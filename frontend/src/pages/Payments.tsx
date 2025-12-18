import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Calendar, DollarSign, Users, Trophy, Settings, Award, Camera, ChevronDown, LogOut, Filter, X, User, Pencil, Download, MessageCircle } from 'lucide-react'
import { paymentsService } from '@/services/paymentsService'
import { DateInput } from '@/components/DateInput'
import { useClubs } from '@/hooks/useClubs'
import { useMembers } from '@/hooks/useMembers'
import { useTournaments } from '@/hooks/useTournaments'
import { toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'

export default function Payments() {
  const { clubId } = useParams<{ clubId: string }>() 
  const navigate = useNavigate()
  const clubIdNum = clubId ? parseInt(clubId) : 0

  // Función helper para obtener la fecha local en formato YYYY-MM-DD
  const getLocalDateString = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [tab, setTab] = useState<'balance' | 'ingresos' | 'otros_ingresos' | 'gastos' | 'conversiones'>('balance')
  const [expenses, setExpenses] = useState<any[]>([])
  const [otherIncomes, setOtherIncomes] = useState<any[]>([])
  const [currencyExchanges, setCurrencyExchanges] = useState<any[]>([])
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [showExchangeModal, setShowExchangeModal] = useState(false)
  const [expenseDraft, setExpenseDraft] = useState({ expense_date: '', amount: '', currency: 'ARS', receipt_number: '', detail: '' })
  const [incomeDraft, setIncomeDraft] = useState({ member_id: '', income_date: '', amount: '', currency: 'ARS', payment_type: 'efectivo', description: '' })
  const [exchangeDraft, setExchangeDraft] = useState({ 
    exchange_date: '', 
    from_currency: 'ARS', 
    from_amount: '', 
    to_currency: 'USD', 
    to_amount: '', 
    exchange_rate: '',
    notes: '' 
  })
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null)
  const [editingIncomeId, setEditingIncomeId] = useState<number | null>(null)
  const [editingExchangeId, setEditingExchangeId] = useState<number | null>(null)
  const [currencyBalance, setCurrencyBalance] = useState<{ ARS: number; USD: number }>({ ARS: 0, USD: 0 })
  const [selectedTournaments, setSelectedTournaments] = useState<number[]>([])
  const [showTournamentModal, setShowTournamentModal] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]) // 1-12
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [memberSearchText, setMemberSearchText] = useState('')
  const [showMemberDropdown, setShowMemberDropdown] = useState(false)
  const [showMonthSelector, setShowMonthSelector] = useState(false)
  const [showDescriptionDropdown, setShowDescriptionDropdown] = useState(false)
  const [showIncomeFilters, setShowIncomeFilters] = useState(false)
  const [incomeFilters, setIncomeFilters] = useState({
    member: '',
    memberId: '',
    description: '',
    paymentType: '',
    currency: ''
  })
  const [showFilterMemberDropdown, setShowFilterMemberDropdown] = useState(false)
  const [showFilterDescriptionDropdown, setShowFilterDescriptionDropdown] = useState(false)

  // Lista de meses
  const monthsList = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ]

  // Lista de años disponibles (últimos 5 años desde el actual)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i)
    }
    return years
  }, [])

  // Función para aplicar filtro de meses/años
  const handleApplyMonthFilter = () => {
    if (selectedMonths.length === 0 || selectedYears.length === 0) {
      // Si no hay meses o años seleccionados, limpiar filtro
      setFrom('')
      setTo('')
    } else {
      // Generar todas las combinaciones de mes-año seleccionadas
      const combinations: { year: number; month: number }[] = []
      selectedYears.forEach(year => {
        selectedMonths.forEach(month => {
          combinations.push({ year, month })
        })
      })

      // Ordenar por año y mes
      combinations.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return a.month - b.month
      })

      // Primer y último periodo
      const first = combinations[0]
      const last = combinations[combinations.length - 1]

      // Calcular primer día del primer mes
      const fromDate = new Date(first.year, first.month - 1, 1)
      const fromYear = fromDate.getFullYear()
      const fromMonth = String(fromDate.getMonth() + 1).padStart(2, '0')
      const fromDay = String(fromDate.getDate()).padStart(2, '0')

      // Calcular último día del último mes
      const toDate = new Date(last.year, last.month, 0)
      const toYear = toDate.getFullYear()
      const toMonth = String(toDate.getMonth() + 1).padStart(2, '0')
      const toDay = String(toDate.getDate()).padStart(2, '0')

      setFrom(`${fromYear}-${fromMonth}-${fromDay}`)
      setTo(`${toYear}-${toMonth}-${toDay}`)
    }
    setShowMonthSelector(false)
  }

  const toggleMonth = (monthValue: number) => {
    setSelectedMonths(prev =>
      prev.includes(monthValue)
        ? prev.filter(m => m !== monthValue)
        : [...prev, monthValue]
    )
  }

  const toggleYear = (year: number) => {
    setSelectedYears(prev =>
      prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year]
    )
  }

  // Validar input mientras escribes - permite escribir libremente
  const validateNumberInput = (value: string): string => {
    if (!value) return ''
    
    // Permitir solo dígitos, puntos y una coma
    let cleaned = value.replace(/[^\d.,]/g, '')
    
    // Contar separadores
    const commas = (cleaned.match(/,/g) || []).length
    const dots = (cleaned.match(/\./g) || []).length
    
    // Si hay más de una coma, mantener solo la última
    if (commas > 1) {
      const lastCommaIndex = cleaned.lastIndexOf(',')
      cleaned = cleaned.slice(0, lastCommaIndex).replace(/,/g, '') + cleaned.slice(lastCommaIndex)
    }
    
    // Limitar decimales a 2 dígitos después de la coma
    const commaIndex = cleaned.indexOf(',')
    if (commaIndex > -1 && cleaned.length > commaIndex + 3) {
      cleaned = cleaned.slice(0, commaIndex + 3)
    }
    
    return cleaned
  }

  // Función para parsear el valor a número
  const parseFormattedNumber = (value: string): number => {
    if (!value) return 0
    
    // Buscar el último separador (coma o punto) como decimal
    const lastComma = value.lastIndexOf(',')
    const lastDot = value.lastIndexOf('.')
    
    let cleaned = value
    
    // Si hay tanto coma como punto, el último es el decimal
    if (lastComma > -1 && lastDot > -1) {
      if (lastComma > lastDot) {
        // La coma es decimal: quitar puntos y cambiar coma por punto
        cleaned = value.replace(/\./g, '').replace(',', '.')
      } else {
        // El punto es decimal: quitar comas
        cleaned = value.replace(/,/g, '')
      }
    } else if (lastComma > -1) {
      // Solo hay coma, es el decimal
      cleaned = value.replace(',', '.')
    }
    // Si solo hay punto, ya está en formato correcto
    
    return parseFloat(cleaned) || 0
  }
  
  // Formatear número para display (agregar puntos de miles y coma decimal)
  const formatForDisplay = (value: string): string => {
    if (!value || value === '0' || value === '0,00') return ''
    const num = parseFormattedNumber(value)
    if (isNaN(num)) return value // Mantener el valor si no es válido
    if (num === 0) return ''
    
    return num.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const { data: clubs = [] } = useClubs()
  const { data: members = [] } = useMembers(clubIdNum)
  const { data: tournaments = [] } = useTournaments(clubIdNum)
  const clubData = clubs.find(c => c.course_id === clubIdNum)
  
  const sanitizeAscii = (text: string | undefined | null) => {
    const base = (text ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '');
    return base.replace(/\s+/g, ' ').trim();
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const exportToExcel = () => {
    // Preparar datos para exportación
    const dataToExport = filteredOtherIncomes.map(income => ({
      'Fecha': new Date(income.income_date).toLocaleDateString('es-AR'),
      'Socio': (income as any).member_name || '-',
      'Descripción': income.description || '-',
      'Tipo de Pago': income.payment_type || '-',
      'Moneda': (income as any).currency || 'ARS',
      'Monto': Number(income.amount || 0)
    }))

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(dataToExport)

    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 12 },  // Fecha
      { wch: 25 },  // Socio
      { wch: 30 },  // Descripción
      { wch: 15 },  // Tipo de Pago
      { wch: 10 },  // Moneda
      { wch: 15 }   // Monto
    ]

    // Agregar hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Otros Ingresos')

    // Generar nombre de archivo con fecha
    const fileName = `otros_ingresos_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`

    // Descargar archivo
    XLSX.writeFile(wb, fileName)
    toast.success('Archivo Excel descargado exitosamente')
  }

  const totalPaid = useMemo(() => {
    return rows.reduce((s, r) => s + (Number(r.total_paid) || 0), 0)
  }, [rows])
  
  const totalOtherIncomes = useMemo(() => {
    return otherIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0)
  }, [otherIncomes])
  
  // Obtener descripciones únicas para reutilizar
  const uniqueDescriptions = useMemo(() => {
    const descriptions = otherIncomes
      .map(i => i.description)
      .filter((desc, index, self) => desc && desc.trim() && self.indexOf(desc) === index)
    return descriptions.sort()
  }, [otherIncomes])

  // Agrupar otros ingresos por descripción para mostrar en balance
  const groupedOtherIncomes = useMemo(() => {
    const groups: { [key: string]: { description: string; amountARS: number; amountUSD: number } } = {}
    
    otherIncomes.forEach(income => {
      const desc = income.description || 'Sin descripción'
      if (!groups[desc]) {
        groups[desc] = { description: desc, amountARS: 0, amountUSD: 0 }
      }
      const currency = (income as any).currency || 'ARS'
      if (currency === 'USD') {
        groups[desc].amountUSD += Number(income.amount || 0)
      } else {
        groups[desc].amountARS += Number(income.amount || 0)
      }
    })
    
    return Object.values(groups).sort((a, b) => {
      const totalA = a.amountARS + a.amountUSD
      const totalB = b.amountARS + b.amountUSD
      return totalB - totalA // Mayor a menor
    })
  }, [otherIncomes])

  // Totales separados por moneda - Otros Ingresos
  const totalOtherIncomesARS = useMemo(() => {
    return otherIncomes
      .filter(i => !i.currency || i.currency === 'ARS')
      .reduce((s, i) => s + (Number(i.amount) || 0), 0)
  }, [otherIncomes])

  const totalOtherIncomesUSD = useMemo(() => {
    return otherIncomes
      .filter(i => i.currency === 'USD')
      .reduce((s, i) => s + (Number(i.amount) || 0), 0)
  }, [otherIncomes])

  // Totales separados por moneda - Gastos
  const totalExpensesARS = useMemo(() => {
    return expenses
      .filter(e => !e.currency || e.currency === 'ARS')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
  }, [expenses])

  const totalExpensesUSD = useMemo(() => {
    return expenses
      .filter(e => e.currency === 'USD')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
  }, [expenses])
  
  const totalAllIncomes = useMemo(() => totalPaid + totalOtherIncomes, [totalPaid, totalOtherIncomes])
  
  const totalExpenses = useMemo(() => {
    return expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  }, [expenses])
  
  const netBalance = useMemo(() => {
    return totalAllIncomes - totalExpenses
  }, [totalAllIncomes, totalExpenses])

  // Balance neto por moneda
  const netBalanceARS = useMemo(() => {
    return totalPaid + totalOtherIncomesARS - totalExpensesARS
  }, [totalPaid, totalOtherIncomesARS, totalExpensesARS])

  const netBalanceUSD = useMemo(() => {
    return totalOtherIncomesUSD - totalExpensesUSD
  }, [totalOtherIncomesUSD, totalExpensesUSD])

  // Filtered rows based on selected tournaments
  const filteredRows = useMemo(() => {
    if (selectedTournaments.length === 0) return rows
    return rows.filter(r => selectedTournaments.includes(r.tournament_id))
  }, [rows, selectedTournaments])

  const filteredTotalPaid = useMemo(() => filteredRows.reduce((s, r) => s + (Number(r.total_paid) || 0), 0), [filteredRows])

  // Filtered other incomes based on filters
  const filteredOtherIncomes = useMemo(() => {
    return otherIncomes.filter(income => {
      const matchesMember = !incomeFilters.memberId || 
        (income as any).member_id?.toString() === incomeFilters.memberId
      const matchesDescription = !incomeFilters.description || 
        income.description?.toLowerCase().includes(incomeFilters.description.toLowerCase())
      const matchesPaymentType = !incomeFilters.paymentType || 
        income.payment_type === incomeFilters.paymentType
      const matchesCurrency = !incomeFilters.currency || 
        (income as any).currency === incomeFilters.currency

      return matchesMember && matchesDescription && matchesPaymentType && matchesCurrency
    })
  }, [otherIncomes, incomeFilters])

  // Total of filtered other incomes
  const filteredOtherIncomesTotal = useMemo(() => {
    return filteredOtherIncomes.reduce((sum, income) => sum + Number(income.amount || 0), 0)
  }, [filteredOtherIncomes])

  // No set default date - show all tournaments by default
  // User can filter by date if needed

  useEffect(() => {
    const load = async () => {
      if (!clubIdNum) return
      setLoading(true)
      try {
        // Always load incomes, other incomes, expenses, and currency exchanges
        const [incomesData, otherIncomesData, expensesData, exchangesData] = await Promise.all([
          paymentsService.getSummary(clubIdNum, { from: from || undefined, to: to || undefined }),
          paymentsService.getOtherIncomes(clubIdNum, { from: from || undefined, to: to || undefined }),
          paymentsService.getExpenses(clubIdNum, { from: from || undefined, to: to || undefined }),
          paymentsService.getCurrencyExchanges(clubIdNum, { from: from || undefined, to: to || undefined })
        ])
        setRows(incomesData)
        setOtherIncomes(otherIncomesData)
        setExpenses(expensesData)
        setCurrencyExchanges(exchangesData)
      } catch (error) {
        console.error('❌ Error cargando contabilidad:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clubIdNum, from, to])

  // Cerrar selector de meses al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMonthSelector) {
        const target = e.target as HTMLElement
        if (!target.closest('.relative')) {
          setShowMonthSelector(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMonthSelector])

  // Cerrar dropdown de socios al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMemberDropdown) {
        const target = e.target as HTMLElement
        const dropdown = target.closest('.member-dropdown-container')
        if (!dropdown) {
          setShowMemberDropdown(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMemberDropdown])

  // Cerrar dropdown de descripciones al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showDescriptionDropdown) {
        const target = e.target as HTMLElement
        const dropdown = target.closest('.description-dropdown-container')
        if (!dropdown) {
          setShowDescriptionDropdown(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDescriptionDropdown])

  // Cerrar dropdowns de filtros al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      if (showFilterMemberDropdown && !target.closest('.filter-member-dropdown')) {
        setShowFilterMemberDropdown(false)
      }
      
      if (showFilterDescriptionDropdown && !target.closest('.filter-description-dropdown')) {
        setShowFilterDescriptionDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilterMemberDropdown, showFilterDescriptionDropdown])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con logo y nombre del club */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {clubData?.logo_path ? (
                <img 
                  src={clubData.logo_path} 
                  alt={clubData.course_name}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <div className="h-10 w-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
              )}
              <h1 className="text-xl font-bold text-gray-900">
                {clubData ? sanitizeAscii(clubData.course_name) : 'Club'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {localStorage.getItem('adminUsername') || 'Usuario'}
                </span>
              </div>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 -mb-px">
            <button
              onClick={() => navigate(`/club/${clubId}/admin?tab=members`)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent transition-colors"
            >
              <Users className="h-4 w-4" />
              Socios
              {members.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {members.length}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate(`/club/${clubId}/admin?tab=tournaments`)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent transition-colors"
            >
              <Trophy className="h-4 w-4" />
              Torneos
              {tournaments.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {tournaments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate(`/club/${clubId}/admin?tab=photos`)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent transition-colors"
            >
              <Camera className="h-4 w-4" />
              Fotos
            </button>
            <button
              onClick={() => navigate(`/club/${clubId}/admin?tab=settings`)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent transition-colors"
            >
              <Settings className="h-4 w-4" />
              Configuración
            </button>
            <button
              onClick={() => navigate(`/club/${clubId}/rankings`)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent transition-colors"
            >
              <Award className="h-4 w-4" />
              Ranking
            </button>
            <button
              onClick={() => navigate(`/club/${clubId}/accounting`)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-900 border-b-2 border-gray-900 transition-colors"
            >
              <DollarSign className="h-4 w-4" />
              Contabilidad
            </button>
          </div>
        </div>
      </div>

      {/* Título de la sección */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Contabilidad</h2>
          <p className="mt-1 text-sm text-gray-600">
            Administra los ingresos y gastos del club
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTab('balance')}
                className={`px-3 py-2 rounded ${tab==='balance' ? 'bg-gray-900 text-white' : 'border'}`}
              >
                Balance
              </button>
              <button
                onClick={() => setTab('ingresos')}
                className={`px-3 py-2 rounded ${tab==='ingresos' ? 'bg-gray-900 text-white' : 'border'}`}
              >
                Ingresos Torneos
              </button>
              <button
                onClick={() => setTab('otros_ingresos')}
                className={`px-3 py-2 rounded ${tab==='otros_ingresos' ? 'bg-gray-900 text-white' : 'border'}`}
              >
                Otros Ingresos
              </button>
              <button
                onClick={() => setTab('gastos')}
                className={`px-3 py-2 rounded ${tab==='gastos' ? 'bg-gray-900 text-white' : 'border'}`}
              >
                Gastos
              </button>
              <button
                onClick={() => setTab('conversiones')}
                className={`px-3 py-2 rounded ${tab==='conversiones' ? 'bg-gray-900 text-white' : 'border'}`}
              >
                Conversiones
              </button>
            </div>
            <div className="flex items-center gap-3">
              {/* Selector de Meses */}
              <div className="relative">
                <button
                  onClick={() => setShowMonthSelector(!showMonthSelector)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {selectedMonths.length > 0 || selectedYears.length > 0
                      ? `${selectedMonths.length} mes(es), ${selectedYears.length} año(s)`
                      : 'Por mes/año'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                
                {showMonthSelector && (
                  <div className="absolute top-full mt-2 z-50 bg-white border border-gray-300 rounded-lg shadow-xl w-[500px]">
                    <div className="p-3 border-b bg-gray-50">
                      <h4 className="font-semibold text-sm text-gray-900">Seleccionar periodo</h4>
                      <p className="text-xs text-gray-600 mt-1">Selecciona uno o varios meses y años</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 p-4">
                      {/* Columna de Meses */}
                      <div>
                        <h5 className="font-medium text-sm text-gray-700 mb-2">Meses</h5>
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {monthsList.map(month => (
                            <label
                              key={month.value}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedMonths.includes(month.value)}
                                onChange={() => toggleMonth(month.value)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">{month.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Columna de Años */}
                      <div>
                        <h5 className="font-medium text-sm text-gray-700 mb-2">Años</h5>
                        <div className="space-y-1">
                          {availableYears.map(year => (
                            <label
                              key={year}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedYears.includes(year)}
                                onChange={() => toggleYear(year)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">{year}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border-t bg-gray-50 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedMonths([])
                          setSelectedYears([])
                          setShowMonthSelector(false)
                          setFrom('')
                          setTo('')
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                      >
                        Limpiar
                      </button>
                      <button
                        onClick={handleApplyMonthFilter}
                        className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        disabled={selectedMonths.length === 0 || selectedYears.length === 0}
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Selector de Rango de Fechas */}
              <DateInput
                value={from}
                onChange={setFrom}
                rangeEnabled
                onRangeSelect={(f, t) => { 
                  setFrom(f)
                  setTo(t)
                  setSelectedMonths([]) // Limpiar selección de meses al usar rango manual
                  setSelectedYears([]) // Limpiar selección de años al usar rango manual
                }}
                rangeFrom={from}
                rangeTo={to}
              />
              
              {/* Botón para limpiar filtros */}
              {(from || to || selectedMonths.length > 0 || selectedYears.length > 0) && (
                <button
                  onClick={() => {
                    setFrom('')
                    setTo('')
                    setSelectedMonths([])
                    setSelectedYears([])
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Limpiar filtros"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {tab==='otros_ingresos' && (
              <div className="ml-auto flex gap-2">
                <button 
                  onClick={() => setShowIncomeFilters(!showIncomeFilters)}
                  className={`flex items-center gap-2 px-3 py-2 rounded border ${showIncomeFilters ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                </button>
                <button 
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={filteredOtherIncomes.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Exportar Excel
                </button>
                <button onClick={() => {
                  const today = getLocalDateString()
                  setIncomeDraft({ member_id: '', income_date: today, amount: '', currency: 'ARS', payment_type: 'efectivo', description: '' })
                  setMemberSearchText('')
                  setShowMemberDropdown(false)
                  setShowDescriptionDropdown(false)
                  setShowIncomeModal(true)
                }} className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                  Agregar ingreso
                </button>
              </div>
            )}
            {tab==='gastos' && (
              <div className="ml-auto">
                <button onClick={() => {
                  const today = getLocalDateString()
                  setExpenseDraft({ expense_date: today, amount: '', currency: 'ARS', receipt_number: '', detail: '' })
                  setShowExpenseModal(true)
                }} className="px-3 py-2 bg-gray-900 text-white rounded hover:bg-gray-800">
                  Agregar gasto
                </button>
              </div>
            )}
            {tab==='conversiones' && (
              <div className="ml-auto">
                <button onClick={async () => {
                  const today = getLocalDateString()
                  setExchangeDraft({ 
                    exchange_date: today, 
                    from_currency: 'ARS', 
                    from_amount: '', 
                    to_currency: 'USD', 
                    to_amount: '', 
                    exchange_rate: '',
                    notes: '' 
                  })
                  // Cargar balance disponible
                  try {
                    const balance = await paymentsService.getCurrencyBalance(clubIdNum)
                    setCurrencyBalance(balance)
                  } catch (error) {
                    console.error('Error al cargar balance:', error)
                  }
                  setShowExchangeModal(true)
                }} className="px-3 py-2 bg-gray-900 text-white rounded hover:bg-gray-800">
                  Registrar conversión
                </button>
              </div>
            )}
          </div>
          {tab==='ingresos' && rows.length > 0 && (
            <button
              onClick={() => setShowTournamentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Filter className="h-4 w-4" />
              {selectedTournaments.length === 0 
                ? 'Seleccionar Torneos' 
                : `${selectedTournaments.length} torneo${selectedTournaments.length > 1 ? 's' : ''} seleccionado${selectedTournaments.length > 1 ? 's' : ''}`
              }
            </button>
          )}
        </div>

        {tab==='balance' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Ingresos Card */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Total Ingresos</h3>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600">
                    ${formatCurrency(totalPaid + totalOtherIncomesARS)}
                  </div>
                  {totalOtherIncomesUSD > 0 && (
                    <div className="text-xl font-bold text-green-600">
                      US${formatCurrency(totalOtherIncomesUSD)}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  De {rows.length} torneo{rows.length !== 1 ? 's' : ''} y {otherIncomes.length} otro{otherIncomes.length !== 1 ? 's' : ''} ingreso{otherIncomes.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Egresos Card */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Total Egresos</h3>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-600">
                    ${formatCurrency(totalExpensesARS)}
                  </div>
                  {totalExpensesUSD > 0 && (
                    <div className="text-xl font-bold text-red-600">
                      US${formatCurrency(totalExpensesUSD)}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  De {expenses.length} gasto{expenses.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Balance Card */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Balance Neto</h3>
                  <div className={`p-2 rounded-lg ${netBalanceARS >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                    <DollarSign className={`h-5 w-5 ${netBalanceARS >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className={`text-2xl font-bold ${netBalanceARS >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    ${formatCurrency(Math.abs(netBalanceARS))} {netBalanceARS >= 0 ? '' : '-'}
                  </div>
                  {(totalOtherIncomesUSD > 0 || totalExpensesUSD > 0) && (
                    <div className={`text-xl font-bold ${netBalanceUSD >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      US${formatCurrency(Math.abs(netBalanceUSD))} {netBalanceUSD >= 0 ? '' : '-'}
                    </div>
                  )}
                </div>
                <p className={`text-sm font-medium mt-2 ${netBalanceARS >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {netBalanceARS >= 0 ? 'Superávit' : 'Déficit'}
                </p>
              </div>
            </div>

            {/* Detailed Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Ingresos por Torneo */}
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Ingresos por Torneo</h3>
                </div>
                <div className="overflow-x-auto max-h-96">
                  {loading ? (
                    <div className="p-6 text-center text-gray-600">Cargando...</div>
                  ) : rows.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No hay ingresos registrados</div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Torneo</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rows.map((r) => (
                          <tr key={r.tournament_id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm">{r.tournament_name}</td>
                            <td className="px-4 py-2 text-sm font-medium text-green-600 text-right">
                              ${formatCurrency(Number(r.total_paid || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Otros Ingresos */}
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Otros Ingresos</h3>
                  <p className="text-xs text-gray-500 mt-1">Agrupado por descripción</p>
                </div>
                <div className="overflow-x-auto max-h-96">
                  {loading ? (
                    <div className="p-6 text-center text-gray-600">Cargando...</div>
                  ) : otherIncomes.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No hay otros ingresos registrados</div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {groupedOtherIncomes.map((group, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm">{group.description}</td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex flex-col items-end gap-1">
                                {group.amountARS > 0 && (
                                  <span className="text-sm font-medium text-green-600">
                                    ${formatCurrency(group.amountARS)}
                                  </span>
                                )}
                                {group.amountUSD > 0 && (
                                  <span className="text-sm font-medium text-green-600">
                                    US${formatCurrency(group.amountUSD)}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Gastos Registrados */}
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Gastos Registrados</h3>
                </div>
                <div className="overflow-x-auto max-h-96">
                  {loading ? (
                    <div className="p-6 text-center text-gray-600">Cargando...</div>
                  ) : expenses.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No hay gastos registrados</div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Detalle</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {expenses.map((e) => (
                          <tr key={e.expense_id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm">
                              {new Date(e.expense_date).toLocaleDateString('es-AR')}
                            </td>
                            <td className="px-4 py-2 text-sm">{e.detail || '-'}</td>
                            <td className="px-4 py-2 text-sm font-medium text-red-600 text-right">
                              {(e as any).currency === 'USD' ? 'US$' : '$'}{formatCurrency(Number(e.amount || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==='ingresos' && (
          <div className="bg-white rounded-lg border overflow-x-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-600">Cargando...</div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Torneo</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cobrado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRows.map((r) => (
                      <tr key={r.tournament_id}>
                        <td className="px-4 py-2">{r.tournament_name}</td>
                        <td className="px-4 py-2 font-semibold">${formatCurrency(Number(r.total_paid || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">TOTAL GENERAL</td>
                      <td className="px-4 py-3 font-bold text-green-700 text-lg">
                        ${formatCurrency(filteredTotalPaid)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )}
          </div>
        )}

        {/* Panel de Filtros para Otros Ingresos */}
        {tab==='otros_ingresos' && showIncomeFilters && (
          <div className="bg-white rounded-lg border p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative filter-member-dropdown">
                <label className="block text-sm font-medium text-gray-700 mb-1">Socio</label>
                <div className="relative">
                  <input
                    type="text"
                    value={incomeFilters.memberId ? members.find((m: any) => m.member_id === parseInt(incomeFilters.memberId))?.first_name + ' ' + members.find((m: any) => m.member_id === parseInt(incomeFilters.memberId))?.last_name : incomeFilters.member}
                    onChange={(e) => {
                      setIncomeFilters(f => ({ ...f, member: e.target.value, memberId: '' }))
                      setShowFilterMemberDropdown(true)
                    }}
                    onFocus={() => setShowFilterMemberDropdown(true)}
                    placeholder="Buscar socio..."
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                  {incomeFilters.memberId && (
                    <button
                      type="button"
                      onClick={() => setIncomeFilters(f => ({ ...f, member: '', memberId: '' }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {showFilterMemberDropdown && (() => {
                  const filteredMembers = (members || []).filter((m: any) => {
                    if (!incomeFilters.member) return true
                    const searchLower = incomeFilters.member.toLowerCase()
                    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase()
                    return fullName.includes(searchLower)
                  })
                  
                  if (!members || members.length === 0 || filteredMembers.length === 0) return null
                  
                  return (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredMembers.map((m: any) => (
                        <button
                          key={m.member_id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIncomeFilters(f => ({ ...f, memberId: m.member_id.toString(), member: '' }))
                            setShowFilterMemberDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b last:border-b-0 text-sm"
                        >
                          <span>{m.first_name} {m.last_name}</span>
                          {m.member_number && (
                            <span className="text-xs text-gray-500 ml-2">#{m.member_number}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )
                })()}
              </div>
              <div className="relative filter-description-dropdown">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <div className="relative">
                  <input
                    type="text"
                    value={incomeFilters.description}
                    onChange={(e) => {
                      setIncomeFilters(f => ({ ...f, description: e.target.value }))
                      setShowFilterDescriptionDropdown(true)
                    }}
                    onFocus={() => setShowFilterDescriptionDropdown(true)}
                    placeholder="Buscar por descripción..."
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                  {incomeFilters.description && (
                    <button
                      type="button"
                      onClick={() => setIncomeFilters(f => ({ ...f, description: '' }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {showFilterDescriptionDropdown && (() => {
                  const filteredDescriptions = uniqueDescriptions.filter(desc => 
                    !incomeFilters.description || desc.toLowerCase().includes(incomeFilters.description.toLowerCase())
                  )
                  
                  if (filteredDescriptions.length === 0) return null
                  
                  return (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-blue-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      <div className="px-3 py-2 bg-blue-50 border-b">
                        <p className="text-xs text-blue-700 font-medium">💡 Descripciones disponibles:</p>
                      </div>
                      {filteredDescriptions.map((desc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIncomeFilters(f => ({ ...f, description: desc }))
                            setShowFilterDescriptionDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b last:border-b-0 text-sm"
                        >
                          {desc}
                        </button>
                      ))}
                    </div>
                  )
                })()}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pago</label>
                <select
                  value={incomeFilters.paymentType}
                  onChange={(e) => setIncomeFilters(f => ({ ...f, paymentType: e.target.value }))}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="cheque">Cheque</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                <select
                  value={incomeFilters.currency}
                  onChange={(e) => setIncomeFilters(f => ({ ...f, currency: e.target.value }))}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas</option>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setIncomeFilters({ member: '', memberId: '', description: '', paymentType: '', currency: '' })}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
              >
                Limpiar filtros
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                {filteredOtherIncomes.length} de {otherIncomes.length} registros
              </span>
            </div>
          </div>
        )}

        {tab==='otros_ingresos' && (
          <div className="bg-white rounded-lg border overflow-x-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-600">Cargando...</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Socio</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo Pago</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOtherIncomes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        {otherIncomes.length === 0 ? 'No hay otros ingresos registrados' : 'No hay ingresos que coincidan con los filtros'}
                      </td>
                    </tr>
                  ) : (
                    filteredOtherIncomes.map((income) => (
                      <tr key={income.income_id}>
                        <td className="px-4 py-2">{new Date(income.income_date).toLocaleDateString('es-AR')}</td>
                        <td className="px-4 py-2">
                          {(income as any).member_name ? (
                            <span className="text-blue-600 font-medium">{(income as any).member_name}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-semibold text-green-600">
                          {(income as any).currency === 'USD' ? 'US$' : '$'}{formatCurrency(Number(income.amount || 0))}
                        </td>
                        <td className="px-4 py-2 capitalize">{income.payment_type || '-'}</td>
                        <td className="px-4 py-2">{income.description || '-'}</td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {(income as any).member_id && (
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await fetch(`/api/club/${clubIdNum}/accounting/incomes/${income.income_id}/send-whatsapp`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' }
                                    })
                                    const data = await response.json()
                                    if (data.success && data.whatsappUrl) {
                                      window.open(data.whatsappUrl, '_blank')
                                      toast.success('Abriendo WhatsApp...')
                                    } else {
                                      toast.error(data.message || 'Error al enviar WhatsApp')
                                    }
                                  } catch (error) {
                                    toast.error('Error al enviar WhatsApp')
                                  }
                                }}
                                className="text-green-600 hover:text-green-900"
                                title="Enviar comprobante por WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                const formattedAmount = formatForDisplay(income.amount.toString())
                                setIncomeDraft({
                                  member_id: (income as any).member_id ? (income as any).member_id.toString() : '',
                                  income_date: new Date(income.income_date).toISOString().split('T')[0],
                                  amount: formattedAmount,
                                  currency: (income as any).currency || 'ARS',
                                  payment_type: income.payment_type || 'efectivo',
                                  description: income.description || ''
                                })
                                setMemberSearchText('')
                                setShowMemberDropdown(false)
                                setShowDescriptionDropdown(false)
                                setEditingIncomeId(income.income_id)
                                setShowIncomeModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('¿Eliminar este ingreso?')) {
                                  try {
                                    await paymentsService.deleteOtherIncome(clubIdNum, income.income_id)
                                    const data = await paymentsService.getOtherIncomes(clubIdNum, { from: from || undefined, to: to || undefined })
                                    setOtherIncomes(data)
                                    toast.success('Ingreso eliminado exitosamente')
                                  } catch (error) {
                                    toast.error('Error al eliminar ingreso')
                                  }
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 font-bold text-gray-900">
                      TOTAL {showIncomeFilters && Object.values(incomeFilters).some(v => v) && '(Filtrado)'}
                    </td>
                    <td className="px-4 py-3 font-bold text-green-700 text-lg text-center">
                      ${formatCurrency(filteredOtherIncomesTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {tab==='gastos' && (
          <div className="bg-white rounded-lg border overflow-x-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-600">Cargando...</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recibo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Detalle</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expenses.map((e) => (
                    <tr key={e.expense_id}>
                      <td className="px-4 py-2">{new Date(e.expense_date).toLocaleDateString('es-AR')}</td>
                      <td className="px-4 py-2 font-semibold text-red-600">
                        {(e as any).currency === 'USD' ? 'US$' : '$'}{formatCurrency(Number(e.amount || 0))}
                      </td>
                      <td className="px-4 py-2">{e.receipt_number || '-'}</td>
                      <td className="px-4 py-2">{e.detail || '-'}</td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              const formattedAmount = formatForDisplay(e.amount.toString())
                              setExpenseDraft({
                                expense_date: new Date(e.expense_date).toISOString().split('T')[0],
                                amount: formattedAmount,
                                currency: (e as any).currency || 'ARS',
                                receipt_number: e.receipt_number || '',
                                detail: e.detail || ''
                              })
                              setEditingExpenseId(e.expense_id)
                              setShowExpenseModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('¿Eliminar este gasto?')) {
                                try {
                                  await paymentsService.deleteExpense(clubIdNum, e.expense_id)
                                  const data = await paymentsService.getExpenses(clubIdNum, { from: from || undefined, to: to || undefined })
                                  setExpenses(data)
                                  toast.success('Gasto eliminado exitosamente')
                                } catch (error) {
                                  toast.error('Error al eliminar gasto')
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Conversiones de Moneda */}
        {tab==='conversiones' && (
          <div className="bg-white rounded-lg border overflow-x-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-600">Cargando...</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">De</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">A</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tasa</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currencyExchanges.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No hay conversiones registradas
                      </td>
                    </tr>
                  ) : (
                    currencyExchanges.map((ex) => (
                      <tr key={ex.exchange_id}>
                        <td className="px-4 py-2">{new Date(ex.exchange_date).toLocaleDateString('es-AR')}</td>
                        <td className="px-4 py-2 font-semibold">
                          {ex.from_currency === 'USD' ? 'US$' : '$'}{formatCurrency(Number(ex.from_amount || 0))} {ex.from_currency}
                        </td>
                        <td className="px-4 py-2 font-semibold text-blue-600">
                          {ex.to_currency === 'USD' ? 'US$' : '$'}{formatCurrency(Number(ex.to_amount || 0))} {ex.to_currency}
                        </td>
                        <td className="px-4 py-2">{Number(ex.exchange_rate).toFixed(4)}</td>
                        <td className="px-4 py-2">{ex.notes || '-'}</td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={async () => {
                                setExchangeDraft({
                                  exchange_date: new Date(ex.exchange_date).toISOString().split('T')[0],
                                  from_currency: ex.from_currency,
                                  from_amount: formatForDisplay(ex.from_amount.toString()),
                                  to_currency: ex.to_currency,
                                  to_amount: formatForDisplay(ex.to_amount.toString()),
                                  exchange_rate: ex.exchange_rate.toString(),
                                  notes: ex.notes || ''
                                })
                                setEditingExchangeId(ex.exchange_id)
                                // Cargar balance disponible
                                try {
                                  const balance = await paymentsService.getCurrencyBalance(clubIdNum)
                                  setCurrencyBalance(balance)
                                } catch (error) {
                                  console.error('Error al cargar balance:', error)
                                }
                                setShowExchangeModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('¿Eliminar esta conversión?')) {
                                  try {
                                    await paymentsService.deleteCurrencyExchange(clubIdNum, ex.exchange_id)
                                    const data = await paymentsService.getCurrencyExchanges(clubIdNum, { from: from || undefined, to: to || undefined })
                                    setCurrencyExchanges(data)
                                    toast.success('Conversión eliminada exitosamente')
                                  } catch (error) {
                                    toast.error('Error al eliminar conversión')
                                  }
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Modal de Selección de Torneos */}
        {showTournamentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowTournamentModal(false)} />
            <div className="relative mx-auto w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[80vh] overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-900 text-white">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Seleccionar Torneos</h3>
                </div>
                <button 
                  onClick={() => setShowTournamentModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                <p className="text-sm text-gray-600 mb-4">
                  Selecciona los torneos que quieres ver en el reporte de ingresos:
                </p>
                <div className="space-y-2">
                  {/* Opción "Todos" */}
                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedTournaments.length === 0}
                      onChange={() => setSelectedTournaments([])}
                      className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900">Todos los torneos</span>
                      <p className="text-xs text-gray-500">Mostrar todos los torneos con ingresos</p>
                    </div>
                  </label>

                  {/* Lista de torneos */}
                  {rows.map(r => (
                    <label 
                      key={r.tournament_id} 
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTournaments.includes(r.tournament_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTournaments([...selectedTournaments, r.tournament_id])
                          } else {
                            setSelectedTournaments(selectedTournaments.filter(id => id !== r.tournament_id))
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">{r.tournament_name}</span>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">
                            {new Date(r.tournament_date).toLocaleDateString('es-AR')}
                          </span>
                          <span className="text-xs font-semibold text-green-600">
                            ${formatCurrency(Number(r.total_paid || 0))}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {selectedTournaments.length === 0 
                    ? `${rows.length} torneos mostrados` 
                    : `${selectedTournaments.length} de ${rows.length} torneos seleccionados`
                  }
                </span>
                <button
                  onClick={() => setShowTournamentModal(false)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Gastos */}
        {showExpenseModal && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={() => {
              setShowExpenseModal(false)
              setExpenseDraft({ expense_date: '', amount: '', currency: 'ARS', receipt_number: '', detail: '' })
              setEditingExpenseId(null)
            }} />
            <div className="relative mx-auto my-10 w-full max-w-lg bg-white rounded-lg shadow-xl p-4 space-y-3">
              <h3 className="text-lg font-semibold">{editingExpenseId ? 'Editar gasto' : 'Nuevo gasto'}</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm text-gray-600">Fecha</label>
                  <DateInput value={expenseDraft.expense_date} onChange={(v) => setExpenseDraft(d => ({ ...d, expense_date: v }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Monto</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={expenseDraft.amount} 
                      onChange={(e) => {
                        const validated = validateNumberInput(e.target.value)
                        setExpenseDraft(d => ({ ...d, amount: validated }))
                      }}
                      onBlur={(e) => {
                        const formatted = formatForDisplay(e.target.value)
                        setExpenseDraft(d => ({ ...d, amount: formatted }))
                      }}
                      className="flex-1 px-3 py-2 border rounded"
                      placeholder="0,00" 
                    />
                    <select
                      value={expenseDraft.currency}
                      onChange={(e) => setExpenseDraft(d => ({ ...d, currency: e.target.value }))}
                      className="w-16 px-1 py-2 border rounded text-sm"
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">N° Recibo</label>
                  <input value={expenseDraft.receipt_number} onChange={(e) => setExpenseDraft(d => ({ ...d, receipt_number: e.target.value }))} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Detalle</label>
                  <textarea value={expenseDraft.detail} onChange={(e) => setExpenseDraft(d => ({ ...d, detail: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={3} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => {
                  setShowExpenseModal(false)
                  setExpenseDraft({ expense_date: '', amount: '', currency: 'ARS', receipt_number: '', detail: '' })
                  setEditingExpenseId(null)
                }} className="px-4 py-2 border rounded">Cancelar</button>
                <button
                  onClick={async () => {
                    try {
                      const expenseToSave = {
                        ...expenseDraft,
                        amount: parseFormattedNumber(expenseDraft.amount)
                      }
                      if (editingExpenseId) {
                        await paymentsService.updateExpense(clubIdNum, editingExpenseId, expenseToSave as any)
                        toast.success('Gasto actualizado exitosamente')
                      } else {
                        await paymentsService.addExpense(clubIdNum, expenseToSave as any)
                        toast.success('Gasto agregado exitosamente')
                      }
                      setShowExpenseModal(false)
                      setExpenseDraft({ expense_date: '', amount: '', currency: 'ARS', receipt_number: '', detail: '' })
                      setEditingExpenseId(null)
                      const ex = await paymentsService.getExpenses(clubIdNum, { from: from || undefined, to: to || undefined })
                      setExpenses(ex)
                    } catch (error) {
                      toast.error('Error al guardar gasto')
                    }
                  }}
                  className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Otros Ingresos */}
        {showIncomeModal && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={() => {
              setShowIncomeModal(false)
              setIncomeDraft({ member_id: '', income_date: '', amount: '', currency: 'ARS', payment_type: 'efectivo', description: '' })
              setMemberSearchText('')
              setShowMemberDropdown(false)
              setShowDescriptionDropdown(false)
              setEditingIncomeId(null)
            }} />
            <div className="relative mx-auto my-10 w-full max-w-lg bg-white rounded-lg shadow-xl p-4 space-y-3">
              <h3 className="text-lg font-semibold text-green-600">{editingIncomeId ? 'Editar ingreso' : 'Nuevo ingreso'}</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="relative member-dropdown-container">
                  <label className="block text-sm text-gray-600 mb-1">Socio (opcional)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={
                        incomeDraft.member_id
                          ? (() => {
                              const member = members.find((m: any) => m.member_id === parseInt(incomeDraft.member_id))
                              return member ? `${member.first_name} ${member.last_name}` : ''
                            })()
                          : memberSearchText
                      }
                      onChange={(e) => {
                        setMemberSearchText(e.target.value)
                        setShowMemberDropdown(true)
                        if (!e.target.value) {
                          setIncomeDraft(d => ({ ...d, member_id: '' }))
                        }
                      }}
                      onFocus={() => setShowMemberDropdown(true)}
                      placeholder="Buscar socio por nombre..."
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {incomeDraft.member_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setIncomeDraft(d => ({ ...d, member_id: '' }))
                          setMemberSearchText('')
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {showMemberDropdown && (() => {
                    const filteredMembers = (members || []).filter((m: any) => {
                      if (!memberSearchText) return true
                      const searchLower = memberSearchText.toLowerCase()
                      const fullName = `${m.first_name} ${m.last_name}`.toLowerCase()
                      return fullName.includes(searchLower)
                    })
                    
                    if (!members || members.length === 0) {
                      return (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-red-300 rounded-lg shadow-lg p-3 text-center">
                          <p className="text-red-600 text-sm">⚠️ No hay socios cargados</p>
                        </div>
                      )
                    }
                    
                    return (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredMembers.length > 0 ? (
                          filteredMembers.map((m: any) => (
                            <button
                              key={m.member_id}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setIncomeDraft(d => ({ ...d, member_id: m.member_id.toString() }))
                                setMemberSearchText('')
                                setShowMemberDropdown(false)
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between border-b last:border-b-0"
                            >
                              <span>{m.first_name} {m.last_name}</span>
                              {m.member_number && (
                                <span className="text-xs text-gray-500">#{m.member_number}</span>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm text-center">
                            No se encontraron socios con "{memberSearchText}"
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  <p className="text-xs text-gray-500 mt-1">
                    Seleccioná un socio si este ingreso es una contribución/aporte de un socio
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Fecha</label>
                  <DateInput value={incomeDraft.income_date} onChange={(v) => setIncomeDraft(d => ({ ...d, income_date: v }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Monto</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={incomeDraft.amount} 
                      onChange={(e) => {
                        const validated = validateNumberInput(e.target.value)
                        setIncomeDraft(d => ({ ...d, amount: validated }))
                      }}
                      onBlur={(e) => {
                        const formatted = formatForDisplay(e.target.value)
                        setIncomeDraft(d => ({ ...d, amount: formatted }))
                      }}
                      className="flex-1 px-3 py-2 border rounded"
                      placeholder="0,00" 
                    />
                    <select
                      value={incomeDraft.currency}
                      onChange={(e) => setIncomeDraft(d => ({ ...d, currency: e.target.value }))}
                      className="w-16 px-1 py-2 border rounded text-sm"
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Tipo de Pago</label>
                  <select 
                    value={incomeDraft.payment_type} 
                    onChange={(e) => setIncomeDraft(d => ({ ...d, payment_type: e.target.value }))} 
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="cheque">Cheque</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className="relative description-dropdown-container">
                  <label className="block text-sm text-gray-600 mb-1">Descripción</label>
                  <textarea 
                    value={incomeDraft.description} 
                    onChange={(e) => {
                      setIncomeDraft(d => ({ ...d, description: e.target.value }))
                      setShowDescriptionDropdown(true)
                    }}
                    onFocus={() => setShowDescriptionDropdown(true)}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    rows={3}
                    placeholder="Ej: Cuota anual, patrocinio, donación, etc." 
                  />
                  {showDescriptionDropdown && uniqueDescriptions.length > 0 && (() => {
                    const searchLower = incomeDraft.description.toLowerCase()
                    const filteredDescriptions = uniqueDescriptions.filter(desc => 
                      !incomeDraft.description || desc.toLowerCase().includes(searchLower)
                    )
                    
                    if (filteredDescriptions.length === 0) return null
                    
                    return (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-blue-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        <div className="px-3 py-2 bg-blue-50 border-b">
                          <p className="text-xs text-blue-700 font-medium">💡 Descripciones guardadas:</p>
                        </div>
                        {filteredDescriptions.map((desc, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setIncomeDraft(d => ({ ...d, description: desc }))
                              setShowDescriptionDropdown(false)
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b last:border-b-0 text-sm"
                          >
                            {desc}
                          </button>
                        ))}
                      </div>
                    )
                  })()}
                  <p className="text-xs text-gray-500 mt-1">
                    Escribí una nueva descripción o seleccioná una existente
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => {
                  setShowIncomeModal(false)
                  setIncomeDraft({ member_id: '', income_date: '', amount: '', currency: 'ARS', payment_type: 'efectivo', description: '' })
                  setMemberSearchText('')
                  setShowMemberDropdown(false)
                  setShowDescriptionDropdown(false)
                  setEditingIncomeId(null)
                }} className="px-4 py-2 border rounded">Cancelar</button>
                <button
                  onClick={async () => {
                    try {
                      const incomeToSave = {
                        ...incomeDraft,
                        member_id: incomeDraft.member_id ? parseInt(incomeDraft.member_id) : null,
                        amount: parseFormattedNumber(incomeDraft.amount)
                      }
                      if (editingIncomeId) {
                        await paymentsService.updateOtherIncome(clubIdNum, editingIncomeId, incomeToSave as any)
                        toast.success('Ingreso actualizado exitosamente')
                      } else {
                        await paymentsService.addOtherIncome(clubIdNum, incomeToSave as any)
                        toast.success('Ingreso agregado exitosamente')
                      }
                      setShowIncomeModal(false)
                      setIncomeDraft({ member_id: '', income_date: '', amount: '', currency: 'ARS', payment_type: 'efectivo', description: '' })
                      setMemberSearchText('')
                      setShowMemberDropdown(false)
                      setShowDescriptionDropdown(false)
                      setEditingIncomeId(null)
                      const data = await paymentsService.getOtherIncomes(clubIdNum, { from: from || undefined, to: to || undefined })
                      setOtherIncomes(data)
                    } catch (error) {
                      toast.error(editingIncomeId ? 'Error al actualizar ingreso' : 'Error al agregar ingreso')
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Conversión de Moneda */}
        {showExchangeModal && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={() => {
              setShowExchangeModal(false)
              setExchangeDraft({ 
                exchange_date: '', 
                from_currency: 'ARS', 
                from_amount: '', 
                to_currency: 'USD', 
                to_amount: '', 
                exchange_rate: '',
                notes: '' 
              })
              setEditingExchangeId(null)
            }} />
            <div className="relative mx-auto my-10 w-full max-w-lg bg-white rounded-lg shadow-xl p-4 space-y-3">
              <h3 className="text-lg font-semibold text-blue-600">{editingExchangeId ? 'Editar conversión' : 'Registrar conversión'}</h3>
              
              {/* Balance disponible */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900 mb-1">💰 Fondos disponibles:</p>
                <div className="flex gap-4 text-sm">
                  <span className="font-semibold text-blue-700">
                    ARS: ${formatCurrency(currencyBalance.ARS)}
                  </span>
                  <span className="font-semibold text-blue-700">
                    USD: US${formatCurrency(currencyBalance.USD)}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm text-gray-600">Fecha</label>
                  <DateInput value={exchangeDraft.exchange_date} onChange={(v) => setExchangeDraft(d => ({ ...d, exchange_date: v }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 font-medium">Convertir de:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={exchangeDraft.from_amount} 
                      onChange={(e) => {
                        const validated = validateNumberInput(e.target.value)
                        const formatted = formatForDisplay(validated)
                        setExchangeDraft(d => {
                          const newDraft = { ...d, from_amount: formatted }
                          // Auto-calcular to_amount si hay tasa de cambio
                          if (d.exchange_rate) {
                            const fromNum = parseFormattedNumber(formatted)
                            const rate = parseFloat(d.exchange_rate)
                            if (fromNum > 0 && rate > 0) {
                              const toNum = fromNum / rate
                              newDraft.to_amount = formatForDisplay(toNum.toFixed(2))
                            }
                          }
                          return newDraft
                        })
                      }}
                      className={`flex-1 px-3 py-2 border rounded ${
                        exchangeDraft.from_amount && parseFormattedNumber(exchangeDraft.from_amount) > currencyBalance[exchangeDraft.from_currency]
                          ? 'border-red-500 bg-red-50'
                          : ''
                      }`}
                      placeholder="0,00" 
                    />
                    <select
                      value={exchangeDraft.from_currency}
                      onChange={(e) => setExchangeDraft(d => ({ ...d, from_currency: e.target.value }))}
                      className="w-20 px-2 py-2 border rounded"
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  {exchangeDraft.from_amount && parseFormattedNumber(exchangeDraft.from_amount) > currencyBalance[exchangeDraft.from_currency] && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Fondos insuficientes. Disponible: {exchangeDraft.from_currency === 'USD' ? 'US$' : '$'}{formatCurrency(currencyBalance[exchangeDraft.from_currency])}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600 font-medium">Convertir a:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={exchangeDraft.to_amount} 
                      onChange={(e) => {
                        const validated = validateNumberInput(e.target.value)
                        const formatted = formatForDisplay(validated)
                        setExchangeDraft(d => {
                          const newDraft = { ...d, to_amount: formatted }
                          // Auto-calcular from_amount si hay tasa de cambio
                          if (d.exchange_rate) {
                            const toNum = parseFormattedNumber(formatted)
                            const rate = parseFloat(d.exchange_rate)
                            if (toNum > 0 && rate > 0) {
                              const fromNum = toNum * rate
                              newDraft.from_amount = formatForDisplay(fromNum.toFixed(2))
                            }
                          }
                          return newDraft
                        })
                      }}
                      className="flex-1 px-3 py-2 border rounded"
                      placeholder="0,00" 
                    />
                    <select
                      value={exchangeDraft.to_currency}
                      onChange={(e) => setExchangeDraft(d => ({ ...d, to_currency: e.target.value }))}
                      className="w-20 px-2 py-2 border rounded"
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Tasa de cambio</label>
                  <input 
                    type="text" 
                    value={exchangeDraft.exchange_rate} 
                    onChange={(e) => {
                      const validated = validateNumberInput(e.target.value)
                      setExchangeDraft(d => {
                        const newDraft = { ...d, exchange_rate: validated }
                        // Auto-calcular to_amount si hay from_amount
                        if (d.from_amount) {
                          const fromNum = parseFormattedNumber(d.from_amount)
                          const rate = parseFloat(validated)
                          if (fromNum > 0 && rate > 0) {
                            const toNum = fromNum / rate
                            newDraft.to_amount = toNum.toFixed(2).replace('.', ',')
                          }
                        }
                        return newDraft
                      })
                    }}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Ej: 1000.50" 
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {exchangeDraft.from_currency === 'ARS' && exchangeDraft.to_currency === 'USD' 
                      ? `Ejemplo: Si la tasa es 1000, significa que $1.000 ARS = US$1 USD`
                      : exchangeDraft.from_currency === 'USD' && exchangeDraft.to_currency === 'ARS'
                      ? `Ejemplo: Si la tasa es 1000, significa que US$1 USD = $1.000 ARS`
                      : `Tasa: 1 ${exchangeDraft.from_currency} = ${exchangeDraft.exchange_rate || '?'} ${exchangeDraft.to_currency}`
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Notas (opcional)</label>
                  <textarea 
                    value={exchangeDraft.notes} 
                    onChange={(e) => setExchangeDraft(d => ({ ...d, notes: e.target.value }))} 
                    className="w-full px-3 py-2 border rounded" 
                    rows={2}
                    placeholder="Ej: Compra de dólares en banco, cambio informal, etc." 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => {
                  setShowExchangeModal(false)
                  setExchangeDraft({ 
                    exchange_date: '', 
                    from_currency: 'ARS', 
                    from_amount: '', 
                    to_currency: 'USD', 
                    to_amount: '', 
                    exchange_rate: '',
                    notes: '' 
                  })
                  setEditingExchangeId(null)
                }} className="px-4 py-2 border rounded">Cancelar</button>
                <button
                  onClick={async () => {
                    try {
                      const exchangeToSave = {
                        ...exchangeDraft,
                        from_amount: parseFormattedNumber(exchangeDraft.from_amount),
                        to_amount: parseFormattedNumber(exchangeDraft.to_amount),
                        exchange_rate: parseFloat(exchangeDraft.exchange_rate)
                      }
                      if (editingExchangeId) {
                        await paymentsService.updateCurrencyExchange(clubIdNum, editingExchangeId, exchangeToSave as any)
                        toast.success('Conversión actualizada exitosamente')
                      } else {
                        await paymentsService.addCurrencyExchange(clubIdNum, exchangeToSave as any)
                        toast.success('Conversión registrada exitosamente')
                      }
                      setShowExchangeModal(false)
                      setExchangeDraft({ 
                        exchange_date: '', 
                        from_currency: 'ARS', 
                        from_amount: '', 
                        to_currency: 'USD', 
                        to_amount: '', 
                        exchange_rate: '',
                        notes: '' 
                      })
                      setEditingExchangeId(null)
                      const data = await paymentsService.getCurrencyExchanges(clubIdNum, { from: from || undefined, to: to || undefined })
                      setCurrencyExchanges(data)
                      // Recargar balance
                      const balance = await paymentsService.getCurrencyBalance(clubIdNum)
                      setCurrencyBalance(balance)
                    } catch (error: any) {
                      const errorMessage = error?.response?.data?.message || error?.message || 'Error al procesar conversión'
                      toast.error(errorMessage)
                    }
                  }}
                  disabled={
                    !exchangeDraft.from_amount || 
                    !exchangeDraft.to_amount || 
                    !exchangeDraft.exchange_rate ||
                    parseFormattedNumber(exchangeDraft.from_amount) > currencyBalance[exchangeDraft.from_currency] ||
                    parseFormattedNumber(exchangeDraft.from_amount) === 0
                  }
                  className={`px-4 py-2 rounded ${
                    !exchangeDraft.from_amount || 
                    !exchangeDraft.to_amount || 
                    !exchangeDraft.exchange_rate ||
                    parseFormattedNumber(exchangeDraft.from_amount) > currencyBalance[exchangeDraft.from_currency] ||
                    parseFormattedNumber(exchangeDraft.from_amount) === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rango inline sin modal */}
    </div>
  )
}


