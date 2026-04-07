import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'

import { useParams, useNavigate, useSearchParams } from 'react-router-dom'

import { ArrowLeft, Printer } from 'lucide-react'

import { scorecardService } from '@/services/scorecardService'

import { getParticipantPhysicalPrintData } from '@/services/participantService'

import { buildPlayerPrintLine, parseDatePartsForPrint, playingHcpForPrint } from '@/utils/scorecardPrintHelpers'



type SheetOk = { rowKey: string; source: 'scorecard' | 'participant'; id: number; data: any }

type SheetErr = { rowKey: string; source: 'scorecard' | 'participant'; id: number; error: string }

type SheetResult = SheetOk | SheetErr



/** Base de Vite (tipos de import.meta.env sin depender de vite-env.d.ts en todos los entornos) */

function vitePublicBaseUrl(): string {

  const meta = import.meta as unknown as { env?: { BASE_URL?: string } }

  const b = meta.env?.BASE_URL

  return typeof b === 'string' && b.length > 0 ? b : '/'

}



function parseIdList(raw: string | null): number[] {

  if (!raw) return []

  const list = raw

    .split(/[,;\s]+/)

    .map((s) => parseInt(s.trim(), 10))

    .filter((n) => !Number.isNaN(n) && n > 0)

  return Array.from(new Set(list))

}

/** Plancha SINERCOM (medidas reales): franja horizontal 35 cm × 18,5 cm; centrada y escalada al A4. */
const CARD_WIDTH_CM = 35
const CARD_HEIGHT_CM = 18.5
const CARD_W_MM = CARD_WIDTH_CM * 10
const CARD_H_MM = CARD_HEIGHT_CM * 10
const A4_W_MM = 210
const A4_H_MM = 297
const PLANCHA_PRINT_SCALE = Math.min(A4_W_MM / CARD_W_MM, A4_H_MM / CARD_H_MM)
/** Tamaño real en papel tras escalar (el scale() no achica el “hueco” en el layout si no recortamos). */
const PLANCHA_SCALED_W_MM = CARD_W_MM * PLANCHA_PRINT_SCALE
const PLANCHA_SCALED_H_MM = CARD_H_MM * PLANCHA_PRINT_SCALE

/** Tamaño en CSS antes del scale(), para que en papel quede ~`targetPt` pt (el scale achica texto e imagen). */
function planchaFontPt(targetPrintPt: number): string {
  const s = targetPrintPt / PLANCHA_PRINT_SCALE
  return `${Math.round(s * 10) / 10}pt`
}

const PLANCHA_FIELD: CSSProperties = {
  position: 'absolute',
  fontFamily: 'Arial, Helvetica, sans-serif',
  color: '#000',
}

function PhysicalPlanchaOverlay({
  data,
  templateUrl,
  noBg,
}: {
  data: any
  templateUrl: string
  noBg: boolean
}) {
  const dateParts = parseDatePartsForPrint(data?.tournament_date || data?.created_at)
  return (
    <div
      style={{
        width: `${CARD_WIDTH_CM}cm`,
        height: `${CARD_HEIGHT_CM}cm`,
        position: 'relative',
        boxSizing: 'border-box',
        backgroundColor: noBg ? '#fff' : 'transparent',
        backgroundImage: templateUrl ? `url(${JSON.stringify(templateUrl)})` : 'none',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
        backgroundSize: '100% 100%',
        border: noBg ? '1px dashed #ccc' : 'none',
      }}
    >
      <div
        style={{
          ...PLANCHA_FIELD,
          left: '2cm',
          top: '1cm',
          fontWeight: 600,
          fontSize: planchaFontPt(12),
          maxWidth: '32cm',
          lineHeight: 1.2,
          wordBreak: 'break-word',
        }}
      >
        {buildPlayerPrintLine(data)}
      </div>
      <div style={{ ...PLANCHA_FIELD, left: '2.5cm', top: '1.7cm', fontSize: planchaFontPt(11) }}>
        {data?.member_number != null && data.member_number !== '' ? String(data.member_number) : '—'}
      </div>
      <div style={{ ...PLANCHA_FIELD, left: '9.7cm', top: '1.7cm', fontWeight: 600, fontSize: planchaFontPt(11) }}>
        {playingHcpForPrint(data)}
      </div>
      <div
        style={{
          ...PLANCHA_FIELD,
          left: '14.5cm',
          top: '1.7cm',
          fontSize: planchaFontPt(10),
          maxWidth: '20cm',
          lineHeight: 1.15,
          wordBreak: 'break-word',
        }}
      >
        {data?.tournament_name || '—'}
      </div>
      <div style={{ ...PLANCHA_FIELD, left: '22cm', top: '1.7cm', fontSize: planchaFontPt(11), whiteSpace: 'nowrap' }}>
        {dateParts.day}
      </div>
      <div style={{ ...PLANCHA_FIELD, left: '23cm', top: '1.7cm', fontSize: planchaFontPt(11), whiteSpace: 'nowrap' }}>
        {dateParts.month}
      </div>
      <div style={{ ...PLANCHA_FIELD, left: '24cm', top: '1.7cm', fontSize: planchaFontPt(11), whiteSpace: 'nowrap' }}>
        {dateParts.year}
      </div>
    </div>
  )
}

