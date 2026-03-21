import { useMemo, useState } from 'react'
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
  UserCircle2
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

  const { permissions, isLoading: permissionsLoading } = useUserPermissions(clubIdParam)
  const { data: clubs = [] } = useClubs()
  const club = clubs.find((c) => c.course_id === clubId)

  const { data: players = [], isLoading, refetch, isRefetching } = useExternalPlayersRegistry(
    clubId,
    permissions.canViewMembers && !permissionsLoading
  )

  const deletePlayer = useDeleteExternalPlayer(clubId)

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ExternalPlayerRegistry | null>(null)
  const [syncingId, setSyncingId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return players
    return players.filter((p) => {
      const name = (p.full_name || '').toLowerCase()
      const mat = (p.member_number || '').toLowerCase()
      return name.includes(q) || mat.includes(q)
    })
  }, [players, search])

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

  if (!permissions.canViewMembers) {
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
          {permissions.canEditMembers && (
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
                          {permissions.canEditMembers && (
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
