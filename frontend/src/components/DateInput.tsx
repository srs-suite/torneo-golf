import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DateInputProps {
  value: string // Formato yyyy-mm-dd para compatibilidad con formularios
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  min?: string
  required?: boolean
  error?: string
  // Opcional: habilitar selección de rango en el mismo calendario
  rangeEnabled?: boolean
  onRangeSelect?: (from: string, to: string) => void
  // Para mostrar rango seleccionado en el mismo campo
  rangeFrom?: string
  rangeTo?: string
}

export function DateInput({ 
  value, 
  onChange, 
  placeholder = "dd/mm/yyyy", 
  className = "",
  min,
  required = false,
  error,
  rangeEnabled = false,
  onRangeSelect,
  rangeFrom,
  rangeTo
}: DateInputProps) {
  const [displayValue, setDisplayValue] = useState('')
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  // Rango
  const [rangeMode, setRangeMode] = useState(false)
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)

  // Helper to parse yyyy-mm-dd in local time
  const parseLocal = (s?: string) => {
    if (!s) return null
    const [y, m, d] = s.split('-').map(n => parseInt(n, 10))
    return new Date(y, (m || 1) - 1, d || 1)
  }

  // Convertir yyyy-mm-dd a dd/mm/yyyy para mostrar
  useEffect(() => {
    // Si hay rango (desde props), mostrar "dd/mm/yyyy — dd/mm/yyyy"
    if (rangeEnabled && (rangeFrom || rangeTo)) {
      const fmt = (v?: string) => {
        if (!v) return ''
        const [y, m, d] = v.split('-')
        return `${d}/${m}/${y}`
      }
      const left = fmt(rangeFrom)
      const right = fmt(rangeTo)
      setDisplayValue(right ? `${left} — ${right}` : left)
      return
    }
    if (value) {
      const [year, month, day] = value.split('-')
      setDisplayValue(`${day}/${month}/${year}`)
    } else {
      setDisplayValue('')
    }
  }, [value, rangeFrom, rangeTo, rangeEnabled])

  // Sincronizar estado interno de rango al abrir calendario o cuando cambie el rango externo
  useEffect(() => {
    if (!rangeEnabled) return
    if (showCalendar) {
      const rs = parseLocal(rangeFrom)
      const re = parseLocal(rangeTo)
      setRangeStart(rs)
      setRangeEnd(re)
      setRangeMode(!!(rs && re))
    }
  }, [showCalendar, rangeFrom, rangeTo, rangeEnabled])

  // Cerrar calendario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowCalendar(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (rangeEnabled) {
      // En modo rango, el input no se escribe manualmente
      return
    }
    let inputValue = e.target.value.replace(/\D/g, '') // Solo números
    
    // Formatear automáticamente mientras escribe
    if (inputValue.length >= 2) {
      inputValue = inputValue.substring(0, 2) + '/' + inputValue.substring(2)
    }
    if (inputValue.length >= 5) {
      inputValue = inputValue.substring(0, 5) + '/' + inputValue.substring(5, 9)
    }
    if (inputValue.length > 10) {
      inputValue = inputValue.substring(0, 10)
    }

    setDisplayValue(inputValue)

    // Validar y convertir a yyyy-mm-dd si está completa
    if (inputValue.length === 10) {
      const [day, month, year] = inputValue.split('/')
      const dayNum = parseInt(day, 10)
      const monthNum = parseInt(month, 10)
      const yearNum = parseInt(year, 10)

      // Validación básica
      if (
        dayNum >= 1 && dayNum <= 31 &&
        monthNum >= 1 && monthNum <= 12 &&
        yearNum >= 1900 && yearNum <= 2100
      ) {
        // Convertir a formato yyyy-mm-dd
        const formattedValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        onChange(formattedValue)
      }
    } else if (inputValue.length < 10) {
      // Si no está completa, limpiar el valor
      onChange('')
    }
  }

  const handleBlur = () => {
    // Validar fecha completa al perder el foco
    if (displayValue.length === 10) {
      const [day, month, year] = displayValue.split('/')
      const dayNum = parseInt(day, 10)
      const monthNum = parseInt(month, 10)
      const yearNum = parseInt(year, 10)

      // Validación más estricta
      const date = new Date(yearNum, monthNum - 1, dayNum)
      const isValidDate = 
        date.getFullYear() === yearNum &&
        date.getMonth() === monthNum - 1 &&
        date.getDate() === dayNum

      if (!isValidDate) {
        setDisplayValue('')
        onChange('')
      }
    }
  }

  const handleCalendarClick = () => {
    setShowCalendar(!showCalendar)
    
    // Si hay una fecha seleccionada, navegar a ese mes
    if (value) {
      const [year, month] = value.split('-')
      setCalendarMonth(new Date(parseInt(year), parseInt(month) - 1))
    }
  }

  const handleDateSelect = (date: Date) => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const formattedValue = `${year}-${month}-${day}`

    if (rangeEnabled && rangeMode && onRangeSelect) {
      // Selección de rango: primer clic define inicio, segundo define fin
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(date)
        setRangeEnd(null)
        // Actualizar vista parcial
        setDisplayValue(`${day}/${month}/${year}`)
      } else {
        // Si el segundo clic es anterior, invertir
        if (date < rangeStart) {
          setRangeEnd(rangeStart)
          setRangeStart(date)
          onRangeSelect(
            `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`,
            `${rangeStart.getFullYear()}-${(rangeStart.getMonth() + 1).toString().padStart(2, '0')}-${rangeStart.getDate().toString().padStart(2, '0')}`
          )
          setDisplayValue(`${date.getDate().toString().padStart(2, '0')}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getFullYear()} — ${rangeStart.getDate().toString().padStart(2,'0')}/${(rangeStart.getMonth()+1).toString().padStart(2,'0')}/${rangeStart.getFullYear()}`)
        } else {
          setRangeEnd(date)
          onRangeSelect(
            `${rangeStart.getFullYear()}-${(rangeStart.getMonth() + 1).toString().padStart(2, '0')}-${rangeStart.getDate().toString().padStart(2, '0')}`,
            `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
          )
          setDisplayValue(`${rangeStart.getDate().toString().padStart(2, '0')}/${(rangeStart.getMonth()+1).toString().padStart(2,'0')}/${rangeStart.getFullYear()} — ${day}/${month}/${year}`)
        }
        // Cerrar luego de elegir ambos
        setShowCalendar(false)
        setRangeMode(false)
      }
      return
    }

    // Modo un solo día aun con rangeEnabled: limpiar rango previo y setear solo "desde"
    if (rangeEnabled && onRangeSelect) {
      onRangeSelect(formattedValue, '')
      setDisplayValue(`${day}/${month}/${year}`)
      setShowCalendar(false)
      return
    }

    onChange(formattedValue)
    setShowCalendar(false)
  }

  const navigateMonth = (direction: number) => {
    setCalendarMonth(prev => {
      const newMonth = new Date(prev)
      newMonth.setMonth(prev.getMonth() + direction)
      return newMonth
    })
  }

  const renderCalendar = () => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    
    // Primer día del mes
    const firstDay = new Date(year, month, 1)
    
    // Primer día del calendario (puede ser del mes anterior)
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() - firstDay.getDay())
    
    const days = []
    const today = new Date()
    const parseLocalCal = (s?: string) => {
      if (!s) return null
      const [y, m, d] = s.split('-').map(n => parseInt(n, 10))
      return new Date(y, (m || 1) - 1, d || 1)
    }
    const selectedDate = parseLocalCal(value)
    
    // Generar 42 días (6 semanas)
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      
      const isCurrentMonth = currentDate.getMonth() === month
      const isToday = currentDate.toDateString() === today.toDateString()
      const hasSomeRange = rangeEnabled && (rangeStart || rangeEnd)
      const isSelected = !hasSomeRange && selectedDate && currentDate.toDateString() === selectedDate.toDateString()
      const minDate = parseLocalCal(min || undefined)
      const isPastDate = minDate ? currentDate < minDate : false

      // Rango visual
      const inRange = rangeStart && rangeEnd && currentDate >= rangeStart && currentDate <= rangeEnd
      const isRangeStart = rangeStart && currentDate.toDateString() === rangeStart.toDateString()
      const isRangeEnd = rangeEnd && currentDate.toDateString() === rangeEnd.toDateString()
      
      days.push(
        <button
          key={i}
          type="button"
          onClick={() => !isPastDate && handleDateSelect(currentDate)}
          disabled={!!isPastDate}
          className={`
            w-8 h-8 text-sm rounded-lg hover:bg-gray-100 transition-colors
            ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
            ${isToday ? 'bg-blue-100 text-blue-600 font-semibold' : ''}
            ${isSelected ? 'bg-gray-600 text-white hover:bg-gray-700' : ''}
            ${inRange ? 'bg-green-100' : ''}
            ${isRangeStart || isRangeEnd ? 'ring-2 ring-green-400' : ''}
            ${isPastDate ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {currentDate.getDate()}
        </button>
      )
    }

    return (
      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 w-80">
        {/* Header del calendario */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigateMonth(-1)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <h3 className="font-semibold text-gray-700">
            {calendarMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </h3>
          
          <button
            type="button"
            onClick={() => navigateMonth(1)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {rangeEnabled && (
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={rangeMode}
                onChange={(e) => {
                  setRangeMode(e.target.checked)
                  setRangeStart(null)
                  setRangeEnd(null)
                }}
              />
              Seleccionar rango
            </label>
            {(rangeStart || rangeEnd) && (
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-gray-700 underline"
                onClick={() => { setRangeStart(null); setRangeEnd(null) }}
              >
                Limpiar
              </button>
            )}
          </div>
        )}

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-xs font-medium text-gray-500 text-center py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Días del calendario */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>

        {/* Botón de hoy */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={() => handleDateSelect(new Date())}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
          >
            Hoy: {today.toLocaleDateString('es-AR')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => {}}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          className={`pl-10 pr-12 py-2 w-full border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${className}`}
          maxLength={10}
        />
        <button
          type="button"
          onClick={handleCalendarClick}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
          title="Abrir calendario"
        >
          <Calendar className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Timezone hint removed per request */}

      {showCalendar && renderCalendar()}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}