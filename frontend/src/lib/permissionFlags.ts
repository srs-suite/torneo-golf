/** Convierte flags de permiso (boolean, 0/1, '0'/'1' desde MySQL) a boolean estricto */
export function permFlag(value: unknown): boolean {
  if (value === true || value === 1 || value === '1') return true
  return false
}