/**

 * Impresión solo de datos sobre plancha física preimpresa.

 * - Colocar escaneado en physical-scorecard-template.png (35×18,5 cm, misma proporción que la franja de cabecera).

 * - Tarjetas: ?ids=1,2,3 | Inscriptos: …/print-overlay/participant/:id o ?participantIds=

 * - Sin imagen: ?nobg=1 | Otra plantilla: ?template=/ruta.png

 * - La franja se dibuja arriba del A4 (centrada solo en horizontal), para alinear con tarjeta chica arriba en la bandeja.

 * - Margen opcional desde el borde superior: ?topmm=2 (milímetros).

 */

export default function ScorecardOverlayPrint() {

  const { clubId, tournamentId, participationId: participationIdParam } = useParams<{
    clubId: string
    tournamentId: string
    participationId?: string
  }>()

  const navigate = useNavigate()

  const [searchParams] = useSearchParams()



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

  const fromParticipants =
    searchParams.get('from') === 'participants' ||
    (!Number.isNaN(pathParticipantId) && pathParticipantId > 0)
  const overlayBackPath =
    clubId && fromParticipants
      ? `/club/${clubId}/admin`
      : clubId && tournamentId
        ? `/club/${clubId}/tournaments/${tournamentId}/scorecards`
        : clubId
          ? `/club/${clubId}/admin`
          : '/'
  const overlayBackLabel = fromParticipants ? 'Volver al club' : 'Volver al historial'

  const noBg = searchParams.get('nobg') === '1'

  const topMarginMm = useMemo(() => {
    const raw = searchParams.get('topmm')
    if (raw == null || raw === '') return 2
    const n = Number(String(raw).replace(',', '.'))
    if (!Number.isFinite(n) || n < 0 || n > 25) return 2
    return n
  }, [searchParams])

  const templateParam = searchParams.get('template')

  const templateUrl = useMemo(() => {

    if (noBg) return ''

    if (templateParam) {

      if (templateParam.startsWith('http://') || templateParam.startsWith('https://')) return templateParam

      return templateParam.startsWith('/') ? templateParam : `${vitePublicBaseUrl()}${templateParam.replace(/^\//, '')}`

    }

    return `${vitePublicBaseUrl()}physical-scorecard-template.png`

  }, [noBg, templateParam])

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

            const data = await scorecardService.getScorecardForPrint(clubIdNum, tournamentIdNum, scorecardId)

            return { rowKey, source: 'scorecard', id: scorecardId, data }

          } catch (e: any) {

            return { rowKey, source: 'scorecard', id: scorecardId, error: e?.message || 'Error al cargar' }

          }

        })

      )

      setSheets(results)

    }

    setLoading(false)

  }, [

    clubIdNum,

    tournamentIdNum,

    activeIds.length,

    useParticipants,

    participantIds,

    scorecardIds,

  ])



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

      <div className="min-h-screen bg-gray-50 flex items-center justify-center">

        <div className="text-center">

          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />

          <p className="mt-4 text-gray-600">Preparando planchas…</p>

        </div>

      </div>

    )

  }



  if (!activeIds.length) {

    return (

      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-6">

        <p className="text-gray-800 text-center max-w-md">

          Falta un ID válido en la URL:{' '}
          <code className="bg-gray-200 px-1 rounded">…/print-overlay/participant/N</code> (inscripto),{' '}
          <code className="bg-gray-200 px-1 rounded">?participantIds=N</code> o{' '}
          <code className="bg-gray-200 px-1 rounded">?ids=N</code> (tarjeta). Si ves un mensaje distinto, forzá recarga (Ctrl+F5): el navegador puede tener un JS viejo.

        </p>

        <button

          type="button"

          onClick={() => navigate(overlayBackPath)}

          className="inline-flex items-center gap-2 px-4 py-2 border rounded-md text-gray-700 bg-white hover:bg-gray-50"

        >

          <ArrowLeft className="h-4 w-4" /> {overlayBackLabel}

        </button>

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

            /* Evitar márgenes y crecimiento raro del documento al imprimir. */
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

            #overlay-print-root, #overlay-print-root * { visibility: visible; }

            /* fixed = anclado al borde superior de cada hoja en la mayoría de navegadores */
            #overlay-print-root {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: transparent !important;
            }

            .overlay-print-page {
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              box-sizing: border-box !important;
            }

            .plancha-print-body {
              display: block !important;
            }

            .no-print-overlay { display: none !important; }

            @page { size: A4 portrait; margin: 0; }

          }

        `,

        }}

      />



      <div className="min-h-screen bg-gray-100 no-print-overlay">

        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">

          <button

            type="button"

            onClick={() => navigate(overlayBackPath)}

            className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md bg-white text-gray-700 hover:bg-gray-50"

          >

            <ArrowLeft className="h-4 w-4" /> {fromParticipants ? 'Volver al club' : 'Volver'}

          </button>

          <div className="text-sm text-gray-600">

            {okCount} plancha{okCount !== 1 ? 's' : ''}

          </div>

          <button

            type="button"

            onClick={handlePrint}

            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800"

          >

            <Printer className="h-4 w-4" /> Imprimir

          </button>

        </div>

        {!noBg && (

          <p className="max-w-3xl mx-auto px-4 text-xs text-amber-900 mb-4">

            Sin imagen: subí <strong>physical-scorecard-template.png</strong> a la carpeta <strong>public</strong> del sitio,

            o usá <strong>?template=/ruta.png</strong>. En el cuadro de impresión: <strong>márgenes ninguno</strong>, escala <strong>100 %</strong> (no “ajustar a la página”). Borde superior: <strong>?topmm=2</strong>.

          </p>

        )}

      </div>



      <div id="overlay-print-root" className="bg-gray-200 print:bg-transparent pb-8 print:pb-0">

        {sheets.map((sheet, idx) => (

          <div

            key={sheet.rowKey}

            className="overlay-print-page mx-auto mb-8 print:mb-0 print:mx-0 bg-white print:bg-transparent"

            style={{
              width: '210mm',
              height: '297mm',
              minHeight: '297mm',
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
                  width: '210mm',
                  height: '297mm',
                  boxSizing: 'border-box',
                  paddingTop: `${topMarginMm}mm`,
                  margin: 0,
                }}
              >
                <div
                  style={{
                    width: `${PLANCHA_SCALED_W_MM}mm`,
                    height: `${PLANCHA_SCALED_H_MM}mm`,
                    overflow: 'hidden',
                    margin: 0,
                  }}
                >
                  <div
                    style={{
                      width: `${CARD_WIDTH_CM}cm`,
                      height: `${CARD_HEIGHT_CM}cm`,
                      transform: `scale(${PLANCHA_PRINT_SCALE})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    <PhysicalPlanchaOverlay data={sheet.data} templateUrl={templateUrl} noBg={noBg} />
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

