import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Calendar, DollarSign, Users, Trophy, Settings, Award, Camera, ChevronDown, LogOut, Filter, X, User, Pencil, Download, MessageCircle } from 'lucide-react'
import { paymentsService } from '@/services/paymentsService'
import { accountsService } from '@/services/accountsService'
import { DateInput } from '@/components/DateInput'
import { useClubs } from '@/hooks/useClubs'
import { useMembers } from '@/hooks/useMembers'
import { useTournaments } from '@/hooks/useTournaments'
import { useUserPermissions } from '@/hooks/useUserPermissions'
import { toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'

export default function Payments() {
  const { clubId } = useParams<{ clubId: string }>() 
  const navigate = useNavigate()
  const clubIdNum = clubId ? parseInt(clubId) : 0
  const { permissions } = useUserPermissions(clubId)

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
  const [tab, setTab] = useState<'balance' | 'ingresos' | 'otros_ingresos' | 'gastos' | 'conversiones' | 'cuentas'>('balance')
  const [expenses, setExpenses] = useState<any[]>([])
  const [otherIncomes, setOtherIncomes] = useState<any[]>([])
  const [currencyExchanges, setCurrencyExchanges] = useState<any[]>([])
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [showExchangeModal, setShowExchangeModal] = useState(false)
  const [expenseDraft, setExpenseDraft] = useState({ expense_date: '', amount: '', currency: 'ARS', receipt_number: '', detail: '', custodian: '', account_id: '' })
  const [incomeDraft, setIncomeDraft] = useState({ member_id: '', income_date: '', amount: '', currency: 'ARS', payment_type: 'efectivo', description: '', custodian: '', account_id: '' })
  const [exchangeDraft, setExchangeDraft] = useState({ 
    exchange_date: '', 
    from_currency: 'ARS', 
    from_amount: '', 
    to_currency: 'USD', 
    to_amount: '', 
    exchange_rate: '',
    notes: '',
    from_account_id: '',
    to_account_id: ''
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
  const [custodians, setCustodians] = useState<string[]>([])
  const [showCustodianDropdown, setShowCustodianDropdown] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [accountDraft, setAccountDraft] = useState({ account_name: '', description: '' })
  const [transferDraft, setTransferDraft] = useState({ from_account_id: '', to_account_id: '', amount: '', currency: 'ARS', description: '', transaction_date: '' })
  const [showIncomeFilters, setShowIncomeFilters] = useState(false)
  const [incomeFilters, setIncomeFilters] = useState({
    member: '',
    memberId: '',
    description: '',
    paymentType: '',
    currency: '',
    custodian: ''
  })
  const [showFilterMemberDropdown, setShowFilterMemberDropdown] = useState(false)
  const [showFilterDescriptionDropdown, setShowFilterDescriptionDropdown] = useState(false)
  const [showFilterCustodianDropdown, setShowFilterCustodianDropdown] = useState(false)

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
    // const dots = (cleaned.match(/\./g) || []).length
    
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
    const dataToExport = filteredOtherIncomes.map(income => {
      const currency = (income as any).currency || 'ARS'
      const amount = Number(income.amount || 0)
      
      // Determinar "En posesión de": primero custodian, luego cuenta, luego socio
      let enPosesionDe = '-'
      if ((income as any).custodian && (income as any).custodian.trim()) {
        enPosesionDe = (income as any).custodian
      } else if ((income as any).account_name && (income as any).account_name.trim()) {
        enPosesionDe = (income as any).account_name
      } else if ((income as any).member_name && (income as any).member_name.trim()) {
        enPosesionDe = `Socio: ${(income as any).member_name}`
      }
      
      return {
        'Fecha': new Date(income.income_date).toLocaleDateString('es-AR'),
        'Socio': (income as any).member_name || '-',
        'Descripción': income.description || '-',
        'Tipo de Pago': income.payment_type || '-',
        'Monto ARS': currency === 'ARS' ? amount : 0,
        'Monto USD': currency === 'USD' ? amount : 0,
        'En posesión de': enPosesionDe
      }
    })

    // Agregar fila de totales
    const totals = {
      'Fecha': 'TOTALES',
      'Socio': '',
      'Descripción': '',
      'Tipo de Pago': '',
      'Monto ARS': filteredOtherIncomes
        .filter(i => !(i as any).currency || (i as any).currency === 'ARS')
        .reduce((sum, i) => sum + Number(i.amount || 0), 0),
      'Monto USD': filteredOtherIncomes
        .filter(i => (i as any).currency === 'USD')
        .reduce((sum, i) => sum + Number(i.amount || 0), 0),
      'En posesión de': ''
    }
    dataToExport.push(totals as any)

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(dataToExport)

    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 12 },  // Fecha
      { wch: 25 },  // Socio
      { wch: 30 },  // Descripción
      { wch: 15 },  // Tipo de Pago
      { wch: 15 },  // Monto ARS
      { wch: 15 },  // Monto USD
      { wch: 20 }   // En posesión de
    ]

    // Formatear la última fila (totales) en negrita
    const lastRowIndex = dataToExport.length
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: lastRowIndex - 1, c: col })
      if (!ws[cellAddress]) continue
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E6E6E6' } }
      }
    }

    // Agregar hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Otros Ingresos')

    // Generar nombre de archivo con fecha
    const fileName = `otros_ingresos_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`

    // Descargar archivo
    XLSX.writeFile(wb, fileName)
    toast.success('Archivo Excel descargado exitosamente')
  }

  const exportExpensesToExcel = () => {
    // Preparar datos para exportación
    const dataToExport = expenses.map(expense => {
      const currency = (expense as any).currency || 'ARS'
      const amount = Number(expense.amount || 0)
      
      // Determinar "En posesión de": primero custodian, luego cuenta
      let enPosesionDe = '-'
      if ((expense as any).custodian && (expense as any).custodian.trim()) {
        enPosesionDe = (expense as any).custodian
      } else if ((expense as any).account_name && (expense as any).account_name.trim()) {
        enPosesionDe = (expense as any).account_name
      }
      
      return {
        'Fecha': new Date(expense.expense_date).toLocaleDateString('es-AR'),
        'Monto ARS': currency === 'ARS' ? amount : 0,
        'Monto USD': currency === 'USD' ? amount : 0,
        'N° Recibo': expense.receipt_number || '-',
        'Detalle': expense.detail || '-',
        'En posesión de': enPosesionDe,
        'Pagado desde': (expense as any).account_name || '-'
      }
    })

    // Agregar fila de totales
    const totals = {
      'Fecha': 'TOTALES',
      'Monto ARS': expenses
        .filter(e => !(e as any).currency || (e as any).currency === 'ARS')
        .reduce((sum, e) => sum + Number(e.amount || 0), 0),
      'Monto USD': expenses
        .filter(e => (e as any).currency === 'USD')
        .reduce((sum, e) => sum + Number(e.amount || 0), 0),
      'N° Recibo': '',
      'Detalle': '',
      'En posesión de': '',
      'Pagado desde': ''
    }
    dataToExport.push(totals as any)

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(dataToExport)

    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 12 },  // Fecha
      { wch: 15 },  // Monto ARS
      { wch: 15 },  // Monto USD
      { wch: 12 },  // N° Recibo
      { wch: 30 },  // Detalle
      { wch: 20 },  // En posesión de
      { wch: 20 }   // Pagado desde
    ]

    // Formatear la última fila (totales) en negrita
    const lastRowIndex = dataToExport.length
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: lastRowIndex - 1, c: col })
      if (!ws[cellAddress]) continue
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E6E6E6' } }
      }
    }

    // Agregar hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos')

    // Generar nombre de archivo con fecha
    const fileName = `gastos_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`

    // Descargar archivo
    XLSX.writeFile(wb, fileName)
    toast.success('Archivo Excel descargado exitosamente')
  }

  const exportTransactionsToExcel = () => {
    // Preparar datos para exportación
    const dataToExport = transactions.map(tx => {
      const currency = tx.currency || 'ARS'
      const amount = Number(tx.amount || 0)
      
      // Separar montos por moneda
      const montoARS = currency === 'ARS' ? amount : 0
      const montoUSD = currency === 'USD' ? amount : 0
      
      // Determinar tipo de transacción en texto
      let tipoTransaccion = ''
      switch (tx.transaction_type) {
        case 'income_tournament':
          tipoTransaccion = 'Ingreso Torneo'
          break
        case 'income_other':
          tipoTransaccion = 'Otro Ingreso'
          break
        case 'expense':
          tipoTransaccion = 'Gasto'
          break
        case 'transfer':
          tipoTransaccion = 'Transferencia'
          break
        case 'exchange':
          tipoTransaccion = 'Conversión'
          break
        default:
          tipoTransaccion = tx.transaction_type || '-'
      }
      
      // Información adicional según el tipo
      let infoAdicional = ''
      if (tx.transaction_type === 'income_other') {
        const parts = []
        if ((tx as any).member_name) parts.push(`Socio: ${(tx as any).member_name}`)
        if ((tx as any).additional_info) parts.push(`Tipo: ${(tx as any).additional_info}`)
        if ((tx as any).custodian) parts.push(`En posesión: ${(tx as any).custodian}`)
        infoAdicional = parts.join(' | ')
      } else if (tx.transaction_type === 'expense') {
        const parts = []
        if ((tx as any).additional_info) parts.push(`Recibo: ${(tx as any).additional_info}`)
        if ((tx as any).custodian) parts.push(`En posesión: ${(tx as any).custodian}`)
        infoAdicional = parts.join(' | ')
      } else if (tx.transaction_type === 'exchange' && (tx as any).additional_info) {
        infoAdicional = (tx as any).additional_info
      }
      
      return {
        'Fecha': new Date(tx.transaction_date).toLocaleDateString('es-AR'),
        'Tipo': tipoTransaccion,
        'Desde Cuenta': tx.from_account_name || '-',
        'Hacia Cuenta': tx.to_account_name || '-',
        'Monto ARS': montoARS,
        'Monto USD': montoUSD,
        'Descripción': tx.description || '-',
        'Información Adicional': infoAdicional || '-'
      }
    })
    
    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 12 },  // Fecha
      { wch: 15 },  // Tipo
      { wch: 20 },  // Desde Cuenta
      { wch: 20 },  // Hacia Cuenta
      { wch: 15 },  // Monto ARS
      { wch: 15 },  // Monto USD
      { wch: 30 },  // Descripción
      { wch: 40 }   // Información Adicional
    ]
    
    // Agregar hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Historial de Movimientos')
    
    // Generar nombre de archivo con fecha
    const fileName = `historial_movimientos_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`
    
    // Descargar archivo
    XLSX.writeFile(wb, fileName)
    toast.success('Archivo Excel descargado exitosamente')
  }

  const exportAccountsBalanceToExcel = () => {
    if (!accounts || accounts.length === 0) {
      toast.error('No hay cuentas para exportar')
      return
    }

    // Preparar datos para exportación
    const dataToExport = accounts.map(account => ({
      'Cuenta': account.account_name,
      'Saldo ARS': Number(account.current_balance_ars || 0),
      'Saldo USD': Number(account.current_balance_usd || 0),
      'Descripción': account.description || '-'
    }))
    
    // Agregar fila de totales
    const totalARS = accounts.reduce((sum, acc) => sum + Number(acc.current_balance_ars || 0), 0)
    const totalUSD = accounts.reduce((sum, acc) => sum + Number(acc.current_balance_usd || 0), 0)
    
    const totals = {
      'Cuenta': 'TOTALES',
      'Saldo ARS': totalARS,
      'Saldo USD': totalUSD,
      'Descripción': ''
    }
    
    dataToExport.push(totals)
    
    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 25 },  // Cuenta
      { wch: 15 },  // Saldo ARS
      { wch: 15 },  // Saldo USD
      { wch: 40 }   // Descripción
    ]
    
    // Formatear la última fila (totales) en negrita
    const lastRowIndex = dataToExport.length
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: lastRowIndex - 1, c: col })
      if (!ws[cellAddress]) continue
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E6E6E6' } }
      }
    }
    
    // Agregar hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Estado de Cuentas')
    
    // Generar nombre de archivo con fecha
    const fileName = `estado_cuentas_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`
    
    // Descargar archivo
    XLSX.writeFile(wb, fileName)
    toast.success('Archivo Excel descargado exitosamente')
  }

  const exportCurrencyExchangesToExcel = () => {
    // Preparar datos para exportación
    const dataToExport = currencyExchanges.map(exchange => {
      // Separar montos por moneda
      const fromAmountARS = exchange.from_currency === 'ARS' ? Number(exchange.from_amount || 0) : 0
      const fromAmountUSD = exchange.from_currency === 'USD' ? Number(exchange.from_amount || 0) : 0
      const toAmountARS = exchange.to_currency === 'ARS' ? Number(exchange.to_amount || 0) : 0
      const toAmountUSD = exchange.to_currency === 'USD' ? Number(exchange.to_amount || 0) : 0
      
      return {
        'Fecha': new Date(exchange.exchange_date).toLocaleDateString('es-AR'),
        'Desde Moneda': exchange.from_currency,
        'Desde Monto ARS': fromAmountARS,
        'Desde Monto USD': fromAmountUSD,
        'Desde Cuenta': exchange.from_account_name || '-',
        'Hacia Moneda': exchange.to_currency,
        'Hacia Monto ARS': toAmountARS,
        'Hacia Monto USD': toAmountUSD,
        'Hacia Cuenta': exchange.to_account_name || '-',
        'Tasa de Cambio': Number(exchange.exchange_rate || 0),
        'Notas': exchange.notes || '-'
      }
    })

    // Agregar fila de totales
    const totals = {
      'Fecha': 'TOTALES',
      'Desde Moneda': '',
      'Desde Monto ARS': currencyExchanges
        .filter(e => e.from_currency === 'ARS')
        .reduce((sum, e) => sum + Number(e.from_amount || 0), 0),
      'Desde Monto USD': currencyExchanges
        .filter(e => e.from_currency === 'USD')
        .reduce((sum, e) => sum + Number(e.from_amount || 0), 0),
      'Desde Cuenta': '',
      'Hacia Moneda': '',
      'Hacia Monto ARS': currencyExchanges
        .filter(e => e.to_currency === 'ARS')
        .reduce((sum, e) => sum + Number(e.to_amount || 0), 0),
      'Hacia Monto USD': currencyExchanges
        .filter(e => e.to_currency === 'USD')
        .reduce((sum, e) => sum + Number(e.to_amount || 0), 0),
      'Hacia Cuenta': '',
      'Tasa de Cambio': '',
      'Notas': ''
    }
    dataToExport.push(totals as any)

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(dataToExport)

    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 12 },  // Fecha
      { wch: 12 },  // Desde Moneda
      { wch: 15 },  // Desde Monto ARS
      { wch: 15 },  // Desde Monto USD
      { wch: 20 },  // Desde Cuenta
      { wch: 12 },  // Hacia Moneda
      { wch: 15 },  // Hacia Monto ARS
      { wch: 15 },  // Hacia Monto USD
      { wch: 20 },  // Hacia Cuenta
      { wch: 15 },  // Tasa de Cambio
      { wch: 30 }   // Notas
    ]

    // Formatear la última fila (totales) en negrita
    const lastRowIndex = dataToExport.length
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: lastRowIndex - 1, c: col })
      if (!ws[cellAddress]) continue
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E6E6E6' } }
      }
    }

    // Agregar hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Conversiones')

    // Generar nombre de archivo con fecha
    const fileName = `conversiones_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`

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

  // Obtener lista única de "En posesión de" (custodian, cuenta o socio)
  const uniqueCustodians = useMemo(() => {
    const custodiansList: string[] = []
    otherIncomes.forEach(income => {
      // Primero custodian
      if ((income as any).custodian && (income as any).custodian.trim()) {
        const custodian = (income as any).custodian.trim()
        if (!custodiansList.includes(custodian)) {
          custodiansList.push(custodian)
        }
      }
      // Luego cuenta
      if ((income as any).account_name && (income as any).account_name.trim()) {
        const accountName = (income as any).account_name.trim()
        if (!custodiansList.includes(accountName)) {
          custodiansList.push(accountName)
        }
      }
      // Finalmente socio (solo si no hay custodian ni cuenta)
      if (!(income as any).custodian && !(income as any).account_name) {
        if ((income as any).member_name && (income as any).member_name.trim()) {
          const memberName = `Socio: ${(income as any).member_name.trim()}`
          if (!custodiansList.includes(memberName)) {
            custodiansList.push(memberName)
          }
        }
      }
    })
    return custodiansList.sort()
  }, [otherIncomes])

  // Agrupar otros ingresos por descripción para mostrar en balance (no usado actualmente)
  // const groupedOtherIncomes = useMemo(() => {
  //   const groups: { [key: string]: { description: string; amountARS: number; amountUSD: number } } = {}
  //   
  //   otherIncomes.forEach(income => {
  //     const desc = income.description || 'Sin descripción'
  //     if (!groups[desc]) {
  //       groups[desc] = { description: desc, amountARS: 0, amountUSD: 0 }
  //     }
  //     const currency = (income as any).currency || 'ARS'
  //     if (currency === 'USD') {
  //       groups[desc].amountUSD += Number(income.amount || 0)
  //     } else {
  //       groups[desc].amountARS += Number(income.amount || 0)
  //     }
  //   })
  //   
  //   return Object.values(groups).sort((a, b) => {
  //     const totalA = a.amountARS + a.amountUSD
  //     const totalB = b.amountARS + b.amountUSD
  //     return totalB - totalA // Mayor a menor
  //   })
  // }, [otherIncomes])

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
  
  // Balance neto ahora usa currencyBalance directamente (incluye conversiones)
  // const netBalance = useMemo(() => {
  //   return totalAllIncomes - totalExpenses
  // }, [totalAllIncomes, totalExpenses])

  // const netBalanceARS = useMemo(() => {
  //   return totalPaid + totalOtherIncomesARS - totalExpensesARS
  // }, [totalPaid, totalOtherIncomesARS, totalExpensesARS])

  // const netBalanceUSD = useMemo(() => {
  //   return totalOtherIncomesUSD - totalExpensesUSD
  // }, [totalOtherIncomesUSD, totalExpensesUSD])

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
      
      // Filtrar por "En posesión de": custodian, cuenta o socio
      const matchesCustodian = !incomeFilters.custodian || (() => {
        const filterLower = incomeFilters.custodian.toLowerCase()
        const custodian = ((income as any).custodian || '').toLowerCase()
        const accountName = ((income as any).account_name || '').toLowerCase()
        const memberName = ((income as any).member_name || '').toLowerCase()
        return custodian.includes(filterLower) || accountName.includes(filterLower) || memberName.includes(filterLower)
      })()

      return matchesMember && matchesDescription && matchesPaymentType && matchesCurrency && matchesCustodian
    })
  }, [otherIncomes, incomeFilters])

  // Total of filtered other incomes por moneda
  const filteredOtherIncomesTotalARS = useMemo(() => {
    return filteredOtherIncomes
      .filter(i => !(i as any).currency || (i as any).currency === 'ARS')
      .reduce((sum, income) => sum + Number(income.amount || 0), 0)
  }, [filteredOtherIncomes])

  const filteredOtherIncomesTotalUSD = useMemo(() => {
    return filteredOtherIncomes
      .filter(i => (i as any).currency === 'USD')
      .reduce((sum, income) => sum + Number(income.amount || 0), 0)
  }, [filteredOtherIncomes])

  // No set default date - show all tournaments by default
  // User can filter by date if needed

  useEffect(() => {
    const load = async () => {
      if (!clubIdNum) return
      setLoading(true)
      try {
        // Always load incomes, other incomes, expenses, currency exchanges, custodians, accounts, and currency balance
        const promises: Promise<any>[] = [
          paymentsService.getSummary(clubIdNum, { from: from || undefined, to: to || undefined }),
          paymentsService.getOtherIncomes(clubIdNum, { from: from || undefined, to: to || undefined }),
          paymentsService.getExpenses(clubIdNum, { from: from || undefined, to: to || undefined }),
          paymentsService.getCurrencyExchanges(clubIdNum, { from: from || undefined, to: to || undefined }),
          paymentsService.getCustodians(clubIdNum),
          accountsService.getAccounts(clubIdNum),
          paymentsService.getCurrencyBalance(clubIdNum)
        ]
        
        const results = await Promise.all(promises)
        const [incomesData, otherIncomesData, expensesData, exchangesData, custodiansData, accountsData, balanceData] = results
        
        // Filtrar torneos vigentes para usuarios sin permiso de totales
        const filteredIncomesData = permissions.canViewFinancialTotals
          ? incomesData
          : incomesData.filter((row: any) => 
              row.status === 'in_progress' || row.status === 'open'
            )
        
        setRows(filteredIncomesData)
        setOtherIncomes(otherIncomesData)
        setExpenses(expensesData)
        setCurrencyExchanges(exchangesData)
        setCustodians(custodiansData)
        setAccounts(accountsData)
        setCurrencyBalance(balanceData)
      } catch (error) {
        console.error('❌ Error cargando contabilidad:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clubIdNum, from, to, permissions.canViewFinancialTotals])
  
  // Cargar transacciones cuando se selecciona la pestaña Cuentas
  useEffect(() => {
    const loadTransactions = async () => {
      if (!clubIdNum || tab !== 'cuentas') return
      try {
        const transactionsData = await accountsService.getTransactions(clubIdNum, { from: from || undefined, to: to || undefined })
        // Debug: verificar datos adicionales
        if (transactionsData.length > 0) {
          const sampleTx = transactionsData.find((t: any) => t.transaction_type === 'income_other')
          if (sampleTx) {
            console.log('🔍 Sample transaction with income_other:', sampleTx)
          }
        }
        setTransactions(transactionsData)
      } catch (error) {
        console.error('❌ Error cargando transacciones:', error)
      }
    }
    loadTransactions()
  }, [clubIdNum, from, to, tab])

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

  // Suprimir warnings TS6133 de variables no usadas temporalmente
  if (false) { console.log(custodians, showCustodianDropdown, totalAllIncomes, totalExpenses) }

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
            {permissions.canViewPhotos && (
              <button
                onClick={() => navigate(`/club/${clubId}/admin?tab=photos`)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent transition-colors"
              >
                <Camera className="h-4 w-4" />
                Fotos
              </button>
            )}
            {permissions.canViewSettings && (
              <button
                onClick={() => navigate(`/club/${clubId}/admin?tab=settings`)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent transition-colors"
              >
                <Settings className="h-4 w-4" />
                Configuración
              </button>
            )}
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
              {permissions.canViewBalance && permissions.canViewFinancialTotals && (
                <button
                  onClick={() => setTab('balance')}
                  className={`px-3 py-2 rounded ${tab==='balance' ? 'bg-gray-900 text-white' : 'border'}`}
                >
                  Balance
                </button>
              )}
              {permissions.canViewTournamentIncomes && (
                <button
                  onClick={() => setTab('ingresos')}
                  className={`px-3 py-2 rounded ${tab==='ingresos' ? 'bg-gray-900 text-white' : 'border'}`}
                >
                  Ingresos Torneos
                </button>
              )}
              {permissions.canViewOtherIncomes && (
                <button
                  onClick={() => setTab('otros_ingresos')}
                  className={`px-3 py-2 rounded ${tab==='otros_ingresos' ? 'bg-gray-900 text-white' : 'border'}`}
                >
                  Otros Ingresos
                </button>
              )}
              {permissions.canViewExpenses && (
                <button
                  onClick={() => setTab('gastos')}
                  className={`px-3 py-2 rounded ${tab==='gastos' ? 'bg-gray-900 text-white' : 'border'}`}
                >
                  Gastos
                </button>
              )}
              {permissions.canViewCurrencyExchanges && (
                <button
                  onClick={() => setTab('conversiones')}
                  className={`px-3 py-2 rounded ${tab==='conversiones' ? 'bg-gray-900 text-white' : 'border'}`}
                >
                  Conversiones
                </button>
              )}
              {permissions.canViewAccounting && (
                <button
                  onClick={() => setTab('cuentas')}
                  className={`px-3 py-2 rounded ${tab==='cuentas' ? 'bg-gray-900 text-white' : 'border'}`}
                >
                  Cuentas
                </button>
              )}
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
                {permissions.canManageOtherIncomes && (
                  <button onClick={() => {
                    const today = getLocalDateString()
                    setIncomeDraft({ member_id: '', income_date: today, amount: '', currency: 'ARS', payment_type: 'efectivo', description: '', custodian: '', account_id: '' })
                    setMemberSearchText('')
                    setShowMemberDropdown(false)
                    setShowCustodianDropdown(false)
                    setShowDescriptionDropdown(false)
                    setShowIncomeModal(true)
                  }} className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                    Agregar ingreso
                  </button>
                )}
              </div>
            )}
            {tab==='gastos' && permissions.canManageExpenses && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={exportExpensesToExcel}
                  className="flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </button>
                <button onClick={() => {
                  const today = getLocalDateString()
                  setExpenseDraft({ expense_date: today, amount: '', currency: 'ARS', receipt_number: '', detail: '', custodian: '', account_id: '' })
                  setShowExpenseModal(true)
                }} className="px-3 py-2 bg-gray-900 text-white rounded hover:bg-gray-800">
                  Agregar gasto
                </button>
              </div>
            )}
            {tab==='conversiones' && permissions.canManageCurrencyExchanges && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={exportCurrencyExchangesToExcel}
                  className="flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </button>
                <button onClick={async () => {
                  const today = getLocalDateString()
                  setExchangeDraft({ 
                    exchange_date: today, 
                    from_currency: 'ARS', 
                    from_amount: '', 
                    to_currency: 'USD', 
                    to_amount: '', 
                    exchange_rate: '',
                    notes: '',
                    from_account_id: '',
                    to_account_id: ''
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
            {permissions.canViewFinancialTotals && (
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
                    <div className={`p-2 rounded-lg ${currencyBalance.ARS >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                      <DollarSign className={`h-5 w-5 ${currencyBalance.ARS >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className={`text-2xl font-bold ${currencyBalance.ARS >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      ${formatCurrency(Math.abs(currencyBalance.ARS))}
                    </div>
                    <div className={`text-xl font-bold ${currencyBalance.USD >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      US${formatCurrency(Math.abs(currencyBalance.USD))}
                    </div>
                  </div>
                  <p className={`text-sm font-medium mt-2 ${currencyBalance.ARS >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    {currencyBalance.ARS >= 0 ? 'Superávit' : 'Déficit'}
                  </p>
                </div>
              </div>
            )}
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
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">En posesión de</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cobrado</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRows.map((r) => (
                      <tr key={r.tournament_id}>
                        <td className="px-4 py-2">{r.tournament_name}</td>
                        <td className="px-4 py-2">
                          {(r as any).account_name ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                              💰 {(r as any).account_name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-medium">
                              ⚠️ Pendiente asignar
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-semibold">${formatCurrency(Number(r.total_paid || 0))}</td>
                        <td className="px-4 py-2 text-center">
                          {permissions.canViewAccounting && (
                            <button
                              onClick={async () => {
                                const selectedAccount = (r as any).account_id ? (r as any).account_id.toString() : ''
                                const accountId = prompt(`Selecciona cuenta para "${r.tournament_name}":\n\n` + 
                                  accounts.map(a => `${a.account_id} - ${a.account_name}`).join('\n') +
                                  '\n\nIngresa el número de cuenta:', selectedAccount)
                                
                                if (accountId !== null && accountId !== '') {
                                  try {
                                    const account = accounts.find(a => a.account_id.toString() === accountId)
                                    if (!account) {
                                      toast.error('Cuenta no válida')
                                      return
                                    }
                                    
                                    // Actualizar torneo con account_id
                                    await fetch(`/api/club/${clubIdNum}/tournaments/${r.tournament_id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ 
                                        tournament_name: r.tournament_name,
                                        tournament_date: r.tournament_date,
                                        tournament_type: 'stroke_play',
                                        account_id: parseInt(accountId)
                                      })
                                    })
                                    
                                    toast.success('Cuenta actualizada')
                                    // Recargar datos
                                    const data = await paymentsService.getSummary(clubIdNum, { from: from || undefined, to: to || undefined })
                                    setRows(data)
                                  } catch (error) {
                                    toast.error('Error al actualizar cuenta')
                                  }
                                }
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Cambiar cuenta"
                            >
                              <Pencil className="h-4 w-4 inline" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {permissions.canViewFinancialTotals && (
                    <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                      <tr>
                        <td className="px-4 py-3 font-bold text-gray-900">TOTAL GENERAL</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 font-bold text-green-700 text-lg">
                          ${formatCurrency(filteredTotalPaid)}
                        </td>
                        <td className="px-4 py-3"></td>
                      </tr>
                    </tfoot>
                  )}
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
              <div className="relative filter-custodian-dropdown">
                <label className="block text-sm font-medium text-gray-700 mb-1">En posesión de</label>
                <div className="relative">
                  <input
                    type="text"
                    value={incomeFilters.custodian}
                    onChange={(e) => {
                      setIncomeFilters(f => ({ ...f, custodian: e.target.value }))
                      setShowFilterCustodianDropdown(true)
                    }}
                    onFocus={() => setShowFilterCustodianDropdown(true)}
                    placeholder="Buscar por custodian, cuenta o socio..."
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                  {incomeFilters.custodian && (
                    <button
                      type="button"
                      onClick={() => {
                        setIncomeFilters(f => ({ ...f, custodian: '' }))
                        setShowFilterCustodianDropdown(false)
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {showFilterCustodianDropdown && (() => {
                  const filteredCustodians = uniqueCustodians.filter(custodian => 
                    !incomeFilters.custodian || custodian.toLowerCase().includes(incomeFilters.custodian.toLowerCase())
                  )
                  
                  if (filteredCustodians.length === 0) return null
                  
                  return (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-blue-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      <div className="px-3 py-2 bg-blue-50 border-b">
                        <p className="text-xs text-blue-700 font-medium">💡 En posesión de:</p>
                      </div>
                      {filteredCustodians.map((custodian, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIncomeFilters(f => ({ ...f, custodian: custodian }))
                            setShowFilterCustodianDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b last:border-b-0 text-sm"
                        >
                          {custodian}
                        </button>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setIncomeFilters({ member: '', memberId: '', description: '', paymentType: '', currency: '', custodian: '' })}
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">En posesión de</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOtherIncomes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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
                        <td className="px-4 py-2">
                          {(income as any).account_name ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                              💰 {(income as any).account_name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-medium">
                              ⚠️ Pendiente asignar
                            </span>
                          )}
                        </td>
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
                            {permissions.canManageOtherIncomes && (
                              <>
                                <button
                                  onClick={() => {
                                    const formattedAmount = formatForDisplay(income.amount.toString())
                                    setIncomeDraft({
                                      member_id: (income as any).member_id ? (income as any).member_id.toString() : '',
                                      income_date: new Date(income.income_date).toISOString().split('T')[0],
                                      amount: formattedAmount,
                                      currency: (income as any).currency || 'ARS',
                                      payment_type: income.payment_type || 'efectivo',
                                      description: income.description || '',
                                      custodian: (income as any).custodian || '',
                                      account_id: (income as any).account_id ? (income as any).account_id.toString() : ''
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
                                        // Reload currency balance
                                        const balance = await paymentsService.getCurrencyBalance(clubIdNum)
                                        setCurrencyBalance(balance)
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
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {permissions.canViewFinancialTotals && (
                  <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 font-bold text-gray-900">
                        TOTAL {showIncomeFilters && Object.values(incomeFilters).some(v => v) && '(Filtrado)'}
                      </td>
                      <td className="px-4 py-3 font-bold text-green-700 text-lg text-center">
                        {filteredOtherIncomesTotalARS > 0 && (
                          <div>
                            ${formatCurrency(filteredOtherIncomesTotalARS)}
                          </div>
                        )}
                        {filteredOtherIncomesTotalUSD > 0 && (
                          <div className="mt-1">
                            US${formatCurrency(filteredOtherIncomesTotalUSD)}
                          </div>
                        )}
                        {filteredOtherIncomesTotalARS === 0 && filteredOtherIncomesTotalUSD === 0 && (
                          <div>$0,00</div>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                )}
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pagado desde</th>
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
                      <td className="px-4 py-2">
                        {(e as any).account_name ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">
                            ↗️ {(e as any).account_name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-medium">
                            ⚠️ Pendiente asignar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {permissions.canManageExpenses && (
                            <>
                              <button
                                onClick={() => {
                                  const formattedAmount = formatForDisplay(e.amount.toString())
                                  setExpenseDraft({
                                    expense_date: new Date(e.expense_date).toISOString().split('T')[0],
                                    amount: formattedAmount,
                                    currency: (e as any).currency || 'ARS',
                                    receipt_number: e.receipt_number || '',
                                    detail: e.detail || '',
                                    custodian: (e as any).custodian || '',
                                    account_id: (e as any).account_id ? (e as any).account_id.toString() : ''
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
                                      // Reload currency balance
                                      const balance = await paymentsService.getCurrencyBalance(clubIdNum)
                                      setCurrencyBalance(balance)
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
                            </>
                          )}
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">De (Sale)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cuenta Origen</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">A (Entra)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cuenta Destino</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tasa</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currencyExchanges.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
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
                        <td className="px-4 py-2">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                            📤 {ex.from_account_name || 'Sin asignar'}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-semibold text-blue-600">
                          {ex.to_currency === 'USD' ? 'US$' : '$'}{formatCurrency(Number(ex.to_amount || 0))} {ex.to_currency}
                        </td>
                        <td className="px-4 py-2">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                            📥 {ex.to_account_name || 'Sin asignar'}
                          </span>
                        </td>
                        <td className="px-4 py-2">{formatCurrency(Number(ex.exchange_rate || 0))}</td>
                        <td className="px-4 py-2">{ex.notes || '-'}</td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {permissions.canManageCurrencyExchanges && (
                              <>
                                <button
                                  onClick={async () => {
                                    setExchangeDraft({
                                      exchange_date: new Date(ex.exchange_date).toISOString().split('T')[0],
                                      from_currency: ex.from_currency,
                                      from_amount: formatForDisplay(ex.from_amount.toString()),
                                      to_currency: ex.to_currency,
                                      to_amount: formatForDisplay(ex.to_amount.toString()),
                                      exchange_rate: formatForDisplay(ex.exchange_rate.toString()),
                                      notes: ex.notes || '',
                                      from_account_id: ex.from_account_id?.toString() || '',
                                      to_account_id: ex.to_account_id?.toString() || ''
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
                              </>
                            )}
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

        {/* Tab: Cuentas */}
        {tab==='cuentas' && (
          <div className="space-y-6">
            {/* Botones de acción - Todos juntos en una línea */}
            {permissions.canViewAccounting && (
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => {
                    setAccountDraft({ account_name: '', description: '' })
                    setShowAccountModal(true)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Crear Nueva Cuenta
                </button>
                {accounts && accounts.length > 0 && (
                  <button
                    onClick={exportAccountsBalanceToExcel}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exportar Estado de Cuentas
                  </button>
                )}
                {accounts && accounts.length >= 2 && (
                  <button
                    onClick={() => {
                      const today = getLocalDateString()
                      setTransferDraft({ from_account_id: '', to_account_id: '', amount: '', currency: 'ARS', description: '', transaction_date: today })
                      setShowTransferModal(true)
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    Transferir entre cuentas
                  </button>
                )}
                {transactions.length > 0 && (
                  <button
                    onClick={exportTransactionsToExcel}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exportar Historial
                  </button>
                )}
              </div>
            )}

            {/* Dashboard de Saldos */}
            {accounts && accounts.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Cuentas</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {accounts.map(account => (
                  <div key={account.account_id} className="bg-white rounded-lg border p-4 relative">
                    <h3 className="font-semibold text-gray-900 mb-2">{account.account_name}</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">ARS:</span>
                        <span className="font-semibold text-green-600">
                          ${formatCurrency(Number(account.current_balance_ars || 0))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">USD:</span>
                        <span className="font-semibold text-blue-600">
                          US${formatCurrency(Number(account.current_balance_usd || 0))}
                        </span>
                      </div>
                    </div>
                    {account.description && (
                      <p className="text-xs text-gray-500 mt-2">{account.description}</p>
                    )}
                    {/* Botón eliminar - solo si saldo es 0 */}
                    {permissions.canViewAccounting && parseFloat(account.current_balance_ars) === 0 && parseFloat(account.current_balance_usd) === 0 && (
                      <button
                        onClick={async () => {
                          if (confirm(`¿Eliminar la cuenta "${account.account_name}"?\n\nEsta acción no se puede deshacer.`)) {
                            try {
                              await accountsService.deleteAccount(clubIdNum, account.account_id)
                              toast.success('Cuenta eliminada exitosamente')
                              const accountsData = await accountsService.getAccounts(clubIdNum)
                              setAccounts(accountsData)
                            } catch (error: any) {
                              toast.error(error?.response?.data?.error || 'Error al eliminar cuenta')
                            }
                          }
                        }}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                        title="Eliminar cuenta"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <DollarSign className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay cuentas creadas</h3>
                <p className="text-gray-600 mb-4">
                  Creá tu primera cuenta para comenzar a gestionar el dinero del club
                </p>
              </div>
            )}

            {/* Movimientos Pendientes de Asignar */}
            {(() => {
              const pendingIncomesARS = otherIncomes.filter(i => !(i as any).account_id && (i as any).currency !== 'USD').reduce((sum, i) => sum + Number(i.amount || 0), 0)
              const pendingIncomesUSD = otherIncomes.filter(i => !(i as any).account_id && (i as any).currency === 'USD').reduce((sum, i) => sum + Number(i.amount || 0), 0)
              const pendingExpensesARS = expenses.filter(e => !(e as any).account_id && (e as any).currency !== 'USD').reduce((sum, e) => sum + Number(e.amount || 0), 0)
              const pendingExpensesUSD = expenses.filter(e => !(e as any).account_id && (e as any).currency === 'USD').reduce((sum, e) => sum + Number(e.amount || 0), 0)
              const balancePendingARS = pendingIncomesARS - pendingExpensesARS
              const balancePendingUSD = pendingIncomesUSD - pendingExpensesUSD
              
              const hasPending = pendingIncomesARS > 0 || pendingIncomesUSD > 0 || pendingExpensesARS > 0 || pendingExpensesUSD > 0

              if (!hasPending) return null

              return (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">⚠️</span>
                    <h3 className="text-lg font-bold text-orange-800">Pendientes de Asignar Cuenta</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Ingresos pendientes */}
                    {(pendingIncomesARS > 0 || pendingIncomesUSD > 0) && (
                      <div className="bg-white rounded-lg p-4 border border-orange-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Ingresos sin cuenta</h4>
                        {pendingIncomesARS > 0 && (
                          <div className="text-lg font-bold text-green-600">
                            +${formatCurrency(pendingIncomesARS)}
                          </div>
                        )}
                        {pendingIncomesUSD > 0 && (
                          <div className="text-lg font-bold text-green-600">
                            +US${formatCurrency(pendingIncomesUSD)}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Gastos pendientes */}
                    {(pendingExpensesARS > 0 || pendingExpensesUSD > 0) && (
                      <div className="bg-white rounded-lg p-4 border border-orange-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Gastos sin cuenta</h4>
                        {pendingExpensesARS > 0 && (
                          <div className="text-lg font-bold text-red-600">
                            -${formatCurrency(pendingExpensesARS)}
                          </div>
                        )}
                        {pendingExpensesUSD > 0 && (
                          <div className="text-lg font-bold text-red-600">
                            -US${formatCurrency(pendingExpensesUSD)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Total pendiente */}
                  <div className="mt-4 pt-4 border-t border-orange-300">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">Balance Pendiente:</span>
                      <div className="text-right">
                        {balancePendingARS !== 0 && (
                          <div className={`text-xl font-bold ${balancePendingARS >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {balancePendingARS >= 0 ? '+' : ''}${formatCurrency(balancePendingARS)}
                          </div>
                        )}
                        {balancePendingUSD !== 0 && (
                          <div className={`text-xl font-bold ${balancePendingUSD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {balancePendingUSD >= 0 ? '+' : ''}US${formatCurrency(balancePendingUSD)}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-orange-700 mt-2">
                      💡 Asigná cuentas a estos movimientos desde las pestañas "Otros Ingresos" y "Gastos"
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Historial de Transacciones */}
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900">Historial de Movimientos</h3>
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-6 text-center text-gray-600">Cargando...</div>
                ) : transactions.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No hay transacciones registradas
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Desde</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hacia</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map(tx => (
                        <tr key={tx.transaction_id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(tx.transaction_date).toLocaleDateString('es-AR')}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <div className="space-y-1">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                tx.transaction_type === 'income_tournament' ? 'bg-green-100 text-green-800' :
                                tx.transaction_type === 'income_other' ? 'bg-blue-100 text-blue-800' :
                                tx.transaction_type === 'expense' ? 'bg-red-100 text-red-800' :
                                tx.transaction_type === 'transfer' ? 'bg-purple-100 text-purple-800' :
                                tx.transaction_type === 'exchange' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {tx.transaction_type === 'income_tournament' ? 'Ingreso Torneo' :
                                 tx.transaction_type === 'income_other' ? 'Otro Ingreso' :
                                 tx.transaction_type === 'expense' ? 'Gasto' :
                                 tx.transaction_type === 'transfer' ? 'Transferencia' :
                                 tx.transaction_type === 'exchange' ? 'Conversión' :
                                 tx.transaction_type}
                              </span>
                              {/* Información adicional según el tipo */}
                              {tx.transaction_type === 'income_other' && (tx as any).member_name && (
                                <div className="text-xs text-gray-600">
                                  👤 {(tx as any).member_name}
                                </div>
                              )}
                              {tx.transaction_type === 'income_other' && (tx as any).additional_info && (
                                <div className="text-xs text-gray-500 capitalize">
                                  💳 {(tx as any).additional_info}
                                </div>
                              )}
                              {tx.transaction_type === 'income_other' && (tx as any).custodian && (
                                <div className="text-xs text-gray-500">
                                  👤 En posesión: {(tx as any).custodian}
                                </div>
                              )}
                              {tx.transaction_type === 'expense' && (tx as any).additional_info && (
                                <div className="text-xs text-gray-500">
                                  🧾 Recibo: {(tx as any).additional_info}
                                </div>
                              )}
                              {tx.transaction_type === 'expense' && (tx as any).custodian && (
                                <div className="text-xs text-gray-500">
                                  👤 En posesión: {(tx as any).custodian}
                                </div>
                              )}
                              {tx.transaction_type === 'exchange' && (tx as any).additional_info && (
                                <div className="text-xs text-gray-500">
                                  {(tx as any).additional_info}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {tx.from_account_name || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {tx.to_account_name || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            <span className={`font-semibold ${
                              tx.transaction_type === 'expense' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {tx.currency === 'USD' ? 'US$' : '$'}
                              {formatCurrency(Number(tx.amount || 0))}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            <div className="space-y-1">
                              <div>{tx.description || '-'}</div>
                              {/* Mostrar información adicional en la descripción si no hay en el tipo */}
                              {tx.transaction_type === 'income_other' && !(tx as any).member_name && tx.description && (
                                <div className="text-xs text-gray-400 italic">
                                  {tx.description}
                                </div>
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
          </div>
        )}

        {/* Modal: Crear/Editar Cuenta */}
        {showAccountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowAccountModal(false)} />
            <div className="relative mx-auto w-full max-w-md bg-white rounded-lg shadow-xl">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold">Nueva Cuenta</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nombre de la cuenta *</label>
                  <input
                    type="text"
                    value={accountDraft.account_name}
                    onChange={(e) => setAccountDraft(d => ({ ...d, account_name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Ej: Caja del club, Tesorero, Cuenta banco"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Descripción (opcional)</label>
                  <textarea
                    value={accountDraft.description}
                    onChange={(e) => setAccountDraft(d => ({ ...d, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                    rows={3}
                    placeholder="Ej: Dinero en efectivo guardado en la caja fuerte del club"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowAccountModal(false)
                    setAccountDraft({ account_name: '', description: '' })
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!accountDraft.account_name.trim()) {
                      toast.error('El nombre de la cuenta es requerido')
                      return
                    }
                    try {
                      await accountsService.createAccount(clubIdNum, accountDraft)
                      toast.success('Cuenta creada exitosamente')
                      setShowAccountModal(false)
                      setAccountDraft({ account_name: '', description: '' })
                      // Recargar cuentas
                      const data = await accountsService.getAccounts(clubIdNum)
                      setAccounts(data)
                    } catch (error: any) {
                      toast.error(error?.response?.data?.error || 'Error al crear cuenta')
                    }
                  }}
                  disabled={!accountDraft.account_name.trim()}
                  className={`px-4 py-2 rounded ${
                    !accountDraft.account_name.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Crear Cuenta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Transferencia entre Cuentas */}
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowTransferModal(false)} />
            <div className="relative mx-auto w-full max-w-md bg-white rounded-lg shadow-xl">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold">Transferir entre Cuentas</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={transferDraft.transaction_date}
                    onChange={(e) => setTransferDraft(d => ({ ...d, transaction_date: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Desde (cuenta origen) *</label>
                  <select
                    value={transferDraft.from_account_id}
                    onChange={(e) => setTransferDraft(d => ({ ...d, from_account_id: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">Seleccionar...</option>
                    {accounts.filter(a => a.account_id.toString() !== transferDraft.to_account_id).map(account => (
                      <option key={account.account_id} value={account.account_id}>
                        {account.account_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Hacia (cuenta destino) *</label>
                  <select
                    value={transferDraft.to_account_id}
                    onChange={(e) => setTransferDraft(d => ({ ...d, to_account_id: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">Seleccionar...</option>
                    {accounts.filter(a => a.account_id.toString() !== transferDraft.from_account_id).map(account => (
                      <option key={account.account_id} value={account.account_id}>
                        {account.account_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Monto *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={transferDraft.amount}
                      onChange={(e) => {
                        const validated = validateNumberInput(e.target.value)
                        setTransferDraft(d => ({ ...d, amount: validated }))
                      }}
                      className="flex-1 px-3 py-2 border rounded"
                      placeholder="0,00"
                    />
                    <select
                      value={transferDraft.currency}
                      onChange={(e) => setTransferDraft(d => ({ ...d, currency: e.target.value }))}
                      className="w-20 px-2 py-2 border rounded"
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Descripción (opcional)</label>
                  <textarea
                    value={transferDraft.description}
                    onChange={(e) => setTransferDraft(d => ({ ...d, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                    rows={2}
                    placeholder="Ej: Transferencia para cubrir gastos..."
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowTransferModal(false)
                    const today = getLocalDateString()
                    setTransferDraft({ from_account_id: '', to_account_id: '', amount: '', currency: 'ARS', description: '', transaction_date: today })
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!transferDraft.from_account_id || !transferDraft.to_account_id || !transferDraft.amount || !transferDraft.transaction_date) {
                      toast.error('Todos los campos obligatorios deben estar completos')
                      return
                    }
                    if (transferDraft.from_account_id === transferDraft.to_account_id) {
                      toast.error('Las cuentas deben ser diferentes')
                      return
                    }
                    try {
                      const transferData = {
                        ...transferDraft,
                        amount: parseFormattedNumber(transferDraft.amount),
                        from_account_id: parseInt(transferDraft.from_account_id),
                        to_account_id: parseInt(transferDraft.to_account_id),
                        transaction_type: 'transfer'
                      }
                      await accountsService.createTransaction(clubIdNum, transferData)
                      toast.success('Transferencia realizada exitosamente')
                      setShowTransferModal(false)
                      const today = getLocalDateString()
                      setTransferDraft({ from_account_id: '', to_account_id: '', amount: '', currency: 'ARS', description: '', transaction_date: today })
                      // Recargar datos
                      const [accountsData, transactionsData] = await Promise.all([
                        accountsService.getAccounts(clubIdNum),
                        accountsService.getTransactions(clubIdNum, { from: from || undefined, to: to || undefined })
                      ])
                      setAccounts(accountsData)
                      setTransactions(transactionsData)
                    } catch (error: any) {
                      toast.error(error?.response?.data?.error || error?.response?.data?.message || 'Error al realizar transferencia')
                    }
                  }}
                  disabled={
                    !transferDraft.from_account_id ||
                    !transferDraft.to_account_id ||
                    !transferDraft.amount ||
                    !transferDraft.transaction_date ||
                    parseFormattedNumber(transferDraft.amount) === 0
                  }
                  className={`px-4 py-2 rounded ${
                    !transferDraft.from_account_id ||
                    !transferDraft.to_account_id ||
                    !transferDraft.amount ||
                    !transferDraft.transaction_date ||
                    parseFormattedNumber(transferDraft.amount) === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  Transferir
                </button>
              </div>
            </div>
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
              setExpenseDraft({ expense_date: '', amount: '', currency: 'ARS', receipt_number: '', detail: '', custodian: '', account_id: '' })
              setEditingExpenseId(null)
              setShowCustodianDropdown(false)
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
                  <label className="block text-sm text-gray-600 mb-1">De qué cuenta sale el dinero *</label>
                  <select
                    value={expenseDraft.account_id}
                    onChange={(e) => setExpenseDraft(d => ({ ...d, account_id: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">Seleccionar cuenta...</option>
                    {accounts.map(account => (
                      <option key={account.account_id} value={account.account_id}>
                        {account.account_name}
                      </option>
                    ))}
                  </select>
                  {accounts.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Primero debes crear al menos una cuenta en la pestaña "Cuentas"
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Detalle</label>
                  <textarea value={expenseDraft.detail} onChange={(e) => setExpenseDraft(d => ({ ...d, detail: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={3} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => {
                  setShowExpenseModal(false)
                  setExpenseDraft({ expense_date: '', amount: '', currency: 'ARS', receipt_number: '', detail: '', custodian: '', account_id: '' })
                  setEditingExpenseId(null)
                  setShowCustodianDropdown(false)
                }} className="px-4 py-2 border rounded">Cancelar</button>
                <button
                  onClick={async () => {
                    if (!expenseDraft.account_id) {
                      toast.error('Debes seleccionar una cuenta')
                      return
                    }
                    try {
                      const expenseToSave = {
                        ...expenseDraft,
                        amount: parseFormattedNumber(expenseDraft.amount),
                        account_id: parseInt(expenseDraft.account_id)
                      }
                      if (editingExpenseId) {
                        await paymentsService.updateExpense(clubIdNum, editingExpenseId, expenseToSave as any)
                        toast.success('Gasto actualizado exitosamente')
                      } else {
                        await paymentsService.addExpense(clubIdNum, expenseToSave as any)
                        toast.success('Gasto agregado exitosamente')
                      }
                      setShowExpenseModal(false)
                      setExpenseDraft({ expense_date: '', amount: '', currency: 'ARS', receipt_number: '', detail: '', custodian: '', account_id: '' })
                      setEditingExpenseId(null)
                      setShowCustodianDropdown(false)
                      const ex = await paymentsService.getExpenses(clubIdNum, { from: from || undefined, to: to || undefined })
                      setExpenses(ex)
                      // Reload accounts to update balances
                      const accountsData = await accountsService.getAccounts(clubIdNum)
                      setAccounts(accountsData)
                      // Reload currency balance
                      const balance = await paymentsService.getCurrencyBalance(clubIdNum)
                      setCurrencyBalance(balance)
                    } catch (error) {
                      toast.error('Error al guardar gasto')
                    }
                  }}
                  disabled={!expenseDraft.account_id || !expenseDraft.amount || !expenseDraft.expense_date}
                  className={`px-4 py-2 rounded ${
                    !expenseDraft.account_id || !expenseDraft.amount || !expenseDraft.expense_date
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
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
              setIncomeDraft({ member_id: '', income_date: '', amount: '', currency: 'ARS', payment_type: 'efectivo', description: '', custodian: '', account_id: '' })
              setMemberSearchText('')
              setShowMemberDropdown(false)
              setShowDescriptionDropdown(false)
              setShowCustodianDropdown(false)
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
                <div>
                  <label className="block text-sm text-gray-600 mb-1">A qué cuenta entra el dinero *</label>
                  <select
                    value={incomeDraft.account_id}
                    onChange={(e) => setIncomeDraft(d => ({ ...d, account_id: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">Seleccionar cuenta...</option>
                    {accounts.map(account => (
                      <option key={account.account_id} value={account.account_id}>
                        {account.account_name}
                      </option>
                    ))}
                  </select>
                  {accounts.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Primero debes crear al menos una cuenta en la pestaña "Cuentas"
                    </p>
                  )}
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
                  setIncomeDraft({ member_id: '', income_date: '', amount: '', currency: 'ARS', payment_type: 'efectivo', description: '', custodian: '', account_id: '' })
                  setMemberSearchText('')
                  setShowMemberDropdown(false)
                  setShowDescriptionDropdown(false)
                  setShowCustodianDropdown(false)
                  setEditingIncomeId(null)
                }} className="px-4 py-2 border rounded">Cancelar</button>
                <button
                  onClick={async () => {
                    if (!incomeDraft.account_id) {
                      toast.error('Debes seleccionar una cuenta')
                      return
                    }
                    try {
                      const incomeToSave = {
                        ...incomeDraft,
                        member_id: incomeDraft.member_id ? parseInt(incomeDraft.member_id) : null,
                        amount: parseFormattedNumber(incomeDraft.amount),
                        account_id: parseInt(incomeDraft.account_id)
                      }
                      if (editingIncomeId) {
                        await paymentsService.updateOtherIncome(clubIdNum, editingIncomeId, incomeToSave as any)
                        toast.success('Ingreso actualizado exitosamente')
                      } else {
                        await paymentsService.addOtherIncome(clubIdNum, incomeToSave as any)
                        toast.success('Ingreso agregado exitosamente')
                      }
                      setShowIncomeModal(false)
                      setIncomeDraft({ member_id: '', income_date: '', amount: '', currency: 'ARS', payment_type: 'efectivo', description: '', custodian: '', account_id: '' })
                      setMemberSearchText('')
                      setShowMemberDropdown(false)
                      setShowDescriptionDropdown(false)
                      setShowCustodianDropdown(false)
                      setEditingIncomeId(null)
                      const data = await paymentsService.getOtherIncomes(clubIdNum, { from: from || undefined, to: to || undefined })
                      setOtherIncomes(data)
                      // Reload accounts to update balances
                      const accountsData = await accountsService.getAccounts(clubIdNum)
                      setAccounts(accountsData)
                      // Reload currency balance
                      const balance = await paymentsService.getCurrencyBalance(clubIdNum)
                      setCurrencyBalance(balance)
                    } catch (error) {
                      toast.error(editingIncomeId ? 'Error al actualizar ingreso' : 'Error al agregar ingreso')
                    }
                  }}
                  disabled={!incomeDraft.account_id || !incomeDraft.amount || !incomeDraft.income_date}
                  className={`px-4 py-2 rounded ${
                    !incomeDraft.account_id || !incomeDraft.amount || !incomeDraft.income_date
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Conversión de Moneda */}
        {showExchangeModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="absolute inset-0 bg-black/30" onClick={() => {
              setShowExchangeModal(false)
              setExchangeDraft({ 
                exchange_date: '', 
                from_currency: 'ARS', 
                from_amount: '', 
                to_currency: 'USD', 
                to_amount: '', 
                exchange_rate: '',
                notes: '',
                from_account_id: '',
                to_account_id: ''
              })
              setEditingExchangeId(null)
            }} />
            <div className="relative mx-auto my-10 w-full max-w-lg bg-white rounded-lg shadow-xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
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
                        setExchangeDraft(d => {
                          const newDraft = { ...d, from_amount: validated }
                          // Auto-calcular to_amount si hay tasa de cambio
                          if (d.exchange_rate) {
                            const fromNum = parseFormattedNumber(validated)
                            const rate = parseFormattedNumber(d.exchange_rate)
                            if (fromNum > 0 && rate > 0) {
                              const toNum = fromNum / rate
                              newDraft.to_amount = toNum.toFixed(2).replace('.', ',')
                            }
                          }
                          return newDraft
                        })
                      }}
                      onBlur={(e) => {
                        const formatted = formatForDisplay(e.target.value)
                        setExchangeDraft(d => {
                          const newDraft = { ...d, from_amount: formatted }
                          // Recalcular to_amount con el valor formateado
                          if (d.exchange_rate) {
                            const fromNum = parseFormattedNumber(formatted)
                            const rate = parseFormattedNumber(d.exchange_rate)
                            if (fromNum > 0 && rate > 0) {
                              const toNum = fromNum / rate
                              newDraft.to_amount = formatForDisplay(toNum.toFixed(2))
                            }
                          }
                          return newDraft
                        })
                      }}
                      className={`flex-1 px-3 py-2 border rounded ${
                        exchangeDraft.from_amount && parseFormattedNumber(exchangeDraft.from_amount) > currencyBalance[exchangeDraft.from_currency as 'ARS' | 'USD']
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
                  {exchangeDraft.from_amount && parseFormattedNumber(exchangeDraft.from_amount) > currencyBalance[exchangeDraft.from_currency as 'ARS' | 'USD'] && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Fondos insuficientes. Disponible: {exchangeDraft.from_currency === 'USD' ? 'US$' : '$'}{formatCurrency(currencyBalance[exchangeDraft.from_currency as 'ARS' | 'USD'])}
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
                        setExchangeDraft(d => {
                          const newDraft = { ...d, to_amount: validated }
                          // Auto-calcular from_amount si hay tasa de cambio
                          if (d.exchange_rate) {
                            const toNum = parseFormattedNumber(validated)
                            const rate = parseFormattedNumber(d.exchange_rate)
                            if (toNum > 0 && rate > 0) {
                              const fromNum = toNum * rate
                              newDraft.from_amount = fromNum.toFixed(2).replace('.', ',')
                            }
                          }
                          return newDraft
                        })
                      }}
                      onBlur={(e) => {
                        const formatted = formatForDisplay(e.target.value)
                        setExchangeDraft(d => {
                          const newDraft = { ...d, to_amount: formatted }
                          // Recalcular from_amount con el valor formateado
                          if (d.exchange_rate) {
                            const toNum = parseFormattedNumber(formatted)
                            const rate = parseFormattedNumber(d.exchange_rate)
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
                          const rate = parseFormattedNumber(validated)
                          if (fromNum > 0 && rate > 0) {
                            const toNum = fromNum / rate
                            newDraft.to_amount = toNum.toFixed(2).replace('.', ',')
                          }
                        }
                        return newDraft
                      })
                    }}
                    onBlur={(e) => {
                      const formatted = formatForDisplay(e.target.value)
                      setExchangeDraft(d => {
                        const newDraft = { ...d, exchange_rate: formatted }
                        // Recalcular to_amount con el valor formateado
                        if (d.from_amount) {
                          const fromNum = parseFormattedNumber(d.from_amount)
                          const rate = parseFormattedNumber(formatted)
                          if (fromNum > 0 && rate > 0) {
                            const toNum = fromNum / rate
                            newDraft.to_amount = formatForDisplay(toNum.toFixed(2))
                          }
                        }
                        return newDraft
                      })
                    }}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Ej: 1.000,50" 
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {exchangeDraft.from_currency === 'ARS' && exchangeDraft.to_currency === 'USD' 
                      ? `Ejemplo: Si la tasa es 1.000,00 significa que $1.000,00 ARS = US$1,00 USD`
                      : exchangeDraft.from_currency === 'USD' && exchangeDraft.to_currency === 'ARS'
                      ? `Ejemplo: Si la tasa es 1.000,00 significa que US$1,00 USD = $1.000,00 ARS`
                      : `Tasa: 1 ${exchangeDraft.from_currency} = ${exchangeDraft.exchange_rate || '?'} ${exchangeDraft.to_currency}`
                    }
                  </p>
                </div>
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-blue-900 mb-1">📤 Cuenta de origen (sale el dinero) *</label>
                    <select
                      value={exchangeDraft.from_account_id || ''}
                      onChange={(e) => setExchangeDraft(d => ({ ...d, from_account_id: e.target.value }))}
                      className="w-full px-3 py-2 border rounded"
                      required
                    >
                      <option value="">Seleccionar cuenta...</option>
                      {accounts.map(account => (
                        <option key={account.account_id} value={account.account_id}>
                          {account.account_name} (ARS: ${formatCurrency(Number(account.current_balance_ars))}, USD: US${formatCurrency(Number(account.current_balance_usd))})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-center text-blue-700 font-bold">⬇️</div>
                  <div>
                    <label className="block text-sm font-semibold text-blue-900 mb-1">📥 Cuenta de destino (entra el dinero) *</label>
                    <select
                      value={exchangeDraft.to_account_id || ''}
                      onChange={(e) => setExchangeDraft(d => ({ ...d, to_account_id: e.target.value }))}
                      className="w-full px-3 py-2 border rounded"
                      required
                    >
                      <option value="">Seleccionar cuenta...</option>
                      {accounts.map(account => (
                        <option key={account.account_id} value={account.account_id}>
                          {account.account_name} (ARS: ${formatCurrency(Number(account.current_balance_ars))}, USD: US${formatCurrency(Number(account.current_balance_usd))})
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-blue-700 font-medium">
                    ℹ️ Resumen:<br/>
                    • Sale de {accounts.find(a => a.account_id.toString() === exchangeDraft.from_account_id)?.account_name || '...'}: {exchangeDraft.from_amount || '0'} {exchangeDraft.from_currency}<br/>
                    • Entra a {accounts.find(a => a.account_id.toString() === exchangeDraft.to_account_id)?.account_name || '...'}: {exchangeDraft.to_amount || '0'} {exchangeDraft.to_currency}
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
                    notes: '',
                    from_account_id: '',
                    to_account_id: ''
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
                        exchange_rate: parseFormattedNumber(exchangeDraft.exchange_rate),
                        from_account_id: parseInt(exchangeDraft.from_account_id),
                        to_account_id: parseInt(exchangeDraft.to_account_id)
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
                        notes: '',
                        from_account_id: '',
                        to_account_id: ''
                      })
                      setEditingExchangeId(null)
                      const data = await paymentsService.getCurrencyExchanges(clubIdNum, { from: from || undefined, to: to || undefined })
                      setCurrencyExchanges(data)
                      // Recargar balance y cuentas
                      const balance = await paymentsService.getCurrencyBalance(clubIdNum)
                      setCurrencyBalance(balance)
                      const accountsData = await accountsService.getAccounts(clubIdNum)
                      setAccounts(accountsData)
                    } catch (error: any) {
                      const errorMessage = error?.response?.data?.message || error?.message || 'Error al procesar conversión'
                      toast.error(errorMessage)
                    }
                  }}
                  disabled={
                    !exchangeDraft.from_account_id ||
                    !exchangeDraft.to_account_id ||
                    !exchangeDraft.from_amount || 
                    !exchangeDraft.to_amount || 
                    !exchangeDraft.exchange_rate ||
                    parseFormattedNumber(exchangeDraft.from_amount) > currencyBalance[exchangeDraft.from_currency as 'ARS' | 'USD'] ||
                    parseFormattedNumber(exchangeDraft.from_amount) === 0
                  }
                  className={`px-4 py-2 rounded ${
                    !exchangeDraft.from_amount || 
                    !exchangeDraft.to_amount || 
                    !exchangeDraft.exchange_rate ||
                    parseFormattedNumber(exchangeDraft.from_amount) > currencyBalance[exchangeDraft.from_currency as 'ARS' | 'USD'] ||
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


