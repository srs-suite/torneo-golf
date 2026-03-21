import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/lib/api'

export interface AagMassSyncSummary {
  membersProcessed: number
  externalsProcessed: number
  totalProcessed: number
  synced: number
  noIndex: number
  notFound: number
  errors: number
  skippedNoMemberNumber: number
}

interface AagMassSyncPanelProps {
  clubId: number
  enabled: boolean
  /** Llamado tras sync exitoso (p. ej. refetch de socios) */
  onAfterSync?: () => void
}

/** POST masivo AAG; timeout largo por procesamiento secuencial en backend */
const SYNC_TIMEOUT_MS = 600_000

export function AagMassSyncPanel({ clubId, enabled, onAfterSync }: AagMassSyncPanelProps) {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<AagMassSyncSummary | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)

  if (!enabled) return null

  const runSync = async () => {
    setLoading(true)
    try {
      const { data } = await api.post<{ success: boolean; data?: AagMassSyncSummary; error?: { message?: string } }>(
        `/club/${clubId}/aag/sync-all-handicaps`,
        {},
        { timeout: SYNC_TIMEOUT_MS }
      )

      if (data?.success && data.data) {
        setSummary(data.data)
        setShowResultModal(true)
        toast.success('Sincronización AAG finalizada')
        onAfterSync?.()
      } else {
        toast.error(data?.error?.message || 'No se pudo completar la sincronización AAG')
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string }
      const msg =
        err?.response?.data?.error?.message || err?.message || 'Error de red al sincronizar con AAG'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={runSync}
        disabled={loading}
        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Consulta masiva de índices en AAG para socios y jugadores externos con matrícula"
      >
        {loading ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        <span>{loading ? 'Sincronizando…' : 'Actualizar índices AAG'}</span>
      </button>

      {showResultModal && summary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Resultado sincronización AAG</h3>
            <p className="text-sm text-gray-600">
              Procesamiento completado. Detalle por estado:
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">Socios procesados</dt>
              <dd className="font-medium text-right">{summary.membersProcessed}</dd>
              <dt className="text-gray-500">Externos procesados</dt>
              <dd className="font-medium text-right">{summary.externalsProcessed}</dd>
              <dt className="text-gray-500">Total procesados</dt>
              <dd className="font-medium text-right">{summary.totalProcessed}</dd>
              <dt className="text-gray-500 text-green-700">Sincronizados (SYNCED)</dt>
              <dd className="font-medium text-right text-green-800">{summary.synced}</dd>
              <dt className="text-gray-500">Sin índice (NO_INDEX)</dt>
              <dd className="font-medium text-right">{summary.noIndex}</dd>
              <dt className="text-gray-500">No encontrado</dt>
              <dd className="font-medium text-right">{summary.notFound}</dd>
              <dt className="text-gray-500 text-red-700">Errores</dt>
              <dd className="font-medium text-right text-red-800">{summary.errors}</dd>
              <dt className="text-gray-500">Omitidos sin matrícula</dt>
              <dd className="font-medium text-right">{summary.skippedNoMemberNumber}</dd>
            </dl>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowResultModal(false)
                  setSummary(null)
                }}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
