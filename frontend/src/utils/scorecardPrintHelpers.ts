import { formatHcpForDisplay } from '@/utils/scoreUtils'

export function formatShortDateAr(dateString: string | undefined | null): string {
  if (!dateString) return '—'
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Día / mes / año por separado para plancha con casillas en columnas (posiciones fijas en cm). */
export function parseDatePartsForPrint(dateString: string | undefined | null): {
  day: string
  month: string
  year: string
} {
  if (!dateString) return { day: '—', month: '—', year: '—' }
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return { day: '—', month: '—', year: '—' }
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: String(d.getMonth() + 1).padStart(2, '0'),
    year: String(d.getFullYear()),
  }
}

export function formatParticipantTeeTime(v: unknown): string {
  if (v == null || v === '') return ''
  const s = String(v).trim()
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  return s
}

/** Nombre + hoyo de salida + hora (inscripción / tee times) */
export function buildPlayerPrintLine(sc: any): string {
  const name = String(sc?.player_name || '').trim()
  const parts: string[] = []
  const sh = sc?.participant_starting_hole
  if (sh != null && sh !== '' && !Number.isNaN(Number(sh))) {
    parts.push(`Salida hoyo ${Number(sh)}`)
  }
  const tt = formatParticipantTeeTime(sc?.participant_tee_time)
  if (tt) parts.push(tt)
  if (!parts.length) return name
  return `${name} — ${parts.join(' · ')}`
}

export function playingHcpForPrint(sc: any): string {
  const used = sc?.participant_handicap_used
  if (used != null && used !== '' && !Number.isNaN(Number(used))) {
    return formatHcpForDisplay(Number(used), sc.handicap_index)
  }
  return formatHcpForDisplay(
    sc?.handicap_local != null ? Number(sc.handicap_local) : null,
    sc.handicap_index
  )
}
