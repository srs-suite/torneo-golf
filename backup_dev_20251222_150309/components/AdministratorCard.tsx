import { useState } from 'react'
import { 
  User, 
  Building2, 
  Shield, 
  ShieldCheck, 
  Edit, 
  Trash2, 
  Key,
  Mail,
  Calendar,
  Clock
} from 'lucide-react'
import { Administrator } from '@/types/administrator'
import { useUpdateAdministrator, useDeleteAdministrator, useResetPassword } from '@/hooks/useAdministrators'

interface AdministratorCardProps {
  administrator: Administrator
  onEdit: (admin: Administrator) => void
}

export function AdministratorCard({ administrator, onEdit }: AdministratorCardProps) {
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  
  const updateAdmin = useUpdateAdministrator()
  const deleteAdmin = useDeleteAdministrator()
  const resetPassword = useResetPassword()

  const getRoleIcon = (role: string, isPrimary: boolean) => {
    if (role === 'system_admin') {
      return <ShieldCheck className="w-5 h-5 text-red-600" />
    }
    return isPrimary ? 
      <Shield className="w-5 h-5 text-blue-600" /> : 
      <User className="w-5 h-5 text-gray-600" />
  }

  const getRoleText = (role: string, isPrimary: boolean) => {
    if (role === 'system_admin') return 'Admin Sistema'
    return isPrimary ? 'Admin Principal' : 'Admin Club'
  }

  const getRoleColor = (role: string, isPrimary: boolean) => {
    if (role === 'system_admin') {
      return 'bg-red-100 text-red-800 border-red-200'
    }
    return isPrimary ? 
      'bg-blue-100 text-blue-800 border-blue-200' : 
      'bg-gray-100 text-gray-800 border-gray-200'
  }

  const handleToggleActive = () => {
    updateAdmin.mutate({
      id: administrator.admin_id,
      data: { isActive: !administrator.is_active }
    })
  }

  const handleDelete = () => {
    if (confirm(`¿Estás seguro de eliminar al administrador ${administrator.full_name}?`)) {
      deleteAdmin.mutate(administrator.admin_id)
    }
  }

  const handleResetPassword = () => {
    if (newPassword.trim().length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres')
      return
    }
    
    resetPassword.mutate(
      { id: administrator.admin_id, password: newPassword },
      {
        onSuccess: () => {
          setShowResetPassword(false)
          setNewPassword('')
        }
      }
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-black text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">{administrator.full_name}</h3>
              <p className="text-sm text-gray-300">@{administrator.username}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Role Badge */}
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(administrator.role, administrator.is_primary_admin)}`}>
              {getRoleIcon(administrator.role, administrator.is_primary_admin)}
              <span className="ml-1">{getRoleText(administrator.role, administrator.is_primary_admin)}</span>
            </div>
            
            {/* Status Badge */}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              administrator.is_active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {administrator.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Contact Info */}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="w-4 h-4 mr-2" />
            <span>{administrator.email}</span>
          </div>
          {administrator.club_name && (
            <div className="flex items-center text-sm text-gray-600">
              <Building2 className="w-4 h-4 mr-2" />
              <span>{administrator.club_name} ({administrator.club_code})</span>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500 flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Creado
            </div>
            <div className="font-medium">{formatDate(administrator.created_at)}</div>
          </div>
          {administrator.last_login && (
            <div>
              <div className="text-gray-500 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Último acceso
              </div>
              <div className="font-medium">{formatDate(administrator.last_login)}</div>
            </div>
          )}
        </div>

        {/* Reset Password Section */}
        {showResetPassword && (
          <div className="border-t pt-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Restablecer Contraseña</h4>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña (mín. 6 caracteres)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <button
                  onClick={handleResetPassword}
                  disabled={resetPassword.isPending}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {resetPassword.isPending ? 'Guardando...' : 'Cambiar'}
                </button>
                <button
                  onClick={() => {
                    setShowResetPassword(false)
                    setNewPassword('')
                  }}
                  className="px-3 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Actions */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(administrator)}
            className="flex items-center px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded"
          >
            <Edit className="w-4 h-4 mr-1" />
            Editar
          </button>
          
          <button
            onClick={() => setShowResetPassword(!showResetPassword)}
            className="flex items-center px-3 py-1.5 text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded"
          >
            <Key className="w-4 h-4 mr-1" />
            Contraseña
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleActive}
            disabled={updateAdmin.isPending}
            className={`px-3 py-1.5 text-sm rounded ${
              administrator.is_active
                ? 'text-red-700 hover:text-red-900 hover:bg-red-100'
                : 'text-green-700 hover:text-green-900 hover:bg-green-100'
            }`}
          >
            {administrator.is_active ? 'Desactivar' : 'Activar'}
          </button>
          
          {!administrator.is_primary_admin && administrator.role !== 'system_admin' && (
            <button
              onClick={handleDelete}
              disabled={deleteAdmin.isPending}
              className="flex items-center px-3 py-1.5 text-sm text-red-700 hover:text-red-900 hover:bg-red-100 rounded"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
