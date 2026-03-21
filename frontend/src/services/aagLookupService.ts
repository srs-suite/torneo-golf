import { api } from '@/lib/api'

export interface AagLookupByMemberNumberData {
  memberNumber: string
  found: boolean
  handicapIndex: number | null
  aagStatus: string
  message: string
}

export async function lookupAagByMemberNumber(
  clubId: number,
  playerType: 'member' | 'external',
  memberNumber: string
): Promise<{ success: true; data: AagLookupByMemberNumberData } | { success: false; error?: { message?: string; code?: string } }> {
  const { data } = await api.post<
    | { success: true; data: AagLookupByMemberNumberData }
    | { success: false; error?: { message?: string; code?: string } }
  >(`/club/${clubId}/aag/lookup-by-member-number`, {
    playerType,
    memberNumber: memberNumber.trim()
  })
  return data as
    | { success: true; data: AagLookupByMemberNumberData }
    | { success: false; error?: { message?: string; code?: string } }
}

/** Persiste índice AAG en DB (sync individual por playerId) */
export async function syncPlayerHandicapFromAagApi(
  clubId: number,
  playerType: 'member' | 'external',
  playerId: number
): Promise<{
  success: boolean
  data?: { message?: string; aagStatus?: string }
  error?: { message?: string; code?: string }
}> {
  const { data } = await api.post(`/club/${clubId}/aag/sync-player-handicap`, {
    playerType,
    playerId
  })
  return data as {
    success: boolean
    data?: { message?: string; aagStatus?: string }
    error?: { message?: string; code?: string }
  }
}
