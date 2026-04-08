import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'

import { scorecardService } from '@/services/scorecardService'
import { getParticipantPhysicalPrintData } from '@/services/participantService'
import { parseDatePartsForPrint, playingHcpForPrint } from '@/utils/scorecardPrintHelpers'

type SheetOk = { rowKey: string; source: 'scorecard' | 'participant'; id: number; data: any }
type SheetErr = { rowKey: string; source: 'scorecard' | 'participant'; id: number; error: string }
type SheetResult = SheetOk | SheetErr

function parseIdList(raw: string | null): number[] {
  if (!raw) return []
  const list = raw
    .split(/[,;\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0)

  return Array.from(new Set(list))
}

function mm(value: number | string): string {
  return typeof value === 'number' ? `${value}mm` : value
}

const CARD_W_MM = 200
const CARD_H_MM = 147

const A4_W_MM = 210
const A4_H_MM = 297
const BASE_PRINT_SCALE = 1

const PLANCHA_FIELD: CSSProperties = {
  position: 'absolute',
  zIndex: 1,
  fontFamily: 'Arial, Helvetica, sans-serif',
  color: '#000',
  boxSizing: 'border-box',
}

const FIELD_POS = {
  playerName: { x: 17, y: 2, w: 95, h: 5 },
  teeHole: { x: 120, y: 2, w: 20, h: 5 },
  teeTime: { x: 145, y: 2, w: 22, h: 5 },

  memberNumber: { x: 17, y: 9, w: 42, h: 5 },
  handicap: { x: 77, y: 9, w: 16, h: 5 },
  tournamentName: { x: 116, y: 9, w: 50, h: 5 },

  dateDay: { x: 172, y: 9, w: 6, h: 5 },
  dateMonth: { x: 179, y: 9, w: 6, h: 5 },
  dateYear: { x: 187, y: 9, w: 8, h: 5 },
}

const FIELD_TUNE = {
  playerName: { x: 0, y: 0 },
  teeHole: { x: 0, y: 0 },
  teeTime: { x: 0, y: 0 },

  memberNumber: { x: 0, y: 0 },
  handicap: { x: 0, y: 0 },
  tournamentName: { x: 0, y: 0 },

  dateDay: { x: 0, y: 0 },
  dateMonth: { x: 0, y: 0 },
  dateYear: { x: 0, y: 0 },
}

const FONT = {
  player: '3mm',
  normal: '2.8mm',
  small: '2.6mm',
}

function safeText(value: unknown, fallback = '—'): string {
  if (value == null) return fallback
  const s = String(value).trim()
  return s.length > 0 ? s : fallback
}

function readTeeStart(data: any): string {
  return safeText(
    data?.participant_starting_hole ??
      data?.starting_hole ??
      data?.start_hole ??
      data?.tee_hole ??
      data?.hole_start ??
      data?.salida_hoyo,
    '—'
  )
}

function readTeeTime(data: any): string {
  const raw =
    data?.participant_tee_time ??
    data?.tee_time ??
    data?.starting_time ??
    data?.start_time ??
    data?.hora_salida ??
    data?.time

  if (raw == null || String(raw).trim() === '') return '—'

  const s = String(raw).trim()

  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5)

  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    const hh = String(d.getHours()).padStart(2, '0')
    const mmValue = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mmValue}`
  }

  return s
}

type PositionedFieldProps = {
  x: number
  y: number
  w?: number
  h?: number
  tuneX?: number
  tuneY?: number
  fontSize?: string
  fontWeight?: number | string
  align?: CSSProperties['textAlign']
  justify?: CSSProperties['justifyContent']
  alignItems?: CSSProperties['alignItems']
  whiteSpace?: CSSProperties['whiteSpace']
  lineHeight?: CSSProperties['lineHeight']
  children: ReactNode
}

function PositionedField({
  x,
  y,
  w,
  h,
  tuneX = 0,
  tuneY = 0,
  fontSize = FONT.normal,
  fontWeight = 600,
  align = 'left',
  justify = 'flex-start',
  alignItems = 'center',
  whiteSpace = 'nowrap',
  lineHeight = 1,
  children,
}: PositionedFieldProps) {
  return (
    <div
      style={{
        ...PLANCHA_FIELD,
        left: mm(x),
        top: mm(y),
        width: w != null ? mm(w) : undefined,
        height: h != null ? mm(h) : undefined,
        display: 'flex',
        justifyContent: justify,
        alignItems,
        fontSize,
        fontWeight,
        textAlign: align,
        whiteSpace,
        lineHeight,
        overflow: 'hidden',
        transform: `translate(${tuneX}mm, ${tuneY}mm)`,
      }}
    >
      {children}
    </div>
  )
}

function PhysicalPlanchaOverlay({ data, calibrationMode }: { data: any; calibrationMode: boolean }) {
  const dateParts = parseDatePartsForPrint(data?.tournament_date || data?.created_at)
  const playerName = safeText(
    data?.player_name ??
      data?.participant_name ??
      data?.name ??
      data?.full_name,
    '—'
  )
  const memberNumber =
    data?.member_number != null && data.member_number !== '' ? String(data.member_number) : '—'
  const handicap = playingHcpForPrint(data)
  const tournamentName = safeText(data?.tournament_name)
  const teeHole = readTeeStart(data)
  const teeTime = readTeeTime(data)

  return (
    <div
      className="physical-plancha-sheet"
      style={{
        width: mm(CARD_W_MM),
        height: mm(CARD_H_MM),
        position: 'relative',
        boxSizing: 'border-box',
        backgroundColor: '#fff',
        border: '0.3mm dashed #ccc',
        overflow: 'hidden',
      }}
    >
      {calibrationMode && (
        <div
          className="physical-plancha-calibration-hud"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: '0.3mm dashed red',
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: 0,
              top: mm(2),
              width: '100%',
              borderTop: '0.2mm dashed blue',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: 0,
              top: mm(9),
              width: '100%',
              borderTop: '0.2mm dashed green',
              pointerEvents: 'none',
            }}
          />

          {[17, 77, 116, 172, 179, 187].map((x) => (
            <div
              key={`guide-x-${x}`}
              style={{
                position: 'absolute',
                left: mm(x),
                top: 0,
                height: '100%',
                borderLeft: '0.2mm dashed rgba(0,0,0,0.35)',
                pointerEvents: 'none',
              }}
            />
          ))}
        </div>
      )}

      <PositionedField
        x={FIELD_POS.playerName.x}
        y={FIELD_POS.playerName.y}
        w={FIELD_POS.playerName.w}
        h={FIELD_POS.playerName.h}
        tuneX={FIELD_TUNE.playerName.x}
        tuneY={FIELD_TUNE.playerName.y}
        fontSize={FONT.player}
        fontWeight={700}
        alignItems="flex-end"
        lineHeight={1}
      >
        {playerName}
      </PositionedField>

      <PositionedField
        x={FIELD_POS.teeHole.x}
        y={FIELD_POS.teeHole.y}
        w={FIELD_POS.teeHole.w}
        h={FIELD_POS.teeHole.h}
        tuneX={FIELD_TUNE.teeHole.x}
        tuneY={FIELD_TUNE.teeHole.y}
        fontSize={FONT.normal}
        fontWeight={700}
        justify="center"
        align="center"
      >
        {teeHole !== '—' ? `Hoyo ${teeHole}` : '—'}
      </PositionedField>

      <PositionedField
        x={FIELD_POS.teeTime.x}
        y={FIELD_POS.teeTime.y}
        w={FIELD_POS.teeTime.w}
        h={FIELD_POS.teeTime.h}
        tuneX={FIELD_TUNE.teeTime.x}
        tuneY={FIELD_TUNE.teeTime.y}
        fontSize={FONT.normal}
        fontWeight={700}
        justify="center"
        align="center"
      >
        {teeTime}
      </PositionedField>

      <PositionedField
        x={FIELD_POS.memberNumber.x}
        y={FIELD_POS.memberNumber.y}
        w={FIELD_POS.memberNumber.w}
        h={FIELD_POS.memberNumber.h}
        tuneX={FIELD_TUNE.memberNumber.x}
        tuneY={FIELD_TUNE.memberNumber.y}
        fontSize={FONT.normal}
        fontWeight={600}
      >
        {memberNumber}
      </PositionedField>

      <PositionedField
        x={FIELD_POS.handicap.x}
        y={FIELD_POS.handicap.y}
        w={FIELD_POS.handicap.w}
        h={FIELD_POS.handicap.h}
        tuneX={FIELD_TUNE.handicap.x}
        tuneY={FIELD_TUNE.handicap.y}
        fontSize={FONT.normal}
        fontWeight={700}
        justify="center"
        align="center"
      >
        {handicap}
      </PositionedField>

      <PositionedField
        x={FIELD_POS.tournamentName.x}
        y={FIELD_POS.tournamentName.y}
        w={FIELD_POS.tournamentName.w}
        h={FIELD_POS.tournamentName.h}
        tuneX={FIELD_TUNE.tournamentName.x}
        tuneY={FIELD_TUNE.tournamentName.y}
        fontSize={FONT.small}
        fontWeight={600}
      >
        {tournamentName}
      </PositionedField>

      <PositionedField
        x={FIELD_POS.dateDay.x}
        y={FIELD_POS.dateDay.y}
        w={FIELD_POS.dateDay.w}
        h={FIELD_POS.dateDay.h}
        tuneX={FIELD_TUNE.dateDay.x}
        tuneY={FIELD_TUNE.dateDay.y}
        fontSize={FONT.small}
        fontWeight={600}
        justify="center"
        align="center"
      >
        {dateParts.day}
      </PositionedField>

      <PositionedField
        x={FIELD_POS.dateMonth.x}
        y={FIELD_POS.dateMonth.y}
        w={FIELD_POS.dateMonth.w}
        h={FIELD_POS.dateMonth.h}
        tuneX={FIELD_TUNE.dateMonth.x}
        tuneY={FIELD_TUNE.dateMonth.y}
        fontSize={FONT.small}
        fontWeight={600}
        justify="center"
        align="center"
      >
        {dateParts.month}
      </PositionedField>

      <PositionedField
        x={FIELD_POS.dateYear.x}
        y={FIELD_POS.dateYear.y}
        w={FIELD_POS.dateYear.w}
        h={FIELD_POS.dateYear.h}
        tuneX={FIELD_TUNE.dateYear.x}
        tuneY={FIELD_TUNE.dateYear.y}
        fontSize={FONT.small}
        fontWeight={600}
        justify="center"
        align="center"
      >
        {dateParts.year}
      </PositionedField>
    </div>
  )
}

export default function ScorecardOverlayPrint() {
  const { clubId, tournamentId, participationId: participationIdParam } = useParams<{
    clubId: string
    tournamentId: string
    participationId?: string
  }>()

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const embed = searchParams.get('embed') === '1'

  const clubIdNum = clubId ? parseInt(clubId, 10) : 0
  const tournamentIdNum = tournamentId ? parseInt(tournamentId, 10) : 0

  const pathParticipantId = useMemo(() => {
    if (!participationIdParam) return NaN
    const n = parseInt(String(participationIdParam).trim(), 10)
    return !Number.isNaN(n) && n > 0 ? n : NaN
  }, [participationIdParam])

  const scorecardIds = useMemo(() => parseIdList(searchParams.get('ids')), [searchParams])

  const participantIds = useMemo(() => {
    const merged = [
      ...parseIdList(searchParams.get('participantIds')),
      ...parseIdList(searchParams.get('participants')),
      ...parseIdList(searchParams.get('participantId')),
    ]
    if (!Number.isNaN(pathParticipantId)) merged.push(pathParticipantId)
    return Array.from(new Set(merged))
  }, [searchParams, pathParticipantId])

  const useParticipants = participantIds.length > 0
  const activeIds = useParticipants ? participantIds : scorecardIds

  const overlayBackPath =
    clubId && tournamentId
      ? `/club/${clubId}/tournaments/${tournamentId}/scorecards`
      : clubId
        ? `/club/${clubId}/admin`
        : '/'

  const overlayBackLabel = tournamentId ? 'Volver al torneo' : 'Volver'

  const calibrationMode = searchParams.get('calibrate') === '1'

  const topMarginMm = useMemo(() => {
    const raw = searchParams.get('topmm')
    if (raw == null || raw === '') return 2
    const n = Number(String(raw).replace(',', '.'))
    if (!Number.isFinite(n) || n < -30 || n > 30) return 2
    return n
  }, [searchParams])

  const leftMarginMm = useMemo(() => {
    const raw = searchParams.get('leftmm')
    if (raw == null || raw === '') return 0
    const n = Number(String(raw).replace(',', '.'))
    if (!Number.isFinite(n) || n < -30 || n > 30) return 0
    return n
  }, [searchParams])

  const extraScale = useMemo(() => {
    const raw = searchParams.get('scale')
    if (raw == null || raw === '') return 1
    const n = Number(String(raw).replace(',', '.'))
    if (!Number.isFinite(n) || n < 0.9 || n > 1.1) return 1
    return n
  }, [searchParams])

  const finalScale = extraScale
  const finalCardWidthMm = CARD_W_MM * finalScale
  const finalCardHeightMm = CARD_H_MM * finalScale

  const [sheets, setSheets] = useState<SheetResult[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!clubIdNum || !tournamentIdNum || activeIds.length === 0) {
      setSheets([])
      setLoading(false)
      return
    }

    setLoading(true)

    if (useParticipants) {
      const results: SheetResult[] = await Promise.all(
        participantIds.map(async (pid): Promise<SheetResult> => {
          const rowKey = `participant-${pid}`
          try {
            const data = await getParticipantPhysicalPrintData(clubIdNum, tournamentIdNum, pid)
            return { rowKey, source: 'participant', id: pid, data }
          } catch (e: any) {
            return { rowKey, source: 'participant', id: pid, error: e?.message || 'Error al cargar' }
          }
        })
      )

      setSheets(results)
    } else {
      const results: SheetResult[] = await Promise.all(
        scorecardIds.map(async (scorecardId): Promise<SheetResult> => {
          const rowKey = `scorecard-${scorecardId}`
          try {
            const data = await scorecardService.getScorecardForPrint(
              clubIdNum,
              tournamentIdNum,
              scorecardId
            )
            return { rowKey, source: 'scorecard', id: scorecardId, data }
          } catch (e: any) {
            return { rowKey, source: 'scorecard', id: scorecardId, error: e?.message || 'Error al cargar' }
          }
        })
      )

      setSheets(results)
    }

    setLoading(false)
  }, [clubIdNum, tournamentIdNum, activeIds.length, useParticipants, participantIds, scorecardIds])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const ap = searchParams.get('autoprint') === 'true'
    if (ap && !loading && sheets.length > 0) {
      const t = setTimeout(() => window.print(), 500)
      return () => clearTimeout(t)
    }
  }, [loading, sheets, searchParams])

  const handlePrint = () => window.print()

  if (loading) {
    return (
      <div
        className={`bg-gray-50 flex items-center justify-center ${embed ? 'min-h-[280px] h-full' : 'min-h-screen'}`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-4 text-gray-600">Preparando planchas…</p>
        </div>
      </div>
    )
  }

  if (!activeIds.length) {
    return (
      <div
        className={`bg-gray-50 flex flex-col items-center justify-center gap-4 p-6 ${embed ? 'min-h-[280px]' : 'min-h-screen'}`}
      >
        <p className="text-gray-800 text-center max-w-md">
          Falta un ID válido en la URL: <code className="bg-gray-200 px-1 rounded">…/print-overlay/participant/N</code>, <code className="bg-gray-200 px-1 rounded">?participantIds=N</code> o <code className="bg-gray-200 px-1 rounded">?ids=N</code>.
        </p>

        {!embed && (
          <button
            type="button"
            onClick={() => navigate(overlayBackPath)}
            className="inline-flex items-center gap-2 px-4 py-2 border rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" /> {overlayBackLabel}
          </button>
        )}
        {embed && <p className="text-sm text-gray-500">Cerrá esta vista con el botón del listado de participantes.</p>}
      </div>
    )
  }

  const okCount = sheets.filter((s) => 'data' in s).length

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            html {
              margin: 0 !important;
              padding: 0 !important;
            }

            html, body {
              width: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              overflow: visible !important;
            }

            #root {
              width: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
              min-height: 0 !important;
              height: auto !important;
              overflow: visible !important;
            }

            body * { visibility: hidden; }

            #overlay-print-root,
            #overlay-print-root * {
              visibility: visible;
            }

            /* absolute evita que fixed encoja o desplace mal el contenido en vista previa / HP */
            #overlay-print-root {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: transparent !important;
              print-color-adjust: economy !important;
              -webkit-print-color-adjust: economy !important;
            }

            .overlay-print-page {
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              box-sizing: border-box !important;
              print-color-adjust: economy !important;
              -webkit-print-color-adjust: economy !important;
            }

            .plancha-print-body {
              display: flex !important;
              justify-content: center !important;
              align-items: flex-start !important;
              box-sizing: border-box !important;
            }

            .physical-plancha-sheet {
              background-color: transparent !important;
              border: none !important;
            }

            .physical-plancha-calibration-hud {
              display: none !important;
            }

            .no-print-overlay {
              display: none !important;
            }

            @page {
              size: A4 portrait;
              margin: 0;
            }
          }
        `,
        }}
      />

      <div className={`bg-gray-100 no-print-overlay ${embed ? 'min-h-0' : 'min-h-screen'}`}>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-3 py-2 sm:px-4 sm:py-4">
          {embed ? (
            <p className="text-xs text-gray-600">Podés cerrar con el botón <strong>Cerrar</strong> del listado de participantes.</p>
          ) : (
            <button
              type="button"
              onClick={() => navigate(overlayBackPath)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md bg-white text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" /> {overlayBackLabel}
            </button>
          )}

          <div className="text-sm text-gray-600">{embed ? '' : `${okCount} plancha${okCount !== 1 ? 's' : ''}`}</div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>

        {!embed && (
          <p className="max-w-3xl mx-auto px-4 text-xs text-amber-900 mb-4">
            <strong>Impresión</strong>: solo el texto de datos, para usar sobre plancha/tarjeta ya impresa. En pantalla el recuadro punteado es guía del tamaño ({CARD_W_MM}×{CARD_H_MM} mm). Parámetros: <strong>?topmm=</strong>, <strong>?leftmm=</strong>, <strong>?scale=</strong>, <strong>?calibrate=1</strong>. Márgenes ninguno, escala <strong>100 %</strong>.
          </p>
        )}
        {embed && (
          <p className="mx-auto max-w-3xl px-3 pb-2 text-[11px] text-gray-500">
            Impresión solo con datos. Ayuda completa en la misma ruta sin <code className="rounded bg-gray-200 px-0.5">embed=1</code>.
          </p>
        )}
      </div>

      <div id="overlay-print-root" className="bg-gray-200 print:bg-transparent pb-8 print:pb-0">
        {sheets.map((sheet, idx) => (
          <div
            key={sheet.rowKey}
            className="overlay-print-page mx-auto mb-8 print:mb-0 print:mx-0 bg-white print:bg-transparent"
            style={{
              width: mm(A4_W_MM),
              height: mm(A4_H_MM),
              minHeight: mm(A4_H_MM),
              pageBreakAfter: idx < sheets.length - 1 ? 'always' : 'auto',
            }}
          >
            {'error' in sheet ? (
              <div className="p-6 text-sm text-red-700">
                {sheet.source === 'participant' ? 'Participante' : 'Tarjeta'} #{sheet.id}: {sheet.error}
              </div>
            ) : (
              <div
                className="plancha-print-body"
                style={{
                  width: mm(A4_W_MM),
                  minHeight: mm(A4_H_MM),
                  boxSizing: 'border-box',
                  margin: 0,
                  paddingTop: mm(topMarginMm),
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: mm(finalCardWidthMm),
                    height: mm(finalCardHeightMm),
                    overflow: 'hidden',
                    flexShrink: 0,
                    position: 'relative',
                    transform: `translateX(${leftMarginMm}mm)`,
                    transformOrigin: 'top center',
                  }}
                >
                  <div
                    style={{
                      width: mm(CARD_W_MM),
                      height: mm(CARD_H_MM),
                      transform: `scale(${finalScale})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    <PhysicalPlanchaOverlay data={sheet.data} calibrationMode={calibrationMode} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

export { BASE_PRINT_SCALE }
