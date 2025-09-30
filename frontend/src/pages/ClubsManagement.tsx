import { useState } from 'react'
import { Plus, Filter, RefreshCw } from 'lucide-react'
import { useClubs } from '@/hooks/useClubs'
import { ClubCard } from '@/components/ClubCard'
import { CreateClubModal } from '@/components/CreateClubModal'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { SearchInput } from '@/components/SearchInput'

export function ClubsManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  const { data: clubs = [], isLoading, error, refetch } = useClubs()

  console.log('ClubsManagement - clubs data:', clubs)
  console.log('ClubsManagement - isLoading:', isLoading)
  console.log('ClubsManagement - error:', error)

  // Filter clubs based on search and status
  const filteredClubs = clubs.filter((club) => {
    const matchesSearch = 
      club.course_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      club.club_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      club.city?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      statusFilter === 'all' || club.subscription_status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  console.log('ClubsManagement - filteredClubs:', filteredClubs)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error al cargar los clubes</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Clubes</h1>
          <p className="text-gray-600 mt-1">
            Administra todos los clubes del sistema
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="btn btn-secondary flex items-center space-x-2"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Club</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Search */}
          <div className="flex-1">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar clubes por nombre, código o ciudad..."
              className="input"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input min-w-[150px]"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="suspended">Suspendidos</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{clubs.length}</div>
          <div className="text-sm text-gray-600">Total Clubes</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">
            {clubs.filter(c => c.subscription_status === 'active').length}
          </div>
          <div className="text-sm text-gray-600">Activos</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {clubs.filter(c => c.subscription_status === 'suspended').length}
          </div>
          <div className="text-sm text-gray-600">Suspendidos</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-600">
            {clubs.reduce((acc, club) => acc + (club.total_members || 0), 0)}
          </div>
          <div className="text-sm text-gray-600">Total Miembros</div>
        </div>
      </div>

      {/* Clubs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClubs.map((club) => (
          <ClubCard key={club.course_id} club={club} />
        ))}
      </div>

      {filteredClubs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500">No se encontraron clubes</p>
        </div>
      )}

      {/* Create Club Modal */}
      <CreateClubModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}
