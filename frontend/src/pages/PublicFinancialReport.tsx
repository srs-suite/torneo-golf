import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DollarSign, TrendingUp, TrendingDown, Smartphone, CheckCircle, Download, X, FileText, ChevronDown, ChevronUp, Camera } from 'lucide-react';
import axios from 'axios';

interface FinancialSummary {
  totalIncomes: number;
  totalExpenses: number;
  balance: number;
  incomeARS: number;
  incomeUSD: number;
  expenseARS: number;
  expenseUSD: number;
  balanceARS: number;
  balanceUSD: number;
}

interface Transaction {
  date: string;
  concept: string;
  amount: number;
  currency?: string;
  payment_method?: string;
  member_name?: string;
  receipt_number?: string;
  custodian?: string;
  created_at?: string;
  receipt_photo_path?: string;
  type?: 'tournament' | 'other';
}

interface FinancialData {
  summary: FinancialSummary;
  incomes: Transaction[];
  expenses: Transaction[];
  accounts: any[];
  memberName: string;
}

export default function PublicFinancialReport() {
  const { clubId } = useParams();
  const [step, setStep] = useState<'phone' | 'verified'>('phone');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [memberName, setMemberName] = useState('');
  const [token, setToken] = useState('');
  const [selectedItem, setSelectedItem] = useState<{type: 'income' | 'expense', data: Transaction} | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    incomes: false,
    expenses: false,
    accounts: false
  });
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(`reportToken_${clubId}`);
    const savedMemberName = localStorage.getItem(`reportMemberName_${clubId}`);
    
    if (savedToken && savedMemberName) {
      setToken(savedToken);
      setMemberName(savedMemberName);
      setStep('verified');
      loadFinancialData(savedToken);
    }
  }, [clubId]);

  const handlePhoneVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`/api/public/report/${clubId}/verify`, {
        phone: phone
      });

      if (response.data.success) {
        const { token: newToken, memberName: name } = response.data;
        setToken(newToken);
        setMemberName(name);
        
        // Save to localStorage
        localStorage.setItem(`reportToken_${clubId}`, newToken);
        localStorage.setItem(`reportMemberName_${clubId}`, name);
        
        setStep('verified');
        loadFinancialData(newToken);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Teléfono no encontrado. Verificá que seas socio activo del club.');
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialData = async (authToken: string) => {
    try {
      const response = await axios.get(`/api/public/report/${clubId}/data?token=${authToken}`);

      if (response.data.success) {
        setFinancialData(response.data.data);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        // Token invalid or expired
        localStorage.removeItem(`reportToken_${clubId}`);
        localStorage.removeItem(`reportMemberName_${clubId}`);
        setStep('phone');
        setError('Tu acceso ha expirado. Por favor ingresá tu teléfono nuevamente.');
      }
    }
  };

  const formatCurrency = (amount: number, currency?: string) => {
    const formatted = new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));
    
    if (currency === 'USD') {
      return `US$${formatted}`;
    }
    return `$${formatted}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      // MySQL dates come as YYYY-MM-DD, parse manually to avoid timezone issues
      const parts = dateString.split('T')[0].split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
      }
      return '-';
    } catch (error) {
      return '-';
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  const handleLogout = () => {
    localStorage.removeItem(`reportToken_${clubId}`);
    localStorage.removeItem(`reportMemberName_${clubId}`);
    setStep('phone');
    setPhone('');
    setFinancialData(null);
    setMemberName('');
    setToken('');
  };

  // Suprimir warning TS6133 de variable no leída
  if (false) { console.log(token) }

  // Phone verification screen
  if (step === 'phone') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-green-100 p-3 rounded-full">
              <Smartphone className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Informe Contable para Socios
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Ingresá tu número de teléfono registrado para acceder al informe financiero del club
          </p>

          <form onSubmit={handlePhoneVerification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Teléfono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ej: 3512345678"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Ingresá el número sin espacios ni guiones
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Verificar y Acceder'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-start space-x-2 text-sm text-gray-600">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p>
                Tu teléfono quedará registrado en este dispositivo. No necesitarás ingresarlo nuevamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!financialData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando informe financiero...</p>
        </div>
      </div>
    );
  }

  // Financial report screen
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 print:shadow-none">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Informe Contable
              </h1>
              <p className="text-gray-600">
                Bienvenido/a, <span className="font-semibold">{memberName}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Resumen de otros ingresos y gastos del club
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors print:hidden"
              >
                Cerrar Sesión
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors print:hidden"
              >
                <Download className="w-4 h-4" />
                Exportar PDF
              </button>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <DollarSign className="w-6 h-6 text-blue-600" />
              <span className="text-gray-600 text-base font-medium">Balance Neto</span>
            </div>
            <div className="space-y-2">
              <p className={`text-4xl font-bold ${(financialData.summary.balanceARS || financialData.summary.balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(financialData.summary.balanceARS || financialData.summary.balance, 'ARS')}
              </p>
              {financialData.summary.balanceUSD !== undefined && financialData.summary.balanceUSD !== 0 && (
                <p className={`text-2xl font-bold ${financialData.summary.balanceUSD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(financialData.summary.balanceUSD, 'USD')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Accounts Section */}
        {financialData.accounts && financialData.accounts.length > 0 && (
          <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
            <button
              onClick={() => setExpandedSections({...expandedSections, accounts: !expandedSections.accounts})}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-800">Cuentas / Fondos</h2>
                  <p className="text-sm text-gray-500">{financialData.accounts.length} cuentas</p>
                </div>
              </div>
              {expandedSections.accounts ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.accounts && (
              <div className="border-t border-gray-200">
                {financialData.accounts.map((account, index) => (
                  <div
                    key={index}
                    className="px-6 py-4 border-b border-gray-100"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900 text-base">{account.account_name}</p>
                        {account.description && (
                          <p className="text-xs text-gray-500 mt-1">{account.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">
                          {formatCurrency(Number(account.current_balance_ars || 0), 'ARS')}
                        </p>
                        {Number(account.current_balance_usd || 0) > 0 && (
                          <p className="text-sm font-bold text-blue-600 mt-1">
                            {formatCurrency(Number(account.current_balance_usd || 0), 'USD')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Incomes (combined: tournaments + other incomes) */}
        {financialData.incomes && financialData.incomes.length > 0 && (
          <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
            <button
              onClick={() => setExpandedSections({...expandedSections, incomes: !expandedSections.incomes})}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-800">Ingresos</h2>
                  <p className="text-sm text-gray-500">{financialData.incomes.length} registros</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-lg font-bold text-green-600 block">
                    {formatCurrency(financialData.summary.incomeARS || 0, 'ARS')}
                  </span>
                  {(financialData.summary.incomeUSD || 0) > 0 && (
                    <span className="text-sm font-bold text-blue-600 block">
                      {formatCurrency(financialData.summary.incomeUSD || 0, 'USD')}
                    </span>
                  )}
                </div>
                {expandedSections.incomes ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>
            
            {expandedSections.incomes && (
              <div className="border-t border-gray-200">
                {financialData.incomes.map((income, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedItem({type: 'income', data: income})}
                    className="px-6 py-4 border-b border-gray-100 hover:bg-green-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <p className="text-xs text-gray-500">{formatDate(income.date)}</p>
                        </div>
                        <p className="font-semibold text-gray-900 text-base">{income.concept}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {income.type === 'tournament' && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              🏆 Torneo
                            </span>
                          )}
                          {income.member_name && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              {income.member_name}
                            </span>
                          )}
                          {income.payment_method && income.payment_method !== 'torneo' && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded capitalize">
                              {income.payment_method}
                            </span>
                          )}
                          {income.custodian && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                              📍 {income.custodian}
                            </span>
                          )}
                          {income.currency && income.currency !== 'ARS' && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              {income.currency}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(income.amount, income.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Expenses */}
        <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
          <button
            onClick={() => setExpandedSections({...expandedSections, expenses: !expandedSections.expenses})}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-800">Gastos</h2>
                <p className="text-sm text-gray-500">{financialData.expenses.length} registros</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <span className="text-lg font-bold text-red-600 block">
                  {formatCurrency(financialData.summary.expenseARS || 0, 'ARS')}
                </span>
                {(financialData.summary.expenseUSD || 0) > 0 && (
                  <span className="text-sm font-bold text-red-600 block">
                    {formatCurrency(financialData.summary.expenseUSD || 0, 'USD')}
                  </span>
                )}
              </div>
              {expandedSections.expenses ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>
          
          {expandedSections.expenses && (
            <div className="border-t border-gray-200">
              {financialData.expenses.map((expense, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedItem({type: 'expense', data: expense})}
                  className="px-6 py-4 border-b border-gray-100 hover:bg-red-50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <p className="text-xs text-gray-500">{formatDate(expense.date)}</p>
                      </div>
                      <p className="font-semibold text-gray-900 text-base">{expense.concept}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {expense.receipt_number && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            N° {expense.receipt_number}
                          </span>
                        )}
                        {expense.custodian && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                            📍 {expense.custodian}
                          </span>
                        )}
                        {expense.currency && expense.currency !== 'ARS' && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {expense.currency}
                          </span>
                        )}
                        {expense.receipt_photo_path && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            Foto disponible
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4 flex flex-col items-end gap-2">
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency(expense.amount, expense.currency)}
                      </p>
                      {expense.receipt_photo_path && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoModalUrl(`/uploads/${expense.receipt_photo_path}`);
                            setShowPhotoModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Ver foto del recibo"
                        >
                          <Camera className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8 print:mt-4">
          <p>Actualizado: {new Date().toLocaleString('es-AR')}</p>
          <p className="mt-2">Este informe es generado automáticamente para mantener la transparencia financiera del club</p>
        </div>
      </div>

      {/* Photo Modal */}
      {showPhotoModal && photoModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => {
          setShowPhotoModal(false);
          setPhotoModalUrl(null);
        }}>
          <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setShowPhotoModal(false);
                setPhotoModalUrl(null);
              }}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 z-10"
              title="Cerrar"
            >
              <X className="h-6 w-6" />
            </button>
            <img 
              src={photoModalUrl} 
              alt="Foto del recibo" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'bg-red-100 text-red-800 p-4 rounded-lg text-center';
                errorDiv.textContent = 'Error al cargar la imagen';
                const parent = target.parentElement;
                if (parent) {
                  parent.appendChild(errorDiv);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${selectedItem.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <FileText className={`w-6 h-6 ${selectedItem.type === 'income' ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedItem.type === 'income' ? 'Detalle de Ingreso' : 'Detalle de Gasto'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Fecha</label>
                <p className="text-base text-gray-900 mt-1">{formatDate(selectedItem.data.date)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  {selectedItem.type === 'income' ? 'Descripción' : 'Detalle'}
                </label>
                <p className="text-base text-gray-900 mt-1">{selectedItem.data.concept}</p>
              </div>

              {selectedItem.type === 'income' && (
                <>
                  {selectedItem.data.member_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Socio</label>
                      <p className="text-base text-gray-900 mt-1">{selectedItem.data.member_name}</p>
                    </div>
                  )}
                  {selectedItem.data.payment_method && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Forma de Pago</label>
                      <p className="text-base text-gray-900 mt-1 capitalize">{selectedItem.data.payment_method}</p>
                    </div>
                  )}
                </>
              )}

              {selectedItem.type === 'expense' && selectedItem.data.receipt_number && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Número de Comprobante</label>
                  <p className="text-base text-gray-900 mt-1">{selectedItem.data.receipt_number}</p>
                </div>
              )}

              {selectedItem.type === 'expense' && selectedItem.data.receipt_photo_path && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Foto del Recibo</label>
                  <button
                    onClick={() => {
                      setPhotoModalUrl(`/uploads/${selectedItem.data.receipt_photo_path}`);
                      setShowPhotoModal(true);
                    }}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200"
                  >
                    <Camera className="w-5 h-5" />
                    Ver foto del recibo
                  </button>
                </div>
              )}

              {selectedItem.data.custodian && (
                <div>
                  <label className="text-sm font-medium text-gray-500">En posesión de</label>
                  <p className="text-base text-gray-900 mt-1">{selectedItem.data.custodian}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedItem.data.currency && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Moneda</label>
                    <p className="text-base text-gray-900 mt-1">{selectedItem.data.currency}</p>
                  </div>
                )}
                {selectedItem.data.created_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Registrado</label>
                    <p className="text-xs text-gray-600 mt-1">{formatDate(selectedItem.data.created_at)}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="text-sm font-medium text-gray-500">Monto</label>
                <p className={`text-3xl font-bold mt-1 ${selectedItem.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(selectedItem.data.amount, selectedItem.data.currency)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="w-full mt-6 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

