import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, FileSpreadsheet, ListChecks, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import { tournamentService } from '@/services/tournamentService'
import { useTournaments } from '@/hooks/useTournaments'
import { useUserPermissions } from '@/hooks/useUserPermissions'
import { exportAnnualRankingsExcel, exportTournamentRankingsExcel } from '@/utils/rankingExport'

function isRankingTournament(t: { is_ranking_event?: unknown }): boolean {
  const v = t?.is_ranking_event
  if (v === true || v === 1) return true
  if (typeof v === 'string' && (v === '1' || v.toLowerCase() === 'true')) return true
  const n = Number(v)
  return n === 1
}

interface AnnualRankings {
  year: number
  club_id: number
  with_hcp: { member_id: number; player_name: string; member_number?: string; rounds: number; total_gross: number; total_net: number }[]
  without_hcp: { member_id: number; player_name: string; member_number?: string; rounds: number; total_gross: number }[]
  top_cuts: {
    without_hcp: any[]
    with_hcp: any[]
  }
  annual_selection?: {
    uses_explicit_selection: boolean
    tournament_ids: number[]
  }
}

export default function Rankings() {
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const clubIdNum = clubId ? parseInt(clubId) : 0

  const { data: tournaments = [] } = useTournaments(clubIdNum)
  const { permissions, isAdmin } = useUserPermissions(clubId)

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState<number>(currentYear)
  const [mode, setMode] = useState<'annual' | 'by_tournament'>('annual')
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [annual, setAnnual] = useState<AnnualRankings | null>(null)
  const [tournamentRanking, setTournamentRanking] = useState<any>(null)
  const [showWithHcp, setShowWithHcp] = useState<boolean>(true)
  const [pickedAnnualIds, setPickedAnnualIds] = useState<number[]>([])
  const [savingAnnualPicks, setSavingAnnualPicks] = useState(false)
  /** Panel de torneos del acumulado: cerrado por defecto; el ranking usa todos hasta abrir y guardar selección. */
  const [annualPicksOpen, setAnnualPicksOpen] = useState(false)

  const rankingTournaments = useMemo(
    () => (tournaments as any[]).filter((t) => isRankingTournament(t)),
    [tournaments]
  )

  const years = useMemo(() => {
    const set = new Set<number>()
    tournaments.forEach((t: any) => {
      if (t.tournament_date) {
        set.add(new Date(t.tournament_date).getFullYear())
      }
    })
    if (!set.size) set.add(currentYear)
    return Array.from(set).sort((a, b) => b - a)
  }, [tournaments, currentYear])

  const annualRankingCandidates = useMemo(() => {
    return (tournaments as any[]).filter((t) => {
      if (!t.tournament_date || !isRankingTournament(t)) return false
      return new Date(t.tournament_date).getFullYear() === year
    })
  }, [tournaments, year])

  const canConfigureAnnualPicks = permissions.canEditTournaments || isAdmin

  const selectedTournamentName = useMemo(() => {
    const t = (tournaments as any[]).find((x) => Number(x.tournament_id) === selectedTournament)
    return t?.tournament_name as string | undefined
  }, [tournaments, selectedTournament])

  useEffect(() => {
    if (mode !== 'annual') return
    const candidateIds = annualRankingCandidates
      .map((t: any) => Number(t.tournament_id))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b)
    if (!annual?.annual_selection) {
      setPickedAnnualIds(candidateIds)
      return
    }
    const sel = annual.annual_selection
    if (sel.uses_explicit_selection && Array.isArray(sel.tournament_ids) && sel.tournament_ids.length > 0) {
      setPickedAnnualIds(sel.tournament_ids.map(Number).sort((a, b) => a - b))
    } else {
      setPickedAnnualIds(candidateIds)
    }
  }, [annual, mode, annualRankingCandidates])

  useEffect(() => {
    const load = async () => {
      if (!clubIdNum) return
      setLoading(true)
      try {
        if (mode === 'annual') {
          const res = await tournamentService.getAnnualRankings(clubIdNum, year)
          setAnnual(res)
          setTournamentRanking(null)
        } else if (mode === 'by_tournament' && selectedTournament) {
          const res = await tournamentService.getTournamentRanking(clubIdNum, selectedTournament)
          setTournamentRanking(res)
          setAnnual(null)
        }
      } catch (e: any) {
        console.error(e)
        toast.error(e?.response?.data?.error || e?.message || 'No se pudo cargar el ranking')
        setAnnual(null)
        setTournamentRanking(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clubIdNum, year, mode, selectedTournament])

  useEffect(() => {
    setAnnualPicksOpen(false)
  }, [year])

  const toggleAnnualPick = (tournamentId: number) => {
    setPickedAnnualIds((prev) => {
      const id = Number(tournamentId)
      if (prev.includes(id)) return prev.filter((x) => x !== id).sort((a, b) => a - b)
      return [...prev, id].sort((a, b) => a - b)
    })
  }

  const saveAnnualPicks = async (asProvisional: boolean) => {
    if (!clubIdNum) return
    setSavingAnnualPicks(true)
    const tid = toast.loading(asProvisional ? 'Restableciendo…' : 'Guardando torneos del acumulado…')
    try {
      const ids = asProvisional ? [] : pickedAnnualIds
      await tournamentService.putAnnualRankingSelection(clubIdNum, year, ids)
      const res = await tournamentService.getAnnualRankings(clubIdNum, year)
      setAnnual(res)
      toast.success(asProvisional ? 'Modo provisorio: cuentan todos los torneos marcados para ranking.' : 'Selección guardada.', { id: tid })
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'No se pudo guardar', { id: tid })
    } finally {
      setSavingAnnualPicks(false)
    }
  }

  const sanitizeAscii = (text: string | undefined | null) => {
    const base = (text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '')
    return base.replace(/\s+/g, ' ').trim()
  }

  const fmtScoreCell = (v: unknown) => {
    if (v === null || v === undefined || v === '') return '—'
    const n = Number(v)
    return Number.isFinite(n) ? String(n) : String(v)
  }

  const handleExportAnnualExcel = () => {
    if (!annual) return
    const kind = showWithHcp ? 'net' : 'gross'
    try {
      exportAnnualRankingsExcel({
        year: annual.year,
        clubId: clubIdNum,
        kind,
        with_hcp: annual.with_hcp || [],
        without_hcp: annual.without_hcp || [],
      })
      toast.success(kind === 'net' ? 'Excel Neto descargado' : 'Excel Gross descargado')
    } catch {
      toast.error('No se pudo exportar a Excel')
    }
  }

  const handleExportTournamentExcel = () => {
    if (!tournamentRanking || !selectedTournament) return
    const kind = showWithHcp ? 'net' : 'gross'
    try {
      exportTournamentRankingsExcel({
        clubId: clubIdNum,
        tournamentId: selectedTournament,
        tournamentName: selectedTournamentName,
        kind,
        with_hcp: tournamentRanking.with_hcp || [],
        without_hcp: tournamentRanking.without_hcp || [],
      })
      toast.success(kind === 'net' ? 'Excel Neto descargado' : 'Excel Gross descargado')
    } catch {
      toast.error('No se pudo exportar a Excel')
    }
  }

  const Table = ({ rows, withHcp }: { rows: any[]; withHcp: boolean }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pos</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jugador</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matrícula</th>
            {withHcp ? (
              <>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total gross</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total neto (inf.)</th>
              </>
            ) : (
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Gross</th>
            )}
            {'rounds' in (rows[0] || {}) && (
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rondas</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((r, i) => (
            <tr
              key={String(r.participation_id ?? r.member_id ?? i)}
              className={i < (withHcp ? 16 : 9) ? 'bg-yellow-50' : 'bg-white'}
            >
              <td className="px-4 py-2">{i + 1}</td>
              <td className="px-4 py-2">{sanitizeAscii(r.player_name)}</td>
              <td className="px-4 py-2">{r.member_number || '-'}</td>
              {withHcp ? (
                <>
                  <td className="px-4 py-2 font-semibold">{fmtScoreCell(r.total_gross)}</td>
                  <td className="px-4 py-2 text-gray-600">{fmtScoreCell(r.total_net)}</td>
                </>
              ) : (
                <td className="px-4 py-2 font-semibold">{fmtScoreCell(r.total_gross)}</td>
              )}
              {'rounds' in r && <td className="px-4 py-2">{r.rounds}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(`/club/${clubId}/admin?tab=tournaments`)} className="p-2 hover:bg-gray-100 rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <h1 className="text-xl font-semibold text-gray-900">Ranking del Club</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-lg border p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Modo</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="annual">Acumulado Anual</option>
              <option value="by_tournament">Por Torneo</option>
            </select>
          </div>

          {mode === 'annual' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Año</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === 'by_tournament' && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Torneo</label>
                <select
                  value={selectedTournament || ''}
                  onChange={(e) => setSelectedTournament(e.target.value ? parseInt(e.target.value) : null)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Seleccionar...</option>
                  {rankingTournaments.map((t: any) => (
                    <option key={t.tournament_id} value={t.tournament_id}>
                      {t.tournament_name} ({new Date(t.tournament_date).toLocaleDateString('es-AR')})
                    </option>
                  ))}
                </select>
              </div>
              {rankingTournaments.length === 0 && (
                <p className="text-xs text-amber-700 max-w-xl">
                  No hay torneos listados como ranking. Guardá el torneo con «Contabilizar para el ranking» y recargá esta página. Si ya lo hiciste, ejecutá en MySQL la migración{' '}
                  <code className="bg-amber-50 px-1 rounded">add_tournament_results_options.sql</code> (columna <code className="bg-amber-50 px-1 rounded">is_ranking_event</code>).
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-gray-700">Mostrar</label>
            <select
              value={showWithHcp ? 'with' : 'without'}
              onChange={(e) => setShowWithHcp(e.target.value === 'with')}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="with">Neto (con índice)</option>
              <option value="without">Gross</option>
            </select>
          </div>
        </div>

        {mode === 'annual' && (
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                title="Torneos que conforman el acumulado"
                aria-expanded={annualPicksOpen}
                onClick={() => setAnnualPicksOpen((o) => !o)}
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100"
              >
                <ListChecks className="h-5 w-5 text-yellow-700" />
              </button>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAnnualPicksOpen((o) => !o)}
                    className="text-left text-sm font-semibold text-gray-900 hover:underline"
                  >
                    Acumulado {year}: torneos que cuentan
                  </button>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${annualPicksOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </div>
                {!annualPicksOpen && annualRankingCandidates.length === 0 && (
                  <p className="text-sm text-amber-800">
                    No hay torneos en {year} con «Contabilizar para el ranking». Revisá el año o editá un torneo.
                  </p>
                )}
                {!annualPicksOpen && annualRankingCandidates.length > 0 && !annual?.annual_selection?.uses_explicit_selection && (
                  <p className="text-sm text-gray-600">
                    Por defecto <strong>cuentan todos</strong> los {annualRankingCandidates.length} torneo
                    {annualRankingCandidates.length === 1 ? '' : 's'} de {year} marcados para ranking. Abrí el panel (ícono o título) solo cuando quieras elegir la lista definitiva y guardar.
                  </p>
                )}
                {!annualPicksOpen && annualRankingCandidates.length > 0 && annual?.annual_selection?.uses_explicit_selection && (
                  <p className="text-sm text-gray-600">
                    <strong>Lista cerrada:</strong> el acumulado usa{' '}
                    {annual.annual_selection.tournament_ids.length === 1
                      ? 'solo 1 torneo elegido'
                      : `solo ${annual.annual_selection.tournament_ids.length} torneos elegidos`}
                    . Abrí el panel para ver o cambiar (si tenés permiso).
                  </p>
                )}
              </div>
            </div>

            {annualPicksOpen && (
              <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                {annualRankingCandidates.length === 0 ? (
                  <p className="text-sm text-amber-800">
                    No hay torneos en <strong>{year}</strong> marcados con «Contabilizar para el ranking». Editá un torneo de ese año, activá esa opción y guardá; después recargá esta página. Si el año del desplegable no coincide con la fecha del torneo, cambiá el año arriba.
                  </p>
                ) : (
                  <>
                    {annual?.annual_selection?.uses_explicit_selection ? (
                      <p className="text-sm text-gray-600">
                        <strong>Selección cerrada:</strong> el ranking anual solo suma los torneos marcados abajo. Podés volver a modo provisorio (todos los marcados) con el botón inferior.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600">
                        Marcá los torneos que deben conformar el acumulado oficial y pulsá <strong>Guardar selección</strong>. Hasta entonces siguen contando <strong>todos</strong> los de {year} con «Contabilizar para el ranking».
                      </p>
                    )}
                    {canConfigureAnnualPicks ? (
                      <>
                        <ul className="max-h-56 overflow-y-auto border rounded divide-y divide-gray-100">
                          {annualRankingCandidates.map((t: any) => {
                            const id = Number(t.tournament_id)
                            const checked = pickedAnnualIds.includes(id)
                            return (
                              <li key={id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
                                <input
                                  type="checkbox"
                                  id={`arp-${id}`}
                                  checked={checked}
                                  onChange={() => toggleAnnualPick(id)}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <label htmlFor={`arp-${id}`} className="text-sm text-gray-800 cursor-pointer flex-1">
                                  {sanitizeAscii(t.tournament_name)}{' '}
                                  <span className="text-gray-500">
                                    ({t.tournament_date ? new Date(t.tournament_date).toLocaleDateString('es-AR') : ''})
                                  </span>
                                </label>
                              </li>
                            )
                          })}
                        </ul>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={savingAnnualPicks || pickedAnnualIds.length === 0}
                            onClick={() => saveAnnualPicks(false)}
                            className="px-3 py-2 text-sm font-medium rounded-md bg-yellow-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-700"
                          >
                            Guardar selección ({pickedAnnualIds.length} torneo{pickedAnnualIds.length === 1 ? '' : 's'})
                          </button>
                          <button
                            type="button"
                            disabled={savingAnnualPicks || !annual?.annual_selection?.uses_explicit_selection}
                            onClick={() => saveAnnualPicks(true)}
                            className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Volver a provisorio (todos los marcados)
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {annual?.annual_selection?.uses_explicit_selection &&
                          annual.annual_selection.tournament_ids?.length > 0 && (
                            <ul className="text-sm text-gray-700 list-disc list-inside">
                              {annualRankingCandidates
                                .filter((t: any) => annual.annual_selection!.tournament_ids.includes(Number(t.tournament_id)))
                                .map((t: any) => (
                                  <li key={t.tournament_id}>
                                    {sanitizeAscii(t.tournament_name)} (
                                    {t.tournament_date ? new Date(t.tournament_date).toLocaleDateString('es-AR') : ''})
                                  </li>
                                ))}
                            </ul>
                          )}
                        {!annual?.annual_selection?.uses_explicit_selection && (
                          <p className="text-xs text-gray-500">
                            Solo los administradores con permiso para editar torneos pueden definir la lista definitiva.
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border p-6 text-center text-gray-600">Cargando ranking...</div>
        ) : (
          <>
            {mode === 'annual' && annual && (
              <div className="bg-white rounded-lg border">
                <div className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Acumulado {annual.year}</h2>
                  <button
                    type="button"
                    onClick={handleExportAnnualExcel}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-700" />
                    {showWithHcp ? 'Exportar Excel (Neto)' : 'Exportar Excel (Gross)'}
                  </button>
                </div>
                <div className="p-6">
                  {showWithHcp ? (
                    annual.with_hcp?.length ? (
                      <Table rows={annual.with_hcp} withHcp />
                    ) : (
                      <p className="text-sm text-gray-600">
                        No hay resultados en <strong>Neto (con índice)</strong> para {annual.year}: hace falta tarjeta en torneos de ranking e <strong>índice WHS</strong> cargado en la ficha del socio (el índice 0,0 cuenta). Probá también <strong>Gross</strong>.
                      </p>
                    )
                  ) : annual.without_hcp?.length ? (
                    <Table rows={annual.without_hcp} withHcp={false} />
                  ) : (
                    <p className="text-sm text-gray-600">
                      No hay resultados en <strong>Gross</strong> para {annual.year}. Verificá tarjetas cargadas en torneos marcados para ranking y el año seleccionado.
                    </p>
                  )}
                </div>
              </div>
            )}

            {mode === 'by_tournament' && tournamentRanking && (
              <div className="bg-white rounded-lg border">
                <div className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Ranking por Torneo</h2>
                  <button
                    type="button"
                    onClick={handleExportTournamentExcel}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-700" />
                    {showWithHcp ? 'Exportar Excel (Neto)' : 'Exportar Excel (Gross)'}
                  </button>
                </div>
                <div className="p-6">
                  {showWithHcp ? (
                    tournamentRanking.with_hcp?.length ? (
                      <Table rows={tournamentRanking.with_hcp} withHcp />
                    ) : (
                      <p className="text-sm text-gray-600">
                        No hay jugadores con <strong>índice WHS</strong> y tarjeta en este torneo (índice 0,0 cuenta). Probá <strong>Gross</strong>.
                      </p>
                    )
                  ) : tournamentRanking.without_hcp?.length ? (
                    <Table rows={tournamentRanking.without_hcp} withHcp={false} />
                  ) : (
                    <p className="text-sm text-gray-600">
                      No hay jugadores en gross para este torneo. Hace falta al menos una tarjeta (`scorecard`) guardada para inscriptos.
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}


