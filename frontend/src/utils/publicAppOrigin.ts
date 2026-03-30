/**
 * Origen público del front (https://host). En build de producción usar VITE_PUBLIC_APP_URL
 * para que el QR y el link de cobros móvil no dependan del host desde el que abriste el admin.
 */
export function getPublicAppOrigin(): string {
  const raw = String(import.meta.env.VITE_PUBLIC_APP_URL ?? '')
    .trim()
    .replace(/\/$/, '')
  if (raw && /^https?:\/\//i.test(raw)) return raw
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}
