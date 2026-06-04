/** Origen de uploads en producción (nginx sirve imágenes por HTTP, no por HTTPS). */
const DEFAULT_PROD_UPLOADS_ORIGIN = 'http://torneogolf.retailsolutionstimetracker.com'

function devUploadsFallbackOrigin(): string {
  const fromEnv = (import.meta.env.VITE_UPLOADS_FALLBACK_ORIGIN as string | undefined)?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (import.meta.env.DEV) return DEFAULT_PROD_UPLOADS_ORIGIN
  return ''
}

/**
 * URL del flyer para mostrar en inscripción pública y admin.
 * - Mismo origen que la página → ruta relativa /uploads/...
 * - Dev con ruta relativa o URL remota → URL absoluta de prod (archivos no están en disco local).
 * - No forzar HTTPS: en prod los /uploads/ solo responden bien por HTTP.
 */
export function resolveFlyerDisplayUrl(rawFlyer: string | null | undefined): string {
  const raw = (rawFlyer ?? '').trim()
  if (!raw) return ''

  try {
    if (raw.startsWith('/uploads/')) {
      const fallback = devUploadsFallbackOrigin()
      if (fallback) return `${fallback}${raw}`
      return raw
    }

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const u = new URL(raw)
      if (!u.pathname.startsWith('/uploads/')) return raw

      if (u.origin === window.location.origin) {
        return u.pathname
      }

      // /uploads/ en prod: preferir HTTP (HTTPS devuelve el index.html del frontend)
      if (u.protocol === 'https:') {
        return `http://${u.host}${u.pathname}${u.search}`
      }

      return raw
    }

    return raw
  } catch {
    return raw
  }
}
