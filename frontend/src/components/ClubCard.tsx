import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Edit, Pause, Play, Building2, Trash2, Flag } from 'lucide-react'
import { Club } from '@/types/club'
import { useUpdateClub, useDeleteClub } from '@/hooks/useClubs'
import { CreateClubModal } from './CreateClubModal'

interface ClubCardProps {
  club: Club
}

export function ClubCard({ club }: ClubCardProps) {
  const navigate = useNavigate()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const updateClub = useUpdateClub()
  const deleteClub = useDeleteClub()

  const handleToggleStatus = () => {
    const newStatus = club.subscription_status === 'active' ? 'suspended' : 'active'
    updateClub.mutate({
      id: club.course_id,
      data: { ...club, subscription_status: newStatus }
    })
  }

  const handleDeleteClub = () => {
    deleteClub.mutate(club.course_id, {
      onSuccess: () => {
        setShowDeleteConfirm(false)
      }
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo'
      case 'suspended':
        return 'Suspendido'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-black text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {club.logo_path && club.logo_path !== '' ? (
                <img
                  src={club.logo_path}
                  alt={`Logo ${club.course_name}`}
                  className="w-10 h-10 rounded-lg object-cover"
                  onError={(e) => {
                    // Si la imagen no carga, mostrar el placeholder
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
              ) : null}
              <div className={`w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center ${club.logo_path && club.logo_path !== '' ? 'hidden' : ''}`}>
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">{club.course_name}</h3>
                <p className="text-sm text-gray-300">{club.club_code}</p>
              </div>
            </div>
            
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(club.subscription_status)}`}>
              {getStatusText(club.subscription_status)}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Location */}
          <div>
            <p className="text-sm text-gray-600">{club.address}</p>
            <p className="text-sm text-gray-600">{club.city}, {club.country}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {club.total_members || 0}
              </div>
              <div className="text-xs text-gray-500">Miembros</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {club.total_tournaments || 0}
              </div>
              <div className="text-xs text-gray-500">Torneos</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {club.administrators || 0}
              </div>
              <div className="text-xs text-gray-500">Admins</div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-sm text-gray-600 space-y-1">
            {club.email && (
              <p className="truncate">{club.email}</p>
            )}
            {club.phone && (
              <p>{club.phone}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-4 py-3">
          <div className="flex justify-between space-x-2 mb-2">
            <button
              className="btn btn-outline flex-1 flex items-center justify-center space-x-1"
              onClick={() => window.open(`/club/${club.course_id}/admin`, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
              <span>Acceder</span>
            </button>
            
            <button
              className="btn btn-outline flex-1 flex items-center justify-center space-x-1"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit className="w-4 h-4" />
              <span>Editar</span>
            </button>
            
            <button
              className={`btn flex-1 flex items-center justify-center space-x-1 ${
                club.subscription_status === 'active'
                  ? 'btn-outline text-yellow-600 hover:bg-yellow-50'
                  : 'btn-success'
              }`}
              onClick={handleToggleStatus}
              disabled={updateClub.isPending}
            >
              {club.subscription_status === 'active' ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Suspender</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Activar</span>
                </>
              )}
            </button>
          </div>

          {/* Unified Holes Management Button */}
          <div className="mb-2">
            <button
              className="btn bg-green-600 hover:bg-green-700 text-white w-full flex items-center justify-center space-x-2"
              onClick={() => navigate(`/system/tees/${club.course_id}`)}
            >
              <Flag className="w-4 h-4" />
              <span>Gestión de Hoyos</span>
            </button>
          </div>

          {/* Delete Section */}
          {!showDeleteConfirm ? (
            <button
              className="btn bg-red-600 hover:bg-red-700 text-white w-full flex items-center justify-center space-x-2"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar Club</span>
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-red-600 font-medium text-center">
                ¿Estás seguro de eliminar "{club.course_name}"?
              </p>
              <div className="flex space-x-2">
                <button
                  className="btn btn-outline flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteClub.isPending}
                >
                  Cancelar
                </button>
                <button
                  className="btn bg-red-600 hover:bg-red-700 text-white flex-1 flex items-center justify-center space-x-1"
                  onClick={handleDeleteClub}
                  disabled={deleteClub.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deleteClub.isPending ? 'Eliminando...' : 'Confirmar'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <CreateClubModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editClub={club}
      />
    </>
  )
}
