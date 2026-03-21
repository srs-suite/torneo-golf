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

/** Compara IDs de admin/user aunque vengan como string (MySQL) o number */
function sameAdminId(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined || a === '' || b === null || b === undefined || b === '') {
    return false
  }
  const na = Number(a)
  const nb = Number(b)
  return Number.isFinite(na) && Number.isFinite(nb) && na === nb
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

const FULL_PERMISSIONS: UserPermissions = {
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

/** Primer render: system_admin = todo; club_admin = último snapshot guardado (evita “todo false” hasta el GET) */
function readInitialPermissionsFromBrowser(): UserPermissions {
  if (typeof window === 'undefined') return DEFAULT_PERMISSIONS
  const adminRole = localStorage.getItem('adminRole')
  if (adminRole === 'system_admin') {
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

export function useUserPermissions(clubId: string | undefined) {
  const [permissions, setPermissions] = useState<UserPermissions>(() => readInitialPermissionsFromBrowser())
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
          updatePermissions({ ...FULL_PERMISSIONS })
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
        const rawList = response.data?.data ?? response.data
        const users = Array.isArray(rawList) ? rawList : []

        // Buscar el usuario actual (puede estar en admin_id o user_id).
        let currentUser = users.find(
          (u: any) => sameAdminId(u.admin_id, adminId) || sameAdminId(u.user_id, adminId)
        )
        // Respaldo: si el ID no matchea (drivers / columnas duplicadas en SQL), matchear por usuario logueado
        const adminUsername = localStorage.getItem('adminUsername')
        if (!currentUser && adminUsername && users.length > 0) {
          const un = adminUsername.trim().toLowerCase()
          currentUser = users.find((u: any) => String(u.username || '').trim().toLowerCase() === un)
        }
        
        if (currentUser) {
          // Si no tiene permission_id (permisos en null), dar permisos completos por defecto
          const hasNoPermissions = currentUser.permission_id === null || currentUser.permission_id === undefined
          
          // Verificar si es administrador principal del club o si no tiene permisos configurados
          if (currentUser.is_primary_admin || hasNoPermissions) {
            updatePermissions({ ...FULL_PERMISSIONS })
            setIsAdmin(true)
          } else {
            // Usuario con permisos limitados
            setIsAdmin(false)
            const pay = !!(currentUser.can_manage_payments || false)
            const next: UserPermissions = {
              canViewMembers: currentUser.can_view_members || false,
              canEditMembers: currentUser.can_edit_members || false,
              canDeleteMembers: currentUser.can_delete_members || false,
              canViewTournaments: currentUser.can_view_tournaments || false,
              canEditTournaments: currentUser.can_edit_tournaments || false,
              canDeleteTournaments: currentUser.can_delete_tournaments || false,
              canViewSettings: currentUser.can_view_settings || false,
              // Legacy: muchos usuarios tienen solo can_manage_payments sin flags granulares ni can_view_accounting
              canViewAccounting: !!(currentUser.can_view_accounting || currentUser.can_manage_payments),
              canManagePayments: pay,
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
            }
            const hasGranularAcct =
              next.canViewBalance ||
              next.canViewFinancialTotals ||
              next.canViewTournamentIncomes ||
              next.canViewOtherIncomes ||
              next.canViewExpenses ||
              next.canViewCurrencyExchanges
            // Quien gestiona cobros debe ver contabilidad aunque la BD no tenga columnas nuevas en true
            if (pay && !hasGranularAcct) {
              next.canViewBalance = true
              next.canViewFinancialTotals = true
              next.canViewTournamentIncomes = true
              next.canViewOtherIncomes = true
              next.canViewExpenses = true
              next.canViewCurrencyExchanges = true
            }
            updatePermissions(next)
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

