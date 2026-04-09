import { Lock } from 'lucide-react'

/** Texto único para `alert()` cuando una acción de edición/carga está bloqueada. */
export const TORNEO_CERRADO_ALERT =
  'Torneo cerrado: no se pueden cargar ni editar tarjetas. Podés verlas e imprimirlas. Para cambiar datos, reabrí el torneo en Administración → Torneos → Editar → estado Abierto.'

type Layout = 'bar' | 'box'

/**
 * Aviso unificado para pantallas cuando el torneo está en estado final (cerrado / completado / cancelado).
 */
export function TournamentClosedNotice({
  layout = 'box',
  children,
}: {
  layout?: Layout
  children: React.ReactNode
}) {
  const outer =
    layout === 'bar'
      ? 'border-b border-amber-200 bg-amber-50 text-amber-950'
      : 'rounded-lg border border-amber-200 bg-amber-50 text-amber-950'

  const inner = layout === 'bar' ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3' : 'px-4 py-3'

  return (
    <div className={`${outer} text-sm`} role="status">
      <div className={`flex items-start gap-3 ${inner}`}>
        <Lock className="h-5 w-5 shrink-0 text-amber-800 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-amber-900">Torneo cerrado</p>
          <div className="mt-1 text-amber-900/90 leading-snug">{children}</div>
        </div>
      </div>
    </div>
  )
}
