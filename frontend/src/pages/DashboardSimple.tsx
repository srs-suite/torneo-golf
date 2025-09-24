import { 
  Building2, 
  Users, 
  Trophy, 
  DollarSign,
  Clock
} from 'lucide-react'
import { useStats, useRecentActivity, useClubs, useInvalidateStats } from '@/hooks/useClubs'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export function DashboardSimple() {
  const { data: stats, isLoading: statsLoading } = useStats()
  const { data: activity = [], isLoading: activityLoading } = useRecentActivity()
  const { data: clubs = [], isLoading: clubsLoading } = useClubs()
  const invalidateStats = useInvalidateStats()



  // Filter active clubs for display
  const activeClubs = clubs.filter(club => club.subscription_status === 'active')

  const statsCards = stats ? [
    {
      label: 'Clubes Activos',
      value: stats.totalClubs?.toString() || '0',
      change: '+1 este mes',
      icon: Building2,
      color: 'bg-gray-800'
    },
    {
      label: 'Miembros Totales',
      value: stats.totalPlayers?.toString() || '0',
      change: '+12 este mes',
      icon: Users,
      color: 'bg-gray-600'
    },
    {
      label: 'Torneos Activos',
      value: stats.totalTournaments?.toString() || '0',
      change: '+2 este mes',
      icon: Trophy,
      color: 'bg-gray-500'
    },
    {
      label: 'Administradores',
      value: stats.totalAdministrators?.toString() || '0',
      change: 'Total activos',
      icon: DollarSign,
      color: 'bg-gray-700'
    }
  ] : []

  if (statsLoading || activityLoading || clubsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Resumen del sistema TeeTracker Pro</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.change}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{item.description}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{item.club_name}</span>
                        <span>•</span>
                        <span>{item.created_at}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {activity.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No hay actividad reciente</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Clubs */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Clubes Activos</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {activeClubs.map((club) => (
                  <div key={club.course_id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{club.course_name}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{club.total_members || 0} miembros</span>
                        <span>{club.total_tournaments || 0} torneos</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Activo
                      </span>
                    </div>
                  </div>
                ))}
                {activeClubs.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No hay clubes activos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  )
}


