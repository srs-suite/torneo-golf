// Utilidades para formateo de fechas y horas en formato argentino
// dd/mm/yyyy y formato 24hs con zona horaria de Argentina

// Zona horaria de Argentina
const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires'

/**
 * Convierte una fecha a formato argentino dd/mm/yyyy
 */
export const formatDateArgentina = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    timeZone: ARGENTINA_TIMEZONE
  }).format(dateObj)
}

/**
 * Convierte una hora a formato 24hs argentino HH:mm
 */
export const formatTimeArgentina = (time: Date | string): string => {
  const timeObj = typeof time === 'string' ? new Date(`1970-01-01T${time}`) : time
  
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ARGENTINA_TIMEZONE
  }).format(timeObj)
}

/**
 * Convierte una fecha y hora completa a formato argentino
 */
export const formatDateTimeArgentina = (dateTime: Date | string): string => {
  const dateTimeObj = typeof dateTime === 'string' ? new Date(dateTime) : dateTime
  
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ARGENTINA_TIMEZONE
  }).format(dateTimeObj)
}

/**
 * Convierte fecha en formato dd/mm/yyyy a yyyy-mm-dd para inputs HTML
 */
export const convertArgentinaDateToHTML = (argentineDate: string): string => {
  if (!argentineDate) return ''
  
  const [day, month, year] = argentineDate.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/**
 * Convierte fecha en formato yyyy-mm-dd a dd/mm/yyyy
 */
export const convertHTMLDateToArgentina = (htmlDate: string): string => {
  if (!htmlDate) return ''
  
  const [year, month, day] = htmlDate.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Obtiene la fecha actual en Argentina en formato yyyy-mm-dd para inputs
 */
export const getCurrentDateHTML = (): string => {
  const now = new Date()
  const argentinaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIMEZONE
  }).format(now)
  
  return argentinaDate // ya está en formato yyyy-mm-dd
}

/**
 * Obtiene la fecha actual en Argentina en formato dd/mm/yyyy
 */
export const getCurrentDateArgentina = (): string => {
  return formatDateArgentina(new Date())
}

/**
 * Valida si una fecha está en formato dd/mm/yyyy
 */
export const isValidArgentinaDate = (date: string): boolean => {
  const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  if (!regex.test(date)) return false
  
  const [, day, month, year] = date.match(regex)!
  const dayNum = parseInt(day, 10)
  const monthNum = parseInt(month, 10)
  const yearNum = parseInt(year, 10)
  
  if (monthNum < 1 || monthNum > 12) return false
  if (dayNum < 1 || dayNum > 31) return false
  if (yearNum < 1900 || yearNum > 2100) return false
  
  // Validar días por mes
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate()
  return dayNum <= daysInMonth
}

/**
 * Formatea moneda en pesos argentinos
 */
export const formatCurrencyArgentina = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

