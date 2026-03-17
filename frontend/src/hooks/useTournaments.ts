import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tournamentService } from '@/services/tournamentService'
import { Tournament, CreateTournamentData } from '@/types/tournament'
import { toast } from 'react-hot-toast'

const QUERY_KEYS = {
  tournaments: (clubId: number) => ['tournaments', clubId],
  tournament: (clubId: number, tournamentId: number) => ['tournament', clubId, tournamentId],
  tournamentParticipants: (clubId: number, tournamentId: number) => ['tournament-participants', clubId, tournamentId],
  tournamentGroups: (clubId: number, tournamentId: number) => ['tournament-groups', clubId, tournamentId],
  tournamentStats: (clubId: number, tournamentId: number) => ['tournament-stats', clubId, tournamentId],
  searchPlayers: (clubId: number, query: string) => ['search-players', clubId, query]
}

// Hook para obtener todos los torneos de un club
export function useTournaments(clubId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.tournaments(clubId),
    queryFn: () => {
      console.log('🔄 Fetching tournaments for club:', clubId)
      return tournamentService.getTournaments(clubId)
    },
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: true,
    enabled: !!clubId,
    onSuccess: (data) => {
      console.log('📋 Tournaments loaded:', data?.length || 0, 'tournaments')
    },
    onError: (error) => {
      console.error('❌ Error loading tournaments:', error)
    }
  })
}

// Hook para obtener un torneo específico
export function useTournament(clubId: number, tournamentId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.tournament(clubId, tournamentId),
    queryFn: () => tournamentService.getTournament(clubId, tournamentId),
    staleTime: 30000,
    enabled: !!clubId && !!tournamentId
  })
}

// Hook para crear un torneo
export function useCreateTournament(clubId: number) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (tournamentData: CreateTournamentData) => 
      tournamentService.createTournament(clubId, tournamentData),
    onSuccess: (newTournament) => {
      console.log('✅ Torneo creado exitosamente:', newTournament)
      // Invalidar y refetch inmediato
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournaments(clubId) })
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.tournaments(clubId) })
      toast.success('Torneo creado exitosamente')
    },
    onError: (error: any) => {
      console.error('❌ Error al crear torneo:', error)
      toast.error(error.response?.data?.message || 'Error al crear el torneo')
    }
  })
}

// Hook para actualizar un torneo
export function useUpdateTournament(clubId: number, tournamentId: number) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (tournamentData: Partial<CreateTournamentData>) => 
      tournamentService.updateTournament(clubId, tournamentId, tournamentData),
    onSuccess: (updatedTournament) => {
      console.log('✅ Torneo actualizado exitosamente:', updatedTournament)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournaments(clubId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournament(clubId, tournamentId) })
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.tournaments(clubId) })
      toast.success('Torneo actualizado exitosamente')
    },
    onError: (error: any) => {
      console.error('❌ Error al actualizar torneo:', error)
      toast.error(error.response?.data?.message || 'Error al actualizar el torneo')
    }
  })
}

// Hook para eliminar un torneo
export function useDeleteTournament(clubId: number) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (tournamentId: number) => 
      tournamentService.deleteTournament(clubId, tournamentId),
    onSuccess: () => {
      console.log('✅ Torneo eliminado exitosamente')
      // Invalidar y refetch inmediato
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournaments(clubId) })
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.tournaments(clubId) })
      toast.success('Torneo eliminado exitosamente')
    },
    onError: (error: any) => {
      console.error('❌ Error al eliminar torneo:', error)
      toast.error(error.response?.data?.message || 'Error al eliminar el torneo')
    }
  })
}

// Hook para cambiar estado del torneo
export function useUpdateTournamentStatus(clubId: number, tournamentId: number) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (status: Tournament['status']) => 
      tournamentService.updateTournamentStatus(clubId, tournamentId, status),
    onSuccess: (updatedTournament) => {
      console.log('✅ Estado del torneo actualizado:', updatedTournament)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournaments(clubId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournament(clubId, tournamentId) })
      toast.success('Estado del torneo actualizado')
    },
    onError: (error: any) => {
      console.error('❌ Error al actualizar estado del torneo:', error)
      toast.error(error.response?.data?.message || 'Error al actualizar el estado')
    }
  })
}

