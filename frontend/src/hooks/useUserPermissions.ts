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
  canViewRankings: boolean
  canViewPhotos: boolean
  canManagePhotos: boolean
  // Contabilidad granular
  canViewFinancialTotals: boolean
  canViewBalance: boolean
  canViewTournamentIncomes: boolean
  canManageTournamentIncomes: boolean
  canViewOtherIncomes: boolean
  canManageOtherIncomes: boolean
  canViewExpenses: boolean
  canManageExpenses: boolean
  canViewCurrencyExchanges: boolean
  canManageCurrencyExchanges: boolean
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
  canViewRankings: false,
  canViewPhotos: false,
  canManagePhotos: false,
  canViewFinancialTotals: false,
  canViewBalance: false,
  canViewTournamentIncomes: false,
  canManageTournamentIncomes: false,
  canViewOtherIncomes: false,
  canManageOtherIncomes: false,
  canViewExpenses: false,
  canManageExpenses: false,
  canViewCurrencyExchanges: false,
  canManageCurrencyExchanges: false,
}

// Función para inicializar permisos desde localStorage
const getInitialPermissions = (): UserPermissions => {
  const adminRole = localStorage.getItem('adminRole')
  if (adminRole === 'system_admin') {
    // Solo system_admin tiene todos los permisos automáticamente
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
      canViewRankings: true,
      canViewPhotos: true,
      canManagePhotos: true,
      canViewFinancialTotals: true,
      canViewBalance: true,
      canViewTournamentIncomes: true,
      canManageTournamentIncomes: true,
      canViewOtherIncomes: true,
      canManageOtherIncomes: true,
      canViewExpenses: true,
      canManageExpenses: true,
      canViewCurrencyExchanges: true,
      canManageCurrencyExchanges: true,
    }
  }
  
  // Para club_admin, verificar permisos en la base de datos (a menos que sea primary_admin)
  return DEFAULT_PERMISSIONS
}

export function useUserPermissions(clubId: string | undefined) {
  const [permissions, setPermissions] = useState<UserPermissions>(getInitialPermissions)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false) // Se actualiza después de cargar permisos

  // Helper para guardar permisos en localStorage y state
  const updatePermissions = (newPermissions: UserPermissions) => {
    setPermissions(newPermissions)
    localStorage.setItem('userPermissions', JSON.stringify(newPermissions))
  }

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        // Verificar si es administrador del sistema
        const adminRole = localStorage.getItem('adminRole')
        const adminId = localStorage.getItem('adminId')
        
        if (adminRole === 'system_admin') {
          // Admin del sistema tiene todos los permisos
          updatePermissions({
            canViewMembers: true,
            canEditMembers: true,
            canDeleteMembers: true,
            canViewTournaments: true,
            canEditTournaments: true,
            canDeleteTournaments: true,
            canViewSettings: true,
            canViewAccounting: true,
            canManagePayments: true,
            canViewRankings: true,
            canViewPhotos: true,
            canManagePhotos: true,
            canViewFinancialTotals: true,
            canViewBalance: true,
            canViewTournamentIncomes: true,
            canManageTournamentIncomes: true,
            canViewOtherIncomes: true,
            canManageOtherIncomes: true,
            canViewExpenses: true,
            canManageExpenses: true,
            canViewCurrencyExchanges: true,
            canManageCurrencyExchanges: true,
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
        if (!adminId) {
          setIsLoading(false)
          return
        }

        // Obtener los usuarios del club
        const response = await api.get(`/club/${clubId}/users`)
        const users = response.data.data || []
        
        // Buscar el usuario actual (puede estar en admin_id o user_id)
        const currentUser = users.find((u: any) => 
          u.admin_id === parseInt(adminId) || u.user_id === parseInt(adminId)
        )
        
        if (currentUser) {
          // Si no tiene permission_id (permisos en null), dar permisos completos por defecto
          const hasNoPermissions = currentUser.permission_id === null || currentUser.permission_id === undefined
          
          // Verificar si es administrador principal del club o si no tiene permisos configurados
          if (currentUser.is_primary_admin || hasNoPermissions) {
            updatePermissions({
              canViewMembers: true,
              canEditMembers: true,
              canDeleteMembers: true,
              canViewTournaments: true,
              canEditTournaments: true,
              canDeleteTournaments: true,
              canViewSettings: true,
              canViewAccounting: true,
              canManagePayments: true,
              canViewRankings: true,
              canViewPhotos: true,
              canManagePhotos: true,
              canViewFinancialTotals: true,
              canViewBalance: true,
              canViewTournamentIncomes: true,
              canManageTournamentIncomes: true,
              canViewOtherIncomes: true,
              canManageOtherIncomes: true,
              canViewExpenses: true,
              canManageExpenses: true,
              canViewCurrencyExchanges: true,
              canManageCurrencyExchanges: true,
            })
            setIsAdmin(true)
          } else {
            // Usuario con permisos limitados
            setIsAdmin(false)
            updatePermissions({
              canViewMembers: currentUser.can_view_members || false,
              canEditMembers: currentUser.can_edit_members || false,
              canDeleteMembers: currentUser.can_delete_members || false,
              canViewTournaments: currentUser.can_view_tournaments || false,
              canEditTournaments: currentUser.can_edit_tournaments || false,
              canDeleteTournaments: currentUser.can_delete_tournaments || false,
              canViewSettings: currentUser.can_view_settings || false,
              canViewAccounting: currentUser.can_view_accounting || false,
              canManagePayments: currentUser.can_manage_payments || false,
              canViewRankings: currentUser.can_view_rankings || false,
              canViewPhotos: currentUser.can_view_photos || false,
              canManagePhotos: currentUser.can_manage_photos || false,
              canViewFinancialTotals: currentUser.can_view_financial_totals || false,
              canViewBalance: currentUser.can_view_balance || false,
              canViewTournamentIncomes: currentUser.can_view_tournament_incomes || false,
              canManageTournamentIncomes: currentUser.can_manage_tournament_incomes || false,
              canViewOtherIncomes: currentUser.can_view_other_incomes || false,
              canManageOtherIncomes: currentUser.can_manage_other_incomes || false,
              canViewExpenses: currentUser.can_view_expenses || false,
              canManageExpenses: currentUser.can_manage_expenses || false,
              canViewCurrencyExchanges: currentUser.can_view_currency_exchanges || false,
              canManageCurrencyExchanges: currentUser.can_manage_currency_exchanges || false,
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

