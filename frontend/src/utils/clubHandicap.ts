import type { Club } from '@/types/club'
import { formatHcpForDisplay } from './scoreUtils'

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
    if (hl != null && hl !== '' && Number.isFinite(Number(hl))) {
      return formatHcpForDisplay(Number(hl), opts.handicap_index)
    }
    return '—'
  }

  const raw = opts.handicap_index
  if (raw == null || raw === '') return '—'
  const idx = Number(raw)
  if (!Number.isFinite(idx)) return '—'
  // Misma regla que ClubAdmin: índice 0 → no se muestra HCP calculado en tabla
  if (idx === 0) return '—'

  const hcp = computeHcpFromIndexSanJeronimo(idx, opts.gender || undefined)
  return formatHcpForDisplay(hcp, opts.handicap_index)
}