// Hook para obtener participantes del torneo
export function useTournamentParticipants(clubId: number, tournamentId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.tournamentParticipants(clubId, tournamentId),
    queryFn: () => tournamentService.getTournamentParticipants(clubId, tournamentId),
    staleTime: 30000,
    enabled: !!clubId && !!tournamentId
  })
}

// Hook para agregar participante
export function useAddParticipant(clubId: number, tournamentId: number) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (participantData: Parameters<typeof tournamentService.addParticipant>[2]) => 
      tournamentService.addParticipant(clubId, tournamentId, participantData),
    onSuccess: () => {
      console.log('✅ Participante agregado exitosamente')
      // Invalidar y refetch inmediato para actualizar conteos
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournamentParticipants(clubId, tournamentId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournaments(clubId) })
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.tournaments(clubId) })
      toast.success('Participante agregado exitosamente')
    },
    onError: (error: any) => {
      console.error('❌ Error al agregar participante:', error)
      toast.error(error.response?.data?.message || 'Error al agregar participante')
    }
  })
}

// Hook para remover participante
export function useRemoveParticipant(clubId: number, tournamentId: number) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (participantId: number) => 
      tournamentService.removeParticipant(clubId, tournamentId, participantId),
    onSuccess: () => {
      console.log('✅ Participante removido exitosamente')
      // Invalidar y refetch inmediato para actualizar conteos y vista de grupos
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournamentParticipants(clubId, tournamentId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournaments(clubId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournamentGroups(clubId, tournamentId) })
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.tournaments(clubId) })
      toast.success('Participante removido exitosamente')
    },
    onError: (error: any) => {
      console.error('❌ Error al remover participante:', error)
      toast.error(error.response?.data?.message || 'Error al remover participante')
    }
  })
}

// Hook para generar grupos
export function useGenerateGroups(clubId: number, tournamentId: number) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (options: Parameters<typeof tournamentService.generateGroups>[2] = {}) => 
      tournamentService.generateGroups(clubId, tournamentId, options),
    onSuccess: () => {
      console.log('✅ Grupos generados exitosamente')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournamentGroups(clubId, tournamentId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournaments(clubId) })
      toast.success('Grupos generados exitosamente')
    },
    onError: (error: any) => {
      console.error('❌ Error al generar grupos:', error)
      toast.error(error.response?.data?.message || 'Error al generar grupos')
    }
  })
}

// Hook para asignar tee times
export function useAssignTeeTimes(clubId: number, tournamentId: number) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (teeTimeData: Parameters<typeof tournamentService.assignTeeTimes>[2]) => 
      tournamentService.assignTeeTimes(clubId, tournamentId, teeTimeData),
    onSuccess: () => {
      console.log('✅ Tee times asignados exitosamente')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournamentGroups(clubId, tournamentId) })
      toast.success('Horarios de salida asignados exitosamente')
    },
    onError: (error: any) => {
      console.error('❌ Error al asignar tee times:', error)
      toast.error(error.response?.data?.message || 'Error al asignar horarios')
    }
  })
}

// Hook para obtener grupos del torneo
export function useTournamentGroups(clubId: number, tournamentId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.tournamentGroups(clubId, tournamentId),
    queryFn: () => tournamentService.getTournamentGroups(clubId, tournamentId),
    enabled: !!clubId && !!tournamentId,
    staleTime: 30000
  })
}

// Hook para reacomodar participantes por HCP (mover al grupo con número más bajo que tenga su banda)
export function useRebalanceGroupsByHcp(clubId: number, tournamentId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => tournamentService.rebalanceGroupsByHcp(clubId, tournamentId),
    onSuccess: (data: { moved: number; message?: string }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournamentGroups(clubId, tournamentId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournamentParticipants(clubId, tournamentId) })
      queryClient.invalidateQueries({ queryKey: ['participants', clubId, tournamentId] })
      if (data.moved > 0) toast.success(`Reacomodados ${data.moved} participante(s) por HCP`)
      else toast(data.message || 'Nada que reacomodar')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Error al reacomodar')
    }
  })
}

// Hook para mover jugador entre grupos
export function useMovePlayerToGroup(clubId: number, tournamentId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ participationId, newGroupNumber }: { participationId: number, newGroupNumber: number }) =>
      tournamentService.movePlayerToGroup(clubId, tournamentId, participationId, newGroupNumber),
    onSuccess: () => {
      console.log('✅ Jugador movido exitosamente')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournamentGroups(clubId, tournamentId) })
      toast.success('Jugador movido exitosamente')
    },
    onError: (error: any) => {
      console.error('❌ Error al mover jugador:', error)
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Error al mover jugador')
    }
  })
}

