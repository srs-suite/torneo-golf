import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '@/lib/api'
import { permFlag } from '@/lib/permissionFlags'

export interface UserPermissions {
  canViewMembers: boolean
  canEditMembers: boolean
  canDeleteMembers: boolean
  canViewExternalPlayers: boolean
  canCreateExternalPlayers: boolean
  canEditExternalPlayers: boolean
  canDeleteExternalPlayers: boolean
  canViewTournaments: boolean
  canEditTournaments: boolean
  canDeleteTournaments: boolean
  canViewSettings: boolean
  canManageUsers: boolean
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
  canViewExternalPlayers: false,
  canCreateExternalPlayers: false,
  canEditExternalPlayers: false,
  canDeleteExternalPlayers: false,
  canViewTournaments: false,
  canEditTournaments: false,
  canDeleteTournaments: false,
  canViewSettings: false,
  canManageUsers: false,
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

const FULL_PERMISSIONS: UserPermissions = {
  canViewMembers: true,
  canEditMembers: true,
  canDeleteMembers: true,
  canViewExternalPlayers: true,
  canCreateExternalPlayers: true,
  canEditExternalPlayers: true,
  canDeleteExternalPlayers: true,
  canViewTournaments: true,
  canEditTournaments: true,
  canDeleteTournaments: true,
  canViewSettings: true,
  canManageUsers: true,
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

function isStoredPrimaryAdmin(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('isPrimaryAdmin') === '1'
}

/** Primer render: system_admin / admin principal = todo; club_admin = último snapshot guardado */
function readInitialPermissionsFromBrowser(): UserPermissions {
  if (typeof window === 'undefined') return DEFAULT_PERMISSIONS
  const adminRole = localStorage.getItem('adminRole')
  if (adminRole === 'system_admin' || isStoredPrimaryAdmin()) {
    return { ...FULL_PERMISSIONS }
  }
  try {
    const raw = localStorage.getItem('userPermissions')
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserPermissions>
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_PERMISSIONS, ...parsed }
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PERMISSIONS
}

function mapApiUserToPermissions(currentUser: Record<string, unknown>): UserPermissions {
  const pay = permFlag(currentUser.can_manage_payments)
  const next: UserPermissions = {
    canViewMembers: permFlag(currentUser.can_view_members),
    canEditMembers: permFlag(currentUser.can_edit_members) || permFlag(currentUser.can_create_members),
    canDeleteMembers: permFlag(currentUser.can_delete_members),
    canViewExternalPlayers: permFlag(currentUser.can_view_external_players),
    canCreateExternalPlayers: permFlag(currentUser.can_create_external_players),
    canEditExternalPlayers: permFlag(currentUser.can_edit_external_players),
    canDeleteExternalPlayers: permFlag(currentUser.can_delete_external_players),
    canViewTournaments: permFlag(currentUser.can_view_tournaments),
    canEditTournaments: permFlag(currentUser.can_edit_tournaments) || permFlag(currentUser.can_create_tournaments),
    canDeleteTournaments: permFlag(currentUser.can_delete_tournaments),
    canViewSettings: permFlag(currentUser.can_view_settings),
    canManageUsers: permFlag(currentUser.can_manage_users),
    canViewAccounting: permFlag(currentUser.can_view_accounting) || pay,
    canManagePayments: pay,
    canViewRankings: permFlag(currentUser.can_view_rankings),
    canViewPhotos: permFlag(currentUser.can_view_photos),
    canManagePhotos: permFlag(currentUser.can_manage_photos),
    canViewFinancialTotals: permFlag(currentUser.can_view_financial_totals),
    canViewBalance: permFlag(currentUser.can_view_balance),
    canViewTournamentIncomes: permFlag(currentUser.can_view_tournament_incomes),
    canManageTournamentIncomes: permFlag(currentUser.can_manage_tournament_incomes),
    canViewOtherIncomes: permFlag(currentUser.can_view_other_incomes),
    canManageOtherIncomes: permFlag(currentUser.can_manage_other_incomes),
    canViewExpenses: permFlag(currentUser.can_view_expenses),
    canManageExpenses: permFlag(currentUser.can_manage_expenses),
    canViewCurrencyExchanges: permFlag(currentUser.can_view_currency_exchanges),
    canManageCurrencyExchanges: permFlag(currentUser.can_manage_currency_exchanges),
  }
  const hasGranularAcct =
    next.canViewBalance ||
    next.canViewFinancialTotals ||
    next.canViewTournamentIncomes ||
    next.canViewOtherIncomes ||
    next.canViewExpenses ||
    next.canViewCurrencyExchanges
  if (pay && !hasGranularAcct) {
    next.canViewBalance = true
    next.canViewFinancialTotals = true
    next.canViewTournamentIncomes = true
    next.canViewOtherIncomes = true
    next.canViewExpenses = true
    next.canViewCurrencyExchanges = true
  }
  return next
}

export function useUserPermissions(clubId: string | undefined) {
  const [permissions, setPermissions] = useState<UserPermissions>(() => readInitialPermissionsFromBrowser())
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const updatePermissions = useCallback((newPermissions: UserPermissions) => {
    setPermissions(newPermissions)
    localStorage.setItem('userPermissions', JSON.stringify(newPermissions))
  }, [])

  const applyUserRecord = useCallback(
    (currentUser: Record<string, unknown>) => {
      const isPrimary = permFlag(currentUser.is_primary_admin)
      const hasPermissionRow =
        currentUser.permission_id !== null && currentUser.permission_id !== undefined

      if (isPrimary) {
        localStorage.setItem('isPrimaryAdmin', '1')
        updatePermissions({ ...FULL_PERMISSIONS })
        setIsAdmin(true)
        return
      }

      localStorage.removeItem('isPrimaryAdmin')

      if (!hasPermissionRow) {
        updatePermissions({ ...DEFAULT_PERMISSIONS })
        setIsAdmin(false)
        return
      }

      updatePermissions(mapApiUserToPermissions(currentUser))
      setIsAdmin(false)
    },
    [updatePermissions]
  )

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const adminRole = localStorage.getItem('adminRole')
        const adminId = localStorage.getItem('adminId')

        if (adminRole === 'system_admin') {
          updatePermissions({ ...FULL_PERMISSIONS })
          setIsAdmin(true)
          setIsLoading(false)
          return
        }

        if (!clubId || !adminId) {
          updatePermissions({ ...DEFAULT_PERMISSIONS })
          setIsLoading(false)
          return
        }

        // Preferir endpoint del usuario logueado (Bearer token)
        try {
          const meRes = await api.get(`/club/${clubId}/users/me`)
          const me = meRes.data?.data ?? meRes.data
          if (me && typeof me === 'object') {
            applyUserRecord(me as Record<string, unknown>)
            setIsLoading(false)
            return
          }
        } catch (meError) {
          console.warn('No se pudo cargar /users/me:', meError)
          if (isStoredPrimaryAdmin()) {
            updatePermissions({ ...FULL_PERMISSIONS })
            setIsAdmin(true)
            setIsLoading(false)
            return
          }
        }

        updatePermissions({ ...DEFAULT_PERMISSIONS })
        setIsAdmin(false)
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching permissions:', error)
        if (isStoredPrimaryAdmin()) {
          updatePermissions({ ...FULL_PERMISSIONS })
          setIsAdmin(true)
        } else {
          updatePermissions({ ...DEFAULT_PERMISSIONS })
          setIsAdmin(false)
        }
        setIsLoading(false)
      }
    }

    fetchPermissions()
  }, [clubId, updatePermissions, applyUserRecord])

  const showExternalPlayersNav = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (!clubId) return false
    const role = localStorage.getItem('adminRole')
    if (role === 'system_admin') return true
    return permissions.canViewExternalPlayers
  }, [clubId, permissions.canViewExternalPlayers])

  return { permissions, isLoading, isAdmin, showExternalPlayersNav }
}
