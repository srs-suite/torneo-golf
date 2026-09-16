import * as XLSX from 'xlsx'

function cellNum(v: unknown): number | string {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(v)
  return Number.isFinite(n) ? n : String(v)
}

function countedTournamentIds(details: any[], limit: number): Set<number> {
  const played = (details || []).filter(
    (d) => d && (d.total_gross != null || d.total_net != null || d.front_nine != null)
  )
  const explicit = played.filter((d) => d.counts === true)
  const hasDropped = played.some((d) => d.counts === false)
  const pool = hasDropped && explicit.length ? explicit : played
  const best = [...pool].sort((a, b) => {
    const byGross = (Number(a.total_gross) || 0) - (Number(b.total_gross) || 0)
    if (byGross !== 0) return byGross
    return Number(a.tournament_id) - Number(b.tournament_id)
  }).slice(0, Math.max(1, limit))
  return new Set(best.map((d) => Number(d.tournament_id)))
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
  countingRounds?: number
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
  downloadMatrixXlsx(
    `ranking_por_torneos_${params.year}_club_${params.clubId}${suffix}.xlsx`,
    sheets,
    params.countingRounds || 3
  )
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
  setTimeout(() => {
    a.remove()
    URL.revokeObjectURL(url)
  }, 2500)
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

function colLetter(n: number): string {
  let s = ''
  let x = n
  while (x > 0) {
    const m = (x - 1) % 26
    s = String.fromCharCode(65 + m) + s
    x = Math.floor((x - 1) / 26)
  }
  return s
}

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    c ^= data[i]
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (c ^ 0xffffffff) >>> 0
}

function zipStore(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const name = enc.encode(f.name)
    const crc = crc32(f.data)
    const local = new Uint8Array(30 + name.length)
    const view = new DataView(local.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 20, true)
    view.setUint32(14, crc, true)
    view.setUint32(18, f.data.length, true)
    view.setUint32(22, f.data.length, true)
    view.setUint16(26, name.length, true)
    local.set(name, 30)
    chunks.push(local, f.data)
    const cen = new Uint8Array(46 + name.length)
    const cv = new DataView(cen.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, f.data.length, true)
    cv.setUint32(24, f.data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, offset, true)
    cen.set(name, 46)
    central.push(cen)
    offset += local.length + f.data.length
  }
  let centralSize = 0
  for (const c of central) centralSize += c.length
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  const all = [...chunks, ...central, eocd]
  const total = all.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let p = 0
  for (const part of all) {
    out.set(part, p)
    p += part.length
  }
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

function xlsxCell(col: number, row: number, value: string | number | '', style: number): string {
  const ref = `${colLetter(col)}${row}`
  if (value === '' || value == null) return `<c r="${ref}" s="${style}"/>`
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}" s="${style}"><v>${value}</v></c>`
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${escXml(value)}</t></is></c>`
}

function matrixSheetXml(rows: any[], tournaments: ExcelTournamentCol[], countingRounds = 3): string {
  const cols = collectTournamentCols(rows, tournaments)
  const sub = ['HCP', 'Ida', 'Vuelta', 'Gross', 'Neto']
  const merges = ['A1:A2', 'B1:B2', 'C1:C2']
  const widths = [
    '<col min="1" max="1" width="12" customWidth="1"/>',
    '<col min="2" max="2" width="28" customWidth="1"/>',
    '<col min="3" max="3" width="14" customWidth="1"/>',
  ]
  cols.forEach((_, i) => {
    const start = 4 + i * 5
    merges.push(`${colLetter(start)}1:${colLetter(start + 4)}1`)
    for (let j = 0; j < 5; j++) widths.push(`<col min="${start + j}" max="${start + j}" width="11" customWidth="1"/>`)
  })

  const row1 = [
    xlsxCell(1, 1, 'Posicion', 1),
    xlsxCell(2, 1, 'Jugador', 1),
    xlsxCell(3, 1, 'Matricula', 1),
  ]
  const row2: string[] = []
  cols.forEach((t, i) => {
    const start = 4 + i * 5
    const title = [fmtDate(t.tournament_date), t.tournament_name].filter(Boolean).join(' — ')
    row1.push(xlsxCell(start, 1, title || `Torneo ${i + 1}`, 7))
    sub.forEach((label, j) => row2.push(xlsxCell(start + j, 2, label, j === 0 ? 8 : 3)))
  })

  const data = (rows || []).map((r, idx) => {
    const details = roundDetailsOf(r)
    const counted = countedTournamentIds(details, countingRounds)
    const byId = new Map<number, any>()
    for (const d of details) byId.set(Number(d.tournament_id), d)
    const excelRow = idx + 3
    const cells = [
      xlsxCell(1, excelRow, Number(r.position ?? idx + 1), 5),
      xlsxCell(2, excelRow, String(r.player_name ?? ''), 4),
      xlsxCell(3, excelRow, String(r.member_number ?? ''), 5),
    ]
    cols.forEach((t, i) => {
      const d = byId.get(t.tournament_id)
      const played = d && (d.total_gross != null || d.total_net != null || d.front_nine != null)
      const counts = played && counted.has(t.tournament_id)
      const style = counts ? 6 : 5
      const start = 4 + i * 5
      const values: Array<string | number | ''> = played
        ? [d.handicap_used ?? '', d.front_nine ?? '', d.back_nine ?? '', d.total_gross ?? '', d.total_net ?? '']
        : ['', '', '', '', '']
      values.forEach((v, j) => {
        const empty = v === '' || v == null
        const num = !empty && Number.isFinite(Number(v)) ? Number(v) : ''
        const colStyle = j === 0 ? (played && counts ? 10 : 9) : (played ? style : 5)
        cells.push(xlsxCell(start + j, excelRow, empty ? '' : num === '' ? String(v) : num, colStyle))
      })
    })
    return `<row r="${excelRow}">${cells.join('')}</row>`
  })

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols>${widths.join('')}</cols>
<sheetData>
<row r="1" ht="32" customHeight="1">${row1.join('')}</row>
<row r="2">${row2.join('')}</row>
${data.join('')}
</sheetData>
<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>
</worksheet>`
}

