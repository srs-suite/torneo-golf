import type { Club } from '@/types/club'
import { formatHcpForDisplay } from './scoreUtils'

export type ParticipantHandicapFields = {
  handicap_index?: number | string | null
  handicap_index_wh?: number | string | null
  handicap_local?: number | string | null
  handicap_used?: number | string | null
  handicap_play?: number | string | null
  gender?: string | null
}

function parseHandicapField(raw: number | string | null | undefined): number | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    const t = raw.trim().replace(',', '.')
    if (t === '' || t.toUpperCase() === 'N/A') return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }
  return Number.isFinite(Number(raw)) ? Number(raw) : null
}

/** Índice WH del jugador (prioriza handicap_index_wh por compatibilidad). */
export function participantWhIndex(p: ParticipantHandicapFields): number | null {
  return parseHandicapField(p.handicap_index_wh ?? p.handicap_index)
}

/** HCP de juego efectivo del torneo (local → usado → play). */
export function participantPlayingHcp(p: ParticipantHandicapFields): number | null {
  for (const raw of [p.handicap_local, p.handicap_used, p.handicap_play]) {
    const n = parseHandicapField(raw)
    if (n !== null) return n
  }
  return null
}

/**
 * Índice → HCP de juego con la misma regla que ClubAdmin al guardar index.
 */
export function computeHcpFromIndexForClub(
  handicapIndex: number | null | undefined,
  gender: string | undefined | null,
  club: Club | undefined
): number | null {
  if (handicapIndex == null || !Number.isFinite(Number(handicapIndex))) return null
  const index = Number(handicapIndex)
  if (index === 0) return 0
  const useClubFormula = club?.enable_field_characteristics !== false
  if (useClubFormula) {
    return computeHcpFromIndexSanJeronimo(index, gender || undefined)
  }
  return Math.round(index)
}

/**
 * Índice → HCP de juego (fórmula San Jerónimo del Rey), misma regla que ClubAdmin.
 * Hombres: round(Index * 130/113 + 0.6)
 * Damas:   round(Index * 128/113 - 0.5)
 */
export function computeHcpFromIndexSanJeronimo(handicapIndex: number, gender: string | undefined): number {
  if (!handicapIndex && handicapIndex !== 0) return 0
  if (handicapIndex === 0) return 0
  if (gender === 'F') {
    const hcp = handicapIndex * (128 / 113) - 0.5
    return Math.round(hcp)
  }
  const hcp = handicapIndex * (130 / 113) + 0.6
  return Math.round(hcp)
}

/**
 * Misma lógica de visualización de HCP que la tabla de socios en ClubAdmin:
 * - Si el club no usa características de cancha: HCP manual (handicap_local).
 * - Si no: HCP calculado desde índice y género con la fórmula del club.
 */
export function formatHcpDisplayForClubPlayer(
  club: Club | undefined,
  opts: {
    handicap_index: number | null | undefined
    handicap_local: number | null | undefined
    gender?: string | null
  }
): string {
  if (club?.enable_field_characteristics === false) {
    const hl = opts.handicap_local
    if (hl != null && Number.isFinite(Number(hl))) {
      return formatHcpForDisplay(Number(hl), opts.handicap_index)
    }
    return '—'
  }

  const raw = opts.handicap_index
  if (raw == null) return '—'
  const idx = Number(raw)
  if (!Number.isFinite(idx)) return '—'
  // Misma regla que ClubAdmin: índice 0 → no se muestra HCP calculado en tabla
  if (idx === 0) return '—'

  const hcp = computeHcpFromIndexSanJeronimo(idx, opts.gender || undefined)
  return formatHcpForDisplay(hcp, opts.handicap_index)
}
