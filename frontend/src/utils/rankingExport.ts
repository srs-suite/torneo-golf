import * as XLSX from 'xlsx'

function cellNum(v: unknown): number | string {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(v)
  return Number.isFinite(n) ? n : String(v)
}

export type RankingExportKind = 'net' | 'gross'

/**
 * Un archivo .xlsx con una sola hoja según la vista (Neto o Gross, acumulado anual).
 */
export function exportAnnualRankingsExcel(params: {
  year: number
  clubId: number | string
  kind: RankingExportKind
  with_hcp: any[]
  without_hcp: any[]
}) {
  const wb = XLSX.utils.book_new()

  if (params.kind === 'net') {
    const netRows = params.with_hcp || []
    const netHasRounds = netRows.length > 0 && 'rounds' in netRows[0]
    const netJson = netRows.map((r, i) => {
      const row: Record<string, string | number> = {
        Pos: i + 1,
        Jugador: String(r.player_name ?? ''),
        Matricula: String(r.member_number ?? ''),
        'Total gross': cellNum(r.total_gross),
        'Total neto': cellNum(r.total_net),
      }
      if (netHasRounds) row.Rondas = cellNum(r.rounds)
      return row
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(netJson), 'Neto')
    XLSX.writeFile(wb, `ranking_acumulado_${params.year}_club_${params.clubId}_neto.xlsx`)
    return
  }

  const grossRows = params.without_hcp || []
  const grossHasRounds = grossRows.length > 0 && 'rounds' in grossRows[0]
  const grossJson = grossRows.map((r, i) => {
    const row: Record<string, string | number> = {
      Pos: i + 1,
      Jugador: String(r.player_name ?? ''),
      Matricula: String(r.member_number ?? ''),
      'Total gross': cellNum(r.total_gross),
    }
    if (grossHasRounds) row.Rondas = cellNum(r.rounds)
    return row
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(grossJson), 'Gross')
  XLSX.writeFile(wb, `ranking_acumulado_${params.year}_club_${params.clubId}_gross.xlsx`)
}

/**
 * Un archivo .xlsx con una sola hoja según la vista (Neto o Gross, un torneo).
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

  const safeName = String(params.tournamentName ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 35)
  const nameSuffix = safeName ? `_${safeName}` : ''

  if (params.kind === 'net') {
    const netRows = params.with_hcp || []
    const netJson = netRows.map((r, i) => ({
      Pos: i + 1,
      Jugador: String(r.player_name ?? ''),
      Matricula: String(r.member_number ?? ''),
      'Total gross': cellNum(r.total_gross),
      'Total neto': cellNum(r.total_net),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(netJson), 'Neto')
    XLSX.writeFile(wb, `ranking_torneo_${params.tournamentId}_club_${params.clubId}${nameSuffix}_neto.xlsx`)
    return
  }

  const grossRows = params.without_hcp || []
  const grossJson = grossRows.map((r, i) => ({
    Pos: i + 1,
    Jugador: String(r.player_name ?? ''),
    Matricula: String(r.member_number ?? ''),
    'Total gross': cellNum(r.total_gross),
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(grossJson), 'Gross')
  XLSX.writeFile(wb, `ranking_torneo_${params.tournamentId}_club_${params.clubId}${nameSuffix}_gross.xlsx`)
}
