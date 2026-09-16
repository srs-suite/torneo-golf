import * as XLSX from 'xlsx'

function cellNum(v: unknown): number | string {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(v)
  return Number.isFinite(n) ? n : String(v)
}

function roundDetailsOf(row: any): any[] {
  if (Array.isArray(row?.round_details) && row.round_details.length) return row.round_details
  const kept = Array.isArray(row?.kept_tournaments) ? row.kept_tournaments.map((d: any) => ({ ...d, counts: true })) : []
  const dropped = Array.isArray(row?.dropped_tournaments) ? row.dropped_tournaments.map((d: any) => ({ ...d, counts: false })) : []
  return [...kept, ...dropped]
}

function fmtDate(v: unknown): string {
  const s = String(v ?? '')
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s.slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}/${m}/${y}`
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
  tournaments?: { tournament_id: number; tournament_name: string; tournament_date?: string }[]
}) {
  const kind = params.kind || 'both'
  const hasFinalSheets = (params.general_with_hcp || params.general_without_hcp) != null
  const tournaments = params.tournaments || []
  const sheets: { name: string; rows: any[]; tournaments: ExcelTournamentCol[] }[] = []

  if (kind === 'net' || kind === 'both') {
    sheets.push({
      name: hasFinalSheets ? 'Handicap' : 'Neto',
      rows: params.with_hcp || [],
      tournaments,
    })
  }
  if (kind === 'gross' || kind === 'both') {
    sheets.push({
      name: hasFinalSheets ? 'Scratch' : 'Gross',
      rows: params.without_hcp || [],
      tournaments,
    })
  }
  if (params.general_without_hcp?.length) {
    sheets.push({ name: 'General Gross', rows: params.general_without_hcp, tournaments })
  }
  if (params.general_with_hcp?.length) {
    sheets.push({ name: 'General Neto', rows: params.general_with_hcp, tournaments })
  }

  const suffix =
    kind === 'net' ? '_neto' : kind === 'gross' ? '_gross' : hasFinalSheets ? '_final' : '_acumulado'
  downloadWorkbookXml(`ranking_anual_${params.year}_club_${params.clubId}${suffix}.xls`, sheets)
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
 * Genera el PNG del ranking como Blob.
 */
export async function buildRankingImageBlob(params: {
  heading: string
  subtitle?: string
  sections: RankingImageSection[]
}): Promise<Blob> {
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

  return blob
}

function escXml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

type ExcelTournamentCol = {
  tournament_id: number
  tournament_name: string
  tournament_date?: string
}

function collectTournamentCols(rows: any[], extra: ExcelTournamentCol[] = []): ExcelTournamentCol[] {
  const map = new Map<number, ExcelTournamentCol>()
  for (const t of extra) {
    const id = Number(t.tournament_id)
    if (!Number.isFinite(id)) continue
    map.set(id, {
      tournament_id: id,
      tournament_name: String(t.tournament_name ?? `Torneo ${id}`),
      tournament_date: t.tournament_date,
    })
  }
  for (const r of rows || []) {
    for (const d of roundDetailsOf(r)) {
      const id = Number(d?.tournament_id)
      if (!Number.isFinite(id) || map.has(id)) continue
      map.set(id, {
        tournament_id: id,
        tournament_name: String(d.tournament_name ?? `Torneo ${id}`),
        tournament_date: d.tournament_date,
      })
    }
  }
  return [...map.values()].sort((a, b) => String(a.tournament_date ?? '').localeCompare(String(b.tournament_date ?? '')))
}

function xmlCell(value: string | number | '', style: string, opts?: { index?: number; mergeAcross?: number; mergeDown?: number; number?: boolean }) {
  const attrs = [
    `ss:StyleID="${style}"`,
    opts?.index ? `ss:Index="${opts.index}"` : '',
    opts?.mergeAcross ? `ss:MergeAcross="${opts.mergeAcross}"` : '',
    opts?.mergeDown ? `ss:MergeDown="${opts.mergeDown}"` : '',
  ].filter(Boolean).join(' ')
  if (value === '' || value == null) return `<Cell ${attrs}/>`
  const type = opts?.number && value !== '' && Number.isFinite(Number(value)) ? 'Number' : 'String'
  const data = type === 'Number' ? String(value) : escXml(value)
  return `<Cell ${attrs}><Data ss:Type="${type}">${data}</Data></Cell>`
}

/** Una fila por jugador. Cada torneo es un bloque; los que computan van resaltados. */
function matrixSheetXml(rows: any[], tournaments: ExcelTournamentCol[]): string {
  const cols = collectTournamentCols(rows, tournaments)
  const sub = ['HCP', 'Ida', 'Vuelta', 'Gross', 'Neto']
  const colXml = [
    '<Column ss:Width="55"/>',
    '<Column ss:Width="180"/>',
    '<Column ss:Width="80"/>',
    ...cols.flatMap(() => [
      '<Column ss:Width="42"/>',
      '<Column ss:Width="42"/>',
      '<Column ss:Width="52"/>',
      '<Column ss:Width="52"/>',
      '<Column ss:Width="48"/>',
    ]),
  ].join('')

  const titleCells = [
    xmlCell('Posicion', 'head', { mergeDown: 1 }),
    xmlCell('Jugador', 'head', { mergeDown: 1 }),
    xmlCell('Matricula', 'head', { mergeDown: 1 }),
  ]
  cols.forEach((t, i) => {
    const date = fmtDate(t.tournament_date)
    const title = [date, t.tournament_name].filter(Boolean).join(' — ')
    titleCells.push(xmlCell(title || `Torneo ${i + 1}`, 'title', {
      index: 4 + i * 5,
      mergeAcross: 4,
    }))
  })

  const subCells: string[] = []
  cols.forEach((_, i) => {
    sub.forEach((label, j) => {
      subCells.push(xmlCell(label, 'sub', j === 0 ? { index: 4 + i * 5 } : undefined))
    })
  })

  const dataRows = (rows || []).map((r, idx) => {
    const details = roundDetailsOf(r)
    const byId = new Map<number, any>()
    for (const d of details) byId.set(Number(d.tournament_id), d)
    const cells = [
      xmlCell(r.position ?? idx + 1, 'cell', { number: true }),
      xmlCell(String(r.player_name ?? ''), 'name'),
      xmlCell(String(r.member_number ?? ''), 'cell'),
    ]
    cols.forEach((t, i) => {
      const d = byId.get(t.tournament_id)
      const played = d && (d.total_gross != null || d.total_net != null || d.front_nine != null)
      const counts = played && d.counts !== false
      const style = counts ? 'hl' : 'cell'
      const start = 4 + i * 5
      const values: Array<string | number | ''> = played
        ? [
            d.handicap_used ?? '',
            d.front_nine ?? '',
            d.back_nine ?? '',
            d.total_gross ?? '',
            d.total_net ?? '',
          ]
        : ['', '', '', '', '']
      values.forEach((v, j) => {
        const empty = v === '' || v == null
        cells.push(xmlCell(empty ? '' : v, played ? style : 'cell', {
          index: j === 0 ? start : undefined,
          number: !empty,
        }))
      })
    })
    return `<Row>${cells.join('')}</Row>`
  })

  return `<Table>${colXml}<Row ss:Height="36">${titleCells.join('')}</Row><Row>${subCells.join('')}</Row>${dataRows.join('')}</Table>`
}

function downloadWorkbookXml(fileName: string, sheets: { name: string; rows: any[]; tournaments: ExcelTournamentCol[] }[]) {
  const xmlSheets = sheets
    .filter((s) => (s.rows || []).length)
    .map((s) => {
      const name = s.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)
      return `<Worksheet ss:Name="${escXml(name)}">${matrixSheetXml(s.rows, s.tournaments)}</Worksheet>`
    })
    .join('')
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
<Style ss:ID="head"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:Bold="1"/><Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/></Borders></Style>
<Style ss:ID="title"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:Bold="1"/><Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/></Borders></Style>
<Style ss:ID="sub"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Size="9"/><Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/></Borders></Style>
<Style ss:ID="cell"><Alignment ss:Horizontal="Center"/></Style>
<Style ss:ID="name"><Alignment ss:Horizontal="Left"/></Style>
<Style ss:ID="hl"><Alignment ss:Horizontal="Center"/><Interior ss:Color="#D6EAF8" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/></Borders></Style>
</Styles>
${xmlSheets}
</Workbook>`
  downloadBlob(new Blob([xml], { type: 'application/vnd.ms-excel' }), fileName.endsWith('.xls') ? fileName : `${fileName}.xls`)
}

