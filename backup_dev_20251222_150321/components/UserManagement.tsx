import { useState, useEffect } from 'react'
import { Users, Plus, Edit, Trash2, Shield, X, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/lib/api'

interface User {
  admin_id: number
  user_id: number
  username: string
  email: string
  full_name: string
  is_primary_admin: boolean
  is_active: boolean
  created_at: string
  last_login: string | null
  // Permissions
  can_view_members?: boolean
  can_view_tournaments?: boolean
  can_view_groups?: boolean
  can_view_scorecards?: boolean
  can_view_photos?: boolean
  can_view_settings?: boolean
  can_view_rankings?: boolean
  can_view_accounting?: boolean
  can_view_financial_totals?: boolean
  can_create_members?: boolean
  can_edit_members?: boolean
  can_delete_members?: boolean
  can_create_tournaments?: boolean
  can_edit_tournaments?: boolean
  can_delete_tournaments?: boolean
  can_manage_participants?: boolean
  can_manage_groups?: boolean
  can_manage_scorecards?: boolean
  can_manage_payments?: boolean
  // Contabilidad granular
  can_view_balance?: boolean
  can_view_tournament_incomes?: boolean
  can_manage_tournament_incomes?: boolean
  can_view_other_incomes?: boolean
  can_manage_other_incomes?: boolean
  can_view_expenses?: boolean
  can_manage_expenses?: boolean
  can_view_currency_exchanges?: boolean
  can_manage_currency_exchanges?: boolean
  can_manage_photos?: boolean
}

interface UserManagementProps {
  clubId: number
}

export function UserManagement({ clubId }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: ''
  })
  const [permissions, setPermissions] = useState({
    can_view_members: false,
    can_view_tournaments: false,
    can_view_groups: false,
    can_view_scorecards: false,
    can_view_photos: false,
    can_view_settings: false,
    can_view_rankings: false,
    can_view_accounting: false,
    can_view_financial_totals: false,
    can_create_members: false,
    can_edit_members: false,
    can_delete_members: false,
    can_create_tournaments: false,
    can_edit_tournaments: false,
    can_delete_tournaments: false,
    can_manage_participants: false,
    can_manage_groups: false,
    can_manage_scorecards: false,
    can_manage_payments: false,
    // Contabilidad granular
    can_view_balance: false,
    can_view_tournament_incomes: false,
    can_manage_tournament_incomes: false,
    can_view_other_incomes: false,
    can_manage_other_incomes: false,
    can_view_expenses: false,
    can_manage_expenses: false,
    can_view_currency_exchanges: false,
    can_manage_currency_exchanges: false,
    can_manage_photos: false
  })
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [clubId])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/club/${clubId}/users`)
      setUsers(response.data.data || [])
    } catch (error: any) {
      toast.error('Error al cargar usuarios')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.username || !formData.email || !formData.fullName || !formData.password) {
      toast.error('Por favor complete todos los campos')
      return
    }

    try {
      await api.post(`/club/${clubId}/users`, {
        username: formData.username,
        email: formData.email,
        fullName: formData.fullName,
        password: formData.password,
        permissions
      })
      toast.success('Usuario creado exitosamente')
      setShowCreateModal(false)
      resetForm()
      loadUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear usuario')
      console.error(error)
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    try {
      const updateData: any = {
        fullName: formData.fullName,
        email: formData.email,
        username: formData.username
      }
      
      if (formData.password) {
        updateData.password = formData.password
      }

      await api.put(`/club/${clubId}/users/${selectedUser.admin_id}/info`, updateData)
      toast.success('Usuario actualizado exitosamente')
      setShowEditUserModal(false)
      setSelectedUser(null)
      resetForm()
      loadUsers()
    } catch (error: any) {
      toast.error('Error al actualizar usuario')
      console.error(error)
    }
  }

  const handleEditPermissions = async () => {
    console.log('🔵 handleEditPermissions called');
    console.log('🔵 selectedUser:', selectedUser);
    console.log('🔵 clubId:', clubId);
    console.log('🔵 permissions:', permissions);
    
    if (!selectedUser) {
      console.log('❌ No selectedUser, returning');
      return;
    }

    try {
      console.log('🟢 Sending PUT request...');
      await api.put(`/club/${clubId}/users/${selectedUser.admin_id}`, permissions)
      console.log('✅ PUT request successful');
      toast.success('Permisos actualizados exitosamente')
      setShowEditModal(false)
      setSelectedUser(null)
      loadUsers()
    } catch (error: any) {
      console.log('❌ Error in PUT request:', error);
      toast.error('Error al actualizar permisos')
      console.error(error)
    }
  }

  const openEditUserModal = (user: User) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      password: '' // Dejar vacío para no cambiar contraseña
    })
    setShowEditUserModal(true)
  }

  const handleDelete = async (userId: number) => {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      await api.delete(`/club/${clubId}/users/${userId}`)
      toast.success('Usuario eliminado exitosamente')
      loadUsers()
    } catch (error: any) {
      toast.error('Error al eliminar usuario')
      console.error(error)
    }
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setPermissions({
      can_view_members: Boolean(user.can_view_members),
      can_view_tournaments: Boolean(user.can_view_tournaments),
      can_view_groups: Boolean(user.can_view_groups),
      can_view_scorecards: Boolean(user.can_view_scorecards),
      can_view_photos: Boolean(user.can_view_photos),
      can_view_settings: Boolean(user.can_view_settings),
      can_view_rankings: Boolean(user.can_view_rankings),
      can_view_accounting: Boolean(user.can_view_accounting),
      can_view_financial_totals: Boolean(user.can_view_financial_totals),
      can_create_members: Boolean(user.can_create_members),
      can_edit_members: Boolean(user.can_edit_members),
      can_delete_members: Boolean(user.can_delete_members),
      can_create_tournaments: Boolean(user.can_create_tournaments),
      can_edit_tournaments: Boolean(user.can_edit_tournaments),
      can_delete_tournaments: Boolean(user.can_delete_tournaments),
      can_manage_participants: Boolean(user.can_manage_participants),
      can_manage_groups: Boolean(user.can_manage_groups),
      can_manage_scorecards: Boolean(user.can_manage_scorecards),
      can_manage_payments: Boolean(user.can_manage_payments),
      // Contabilidad granular
      can_view_balance: Boolean(user.can_view_balance),
      can_view_tournament_incomes: Boolean(user.can_view_tournament_incomes),
      can_manage_tournament_incomes: Boolean(user.can_manage_tournament_incomes),
      can_view_other_incomes: Boolean(user.can_view_other_incomes),
      can_manage_other_incomes: Boolean(user.can_manage_other_incomes),
      can_view_expenses: Boolean(user.can_view_expenses),
      can_manage_expenses: Boolean(user.can_manage_expenses),
      can_view_currency_exchanges: Boolean(user.can_view_currency_exchanges),
      can_manage_currency_exchanges: Boolean(user.can_manage_currency_exchanges),
      can_manage_photos: Boolean(user.can_manage_photos)
    })
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({ username: '', email: '', fullName: '', password: '' })
    setPermissions({
      can_view_members: false,
      can_view_tournaments: false,
      can_view_groups: false,
      can_view_scorecards: false,
      can_view_photos: false,
      can_view_settings: false,
      can_view_rankings: false,
      can_view_accounting: false,
      can_view_financial_totals: false,
      can_create_members: false,
      can_edit_members: false,
      can_delete_members: false,
      can_create_tournaments: false,
      can_edit_tournaments: false,
      can_delete_tournaments: false,
      can_manage_participants: false,
      can_manage_groups: false,
      can_manage_scorecards: false,
      can_manage_payments: false,
      // Contabilidad granular
      can_view_balance: false,
      can_view_tournament_incomes: false,
      can_manage_tournament_incomes: false,
      can_view_other_incomes: false,
      can_manage_other_incomes: false,
      can_view_expenses: false,
      can_manage_expenses: false,
      can_view_currency_exchanges: false,
      can_manage_currency_exchanges: false,
      can_manage_photos: false
    })
    setShowPassword(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
          <p className="mt-1 text-sm text-gray-600">
            Administra los usuarios y sus permisos de acceso al sistema
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowCreateModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza creando tu primer usuario.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último acceso</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.admin_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_primary_admin ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        Administrador Principal
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Usuario
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_login 
                      ? new Date(user.last_login).toLocaleDateString('es-AR')
                      : 'Nunca'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditUserModal(user)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Editar usuario"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar permisos"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      {!user.is_primary_admin && (
                        <button
                          onClick={() => handleDelete(user.admin_id)}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setShowCreateModal(false)} />
            <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Crear Nuevo Usuario</h3>
                  <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Juan Pérez"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="juanperez"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="juan@ejemplo.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Permisos de Acceso</h4>
                    <PermissionsGrid permissions={permissions} setPermissions={setPermissions} />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Crear Usuario
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setShowEditModal(false)} />
            <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Editar Permisos</h3>
                    <p className="text-sm text-gray-600">{selectedUser.full_name} (@{selectedUser.username})</p>
                  </div>
                  <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="border-t pt-4">
                  <PermissionsGrid permissions={permissions} setPermissions={setPermissions} />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEditPermissions}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setShowEditUserModal(false)} />
            <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Editar Usuario</h3>
                  <button onClick={() => setShowEditUserModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Dejar vacío para no cambiar"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Dejar en blanco para mantener la contraseña actual</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => {
                      setShowEditUserModal(false)
                      resetForm()
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEditUser}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Permissions Grid Component
function PermissionsGrid({ permissions, setPermissions }: any) {
  const permissionGroups = [
    {
      title: 'Menú y Vistas',
      permissions: [
        { key: 'can_view_members', label: 'Ver Socios' },
        { key: 'can_view_tournaments', label: 'Ver Torneos' },
        { key: 'can_view_groups', label: 'Ver Grupos' },
        { key: 'can_view_scorecards', label: 'Ver Tarjetas' },
        { key: 'can_view_photos', label: 'Ver Fotos' },
        { key: 'can_view_rankings', label: 'Ver Rankings' },
        { key: 'can_view_accounting', label: 'Ver Contabilidad' },
        { key: 'can_view_financial_totals', label: '💰 Ver Totales Financieros' },
        { key: 'can_view_settings', label: 'Ver Configuración' },
      ]
    },
    {
      title: 'Socios',
      permissions: [
        { key: 'can_create_members', label: 'Crear Socios' },
        { key: 'can_edit_members', label: 'Editar Socios' },
        { key: 'can_delete_members', label: 'Eliminar Socios' },
      ]
    },
    {
      title: 'Torneos',
      permissions: [
        { key: 'can_create_tournaments', label: 'Crear Torneos' },
        { key: 'can_edit_tournaments', label: 'Editar Torneos' },
        { key: 'can_delete_tournaments', label: 'Eliminar Torneos' },
      ]
    },
    {
      title: 'Gestión',
      permissions: [
        { key: 'can_manage_participants', label: 'Gestionar Participantes' },
        { key: 'can_manage_groups', label: 'Gestionar Grupos' },
        { key: 'can_manage_scorecards', label: 'Gestionar Tarjetas' },
        { key: 'can_manage_payments', label: 'Gestionar Pagos' },
      ]
    },
    {
      title: 'Contabilidad - Secciones',
      permissions: [
        { key: 'can_view_balance', label: '📊 Ver Balance General' },
        { key: 'can_view_tournament_incomes', label: '🏆 Ver Ingresos Torneos' },
        { key: 'can_manage_tournament_incomes', label: '🏆✏️ Gestionar Ingresos Torneos' },
        { key: 'can_view_other_incomes', label: '💰 Ver Otros Ingresos' },
        { key: 'can_manage_other_incomes', label: '💰✏️ Gestionar Otros Ingresos' },
      ]
    },
    {
      title: 'Contabilidad - Gastos y Cambio',
      permissions: [
        { key: 'can_view_expenses', label: '💸 Ver Gastos' },
        { key: 'can_manage_expenses', label: '💸✏️ Gestionar Gastos' },
        { key: 'can_view_currency_exchanges', label: '💱 Ver Conversiones' },
        { key: 'can_manage_currency_exchanges', label: '💱✏️ Gestionar Conversiones' },
      ]
    },
    {
      title: 'Fotos',
      permissions: [
        { key: 'can_manage_photos', label: 'Gestionar Fotos' },
      ]
    }
  ]

  return (
    <div className="grid grid-cols-2 gap-6">
      {permissionGroups.map((group) => (
        <div key={group.title} className="space-y-2">
          <h5 className="text-xs font-semibold text-gray-700 uppercase">{group.title}</h5>
          {group.permissions.map((perm) => (
            <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={permissions[perm.key] === true}
                onChange={(e) => setPermissions({ ...permissions, [perm.key]: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">{perm.label}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}

