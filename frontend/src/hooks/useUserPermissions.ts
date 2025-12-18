import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export interface UserPermissions {
  canViewMembers: boolean
  canEditMembers: boolean
  canDeleteMembers: boolean
  canViewTournaments: boolean
  canEditTournaments: boolean
  canDeleteTournaments: boolean
  canViewSettings: boolean
  canViewAccounting: boolean
  canManagePayments: boolean
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  canViewMembers: false,
  canEditMembers: false,
  canDeleteMembers: false,
  canViewTournaments: false,
  canEditTournaments: false,
  canDeleteTournaments: false,
  canViewSettings: false,
  canViewAccounting: false,
  canManagePayments: false,
}

// Función para inicializar permisos desde localStorage
const getInitialPermissions = (): UserPermissions => {
  const adminRole = localStorage.getItem('adminRole')
  if (adminRole === 'system_admin' || adminRole === 'club_admin') {
    // Admin tiene todos los permisos
    return {
      canViewMembers: true,
      canEditMembers: true,
      canDeleteMembers: true,
      canViewTournaments: true,
      canEditTournaments: true,
      canDeleteTournaments: true,
      canViewSettings: true,
      canViewAccounting: true,
      canManagePayments: true,
    }
  }
  return DEFAULT_PERMISSIONS
}

export function useUserPermissions(clubId: string | undefined) {
  const [permissions, setPermissions] = useState<UserPermissions>(getInitialPermissions)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(() => {
    const adminRole = localStorage.getItem('adminRole')
    return adminRole === 'system_admin' || adminRole === 'club_admin'
  })

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        // Verificar si es administrador del sistema
        const adminRole = localStorage.getItem('adminRole')
        if (adminRole === 'system_admin') {
          // Admin del sistema tiene todos los permisos
          setPermissions({
            canViewMembers: true,
            canEditMembers: true,
            canDeleteMembers: true,
            canViewTournaments: true,
            canEditTournaments: true,
            canDeleteTournaments: true,
            canViewSettings: true,
            canViewAccounting: true,
            canManagePayments: true,
          })
          setIsAdmin(true)
          setIsLoading(false)
          return
        }

        if (!clubId) {
          setIsLoading(false)
          return
        }

        // Obtener el ID del usuario actual
        const adminId = localStorage.getItem('adminId')
        if (!adminId) {
          setIsLoading(false)
          return
        }

        // Obtener los usuarios del club
        const response = await api.get(`/club/${clubId}/users`)
        const users = response.data.data || []
        
        // Buscar el usuario actual
        const currentUser = users.find((u: any) => u.admin_id === parseInt(adminId))
        
        if (currentUser) {
          // Verificar si es administrador principal del club
          if (currentUser.is_primary_admin) {
            setPermissions({
              canViewMembers: true,
              canEditMembers: true,
              canDeleteMembers: true,
              canViewTournaments: true,
              canEditTournaments: true,
              canDeleteTournaments: true,
              canViewSettings: true,
              canViewAccounting: true,
              canManagePayments: true,
            })
            setIsAdmin(true)
          } else {
            // Usuario con permisos limitados
            setPermissions({
              canViewMembers: currentUser.can_view_members || false,
              canEditMembers: currentUser.can_edit_members || false,
              canDeleteMembers: currentUser.can_delete_members || false,
              canViewTournaments: currentUser.can_view_tournaments || false,
              canEditTournaments: currentUser.can_edit_tournaments || false,
              canDeleteTournaments: currentUser.can_delete_tournaments || false,
              canViewSettings: currentUser.can_view_settings || false,
              canViewAccounting: currentUser.can_view_accounting || false,
              canManagePayments: currentUser.can_manage_payments || false,
            })
            setIsAdmin(false)
          }
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching permissions:', error)
        setIsLoading(false)
      }
    }

    fetchPermissions()
  }, [clubId])

  return { permissions, isLoading, isAdmin }
}

