import axios from 'axios';
import { Participant, PlayerSearchResult } from '@/types/participant';
import type { ExternalPlayerRegistry } from '@/types/externalPlayer';

const API_URL = '/api/club';

export const getTournamentParticipants = async (clubId: number, tournamentId: number): Promise<Participant[]> => {
  const response = await axios.get(`${API_URL}/${clubId}/tournaments/${tournamentId}/participants`);
  const participants = response.data.data;
  
  // Mapear los datos para asegurar que tengan la estructura correcta
  return participants.map((participant: any) => ({
    ...participant,
    participant_id: participant.participation_id || participant.participant_id,
    // member_number ya viene correcto del backend, solo asegurar que no sea undefined
    member_number: participant.member_number || null,
  }));
};

export const addTournamentParticipant = async (
  clubId: number,
  tournamentId: number,
  participantData: any
): Promise<Participant> => {
  const response = await axios.post(`${API_URL}/${clubId}/tournaments/${tournamentId}/participants`, participantData);
  return response.data.data;
};

export const removeTournamentParticipant = async (
  clubId: number, 
  tournamentId: number, 
  participantId: number
): Promise<void> => {
  await axios.delete(`${API_URL}/${clubId}/tournaments/${tournamentId}/participants/${participantId}`);
};

export const updateParticipantStatus = async (
  clubId: number, 
  tournamentId: number, 
  participantId: number, 
  status: Participant['status']
): Promise<Participant[]> => {
  const response = await axios.patch(`${API_URL}/${clubId}/tournaments/${tournamentId}/participants/${participantId}`, { status });
  return response.data.data;
};

export const updateParticipantHandicap = async (
  clubId: number,
  tournamentId: number,
  participantId: number,
  data: { handicap_index?: number | null; handicap_local?: number | null }
): Promise<Participant[]> => {
  const response = await axios.put(
    `${API_URL}/${clubId}/tournaments/${tournamentId}/participants/${participantId}`,
    data
  );
  return response.data.data;
};

/** Actualiza el turno (Mañana/Tarde) del participante */
export const updateParticipantTeePreference = async (
  clubId: number,
  tournamentId: number,
  participantId: number,
  preferred_session: 'morning' | 'afternoon' | null
): Promise<Participant[]> => {
  const response = await axios.put(
    `${API_URL}/${clubId}/tournaments/${tournamentId}/participants/${participantId}`,
    { preferred_session }
  );
  return response.data.data;
};

/** Obtiene la URL de WhatsApp para enviar confirmación de inscripción al jugador */
export const getParticipantWhatsAppInscriptionUrl = async (
  clubId: number,
  tournamentId: number,
  participantId: number
): Promise<{ whatsappUrl: string }> => {
  const response = await axios.get(
    `${API_URL}/${clubId}/tournaments/${tournamentId}/participants/${participantId}/whatsapp-inscription`
  );
  return { whatsappUrl: response.data.whatsappUrl };
};

/** Obtiene la URL de WhatsApp para enviar confirmación de pago al jugador */
export const getParticipantWhatsAppPaymentUrl = async (
  clubId: number,
  tournamentId: number,
  participantId: number
): Promise<{ whatsappUrl: string }> => {
  const response = await axios.get(
    `${API_URL}/${clubId}/tournaments/${tournamentId}/participants/${participantId}/whatsapp-payment`
  );
  return { whatsappUrl: response.data.whatsappUrl };
};

export const updateParticipantPayment = async (
  clubId: number,
  tournamentId: number,
  participantId: number,
  paymentData: {
    fee_amount?: number
    paid_amount?: number
    payment_status?: 'pending' | 'paid' | 'waived'
    payment_method?: string
    receipt_number?: string
    payment_notes?: string
  }
): Promise<void> => {
  await axios.put(`${API_URL}/${clubId}/tournaments/${tournamentId}/participants/${participantId}/payment`, paymentData);
};
export const searchPlayersForTournament = async (clubId: number, query: string): Promise<PlayerSearchResult[]> => {
  if (!query || query.length < 2) {
    return [];
  }
  const response = await axios.get(`${API_URL}/${clubId}/search-players?q=${encodeURIComponent(query)}`);
  return response.data.data;
};

export const checkDuplicateExternalPlayers = async (clubId: number, playerData: any): Promise<any> => {
  const response = await axios.post(`${API_URL}/${clubId}/external-players/check-duplicates`, playerData);
  return response.data.data;
};

export const createExternalPlayer = async (clubId: number, playerData: any): Promise<any> => {
  const response = await axios.post(`${API_URL}/${clubId}/external-players`, playerData);
  return response.data.data;
};

export const getExternalPlayers = async (clubId: number): Promise<PlayerSearchResult[]> => {
  const response = await axios.get(`${API_URL}/${clubId}/external-players`);
  return response.data.data;
};

/** Solo registros de `external_players` (con columnas AAG) para gestión administrativa */
export const getExternalPlayersRegistry = async (clubId: number): Promise<ExternalPlayerRegistry[]> => {
  const response = await axios.get(`${API_URL}/${clubId}/external-players/registry`);
  return response.data.data;
};

export const updateExternalPlayer = async (clubId: number, playerId: number, playerData: any): Promise<any> => {
  const response = await axios.put(`${API_URL}/${clubId}/external-players/${playerId}`, playerData);
  return response.data.data;
};

export const deleteExternalPlayer = async (clubId: number, playerId: number): Promise<void> => {
  await axios.delete(`${API_URL}/${clubId}/external-players/${playerId}`);
};