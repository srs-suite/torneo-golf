import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scorecardService } from '@/services/scorecardService'
import { toast } from 'react-hot-toast'

const QUERY_KEYS = {
  tournamentScorecards: (clubId: number, tournamentId: number) => 
    ['scorecards', 'tournament', clubId, tournamentId],
  playerScorecard: (clubId: number, tournamentId: number, playerId: number, isExternal: boolean) => 
    ['scorecard', 'player', clubId, tournamentId, playerId, isExternal],
  scorecardForPrint: (clubId: number, tournamentId: number, scorecardId: number) => 
    ['scorecard', 'print', clubId, tournamentId, scorecardId]
}

export function useTournamentScorecards(clubId: number, tournamentId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.tournamentScorecards(clubId, tournamentId),
    queryFn: () => scorecardService.getTournamentScorecards(clubId, tournamentId),
    enabled: !!(clubId && tournamentId)
  })
}

export function usePlayerScorecard(
  clubId: number, 
  tournamentId: number, 
  playerId: number, 
  isExternal: boolean = false
) {
  return useQuery({
    queryKey: QUERY_KEYS.playerScorecard(clubId, tournamentId, playerId, isExternal),
    queryFn: () => scorecardService.getPlayerScorecard(clubId, tournamentId, playerId, isExternal),
    enabled: !!(clubId && tournamentId && playerId)
  })
}

export function useSaveScorecard(clubId: number, tournamentId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scorecardData: any) => 
      scorecardService.saveScorecard(clubId, tournamentId, scorecardData),
    onSuccess: () => {
      console.log('✅ Scorecard saved successfully')
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.tournamentScorecards(clubId, tournamentId) 
      })
      toast.success('Tarjeta guardada exitosamente')
    },
    onError: (error: any) => {
      console.error('❌ Error saving scorecard:', error)
      toast.error(error.response?.data?.message || 'Error al guardar la tarjeta')
    }
  })
}

export function useUpdateScorecard(clubId: number, tournamentId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ scorecardId, updateData }: { scorecardId: number, updateData: any }) => 
      scorecardService.updateScorecard(clubId, scorecardId, updateData),
    onSuccess: () => {
      console.log('✅ Scorecard updated successfully')
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.tournamentScorecards(clubId, tournamentId) 
      })
      toast.success('Tarjeta actualizada exitosamente')
    },
    onError: (error: any) => {
      console.error('❌ Error updating scorecard:', error)
      toast.error(error.response?.data?.message || 'Error al actualizar la tarjeta')
    }
  })
}

export function useDeleteScorecard(clubId: number, tournamentId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scorecardId: number) => 
      scorecardService.deleteScorecard(clubId, scorecardId),
    onSuccess: () => {
      console.log('✅ Scorecard deleted successfully')
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.tournamentScorecards(clubId, tournamentId) 
      })
      toast.success('Tarjeta eliminada exitosamente')
    },
    onError: (error: any) => {
      console.error('❌ Error deleting scorecard:', error)
      toast.error(error.response?.data?.message || 'Error al eliminar la tarjeta')
    }
  })
}

export function useGetScorecardDetail(clubId: number, tournamentId: number, scorecardId: number) {
  return useQuery({
    queryKey: ['scorecard', 'detail', clubId, tournamentId, scorecardId],
    queryFn: () => scorecardService.getScorecardDetail(clubId, tournamentId, scorecardId),
    enabled: !!(clubId && tournamentId && scorecardId)
  })
}

export function useGetScorecardForPrint(clubId: number, tournamentId: number, scorecardId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.scorecardForPrint(clubId, tournamentId, scorecardId),
    queryFn: () => scorecardService.getScorecardForPrint(clubId, tournamentId, scorecardId),
    enabled: !!(clubId && tournamentId && scorecardId)
  })
}