/** Abre WhatsApp Desktop o WhatsApp Web (elige contacto y envía). */
function openWhatsAppApp(message?: string) {
  const text = message ? encodeURIComponent(message) : ''
  const url = text ? `https://api.whatsapp.com/send?text=${text}` : 'https://web.whatsapp.com/'
  window.open(url, '_blank', 'noopener,noreferrer')
}

export type WhatsAppShareResult = 'shared' | 'clipboard' | 'downloaded'

/**
 * Comparte el ranking por WhatsApp: menú nativo, portapapeles + app, o descarga.
 */
export async function shareRankingImageForWhatsApp(params: {
  fileName: string
  heading: string
  subtitle?: string
  sections: RankingImageSection[]
}): Promise<WhatsAppShareResult> {
  const blob = await buildRankingImageBlob({
    heading: params.heading,
    subtitle: params.subtitle,
    sections: params.sections,
  })
  const fileName = params.fileName.endsWith('.png') ? params.fileName : `${params.fileName}.png`
  const file = new File([blob], fileName, { type: 'image/png' })
  const shareText = params.heading

  if (typeof navigator.share === 'function') {
    try {
      const payload: ShareData = { title: params.heading, text: shareText, files: [file] }
      if (!navigator.canShare || navigator.canShare(payload)) {
        await navigator.share(payload)
        return 'shared'
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err
      }
    }
  }

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      openWhatsAppApp(shareText)
      return 'clipboard'
    } catch {
      // seguir al fallback de descarga
    }
  }

  downloadBlob(blob, fileName)
  openWhatsAppApp(shareText)
  return 'downloaded'
}

/** Descarga PNG (compatibilidad). */
export async function exportRankingImageForWhatsApp(params: {
  fileName: string
  heading: string
  subtitle?: string
  sections: RankingImageSection[]
}): Promise<void> {
  const blob = await buildRankingImageBlob({
    heading: params.heading,
    subtitle: params.subtitle,
    sections: params.sections,
  })
  downloadBlob(blob, params.fileName)
}