const XLSX_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
</fonts>
<fills count="5">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE5E7EB"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD6EAF8"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="medium"><color rgb="FF1F2937"/></left><right/><top/><bottom/><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="11">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
</cellXfs>
</styleSheet>`

function downloadMatrixXlsx(
  fileName: string,
  sheets: { name: string; rows: any[]; tournaments: ExcelTournamentCol[] }[],
  countingRounds = 3
) {
  const usable = sheets.filter((s) => (s.rows || []).length)
  if (!usable.length) throw new Error('No hay filas para exportar')
  const enc = new TextEncoder()
  const sheetFiles = usable.map((s, i) => ({
    name: `xl/worksheets/sheet${i + 1}.xml`,
    data: enc.encode(matrixSheetXml(s.rows, s.tournaments, countingRounds)),
  }))
  const sheetRels = usable
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join('')
  const sheetTags = usable
    .map((s, i) => {
      const name = s.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || `Hoja${i + 1}`
      return `<sheet name="${escXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
    })
    .join('')
  const stylesRid = usable.length + 1
  const files = [
    {
      name: '[Content_Types].xml',
      data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${usable.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`),
    },
    {
      name: '_rels/.rels',
      data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    },
    {
      name: 'xl/workbook.xml',
      data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheetTags}</sheets>
</workbook>`),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheetRels}
<Relationship Id="rId${stylesRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    },
    { name: 'xl/styles.xml', data: enc.encode(XLSX_STYLES) },
    ...sheetFiles,
  ]
  const outName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`
  downloadBlob(zipStore(files), outName)
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

function firstRoundPairs(size: number): Array<[number, number]> {
  const slotOrder = [1, 8, 4, 5, 3, 6, 2, 7]
  if (size <= 8) {
    const pairs: Array<[number, number]> = []
    for (let i = 0; i < slotOrder.length; i += 2) {
      pairs.push([slotOrder[i], slotOrder[i + 1]])
    }
    return pairs
  }
  return slotOrder.map((seed) => [seed, size + 1 - seed])
}

function bracketRoundLabels(size: number): string[] {
  if (size <= 8) return ['Cuartos de final', 'Semifinales', 'Final', 'Campeón']
  return ['Octavos de final', 'Cuartos de final', 'Semifinales', 'Final', 'Campeón']
}

function bracketPageHtml(sheet: {
  title: string
  size: number
  rows: any[]
  clubName: string
  year: number
  throughLabel: string
}): string {
  const size = sheet.size <= 8 ? 8 : 16
  const pairs = firstRoundPairs(size)
  const rounds = Math.log2(size)
  const labels = bracketRoundLabels(size)
  const player = (seed: number) => {
    const row = sheet.rows[seed - 1]
    const name = String(row?.player_name ?? '').trim()
    return { seed, name }
  }
  const firstRound = pairs
    .map(([a, b]) => {
      const pa = player(a)
      const pb = player(b)
      return `<div class="match">
        <div class="slot">${pa.name ? `<span class="seed">${pa.seed}</span><span class="nm">${escXml(pa.name)}</span>` : `<span class="seed">${pa.seed}</span>`}</div>
        <div class="slot">${pb.name ? `<span class="seed">${pb.seed}</span><span class="nm">${escXml(pb.name)}</span>` : `<span class="seed">${pb.seed}</span>`}</div>
      </div>`
    })
    .join('')
  const later = Array.from({ length: rounds - 1 }, (_, roundIndex) => {
    const matchCount = size / 2 ** (roundIndex + 2)
    const matches = Array.from({ length: matchCount }, () => `<div class="match empty"><div class="slot"></div><div class="slot"></div></div>`).join('')
    return `<div class="round">${matches}</div>`
  }).join('')
  const compact = size > 8 ? ' compact' : ''
  return `<section class="sheet${compact}">
    <header class="banner">
      <div>
        <h1>TORNEO FINAL</h1>
        <p>Llave de eliminación directa – ${size} jugadores</p>
      </div>
      <div class="until">
        <span>HASTA EL</span>
        <strong>${escXml(sheet.throughLabel)}</strong>
      </div>
    </header>
    <p class="meta">${escXml(sheet.clubName || 'Club')} · ${escXml(sheet.title)} · Ranking ${sheet.year}</p>
    <div class="labels">${labels.map((label) => `<span>${label}</span>`).join('')}</div>
    <div class="bracket">
      <div class="round">${firstRound}</div>
      ${later}
      <div class="round champ-col">
        <div class="champ">
          <div class="champ-tag">Campeón</div>
          <div class="champ-name"></div>
        </div>
      </div>
    </div>
    <p class="foot">Completá los ganadores en los casilleros vacíos. Cruces: 1 vs ${size}, 4 vs 5 en el lado alto.</p>
  </section>`
}

function bracketHtml(params: {
  year: number
  clubName: string
  throughLabel: string
  sheets: { title: string; size: number; rows: any[] }[]
}): string {
  const pages = params.sheets
    .map((sheet) =>
      bracketPageHtml({
        ...sheet,
        clubName: params.clubName,
        year: params.year,
        throughLabel: params.throughLabel,
      })
    )
    .join('')
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Llave ranking ${params.year}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; color: #1e293b; font-family: Calibri, "Segoe UI", Arial, sans-serif; }
  .sheet { width: 281mm; min-height: 194mm; page-break-after: always; display: flex; flex-direction: column; }
  .sheet:last-child { page-break-after: auto; }
  .banner { display: flex; justify-content: space-between; align-items: center; background: #16324f; color: white; padding: 4mm 5mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .banner h1 { margin: 0; font-size: 20pt; letter-spacing: 0.04em; font-weight: 800; }
  .banner p { margin: 1mm 0 0; font-size: 10pt; opacity: 0.9; }
  .until { text-align: right; border-left: 1px solid rgba(255,255,255,.45); padding-left: 5mm; }
  .until span { display: block; font-size: 8pt; letter-spacing: 0.12em; }
  .until strong { font-size: 16pt; }
  .meta { margin: 2.5mm 0 1.5mm; font-size: 9pt; color: #475569; letter-spacing: 0.04em; text-transform: uppercase; }
  .labels { display: flex; gap: 3mm; margin-bottom: 2mm; }
  .labels span { flex: 1; text-align: center; background: #e8eef5; color: #334155; font-size: 8pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 1.4mm 1mm; border-radius: 2px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .labels span:last-child { flex: 0.7; }
  .bracket { flex: 1; display: flex; min-height: 150mm; }
  .round { flex: 1; display: flex; flex-direction: column; justify-content: space-around; }
  .match { position: relative; display: flex; flex-direction: column; justify-content: center; margin: 1.2mm 8mm 1.2mm 0; }
  .match::after { content: ""; position: absolute; right: -8mm; top: 22%; bottom: 22%; width: 8mm; border: 1.6px solid #16324f; border-left: 0; }
  .champ-col { justify-content: center; flex: 0.85; }
  .slot { display: flex; align-items: center; gap: 1.5mm; min-height: 8.5mm; margin: 0.8mm 0; padding: 0 1.5mm; border: 1px solid #d5dee8; border-radius: 2px; background: white; font-size: 9pt; }
  .seed { flex: 0 0 5.5mm; height: 5.5mm; display: inline-flex; align-items: center; justify-content: center; background: #eef3f8; color: #16324f; font-size: 8pt; font-weight: 700; border-radius: 2px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .nm { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .compact .slot { min-height: 5.6mm; font-size: 7.4pt; margin: 0.35mm 0; }
  .compact .seed { flex-basis: 4.6mm; height: 4.6mm; font-size: 7pt; }
  .compact .match { margin-right: 6mm; }
  .compact .match::after { right: -6mm; width: 6mm; }
  .champ { display: flex; align-items: center; gap: 2mm; }
  .champ-tag { background: #16324f; color: white; font-weight: 800; font-size: 8pt; letter-spacing: 0.08em; text-transform: uppercase; padding: 2.2mm 3mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .champ-name { flex: 1; min-height: 9mm; border: 1px solid #d5dee8; border-radius: 2px; background: white; }
  .foot { margin: 2mm 0 0; font-size: 7.5pt; color: #64748b; }
  @media screen {
    body { background: #e5e7eb; padding: 12px; }
    .sheet { background: white; margin: 0 auto 12px; box-shadow: 0 1px 4px rgba(0,0,0,.12); }
  }
</style>
</head>
<body>
${pages}
<script>window.addEventListener('load', function () { setTimeout(function () { window.print() }, 250) })</script>
</body>
</html>`
}

/** Llave A4 horizontal: Scratch (8) y Handicap (16). */
export function printAnnualBracket(params: {
  year: number
  clubName: string
  throughLabel: string
  sheets: { title: string; size: number; rows: any[] }[]
}) {
  const html = bracketHtml(params)
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  const w = window.open(url, '_blank')
  if (!w) {
    URL.revokeObjectURL(url)
    throw new Error('El navegador bloqueó la ventana de impresión')
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}


