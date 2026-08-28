import * as XLSX from 'xlsx'

function cellNum(v: unknown): number | string {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(v)
  return Number.isFinite(n) ? n : String(v)
}

export type RankingExportKind = 'net' | 'gross' | 'both'

/**
 * Excel del ranking anual: Scratch/Handicap y/o General.
 */
export function exportAnnualRankingsExcel(params: {
  year: number
  clubId: number | string
  kind: RankingExportKind
  with_hcp: any[]
  without_hcp: any[]
  general_with_hcp?: any[]
  general_without_hcp?: any[]
}) {
  const wb = XLSX.utils.book_new()
  const kind = params.kind || 'both'
  const hasFinalSheets = (params.general_with_hcp || params.general_without_hcp) != null

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
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(netJson),
      hasFinalSheets ? 'Handicap' : 'Neto'
    )
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
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(grossJson),
      hasFinalSheets ? 'Scratch' : 'Gross'
    )
  }

  if (params.general_without_hcp?.length) {
    const g = params.general_without_hcp.map((r, i) => ({
      Pos: r.position ?? i + 1,
      Jugador: String(r.player_name ?? ''),
      Matricula: String(r.member_number ?? ''),
      Jugadas: cellNum(r.rounds),
      'Total Gross': cellNum(r.total_gross),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(g), 'General Gross')
  }
  if (params.general_with_hcp?.length) {
    const g = params.general_with_hcp.map((r, i) => ({
      Pos: r.position ?? i + 1,
      Jugador: String(r.player_name ?? ''),
      Matricula: String(r.member_number ?? ''),
      Jugadas: cellNum(r.rounds),
      'Total gross': cellNum(r.total_gross),
      'Total neto': cellNum(r.total_net),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(g), 'General Neto')
  }

  const suffix =
    kind === 'net' ? '_neto' : kind === 'gross' ? '_gross' : hasFinalSheets ? '_final' : '_acumulado'
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

export type RankingImageSection = {
  title: string
  withHcp: boolean
  rows: any[]
  showRounds?: boolean
}

function fmtImg(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  return Number.isFinite(n) ? String(n) : String(v)
}

function sanitizeName(text: unknown): string {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * PNG del ranking para adjuntar en WhatsApp (sin dependencias extra).
 */
export async function exportRankingImageForWhatsApp(params: {
  fileName: string
  heading: string
  subtitle?: string
  sections: RankingImageSection[]
}): Promise<void> {
  const sections = (params.sections || []).filter((s) => (s.rows || []).length > 0)
  if (!sections.length) {
    throw new Error('No hay filas para exportar')
  }

  const pad = 28
  const titleH = 36
  const subH = params.subtitle ? 22 : 0
  const sectionTitleH = 28
  const headerH = 30
  const rowH = 26
  const gapAfterSection = 22
  const colPos = 44
  const colName = 220
  const colMat = 72
  const colRounds = 56
  const colScore = 72

  const sectionWidths = sections.map((s) => {
    const showRounds = s.showRounds !== false
    let w = colPos + colName + colMat
    if (showRounds) w += colRounds
    if (s.withHcp) w += colScore * 2
    else w += colScore
    return w
  })
  const contentW = Math.max(...sectionWidths, 420)
  const width = contentW + pad * 2

  let height = pad + titleH + subH + 12
  for (const s of sections) {
    height += sectionTitleH + headerH + s.rows.length * rowH + gapAfterSection
  }
  height += pad

  const scale = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * scale)
  canvas.height = Math.ceil(height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear la imagen')

  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  let y = pad
  ctx.fillStyle = '#111827'
  ctx.font = 'bold 22px Arial, Helvetica, sans-serif'
  ctx.fillText(params.heading, pad, y + 22)
  y += titleH

  if (params.subtitle) {
    ctx.fillStyle = '#6b7280'
    ctx.font = '13px Arial, Helvetica, sans-serif'
    ctx.fillText(params.subtitle, pad, y + 14)
    y += subH
  }
  y += 12

  for (const section of sections) {
    const showRounds = section.showRounds !== false
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 15px Arial, Helvetica, sans-serif'
    ctx.fillText(section.title, pad, y + 18)
    y += sectionTitleH

    const headers: { label: string; x: number; w: number; align?: 'left' | 'right' }[] = [
      { label: 'Pos', x: pad, w: colPos },
      { label: 'Jugador', x: pad + colPos, w: colName },
      { label: 'Mat.', x: pad + colPos + colName, w: colMat },
    ]
    let x = pad + colPos + colName + colMat
    if (showRounds) {
      headers.push({ label: 'Jug.', x, w: colRounds, align: 'right' })
      x += colRounds
    }
    if (section.withHcp) {
      headers.push({ label: 'Gross', x, w: colScore, align: 'right' })
      x += colScore
      headers.push({ label: 'Neto', x, w: colScore, align: 'right' })
    } else {
      headers.push({ label: 'Gross', x, w: colScore, align: 'right' })
    }

    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(pad - 4, y, contentW + 8, headerH)
    ctx.fillStyle = '#4b5563'
    ctx.font = 'bold 12px Arial, Helvetica, sans-serif'
    for (const h of headers) {
      const tx = h.align === 'right' ? h.x + h.w - 4 : h.x + 4
      ctx.textAlign = h.align === 'right' ? 'right' : 'left'
      ctx.fillText(h.label, tx, y + 20)
    }
    ctx.textAlign = 'left'
    y += headerH

    section.rows.forEach((r, i) => {
      if (i % 2 === 1) {
        ctx.fillStyle = '#f9fafb'
        ctx.fillRect(pad - 4, y, contentW + 8, rowH)
      }
      ctx.fillStyle = '#111827'
      ctx.font = '13px Arial, Helvetica, sans-serif'
      const cells: { text: string; x: number; w: number; align?: 'left' | 'right'; bold?: boolean }[] = [
        { text: String(i + 1), x: pad, w: colPos },
        { text: sanitizeName(r.player_name).slice(0, 28), x: pad + colPos, w: colName },
        { text: String(r.member_number || '—'), x: pad + colPos + colName, w: colMat },
      ]
      let cx = pad + colPos + colName + colMat
      if (showRounds) {
        cells.push({ text: fmtImg(r.rounds), x: cx, w: colRounds, align: 'right' })
        cx += colRounds
      }
      if (section.withHcp) {
        cells.push({ text: fmtImg(r.total_gross), x: cx, w: colScore, align: 'right' })
        cx += colScore
        cells.push({ text: fmtImg(r.total_net), x: cx, w: colScore, align: 'right', bold: true })
      } else {
        cells.push({ text: fmtImg(r.total_gross), x: cx, w: colScore, align: 'right', bold: true })
      }
      for (const c of cells) {
        ctx.font = c.bold ? 'bold 13px Arial, Helvetica, sans-serif' : '13px Arial, Helvetica, sans-serif'
        const tx = c.align === 'right' ? c.x + c.w - 4 : c.x + 4
        ctx.textAlign = c.align === 'right' ? 'right' : 'left'
        ctx.fillText(c.text, tx, y + 18)
      }
      ctx.textAlign = 'left'
      y += rowH
    })

    y += gapAfterSection
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar PNG'))), 'image/png')
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = params.fileName.endsWith('.png') ? params.fileName : `${params.fileName}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
