import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DollarSign, TrendingUp, TrendingDown, Lock, Download, Calendar } from 'lucide-react';
import axios from 'axios';

interface FinancialSummary {
  tournamentIncome: number;
  otherIncome: number;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  currencyBalance?: {
    pesos: number;
    dollars: number;
  };
}

interface Transaction {
  date: string;
  concept: string;
  amount: number;
  category?: string;
  type: 'income' | 'expense';
}

interface FinancialData {
  summary: FinancialSummary;
  tournaments: any[];
  otherIncomes: any[];
  expenses: any[];
}

export default function PublicFinance() {
  const { clubId } = useParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.get(`/api/public/finance/${clubId}`, {
        headers: {
          Authorization: `Bearer ${password}`
        }
      });

      if (response.data.success) {
        setIsAuthenticated(true);
        setFinancialData(response.data.data);
        localStorage.setItem('publicFinanceAuth', password);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Contraseña incorrecta');
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialData = async (authPassword: string) => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);

      const response = await axios.get(`/api/public/finance/${clubId}?${params}`, {
        headers: {
          Authorization: `Bearer ${authPassword}`
        }
      });

      if (response.data.success) {
        setFinancialData(response.data.data);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setIsAuthenticated(false);
        localStorage.removeItem('publicFinanceAuth');
      }
    }
  };

  useEffect(() => {
    const savedPassword = localStorage.getItem('publicFinanceAuth');
    if (savedPassword) {
      setPassword(savedPassword);
      setIsAuthenticated(true);
      loadFinancialData(savedPassword);
    }
  }, [clubId]);

  useEffect(() => {
    if (isAuthenticated && password) {
      loadFinancialData(password);
    }
  }, [dateFrom, dateTo]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const exportToPDF = () => {
    window.print();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Transparencia Financiera
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Ingresá la contraseña compartida para ver el resumen financiero del club
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña de Socios
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingresá la contraseña"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Acceder'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Si no tenés la contraseña, consultá con la comisión directiva
          </p>
        </div>
      </div>
    );
  }

  if (!financialData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos financieros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 print:shadow-none">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Transparencia Financiera
              </h1>
              <p className="text-gray-600">
                Resumen de ingresos y gastos del club
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  localStorage.removeItem('publicFinanceAuth');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors print:hidden"
              >
                Cerrar Sesión
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors print:hidden"
              >
                <Download className="w-4 h-4" />
                Exportar PDF
              </button>
            </div>
          </div>

          {/* Date Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4 print:hidden">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {(dateFrom || dateTo) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Limpiar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Ingresos Totales</span>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(financialData.summary.totalIncome)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Torneos: {formatCurrency(financialData.summary.tournamentIncome)}<br />
              Otros: {formatCurrency(financialData.summary.otherIncome)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Gastos Totales</span>
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(financialData.summary.totalExpenses)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Balance</span>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <p className={`text-2xl font-bold ${financialData.summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(financialData.summary.balance)}
            </p>
          </div>

          {financialData.summary.currencyBalance && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm font-medium">Saldos por Moneda</span>
                <DollarSign className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                AR$: {formatCurrency(financialData.summary.currencyBalance.pesos)}
              </p>
              <p className="text-sm font-semibold text-gray-700">
                US$: ${financialData.summary.currencyBalance.dollars.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Tournaments Income */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Ingresos por Torneos</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Torneo</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Fecha</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-semibold">Cuota</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-semibold">Pagos</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {financialData.tournaments.map((tournament) => (
                  <tr key={tournament.tournament_id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{tournament.tournament_name}</td>
                    <td className="py-3 px-4">{formatDate(tournament.tournament_date)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(tournament.entry_fee)}</td>
                    <td className="py-3 px-4 text-right">{tournament.paid_participants}</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">
                      {formatCurrency(tournament.income)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Other Incomes */}
        {financialData.otherIncomes.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Otros Ingresos</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-gray-600 font-semibold">Fecha</th>
                    <th className="text-left py-3 px-4 text-gray-600 font-semibold">Concepto</th>
                    <th className="text-left py-3 px-4 text-gray-600 font-semibold">Socio</th>
                    <th className="text-right py-3 px-4 text-gray-600 font-semibold">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {financialData.otherIncomes.map((income) => (
                    <tr key={income.income_id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{formatDate(income.date)}</td>
                      <td className="py-3 px-4">{income.concept}</td>
                      <td className="py-3 px-4">{income.member_name}</td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600">
                        {formatCurrency(income.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expenses */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Gastos</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Fecha</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Concepto</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Categoría</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-semibold">Método de Pago</th>
                  <th className="text-right py-3 px-4 text-gray-600 font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody>
                {financialData.expenses.map((expense) => (
                  <tr key={expense.expense_id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{formatDate(expense.date)}</td>
                    <td className="py-3 px-4">{expense.concept}</td>
                    <td className="py-3 px-4">{expense.category}</td>
                    <td className="py-3 px-4">{expense.payment_method}</td>
                    <td className="py-3 px-4 text-right font-semibold text-red-600">
                      {formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8 print:mt-4">
          <p>Actualizado: {new Date().toLocaleString('es-AR')}</p>
          <p className="mt-2">Este reporte es generado automáticamente para mantener la transparencia financiera del club</p>
        </div>
      </div>

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

