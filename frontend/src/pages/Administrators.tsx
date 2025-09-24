import { useState } from 'react'
import { Plus, Search, Filter, RefreshCw, Users, Building2, Shield } from 'lucide-react'
import { useAdministrators } from '@/hooks/useAdministrators'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { AdministratorCard } from '@/components/AdministratorCard'
import { Administrator } from '@/types/administrator'

export function Administrators() {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingAdmin, setEditingAdmin] = useState<Administrator | null>(null)
  
  const { data: administrators = [], isLoading, error, refetch } = useAdministrators()

  // Filter administrators
  const filteredAdministrators = administrators.filter((admin) => {
    const matchesSearch = 
      admin.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.club_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = 
      roleFilter === 'all' || admin.role === roleFilter
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && admin.is_active) ||
      (statusFilter === 'inactive' && !admin.is_active)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  // Group administrators by role
  const systemAdmins = filteredAdministrators.filter(admin => admin.role === 'system_admin')
  const clubAdmins = filteredAdministrators.filter(admin => admin.role === 'club_admin')

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error al cargar administradores: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Administradores</h1>
          <p className="text-gray-600 mt-1">
            Gestiona todos los administradores del sistema
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
            onClick={() => {/* TODO: Implementar modal de creación */}}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Administrador</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, usuario, email o club..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="sm:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">Todos los roles</option>
              <option value="system_admin">Admin Sistema</option>
              <option value="club_admin">Admin Club</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">{systemAdmins.length}</p>
              <p className="text-gray-600">Admins Sistema</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">{clubAdmins.length}</p>
              <p className="text-gray-600">Admins Club</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">
                {administrators.filter(a => a.is_active).length}
              </p>
              <p className="text-gray-600">Activos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : filteredAdministrators.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay administradores</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'No se encontraron administradores con los filtros aplicados'
              : 'Aún no hay administradores registrados en el sistema'
            }
          </p>
          {!searchTerm && roleFilter === 'all' && statusFilter === 'all' && (
            <button
              onClick={() => {/* TODO: Implementar modal de creación */}}
              className="btn btn-primary"
            >
              Crear Primer Administrador
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* System Administrators */}
          {systemAdmins.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-red-600" />
                Administradores del Sistema ({systemAdmins.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {systemAdmins.map((admin) => (
                  <AdministratorCard
                    key={admin.admin_id}
                    administrator={admin}
                    onEdit={setEditingAdmin}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Club Administrators */}
          {clubAdmins.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                Administradores de Clubes ({clubAdmins.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {clubAdmins.map((admin) => (
                  <AdministratorCard
                    key={admin.admin_id}
                    administrator={admin}
                    onEdit={setEditingAdmin}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TODO: Add CreateAdministratorModal and EditAdministratorModal */}
    </div>
  )
}
