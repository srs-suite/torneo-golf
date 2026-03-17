import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  getTournamentParticipants,
  addTournamentParticipant,
  removeTournamentParticipant,
  updateParticipantStatus,
  updateParticipantPayment,
  updateParticipantHandicap,
  searchPlayersForTournament,
  createExternalPlayer,
  updateExternalPlayer,
  getExternalPlayers,
  deleteExternalPlayer
} from '@/services/participantService';
import { Participant, PlayerSearchResult } from '@/types/participant';

const QUERY_KEYS = {
  participants: (clubId: number, tournamentId: number) => ['participants', clubId, tournamentId],
  playerSearch: (clubId: number, query: string) => ['player-search', clubId, query],
  externalPlayers: (clubId: number) => ['external-players', clubId],
};

export const useParticipants = (clubId: number, tournamentId: number) => {
  return useQuery<Participant[], Error>({
    queryKey: QUERY_KEYS.participants(clubId, tournamentId),
    queryFn: () => getTournamentParticipants(clubId, tournamentId),
    enabled: clubId > 0 && tournamentId > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};

export const useUpdateParticipantPayment = (clubId: number, tournamentId: number) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { participantId: number; paymentData: any }>({
    mutationFn: ({ participantId, paymentData }) => updateParticipantPayment(clubId, tournamentId, participantId, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.participants(clubId, tournamentId) });
      toast.success('Cobro actualizado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar cobro');
      console.error('Error updating payment:', error);
    },
  });
};

export const useAddParticipant = (clubId: number, tournamentId: number) => {
  const queryClient = useQueryClient();
  return useMutation<Participant, Error, any>({
    mutationFn: (participantData) => addTournamentParticipant(clubId, tournamentId, participantData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.participants(clubId, tournamentId) });
      queryClient.invalidateQueries({ queryKey: ['tournament-groups', clubId, tournamentId] });
      toast.success('Participante agregado exitosamente!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Error al agregar participante');
      console.error('Error adding participant:', error);
    },
  });
};

export const useRemoveParticipant = (clubId: number, tournamentId: number) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (participantId) => removeTournamentParticipant(clubId, tournamentId, participantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.participants(clubId, tournamentId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.externalPlayers(clubId) });
      queryClient.invalidateQueries({ queryKey: ['tournament-groups', clubId, tournamentId] });
      toast.success('Participante eliminado exitosamente!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar participante');
      console.error('Error removing participant:', error);
    },
  });
};

export const useUpdateParticipantStatus = (clubId: number, tournamentId: number) => {
  const queryClient = useQueryClient();
  return useMutation<Participant[], Error, { participantId: number; status: Participant['status'] }>({
    mutationFn: ({ participantId, status }) => updateParticipantStatus(clubId, tournamentId, participantId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.participants(clubId, tournamentId) });
      toast.success('Estado actualizado exitosamente!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar estado');
      console.error('Error updating status:', error);
    },
  });
};

export const useUpdateParticipantHandicap = (clubId: number, tournamentId: number) => {
  const queryClient = useQueryClient();
  return useMutation<Participant[], Error, { participantId: number; handicap_index?: number | null; handicap_local?: number | null }>({
    mutationFn: ({ participantId, handicap_index, handicap_local }) =>
      updateParticipantHandicap(clubId, tournamentId, participantId, { handicap_index, handicap_local }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.participants(clubId, tournamentId) });
      queryClient.invalidateQueries({ queryKey: ['tournament-groups', clubId, tournamentId] });
      toast.success('Index/HCP actualizado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Error al actualizar handicap');
    },
  });
};

export const useSearchPlayers = (clubId: number) => {
  return useMutation<PlayerSearchResult[], Error, string>({
    mutationFn: (query) => searchPlayersForTournament(clubId, query),
    onError: (error: any) => {
      console.error('Error searching players:', error);
    },
  });
};

export const useExternalPlayers = (clubId: number, enabled: boolean = true) => {
  return useQuery<PlayerSearchResult[], Error>({
    queryKey: QUERY_KEYS.externalPlayers(clubId),
    queryFn: () => getExternalPlayers(clubId),
    enabled: enabled && clubId > 0,
    staleTime: 0, // Always refresh
    refetchOnWindowFocus: true,
  });
};

export const useCreateExternalPlayer = (clubId: number) => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: (playerData) => createExternalPlayer(clubId, playerData),
    onSuccess: () => {
      // Invalidate external players list to refresh it
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.externalPlayers(clubId) });
      toast.success('Jugador externo creado exitosamente!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear jugador externo');
      console.error('Error creating external player:', error);
    },
  });
};

export const useUpdateExternalPlayer = (clubId: number) => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { playerId: number; playerData: any }>({
    mutationFn: ({ playerId, playerData }) => updateExternalPlayer(clubId, playerId, playerData),
    onSuccess: () => {
      // Invalidate external players list to refresh it
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.externalPlayers(clubId) });
      toast.success('Jugador externo actualizado exitosamente!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar jugador externo');
      console.error('Error updating external player:', error);
    },
  });
};

export const useDeleteExternalPlayer = (clubId: number) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (playerId) => deleteExternalPlayer(clubId, playerId),
    onSuccess: () => {
      // Invalidate external players list to refresh it
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.externalPlayers(clubId) });
      toast.success('Jugador externo eliminado exitosamente!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar jugador externo');
      console.error('Error deleting external player:', error);
    },
  });
};
