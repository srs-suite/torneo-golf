import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Calendar, DollarSign, Users, Trophy, Settings, Award, Camera, ChevronDown, LogOut } from 'lucide-react'
import { paymentsService } from '@/services/paymentsService'
import { DateInput } from '@/components/DateInput'
import { useClubs } from '@/hooks/useClubs'
import { useMembers } from '@/hooks/useMembers'
import { useTournaments } from '@/hooks/useTournaments'

export default function Payments() {
  const { clubId } = useParams<{ clubId: string }>() 
  const navigate = useNavigate()
  const clubIdNum = clubId ? parseInt(clubId) : 0

  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [tab, setTab] = useState<'ingresos' | 'gastos'>('ingresos')
  const [expenses, setExpenses] = useState<any[]>([])
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenseDraft, setExpenseDraft] = useState({ expense_date: '', amount: 0, receipt_number: '', detail: '' })
  const [selectedTournaments, setSelectedTournaments] = useState<number[]>([])
  const [showTournamentDropdown, setShowTournamentDropdown] = useState(false)

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
    return Math.round(amount).toLocaleString('es-AR')
  }

  const totalPaid = useMemo(() => rows.reduce((s, r) => s + (Number(r.total_paid) || 0), 0), [rows])
  const totalFee = useMemo(() => rows.reduce((s, r) => s + (Number(r.total_fee) || 0), 0), [rows])

  // Filtered rows based on selected tournaments
  const filteredRows = useMemo(() => {
    if (selectedTournaments.length === 0) return rows
    return rows.filter(r => selectedTournaments.includes(r.tournament_id))
  }, [rows, selectedTournaments])

  const filteredTotalPaid = useMemo(() => filteredRows.reduce((s, r) => s + (Number(r.total_paid) || 0), 0), [filteredRows])

  // No set default date - show all tournaments by default
  // User can filter by date if needed

  useEffect(() => {
    const load = async () => {
      if (!clubIdNum) return
      setLoading(true)
      try {
        if (tab === 'ingresos') {
          const data = await paymentsService.getSummary(clubIdNum, { from: from || undefined, to: to || undefined })
          setRows(data)
        } else {
          const ex = await paymentsService.getExpenses(clubIdNum, { from: from || undefined, to: to || undefined })
          setExpenses(ex)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clubIdNum, from, to, tab])

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
                onClick={() => setTab('ingresos')}
                className={`px-3 py-2 rounded ${tab==='ingresos' ? 'bg-gray-900 text-white' : 'border'}`}
              >
                Ingresos Torneos
              </button>
              <button
                onClick={() => setTab('gastos')}
                className={`px-3 py-2 rounded ${tab==='gastos' ? 'bg-gray-900 text-white' : 'border'}`}
              >
                Gastos
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <DateInput
                value={from}
                onChange={setFrom}
                rangeEnabled
                onRangeSelect={(f, t) => { setFrom(f); setTo(t) }}
                rangeFrom={from}
                rangeTo={to}
              />
            </div>
            {tab==='gastos' && (
              <div className="ml-auto">
                <button onClick={() => {
                  const today = new Date().toISOString().split('T')[0]
                  setExpenseDraft({ expense_date: today, amount: 0, receipt_number: '', detail: '' })
                  setShowExpenseModal(true)
                }} className="px-3 py-2 bg-gray-900 text-white rounded hover:bg-gray-800">
                  Agregar gasto
                </button>
              </div>
            )}
          </div>
          {tab==='ingresos' && rows.length > 0 && (
            <div className="relative w-full max-w-md">
              <label className="block text-sm text-gray-600 mb-1">Filtrar por torneo</label>
              <button
                onClick={() => setShowTournamentDropdown(!showTournamentDropdown)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex items-center justify-between bg-white"
              >
                <span className="text-gray-700">
                  {selectedTournaments.length === 0 
                    ? 'Todos los torneos' 
                    : `${selectedTournaments.length} torneo${selectedTournaments.length > 1 ? 's' : ''} seleccionado${selectedTournaments.length > 1 ? 's' : ''}`
                  }
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
              {showTournamentDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowTournamentDropdown(false)}
                  />
                  <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2">
                      <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTournaments.length === 0}
                          onChange={() => setSelectedTournaments([])}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">Todos los torneos</span>
                      </label>
                      {rows.map(r => (
                        <label key={r.tournament_id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
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
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{r.tournament_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expenses.map((e) => (
                    <tr key={e.expense_id}>
                      <td className="px-4 py-2">{new Date(e.expense_date).toLocaleDateString('es-AR')}</td>
                      <td className="px-4 py-2">${formatCurrency(Number(e.amount || 0))}</td>
                      <td className="px-4 py-2">{e.receipt_number || '-'}</td>
                      <td className="px-4 py-2">{e.detail || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {showExpenseModal && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowExpenseModal(false)} />
            <div className="relative mx-auto my-10 w-full max-w-lg bg-white rounded-lg shadow-xl p-4 space-y-3">
              <h3 className="text-lg font-semibold">Nuevo gasto</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600">Fecha</label>
                  <DateInput value={expenseDraft.expense_date} onChange={(v) => setExpenseDraft(d => ({ ...d, expense_date: v }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Monto</label>
                  <input type="number" min={0} value={expenseDraft.amount} onChange={(e) => setExpenseDraft(d => ({ ...d, amount: Number(e.target.value || 0) }))} className="w-full px-3 py-2 border rounded" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-600">N° Recibo</label>
                  <input value={expenseDraft.receipt_number} onChange={(e) => setExpenseDraft(d => ({ ...d, receipt_number: e.target.value }))} className="w-full px-3 py-2 border rounded" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-600">Detalle</label>
                  <textarea value={expenseDraft.detail} onChange={(e) => setExpenseDraft(d => ({ ...d, detail: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={3} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowExpenseModal(false)} className="px-4 py-2 border rounded">Cancelar</button>
                <button
                  onClick={async () => {
                    await paymentsService.addExpense(clubIdNum, expenseDraft as any)
                    setShowExpenseModal(false)
                    const ex = await paymentsService.getExpenses(clubIdNum, { from: from || undefined, to: to || undefined })
                    setExpenses(ex)
                  }}
                  className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
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