export function useMoveGroupToHole(clubId: number, tournamentId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ groupNumber, newStartingHole, newTeeTime }: { groupNumber: number, newStartingHole: number, newTeeTime?: string }) =>
      tournamentService.moveGroupToHole(clubId, tournamentId, groupNumber, newStartingHole, newTeeTime),
    onMutate: async ({ groupNumber, newStartingHole, newTeeTime }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.tournamentGroups(clubId, tournamentId) })
      const previous = queryClient.getQueryData<any>(QUERY_KEYS.tournamentGroups(clubId, tournamentId))
      queryClient.setQueryData<any>(QUERY_KEYS.tournamentGroups(clubId, tournamentId), (old: any) => {
        if (!Array.isArray(old)) return old
        return old.map((g) => g.group_number === groupNumber ? { ...g, starting_hole: newStartingHole, tee_time: newTeeTime ?? g.tee_time } : g)
      })
      return { previous }
    },
    onError: (error: any, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(QUERY_KEYS.tournamentGroups(clubId, tournamentId), ctx.previous)
      }
      console.error('❌ Error al mover grupo:', error)
      toast.error(error.response?.data?.message || 'Error al mover grupo')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournamentGroups(clubId, tournamentId) })
    },
    onSuccess: async () => {
      console.log('✅ Grupo movido exitosamente')
      toast.success('Grupo movido exitosamente')
      // Forzar refetch inmediato para evitar ver estado viejo tras el optimista
      await queryClient.refetchQueries({ queryKey: QUERY_KEYS.tournamentGroups(clubId, tournamentId) })
    }
  })
}

export function useSwapGroupNumbers(clubId: number, tournamentId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ groupNumber1, groupNumber2 }: { groupNumber1: number, groupNumber2: number }) =>
      tournamentService.swapGroupNumbers(clubId, tournamentId, groupNumber1, groupNumber2),
    onSuccess: () => {
      console.log('✅ Números de grupo intercambiados exitosamente')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournamentGroups(clubId, tournamentId) })
      toast.success('Grupos renumerados exitosamente')
    },
    onError: (error: any) => {
      console.error('❌ Error al intercambiar números de grupo:', error)
      toast.error(error.response?.data?.message || 'Error al renumerar grupos')
    }
  })
}

export function useCreateEmptyGroup(clubId: number, tournamentId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (config?: { hole: number; time: string | null }) => 
      tournamentService.createEmptyGroup(clubId, tournamentId, config),
    onSuccess: () => {
      console.log('✅ Grupo vacío creado exitosamente')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournamentGroups(clubId, tournamentId) })
      toast.success('Grupo vacío creado exitosamente')
    },
    onError: (error: any) => {
      console.error('❌ Error al crear grupo vacío:', error)
      toast.error(error.response?.data?.message || 'Error al crear grupo vacío')
    }
  })
}

export function useDeleteEmptyGroup(clubId: number, tournamentId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (groupNumber: number) => 
      tournamentService.deleteEmptyGroup(clubId, tournamentId, groupNumber),
    onSuccess: () => {
      console.log('✅ Grupo vacío eliminado exitosamente')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tournamentGroups(clubId, tournamentId) })
      toast.success('Grupo vacío eliminado exitosamente')
    },
    onError: (error: any) => {
      console.error('❌ Error al eliminar grupo vacío:', error)
      toast.error(error.response?.data?.message || 'Error al eliminar grupo vacío')
    }
  })
}

// Hook para obtener estadísticas del torneo
export function useTournamentStats(clubId: number, tournamentId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.tournamentStats(clubId, tournamentId),
    queryFn: () => tournamentService.getTournamentStats(clubId, tournamentId),
    staleTime: 30000,
    enabled: !!clubId && !!tournamentId
  })
}

// Hook para buscar jugadores
export function useSearchPlayers(clubId: number, query: string) {
  return useQuery({
    queryKey: QUERY_KEYS.searchPlayers(clubId, query),
    queryFn: () => tournamentService.searchPlayers(clubId, query),
    staleTime: 60000, // 1 minuto
    enabled: !!clubId && query.length >= 2 // Solo buscar si hay al menos 2 caracteres
  })
}
