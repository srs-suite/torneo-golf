/** Clave de URL para manual-entry: evita colisión entre member_id, external_player_id y participant_id. */

export function scorecardPlayerUrlKey(player: {
  player_type?: string | null
  member_id?: number | string | null
  external_player_id?: number | string | null
}): string | null {
  const pt = String(player?.player_type || '').toLowerCase()
  const extId = player?.external_player_id
  const memId = player?.member_id

  if (pt === 'external' || (extId != null && extId !== '' && (memId == null || memId === ''))) {
    const n = Number(extId)
    return Number.isFinite(n) && n > 0 ? `e-${n}` : null
  }

  const n = Number(memId)
  return Number.isFinite(n) && n > 0 ? `m-${n}` : null
}

export function findParticipantByUrlKey<T extends {
  player_type?: string | null
  member_id?: number | string | null
  external_player_id?: number | string | null
  participant_id?: number | string | null
}>(participants: T[], key: string | undefined | null): T | null {
  if (!key || !participants?.length) return null

  const memberMatch = /^m-(\d+)$/i.exec(key)
  if (memberMatch) {
    const id = Number(memberMatch[1])
    return participants.find((p) => Number(p.member_id) === id) ?? null
  }

  const externalMatch = /^e-(\d+)$/i.exec(key)
  if (externalMatch) {
    const id = Number(externalMatch[1])
    return participants.find((p) => Number(p.external_player_id) === id) ?? null
  }

  // URLs viejas solo numéricas: member → external → participant (último, más ambiguo)
  const n = Number(key)
  if (!Number.isFinite(n) || n <= 0) return null

  return (
    participants.find((p) => Number(p.member_id) === n) ??
    participants.find((p) => Number(p.external_player_id) === n) ??
    participants.find((p) => Number(p.participant_id) === n) ??
    null
  )
}
