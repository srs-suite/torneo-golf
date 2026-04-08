import { useMemo, useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  UserPlus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Loader2,
  UserCircle2,
  Printer,
  X
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useUserPermissions } from '@/hooks/useUserPermissions'
import { useClubs } from '@/hooks/useClubs'
import {
  useExternalPlayersRegistry,
  useDeleteExternalPlayer
} from '@/hooks/useParticipants'
import { CreateExternalPlayerModal } from '@/components/CreateExternalPlayerModal'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { formatHcpDisplayForClubPlayer } from '@/utils/clubHandicap'
import { syncPlayerHandicapFromAagApi } from '@/services/aagLookupService'
import type { ExternalPlayerRegistry } from '@/types/externalPlayer'

function formatAagDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  } catch {
    return '—'
  }
}

function genderLabel(g: string | null | undefined): string {
  if (g === 'M') return 'M'
  if (g === 'F') return 'F'
  if (g === 'Other') return 'Otro'
  return '—'
}

export default function ExternalPlayers() {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clubId = clubIdParam ? parseInt(clubIdParam, 10) : 0

  const { permissions, isLoading: permissionsLoading, showExternalPlayersNav } = useUserPermissions(clubIdParam)
  const { data: clubs = [] } = useClubs()
  const club = clubs.find((c) => c.course_id === clubId)

  const canEditExternalPlayers = permissions.canEditMembers || permissions.canManagePayments

  const { data: players = [], isLoading, refetch, isRefetching } = useExternalPlayersRegistry(
    clubId,
    showExternalPlayersNav && !permissionsLoading
  )

  const deletePlayer = useDeleteExternalPlayer(clubId)

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ExternalPlayerRegistry | null>(null)
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [externalPlanchaEmbed, setExternalPlanchaEmbed] = useState<{
    externalPlayerIds: number[]
  } | null>(null)
  const [externalPlanchaSelectedIds, setExternalPlanchaSelectedIds] = useState<Set<number>>(() => new Set())
  const externalPlanchaSelectAllRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return players
    return players.filter((p) => {
      const name = (p.full_name || '').toLowerCase()
      const mat = (p.member_number || '').toLowerCase()
      return name.includes(q) || mat.includes(q)
    })
  }, [players, search])

  const visibleExternalIdsForPlancha = useMemo(
    () => filtered.map((p) => p.external_id),
    [filtered]
  )

  const allVisibleExternalPlanchaSelected =
    visibleExternalIdsForPlancha.length > 0 &&
    visibleExternalIdsForPlancha.every((id) => externalPlanchaSelectedIds.has(id))

  useEffect(() => {
    const el = externalPlanchaSelectAllRef.current
    if (!el) return
    const n = visibleExternalIdsForPlancha.filter((id) => externalPlanchaSelectedIds.has(id)).length
    el.indeterminate = n > 0 && n < visibleExternalIdsForPlancha.length
  }, [visibleExternalIdsForPlancha, externalPlanchaSelectedIds])

  const toggleExternalPlanchaRowSelected = (externalId: number) => {
    setExternalPlanchaSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(externalId)) next.delete(externalId)
      else next.add(externalId)
      return next
    })
  }

  const toggleSelectAllExternalPlanchaVisible = () => {
    setExternalPlanchaSelectedIds((prev) => {
      const next = new Set(prev)
      if (allVisibleExternalPlanchaSelected) {
        visibleExternalIdsForPlancha.forEach((id) => next.delete(id))
      } else {
        visibleExternalIdsForPlancha.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const openCreate = () => {
    setEditing(null)
    setShowModal(true)
  }

  const openEdit = (row: ExternalPlayerRegistry) => {
    setEditing(row)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditing(null)
  }

  const handleModalSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ['external-players-registry', clubId] })
    void queryClient.invalidateQueries({ queryKey: ['external-players', clubId] })
    void refetch()
  }

  const handleSyncAag = async (row: ExternalPlayerRegistry) => {
    const mn = String(row.member_number || '').trim()
    if (!mn) {
      toast.error('Este jugador no tiene matrícula cargada')
      return
    }
    setSyncingId(row.external_id)
    try {
      const res = await syncPlayerHandicapFromAagApi(clubId, 'external', row.external_id)
      if (res.success) {
        toast.success(res.data?.message || 'AAG actualizado')
        await handleModalSuccess()
      } else {
        toast.error(res.error?.message || 'No se pudo sincronizar con AAG')
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string }
      toast.error(err?.response?.data?.error?.message || err?.message || 'Error al consultar AAG')
    } finally {
      setSyncingId(null)
    }
  }

  const openExternalPlanchaPrint = (externalIds: number[]) => {
    const ids = [...new Set(externalIds.filter((id) => Number.isFinite(id) && id > 0))]
    if (ids.length === 0) {
      toast.error('Seleccioná al menos un jugador.')
      return
    }
    setExternalPlanchaEmbed({ externalPlayerIds: ids })
  }

  useEffect(() => {
    if (externalPlanchaEmbed == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExternalPlanchaEmbed(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [externalPlanchaEmbed])

  const handleDelete = (row: ExternalPlayerRegistry) => {
    if (!window.confirm(`¿Eliminar a "${row.full_name}"? Esta acción no se puede deshacer.`)) return
    deletePlayer.mutate(row.external_id, {
      onSuccess: () => {
        void refetch()
      }
    })
  }

  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    )
  }

  if (!showExternalPlayersNav) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p className="text-gray-700">No tenés permiso para ver esta sección.</p>
        <button
          type="button"
          onClick={() => navigate(`/club/${clubId}/admin`)}
          className="mt-4 text-blue-600 hover:underline"
        >
          Volver al panel
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(`/club/${clubId}/admin`)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                <UserCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Jugadores externos</h1>
                <p className="text-sm text-gray-600">
                  {club?.course_name || `Club #${clubId}`}
                </p>
              </div>
            </div>
          </div>
          {canEditExternalPlayers && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              <UserPlus className="w-4 h-4" />
              Agregar jugador externo
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder="Buscar por nombre o matrícula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>
        </div>

        {externalPlanchaSelectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="text-gray-700">
              {externalPlanchaSelectedIds.size} seleccionado
              {externalPlanchaSelectedIds.size !== 1 ? 's' : ''} para plancha
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openExternalPlanchaPrint(Array.from(externalPlanchaSelectedIds))}
                className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir planchas
              </button>
              <button
                type="button"
                onClick={() => setExternalPlanchaSelectedIds(new Set())}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                Limpiar selección
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-10 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        ref={externalPlanchaSelectAllRef}
                        type="checkbox"
                        checked={
                          visibleExternalIdsForPlancha.length > 0 && allVisibleExternalPlanchaSelected
                        }
                        onChange={toggleSelectAllExternalPlanchaVisible}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                        title="Seleccionar filas visibles para imprimir plancha"
                        aria-label="Seleccionar todos los jugadores visibles para plancha"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Matrícula
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Club origen
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Género
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Handicap Index
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      HCP Club
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AAG
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Últ. consulta AAG
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((row) => (
                    <tr key={row.external_id} className="hover:bg-gray-50">
                      <td className="px-2 py-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={externalPlanchaSelectedIds.has(row.external_id)}
                          onChange={() => toggleExternalPlanchaRowSelected(row.external_id)}
                          className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                          title="Incluir en impresión de planchas"
                          aria-label={`Incluir plancha de ${row.full_name}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.member_number || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-[140px] truncate" title={row.home_club || ''}>
                        {row.home_club || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{genderLabel(row.gender)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.handicap_index != null && Number.isFinite(row.handicap_index)
                          ? row.handicap_index
                          : '—'}
                      </td>
                      <td
                        className="px-4 py-3 text-sm text-gray-700"
                        title="Misma regla que la tabla de socios: manual si el club no usa características de cancha; si no, índice → HCP con fórmula del club."
                      >
                        {formatHcpDisplayForClubPlayer(club, {
                          handicap_index: row.handicap_index,
                          handicap_local: row.handicap_local,
                          gender: row.gender
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-[120px] truncate" title={row.aag_sync_message || ''}>
                        {row.aag_sync_status || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatAagDate(row.aag_last_check_at)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openExternalPlanchaPrint([row.external_id])}
                            className="p-1.5 text-gray-500 hover:text-gray-800"
                            title="Plancha física: nombre, matrícula, HCP; fecha del día"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {canEditExternalPlayers && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(row)}
                                className="p-1.5 text-gray-500 hover:text-gray-800"
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSyncAag(row)}
                                disabled={syncingId === row.external_id}
                                className="p-1.5 text-gray-500 hover:text-blue-700 disabled:opacity-50"
                                title="Consultar AAG (sincronizar índice)"
                              >
                                {syncingId === row.external_id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                              </button>
                              {permissions.canDeleteMembers && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(row)}
                                  disabled={deletePlayer.isPending}
                                  className="p-1.5 text-gray-500 hover:text-red-600 disabled:opacity-50"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm">
                {players.length === 0
                  ? 'No hay jugadores externos cargados.'
                  : 'Ningún resultado con ese criterio de búsqueda.'}
              </div>
            )}
          </div>
        )}

        {isRefetching && !isLoading && (
          <p className="text-xs text-gray-400 text-center">Actualizando…</p>
        )}
      </main>

      {externalPlanchaEmbed != null && externalPlanchaEmbed.externalPlayerIds.length > 0 && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ext-plancha-embed-title"
          onClick={() => setExternalPlanchaEmbed(null)}
        >
          <div
            className="flex h-[min(88vh,840px)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-gray-50 px-3 py-2">
              <span id="ext-plancha-embed-title" className="text-sm font-medium text-gray-800">
                {externalPlanchaEmbed.externalPlayerIds.length > 1
                  ? `Plancha física · ${externalPlanchaEmbed.externalPlayerIds.length} planchas`
                  : 'Plancha física · vista previa'}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setExternalPlanchaEmbed(null)}
              >
                <X className="h-4 w-4" />
                Cerrar
              </button>
            </div>
            <iframe
              key={externalPlanchaEmbed.externalPlayerIds.join(',')}
              className="min-h-0 w-full flex-1 border-0 bg-gray-100"
              title="Imprimir plancha física"
              src={`/club/${clubId}/external-players/print-plancha?externalPlayerIds=${externalPlanchaEmbed.externalPlayerIds.join(',')}&embed=1`}
            />
          </div>
        </div>
      )}

      {showModal && (
        <CreateExternalPlayerModal
          isOpen={showModal}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          clubId={clubId}
          openDirectlyToCreateForm
          editingPlayer={
            editing
              ? {
                  player_id: editing.external_id,
                  player_name: editing.full_name,
                  player_email: editing.email,
                  player_phone: editing.phone,
                  gender: editing.gender,
                  handicap_index: editing.handicap_index,
                  handicap_local: editing.handicap_local,
                  member_number: editing.member_number,
                  player_club: editing.home_club,
                  notes: editing.notes
                }
              : undefined
          }
        />
      )}
    </div>
  )
}
