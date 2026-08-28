import * as XLSX from 'xlsx'

function cellNum(v: unknown): number | string {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(v)
  return Number.isFinite(n) ? n : String(v)
}

export type RankingExportKind = 'net' | 'gross' | 'both'

/**
 * Excel del ranking anual: Scratch (gross) y/o Handicap (neto).
 */
export function exportAnnualRankingsExcel(params: {
  year: number
  clubId: number | string
  kind: RankingExportKind
  with_hcp: any[]
  without_hcp: any[]
}) {
  const wb = XLSX.utils.book_new()
  const kind = params.kind || 'both'

  if (kind === 'net' || kind === 'both') {
    const netRows = params.with_hcp || []
    const netJson = netRows.map((r, i) => ({
      Pos: r.position ?? i + 1,
      Jugador: String(r.player_name ?? ''),
      Matricula: String(r.member_number ?? ''),
      Jugadas: cellNum(r.rounds),
      Computan: cellNum(r.rounds_counted ?? ''),
      'Total gross': cellNum(r.total_gross),
      'Total neto': cellNum(r.total_net),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(netJson), 'Handicap')
  }

  if (kind === 'gross' || kind === 'both') {
    const grossRows = params.without_hcp || []
    const grossJson = grossRows.map((r, i) => ({
      Pos: r.position ?? i + 1,
      Jugador: String(r.player_name ?? ''),
      Matricula: String(r.member_number ?? ''),
      Jugadas: cellNum(r.rounds),
      Computan: cellNum(r.rounds_counted ?? ''),
      'Total Gross': cellNum(r.total_gross),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(grossJson), 'Scratch')
  }

  const suffix = kind === 'net' ? '_handicap' : kind === 'gross' ? '_scratch' : '_scratch_handicap'
  XLSX.writeFile(wb, `ranking_anual_${params.year}_club_${params.clubId}${suffix}.xlsx`)
}

/**
 * Excel ranking por torneo (Gross y/o Neto).
 */
export function exportTournamentRankingsExcel(params: {
  clubId: number | string
  tournamentId: number
  tournamentName?: string
  kind: RankingExportKind
  with_hcp: any[]
  without_hcp: any[]
}) {
  const wb = XLSX.utils.book_new()
  const kind = params.kind || 'both'

  const safeName = String(params.tournamentName ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 35)
  const nameSuffix = safeName ? `_${safeName}` : ''

  if (kind === 'net' || kind === 'both') {
    const netRows = params.with_hcp || []
    const netJson = netRows.map((r, i) => ({
      Pos: i + 1,
      Jugador: String(r.player_name ?? ''),
      Matricula: String(r.member_number ?? ''),
      'Total gross': cellNum(r.total_gross),
      'Total neto': cellNum(r.total_net),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(netJson), 'Neto')
  }

  if (kind === 'gross' || kind === 'both') {
    const grossRows = params.without_hcp || []
    const grossJson = grossRows.map((r, i) => ({
      Pos: i + 1,
      Jugador: String(r.player_name ?? ''),
      Matricula: String(r.member_number ?? ''),
      'Total Gross': cellNum(r.total_gross),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(grossJson), 'Gross')
  }

  const suffix = kind === 'net' ? '_neto' : kind === 'gross' ? '_gross' : ''
  XLSX.writeFile(wb, `ranking_torneo_${params.tournamentId}_club_${params.clubId}${nameSuffix}${suffix}.xlsx`)
}
