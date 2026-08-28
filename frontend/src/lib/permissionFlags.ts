/** Convierte flags (boolean, 0/1, '0'/'1', Buffer MySQL / JSON) a boolean estricto */
export function permFlag(value: unknown): boolean {
  if (value === true || value === 1 || value === '1') return true
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value) && value.length > 0) {
    return value[0] === 1
  }
  // Buffer serializado en JSON: { type: 'Buffer', data: [1] }
  if (
    value &&
    typeof value === 'object' &&
    (value as { type?: string }).type === 'Buffer' &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    const data = (value as { data: number[] }).data
    return data.length > 0 && Number(data[0]) === 1
  }
  if (typeof value === 'string' && value.toLowerCase() === 'true') return true
  return false
}
