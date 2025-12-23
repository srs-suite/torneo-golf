import { useState, useEffect, useRef } from 'react'
import { Clock, ChevronUp, ChevronDown } from 'lucide-react'

interface TimeInputProps {
  value: string // Formato HH:mm
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  error?: string
}

export function TimeInput({ 
  value, 
  onChange, 
  placeholder = "HH:mm", 
  className = "",
  required = false,
  error
}: TimeInputProps) {
  const [displayValue, setDisplayValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [hours, setHours] = useState(12)
  const [minutes, setMinutes] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDisplayValue(value)
    if (value) {
      const [h, m] = value.split(':')
      setHours(parseInt(h, 10))
      setMinutes(parseInt(m, 10))
    }
  }, [value])

  // Cerrar selector al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowTimePicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value.replace(/\D/g, '') // Solo números
    
    // Formatear automáticamente mientras escribe
    if (inputValue.length >= 2) {
      inputValue = inputValue.substring(0, 2) + ':' + inputValue.substring(2, 4)
    }
    if (inputValue.length > 5) {
      inputValue = inputValue.substring(0, 5)
    }

    setDisplayValue(inputValue)

    // Validar y convertir si está completa
    if (inputValue.length === 5) {
      const [hours, minutes] = inputValue.split(':')
      const hoursNum = parseInt(hours, 10)
      const minutesNum = parseInt(minutes, 10)

      // Validación básica
      if (
        hoursNum >= 0 && hoursNum <= 23 &&
        minutesNum >= 0 && minutesNum <= 59
      ) {
        onChange(inputValue)
        setHours(hoursNum)
        setMinutes(minutesNum)
      }
    } else if (inputValue.length < 5) {
      onChange('')
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
    
    // Validar hora completa al perder el foco
    if (displayValue.length === 5) {
      const [hours, minutes] = displayValue.split(':')
      const hoursNum = parseInt(hours, 10)
      const minutesNum = parseInt(minutes, 10)

      // Validación estricta
      if (
        isNaN(hoursNum) || isNaN(minutesNum) ||
        hoursNum < 0 || hoursNum > 23 ||
        minutesNum < 0 || minutesNum > 59
      ) {
        setDisplayValue('')
        onChange('')
      }
    }
  }

  const handleClockClick = () => {
    setShowTimePicker(!showTimePicker)
  }

  const updateTime = (newHours: number, newMinutes: number) => {
    const formattedTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`
    onChange(formattedTime)
    setHours(newHours)
    setMinutes(newMinutes)
  }

  const adjustHours = (direction: number) => {
    const newHours = Math.max(0, Math.min(23, hours + direction))
    updateTime(newHours, minutes)
  }

  const adjustMinutes = (direction: number) => {
    const newMinutes = Math.max(0, Math.min(59, minutes + direction))
    updateTime(hours, newMinutes)
  }

  const setQuickTime = (h: number, m: number) => {
    updateTime(h, m)
    setShowTimePicker(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir teclas de navegación
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'Home' ||
      e.key === 'End'
    ) {
      return
    }

    // Solo permitir números
    if (!/\d/.test(e.key)) {
      e.preventDefault()
    }
  }

  const renderTimePicker = () => {
    const commonTimes = [
      { label: 'Mañana', times: [
        { h: 8, m: 0, label: '08:00' },
        { h: 9, m: 0, label: '09:00' },
        { h: 10, m: 0, label: '10:00' },
        { h: 11, m: 0, label: '11:00' }
      ]},
      { label: 'Mediodía', times: [
        { h: 12, m: 0, label: '12:00' },
        { h: 13, m: 0, label: '13:00' },
        { h: 14, m: 0, label: '14:00' },
        { h: 15, m: 0, label: '15:00' }
      ]},
      { label: 'Tarde', times: [
        { h: 16, m: 0, label: '16:00' },
        { h: 17, m: 0, label: '17:00' },
        { h: 18, m: 0, label: '18:00' },
        { h: 19, m: 0, label: '19:00' }
      ]}
    ]

    return (
      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 w-80">
        {/* Selector manual */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Ajustar Hora</h4>
          <div className="flex items-center justify-center space-x-4">
            {/* Horas */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => adjustHours(1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="text-2xl font-mono font-bold text-gray-700 w-12 text-center">
                {hours.toString().padStart(2, '0')}
              </div>
              <button
                type="button"
                onClick={() => adjustHours(-1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 mt-1">Horas</span>
            </div>

            <div className="text-2xl font-bold text-gray-400">:</div>

            {/* Minutos */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => adjustMinutes(15)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="text-2xl font-mono font-bold text-gray-700 w-12 text-center">
                {minutes.toString().padStart(2, '0')}
              </div>
              <button
                type="button"
                onClick={() => adjustMinutes(-15)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 mt-1">Minutos</span>
            </div>
          </div>
        </div>

        {/* Horarios comunes */}
        <div className="space-y-3">
          {commonTimes.map((period) => (
            <div key={period.label}>
              <h5 className="text-xs font-medium text-gray-500 mb-2">{period.label}</h5>
              <div className="grid grid-cols-4 gap-2">
                {period.times.map((time) => (
                  <button
                    key={time.label}
                    type="button"
                    onClick={() => setQuickTime(time.h, time.m)}
                    className={`
                      py-2 px-3 text-sm rounded-lg border transition-colors
                      ${hours === time.h && minutes === time.m
                        ? 'bg-gray-600 text-white border-gray-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    {time.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Botón de limpiar */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              onChange('')
              setDisplayValue('')
              setShowTimePicker(false)
            }}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
          >
            Limpiar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={`pl-10 pr-12 py-2 w-full border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${className}`}
          maxLength={5}
        />
        <button
          type="button"
          onClick={handleClockClick}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
          title="Abrir selector de hora"
        >
          <Clock className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {!isFocused && !showTimePicker && (
        <div className="absolute right-14 top-1/2 transform -translate-y-1/2">
          <span className="text-xs text-gray-500">Formato 24hs</span>
        </div>
      )}

      {showTimePicker && renderTimePicker()}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}