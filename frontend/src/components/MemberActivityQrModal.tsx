import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { QrCode, Copy, Check, Download, X, AlertCircle, Printer } from 'lucide-react'

/** Título del cartel: impresión, descarga PNG y previsualización */
const QR_CARTEL_HEADLINE = 'Consultar resultados de torneos y Ranking'

/** Texto de apoyo: qué hacer al escanear */
const QR_CARTEL_SUBLINE =
  'Escaneá el código con el celular · ingreso con matrícula de socio'

function wrapCanvasLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

/**
 * PNG cartel + QR. Usa fetch + createImageBitmap cuando hay soporte (más fiable que new Image()
 * con data URL en Safari / algunos móviles).
 */
async function buildCompositeCartelPng(qrDataUrl: string): Promise<string | null> {
  try {
    const res = await fetch(qrDataUrl)
    const blob = await res.blob()

    let qrDrawable: CanvasImageSource
    let release: (() => void) | undefined

    if (typeof createImageBitmap !== 'undefined') {
      const bitmap = await createImageBitmap(blob)
      qrDrawable = bitmap
      release = () => bitmap.close()
    } else {
      qrDrawable = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(blob)
        img.onload = () => {
          URL.revokeObjectURL(url)
          resolve(img)
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('qr-img'))
        }
        img.src = url
      })
    }

    const W = 440
    const padX = 28
    const padY = 28
    const qrSize = 280
    const boxInnerPadX = 16
    const boxInnerPadY = 14
    const lineGap = 4
    const titleSize = 19
    const subSize = 14

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      release?.()
      return null
    }

    ctx.font = `bold ${titleSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
    const boxW = W - padX * 2
    const innerW = boxW - boxInnerPadX * 2 - 4
    const headlineLines = wrapCanvasLines(ctx, QR_CARTEL_HEADLINE, innerW)

    ctx.font = `${subSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
    const subLines = wrapCanvasLines(ctx, QR_CARTEL_SUBLINE, W - padX * 2)
    const subLineHeight = Math.round(subSize * 1.35)

    const titleLineHeight = Math.round(titleSize * 1.35)
    const boxH =
      boxInnerPadY * 2 +
      headlineLines.length * titleLineHeight +
      (headlineLines.length - 1) * lineGap

    const gapAfterBox = 16
    const gapBeforeQr = 18
    const subBlockH =
      subLines.length * subLineHeight + Math.max(0, subLines.length - 1) * 4

    const H =
      padY +
      boxH +
      gapAfterBox +
      subBlockH +
      gapBeforeQr +
      qrSize +
      padY

    canvas.width = W
    canvas.height = H

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    let y = padY
    const boxX = padX

    ctx.strokeStyle = '#111111'
    ctx.lineWidth = 2
    ctx.strokeRect(boxX, y, boxW, boxH)

    ctx.fillStyle = '#f9fafb'
    ctx.fillRect(boxX + 1, y + 1, boxW - 2, boxH - 2)

    ctx.fillStyle = '#111111'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = `bold ${titleSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
    let ty = y + boxInnerPadY
    const cx = W / 2
    for (const line of headlineLines) {
      ctx.fillText(line, cx, ty)
      ty += titleLineHeight + lineGap
    }

    y += boxH + gapAfterBox
    ctx.font = `${subSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
    ctx.fillStyle = '#444444'
    let sy = y
    for (const line of subLines) {
      ctx.fillText(line, cx, sy)
      sy += subLineHeight + 4
    }

    const qrX = (W - qrSize) / 2
    const qrY = H - padY - qrSize
    ctx.drawImage(qrDrawable, qrX, qrY, qrSize, qrSize)
    release?.()

    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

type Props = {
  isOpen: boolean
  onClose: () => void
  clubId: string | undefined
}

export function MemberActivityQrModal({ isOpen, onClose, clubId }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)
  /** Cartel+QR listo: impresión y descarga síncronas al click (evita Safari que pierde el gesto tras await). */
  const [compositePngUrl, setCompositePngUrl] = useState<string | null>(null)
  const [compositeLoading, setCompositeLoading] = useState(false)
  const [compositeFailed, setCompositeFailed] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const activityUrl =
    clubId && baseUrl ? `${baseUrl}/club/${clubId}/mi-actividad` : ''
  const isLocalhost =
    baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')

  useEffect(() => {
    if (!isOpen || !activityUrl) {
      setQrDataUrl('')
      setError(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(false)
    QRCode.toDataURL(activityUrl, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, activityUrl])

  useEffect(() => {
    if (!qrDataUrl) {
      setCompositePngUrl(null)
      setCompositeLoading(false)
      setCompositeFailed(false)
      return
    }
    let cancelled = false
    setCompositeLoading(true)
    setCompositePngUrl(null)
    setCompositeFailed(false)
    void buildCompositeCartelPng(qrDataUrl).then((url) => {
      if (!cancelled) {
        setCompositePngUrl(url)
        setCompositeLoading(false)
        if (!url) setCompositeFailed(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [qrDataUrl])

  const handleCopy = () => {
    if (!activityUrl) return
    void navigator.clipboard.writeText(activityUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /** Sin await: el PNG ya está generado en compositePngUrl (requerido p. ej. Safari). */
  const handleDownload = () => {
    if (!compositePngUrl || !clubId) return
    const a = document.createElement('a')
    a.href = compositePngUrl
    a.download = `qr-resultados-ranking-club-${clubId}.png`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  /** Iframe oculto: suele funcionar mejor que window.open + print (popups, móviles). */
  const handlePrint = () => {
    if (!compositePngUrl) {
      window.alert(
        compositeLoading
          ? 'Se está armando la imagen para imprimir. Esperá un momento y probá de nuevo.'
          : 'No se pudo armar la imagen. Cerrá el cuadro, abrilo de nuevo o probá descargar el PNG.'
      )
      return
    }
    const imgSrc = compositePngUrl.replace(/"/g, '&quot;')
    const titleEsc = QR_CARTEL_HEADLINE.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const altEsc = QR_CARTEL_HEADLINE.replace(/"/g, '&quot;')

    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      border: '0',
      opacity: '0',
      pointerEvents: 'none',
    })
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    const win = iframe.contentWindow
    if (!doc || !win) {
      iframe.remove()
      window.alert('Tu navegador no permitió preparar la impresión.')
      return
    }

    doc.open()
    doc.write(
      `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>${titleEsc}</title>` +
        `<style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 16px; text-align: center; background: #fff; }
          img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
        </style></head><body>` +
        `<img src="${imgSrc}" alt="${altEsc}" />` +
        `</body></html>`
    )
    doc.close()

    const runPrint = () => {
      try {
        win.focus()
        win.print()
      } catch {
        /* ignore */
      } finally {
        window.setTimeout(() => iframe.remove(), 800)
      }
    }

    const img = doc.querySelector('img')
    if (img && !img.complete) {
      img.onload = () => window.setTimeout(runPrint, 100)
      img.onerror = runPrint
    } else {
      window.setTimeout(runPrint, 150)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-activity-qr-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 rounded-lg bg-gray-900 p-2">
              <QrCode className="h-5 w-5 text-white" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 id="member-activity-qr-title" className="text-base font-semibold text-gray-900">
                QR resultados y ranking
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Para pegar en el club: el socio escanea y consulta resultados de torneos y ranking con su
                matrícula.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div
            className="rounded-lg border-2 border-gray-900 bg-gray-50 px-3 py-3 text-center text-sm font-bold text-gray-900 leading-snug"
            aria-hidden
          >
            {QR_CARTEL_HEADLINE}
          </div>

          <p className="text-center text-xs text-gray-600 leading-snug">{QR_CARTEL_SUBLINE}</p>

          <div className="flex justify-center rounded-lg border border-gray-200 bg-gray-50 py-4">
            {error ? (
              <div className="flex h-[200px] w-[200px] flex-col items-center justify-center text-center text-sm text-gray-500 px-3">
                No se pudo generar el código. Probá de nuevo o usá el enlace de abajo.
              </div>
            ) : loading ? (
              <div className="flex h-[200px] w-[200px] items-center justify-center text-gray-500 text-sm">
                Generando…
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Código QR: resultados de torneos y ranking del club"
                className="h-[200px] w-[200px]"
              />
            ) : null}
          </div>

          {compositeFailed && qrDataUrl && !compositeLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
              No se pudo armar la imagen con cartel. Probá con otro navegador o actualizá la página.
            </div>
          )}

          {isLocalhost && (
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <p>
                Estás en <code className="rounded bg-amber-100 px-1">localhost</code>. Para probar el QR
                en el teléfono, abrí esta página con la IP de tu PC (ej.{' '}
                <code className="rounded bg-amber-100 px-1">http://192.168.x.x:5173</code>) y volvé a
                abrir este QR.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Enlace</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={activityUrl}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-800"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Listo' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!qrDataUrl || !compositePngUrl}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="h-4 w-4" />
              {compositeLoading ? 'Preparando…' : 'Imprimir (cartel + QR)'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!qrDataUrl || !compositePngUrl}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              {compositeLoading ? 'Preparando…' : 'Descargar PNG (cartel + QR)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
