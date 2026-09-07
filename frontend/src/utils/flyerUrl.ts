/** En desarrollo local, los archivos están en prod (no en disco local). */
const DEFAULT_PROD_UPLOADS_ORIGIN = 'https://torneogolf.retailsolutionstimetracker.com'

function devUploadsFallbackOrigin(): string {
  const fromEnv = (import.meta.env.VITE_UPLOADS_FALLBACK_ORIGIN as string | undefined)?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (import.meta.env.DEV) return DEFAULT_PROD_UPLOADS_ORIGIN
  return ''
}

/**
 * URL del flyer para mostrar en inscripción pública y admin.
 * - Producción: ruta relativa /uploads/... (mismo origen HTTPS; Nginx proxya al backend).
 * - Dev: URL absoluta de prod para ver imágenes reales.
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

      // Mismo host que la página → ruta relativa (evita mixed content)
      if (typeof window !== 'undefined' && u.host === window.location.host) {
        return u.pathname + u.search
      }

      const fallback = devUploadsFallbackOrigin()
      if (fallback && import.meta.env.DEV) {
        return `${fallback}${u.pathname}${u.search}`
      }

      // Preferir HTTPS en prod
      if (u.protocol === 'http:') {
        return `https://${u.host}${u.pathname}${u.search}`
      }

      return raw
    }

    return raw
  } catch {
    return raw
  }
}
