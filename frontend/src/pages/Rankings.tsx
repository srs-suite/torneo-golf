import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Download, FileSpreadsheet, ListChecks, Lock, Trophy, Unlock, UserCog } from 'lucide-react'
import toast from 'react-hot-toast'
import { tournamentService } from '@/services/tournamentService'
import { useTournaments } from '@/hooks/useTournaments'
import { useUserPermissions } from '@/hooks/useUserPermissions'
import {
  exportAnnualRankingsExcel,
  exportRankingImageForWhatsApp,
  exportTournamentRankingsExcel,
} from '@/utils/rankingExport'
import { permFlag } from '@/lib/permissionFlags'

function isRankingTournament(t: { is_ranking_event?: unknown }): boolean {
  return permFlag(t?.is_ranking_event)
}

function sanitizeAscii(text: string | undefined | null) {
  const base = (text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '')
  return base.replace(/\s+/g, ' ').trim()
}

function fmtScoreCell(v: unknown) {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  return Number.isFinite(n) ? String(n) : String(v)
}

function RankingTable({
  rows,
  withHcp,
  highlightCount,
  showRounds = true,
  showComputan = false,
  defaultCountingRounds = 3,
}: {
  rows: any[]
  withHcp: boolean
  highlightCount?: number
  showRounds?: boolean
  showComputan?: boolean
  defaultCountingRounds?: number
}) {
  type SortCol = 'rounds' | 'net' | null
  const [sortCol, setSortCol] = useState<SortCol>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const toNum = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY
  }
  const cycleSort = (col: 'rounds' | 'net') => {
    if (sortCol !== col) {
      setSortCol(col)
      setSortDir('asc')
      return
    }
    if (sortDir === 'asc') {
      setSortDir('desc')
      return
    }
    setSortCol(null)
    setSortDir('asc')
  }
  const sortHint = (col: 'rounds' | 'net') => {
    if (sortCol !== col) return '↕'
    return sortDir === 'asc' ? '↑ menor' : '↓ mayor'
  }
  const orderedRows = [...rows].sort((a, b) => {
    if (sortCol === 'rounds' && showRounds) {
      const byRounds = toNum(a.rounds) - toNum(b.rounds)
      if (byRounds !== 0) return sortDir === 'asc' ? byRounds : -byRounds
    }
    if (sortCol === 'net' && withHcp) {
      const byNet = toNum(a.total_net) - toNum(b.total_net)
      if (byNet !== 0) return sortDir === 'asc' ? byNet : -byNet
    }
    if (withHcp) {
      const byNet = toNum(a.total_net) - toNum(b.total_net)
      if (byNet !== 0) return byNet
    }
    const byGross = toNum(a.total_gross) - toNum(b.total_gross)
    if (byGross !== 0) return byGross
    return String(a.player_name ?? '').localeCompare(String(b.player_name ?? ''), 'es')
  })
  const hi = highlightCount ?? orderedRows.length

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pos</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jugador</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matrícula</th>
            {showRounds && (
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => cycleSort('rounds')}
                  title="Ordenar por rondas jugadas (menor / mayor / por score)"
                  className="inline-flex items-center gap-1 hover:text-gray-800"
                >
                  Jugadas
                  <span className="text-[10px] font-normal normal-case text-gray-400">
                    {sortHint('rounds')}
                  </span>
                </button>
              </th>
            )}
            {showRounds && showComputan && (
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Computan</th>
            )}
            {withHcp ? (
              <>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total gross</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => cycleSort('net')}
                    title="Ordenar por total neto (menor / mayor / por defecto)"
                    className="inline-flex items-center gap-1 hover:text-gray-800"
                  >
                    Total neto
                    <span className="text-[10px] font-normal normal-case text-gray-400">
                      {sortHint('net')}
                    </span>
                  </button>
                </th>
              </>
            ) : (
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Gross</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {orderedRows.map((r, i) => (
            <tr
              key={String(r.participation_id ?? r.member_id ?? i)}
              className={i < hi ? 'bg-yellow-50' : 'bg-white'}
            >
              <td className="px-4 py-2">{i + 1}</td>
              <td className="px-4 py-2">{sanitizeAscii(r.player_name)}</td>
              <td className="px-4 py-2">{r.member_number || '-'}</td>
              {showRounds && <td className="px-4 py-2">{fmtScoreCell(r.rounds)}</td>}
              {showRounds && showComputan && (
                <td className="px-4 py-2">{fmtScoreCell(r.rounds_counted ?? defaultCountingRounds)}</td>
              )}
              {withHcp ? (
                <>
                  <td className="px-4 py-2 text-gray-600">{fmtScoreCell(r.total_gross)}</td>
                  <td className="px-4 py-2 font-semibold">{fmtScoreCell(r.total_net)}</td>
                </>
              ) : (
                <td className="px-4 py-2 font-semibold">{fmtScoreCell(r.total_gross)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NotEligibleTable({
  rows,
}: {
  rows: { member_id: number; player_name: string; member_number?: string; rounds: number; rounds_needed: number }[]
}) {
  const [roundsSort, setRoundsSort] = useState<'asc' | 'desc'>('desc')
  const ordered = [...rows].sort((a, b) => {
    const byRounds = Number(a.rounds) - Number(b.rounds)
    if (byRounds !== 0) return roundsSort === 'asc' ? byRounds : -byRounds
    return sanitizeAscii(a.player_name).localeCompare(sanitizeAscii(b.player_name), 'es')
  })

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jugador</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Matrícula</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
              <button
                type="button"
                onClick={() => setRoundsSort((p) => (p === 'asc' ? 'desc' : 'asc'))}
                title="Ordenar por torneos jugados"
                className="inline-flex items-center gap-1 hover:text-gray-800"
              >
                Torneos jugados
                <span className="text-[10px] font-normal normal-case text-gray-400">
                  {roundsSort === 'asc' ? '↑ menor' : '↓ mayor'}
                </span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {ordered.map((r) => (
            <tr key={r.member_id}>
              <td className="px-4 py-2">{sanitizeAscii(r.player_name)}</td>
              <td className="px-4 py-2">{r.member_number || '-'}</td>
              <td className="px-4 py-2">
                {r.rounds} / {r.rounds_needed}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface AnnualRankings {
  year: number
  club_id: number
  status?: 'provisional' | 'final'
  finalized_at?: string | null
  rules?: {
    expected_tournaments: number
    min_rounds: number
    counting_rounds: number
    scratch_cut: number
    handicap_cut: number
  }
  with_hcp: any[]
  without_hcp: any[]
  general_with_hcp?: any[]
  general_without_hcp?: any[]
  scratch?: any[]
  handicap?: any[]
  not_eligible?: { member_id: number; player_name: string; member_number?: string; rounds: number; rounds_needed: number }[]
  eligible_count?: number
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
  const [yearTouched, setYearTouched] = useState(false)
  const [mode, setMode] = useState<'annual' | 'by_tournament'>('annual')
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [annual, setAnnual] = useState<AnnualRankings | null>(null)
  const [tournamentRanking, setTournamentRanking] = useState<any>(null)
  const [showWithHcp, setShowWithHcp] = useState(true)
  const [pickedAnnualIds, setPickedAnnualIds] = useState<number[]>([])
  const [savingAnnualPicks, setSavingAnnualPicks] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
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

  // Si el año actual no tiene torneos, usar el más reciente disponible (evita ranking vacío al entrar)
  useEffect(() => {
    if (yearTouched || !years.length) return
    if (!years.includes(year)) {
      setYear(years[0])
    }
  }, [years, year, yearTouched])

  const annualRankingCandidates = useMemo(() => {
    return (tournaments as any[]).filter((t) => {
      if (!t.tournament_date || !isRankingTournament(t)) return false
      return new Date(t.tournament_date).getFullYear() === year
    })
  }, [tournaments, year])

  const canConfigureAnnualPicks = permissions.canEditTournaments || isAdmin || permissions.canViewRankings
  const isFinal = annual?.status === 'final'
  const rules = annual?.rules || {
    expected_tournaments: 5,
    min_rounds: 3,
    counting_rounds: 3,
    scratch_cut: 8,
    handicap_cut: 16,
  }

  const generalGross = annual?.general_without_hcp || (!isFinal ? annual?.without_hcp : []) || []
  const generalNet = annual?.general_with_hcp || (!isFinal ? annual?.with_hcp : []) || []
  const scratchRows = annual?.scratch || []
  const handicapRows = annual?.handicap || []
  const generalRows = showWithHcp ? generalNet : generalGross

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
        } else if (mode === 'by_tournament' && !selectedTournament) {
          setTournamentRanking(null)
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
    if (isFinal) return
    setPickedAnnualIds((prev) => {
      const id = Number(tournamentId)
      if (prev.includes(id)) return prev.filter((x) => x !== id).sort((a, b) => a - b)
      return [...prev, id].sort((a, b) => a - b)
    })
  }

  const saveAnnualPicks = async (asProvisional: boolean) => {
    if (!clubIdNum || isFinal) return
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

  const handleFinalize = async (finalize: boolean) => {
    if (!clubIdNum || !canConfigureAnnualPicks) return
    const msg = finalize
      ? `¿Cerrar el ranking final ${year}? Se bloqueará el cambio de torneos. Reglas: mín. ${rules.min_rounds} rondas, mejores ${rules.counting_rounds} por Gross, Scratch top ${rules.scratch_cut}, Handicap siguientes ${rules.handicap_cut}.`
      : `¿Reabrir el ranking ${year}? Volverá a modo provisorio y podrás editar torneos.`
    if (!window.confirm(msg)) return
    setFinalizing(true)
    const tid = toast.loading(finalize ? 'Cerrando ranking final…' : 'Reabriendo ranking…')
    try {
      const data = await tournamentService.setAnnualRankingFinalized(clubIdNum, year, finalize)
      if (data?.rankings) setAnnual(data.rankings)
      else {
        const res = await tournamentService.getAnnualRankings(clubIdNum, year)
        setAnnual(res)
      }
      toast.success(finalize ? 'Ranking final cerrado.' : 'Ranking reabierto (provisorio).', { id: tid })
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'No se pudo actualizar', { id: tid })
    } finally {
      setFinalizing(false)
    }
  }

  const handleExportAnnualExcel = () => {
    if (!annual) return
    try {
      if (isFinal) {
        exportAnnualRankingsExcel({
          year: annual.year,
          clubId: clubIdNum,
          kind: 'both',
          with_hcp: handicapRows,
          without_hcp: scratchRows,
          general_with_hcp: generalNet,
          general_without_hcp: generalGross,
        })
        toast.success('Excel descargado (Scratch + Handicap + General)')
      } else {
        exportAnnualRankingsExcel({
          year: annual.year,
          clubId: clubIdNum,
          kind: showWithHcp ? 'net' : 'gross',
          with_hcp: generalNet,
          without_hcp: generalGross,
        })
        toast.success(showWithHcp ? 'Excel Neto descargado' : 'Excel Gross descargado')
      }
    } catch {
      toast.error('No se pudo exportar a Excel')
    }
  }

  const handleExportTournamentExcel = () => {
    if (!tournamentRanking || !selectedTournament) return
    try {
      exportTournamentRankingsExcel({
        clubId: clubIdNum,
        tournamentId: selectedTournament,
        tournamentName: selectedTournamentName,
        kind: 'both',
        with_hcp: tournamentRanking.with_hcp || [],
        without_hcp: tournamentRanking.without_hcp || [],
      })
      toast.success('Excel descargado')
    } catch {
      toast.error('No se pudo exportar a Excel')
    }
  }

  const handleExportAnnualWhatsApp = async () => {
    if (!annual) return
    try {
      if (isFinal) {
        await exportRankingImageForWhatsApp({
          fileName: `ranking_anual_${annual.year}_club_${clubIdNum}_whatsapp.png`,
          heading: `Ranking anual ${annual.year}`,
          subtitle: 'Scratch + Handicap + General — listo para WhatsApp',
          sections: [
            { title: `Scratch — top ${rules.scratch_cut} (Gross)`, withHcp: false, rows: scratchRows, showRounds: true },
            { title: `Handicap — siguientes ${rules.handicap_cut} (Neto)`, withHcp: true, rows: handicapRows, showRounds: true },
            {
              title: showWithHcp ? 'General Neto' : 'General Gross',
              withHcp: showWithHcp,
              rows: generalRows,
              showRounds: true,
            },
          ],
        })
      } else {
        await exportRankingImageForWhatsApp({
          fileName: `ranking_anual_${annual.year}_club_${clubIdNum}_${showWithHcp ? 'neto' : 'gross'}_whatsapp.png`,
          heading: `Acumulado ${annual.year}`,
          subtitle: showWithHcp ? 'Ranking Neto' : 'Ranking Gross',
          sections: [
            {
              title: showWithHcp ? 'Neto' : 'Gross',
              withHcp: showWithHcp,
              rows: generalRows,
              showRounds: true,
            },
          ],
        })
      }
      toast.success('Imagen descargada — adjuntála en WhatsApp')
    } catch {
      toast.error('No se pudo generar la imagen')
    }
  }

  const handleExportTournamentWhatsApp = async () => {
    if (!tournamentRanking || !selectedTournament) return
    try {
      await exportRankingImageForWhatsApp({
        fileName: `ranking_torneo_${selectedTournament}_club_${clubIdNum}_whatsapp.png`,
        heading: selectedTournamentName || `Torneo ${selectedTournament}`,
        subtitle: 'Ranking por torneo — listo para WhatsApp',
        sections: [
          { title: 'Gross', withHcp: false, rows: tournamentRanking.without_hcp || [], showRounds: false },
          { title: 'Neto', withHcp: true, rows: tournamentRanking.with_hcp || [], showRounds: false },
        ],
      })
      toast.success('Imagen descargada — adjuntála en WhatsApp')
    } catch {
      toast.error('No se pudo generar la imagen')
    }
  }

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
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate(`/club/${clubId}/admin?tab=users`)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <UserCog className="h-4 w-4" />
                Usuarios
              </button>
            )}
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
                onChange={(e) => {
                  setYearTouched(true)
                  setYear(parseInt(e.target.value))
                }}
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
                  No hay torneos listados como ranking. Guardá el torneo con «Contabilizar para el ranking» y recargá esta página.
                </p>
              )}
            </div>
          )}

          {mode === 'annual' && !isFinal && (
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
          )}
        </div>

        {mode === 'annual' && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Reglas del ranking {year}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {isFinal ? (
                      <>
                        Ranking final: mín. {rules.min_rounds} torneos, mejores {rules.counting_rounds} por Gross → Scratch top{' '}
                        {rules.scratch_cut} + Handicap siguientes {rules.handicap_cut}. El <strong>ranking general</strong> sigue
                        mostrando a todos los que jugaron (todas sus rondas).
                      </>
                    ) : (
                      <>
                        <strong>Provisorio:</strong> se muestran todos los jugadores con al menos una tarjeta (suma de todas las
                        rondas). Cuando terminen los torneos del año, usá el botón de abajo para <strong>cerrar el ranking final</strong>.
                      </>
                    )}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    isFinal ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {isFinal ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  {isFinal ? 'Ranking final' : 'Provisorio'}
                </span>
              </div>
              {canConfigureAnnualPicks ? (
                <div className="flex flex-wrap gap-2">
                  {!isFinal ? (
                    <button
                      type="button"
                      disabled={finalizing || loading}
                      onClick={() => handleFinalize(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50 shadow-sm"
                    >
                      <Lock className="h-4 w-4" />
                      Ya se jugaron todos los torneos — cerrar ranking final
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={finalizing || loading}
                      onClick={() => handleFinalize(false)}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Unlock className="h-4 w-4" />
                      Reabrir ranking (provisorio)
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-900">
                  Para cerrar el ranking final necesitás permiso de editar torneos o ser administrador.
                </p>
              )}
            </div>

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
                      {annualRankingCandidates.length === 1 ? '' : 's'} de {year} marcados para ranking.
                    </p>
                  )}
                  {!annualPicksOpen && annualRankingCandidates.length > 0 && annual?.annual_selection?.uses_explicit_selection && (
                    <p className="text-sm text-gray-600">
                      <strong>Lista cerrada:</strong> el acumulado usa {annual.annual_selection.tournament_ids.length} torneo(s) elegido(s).
                    </p>
                  )}
                  {isFinal && (
                    <p className="text-xs text-green-700">Ranking final: la selección de torneos está bloqueada hasta reabrir.</p>
                  )}
                </div>
              </div>

              {annualPicksOpen && (
                <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                  {annualRankingCandidates.length === 0 ? (
                    <p className="text-sm text-amber-800">
                      No hay torneos en <strong>{year}</strong> marcados con «Contabilizar para el ranking».
                    </p>
                  ) : (
                    <>
                      {canConfigureAnnualPicks && !isFinal ? (
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
                        <ul className="text-sm text-gray-700 list-disc list-inside">
                          {annualRankingCandidates
                            .filter((t: any) =>
                              !annual?.annual_selection?.uses_explicit_selection ||
                              annual.annual_selection!.tournament_ids.includes(Number(t.tournament_id))
                            )
                            .map((t: any) => (
                              <li key={t.tournament_id}>
                                {sanitizeAscii(t.tournament_name)} (
                                {t.tournament_date ? new Date(t.tournament_date).toLocaleDateString('es-AR') : ''})
                              </li>
                            ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border p-6 text-center text-gray-600">Cargando ranking...</div>
        ) : (
          <>
            {mode === 'annual' && annual && (
              <div className="space-y-6">
                {!isFinal ? (
                  <div className="bg-white rounded-lg border">
                    <div className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">Acumulado {annual.year}</h2>
                        <p className="text-xs text-gray-500">
                          Todos los jugadores con tarjeta. Suma de todas las rondas. En Neto solo faltan quienes no tienen índice WHS.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleExportAnnualExcel}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                        >
                          <FileSpreadsheet className="h-4 w-4 text-green-700" />
                          {showWithHcp ? 'Exportar Excel (Neto)' : 'Exportar Excel (Gross)'}
                        </button>
                        <button
                          type="button"
                          onClick={handleExportAnnualWhatsApp}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                        >
                          <ImageDown className="h-4 w-4 text-emerald-600" />
                          Descargar para WhatsApp
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      {generalRows.length ? (
                        <RankingTable
                          rows={generalRows}
                          withHcp={showWithHcp}
                          highlightCount={showWithHcp ? 16 : 9}
                          showComputan={false}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">
                          {showWithHcp
                            ? 'No hay resultados en Neto (hace falta índice WHS). Probá Gross.'
                            : 'No hay tarjetas cargadas en torneos de ranking para este año.'}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-lg border">
                      <div className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold">Scratch — top {rules.scratch_cut} (Gross)</h2>
                          <p className="text-xs text-gray-500">
                            Elegibles: {annual.eligible_count ?? 0}. Mejores {rules.counting_rounds} tarjetas por Gross.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleExportAnnualExcel}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                          >
                            <FileSpreadsheet className="h-4 w-4 text-green-700" />
                            Exportar Excel
                          </button>
                          <button
                            type="button"
                            onClick={handleExportAnnualWhatsApp}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                          >
                            <ImageDown className="h-4 w-4 text-emerald-600" />
                            Descargar para WhatsApp
                          </button>
                        </div>
                      </div>
                      <div className="p-6">
                        {scratchRows.length ? (
                          <RankingTable
                            rows={scratchRows}
                            withHcp={false}
                            highlightCount={rules.scratch_cut}
                            showComputan
                            defaultCountingRounds={rules.counting_rounds}
                          />
                        ) : (
                          <p className="text-sm text-gray-600">
                            No hay jugadores elegibles (mínimo {rules.min_rounds} torneos).
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border">
                      <div className="px-6 py-4 border-b">
                        <h2 className="text-lg font-semibold">Handicap — siguientes {rules.handicap_cut} (Neto)</h2>
                        <p className="text-xs text-gray-500">
                          Siguientes al Scratch por Gross; orden por neto de las {rules.counting_rounds} tarjetas computables.
                        </p>
                      </div>
                      <div className="p-6">
                        {handicapRows.length ? (
                          <RankingTable
                            rows={handicapRows}
                            withHcp
                            highlightCount={rules.handicap_cut}
                            showComputan
                            defaultCountingRounds={rules.counting_rounds}
                          />
                        ) : (
                          <p className="text-sm text-gray-600">No hay jugadores suficientes para Handicap.</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border">
                      <div className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold">Ranking general — todos los participantes</h2>
                          <p className="text-xs text-gray-500">
                            Sin filtro de cantidad de torneos. Suma de todas las rondas. En Neto solo faltan quienes no tienen índice WHS.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-700">Mostrar</label>
                          <select
                            value={showWithHcp ? 'with' : 'without'}
                            onChange={(e) => setShowWithHcp(e.target.value === 'with')}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="with">Neto</option>
                            <option value="without">Gross</option>
                          </select>
                        </div>
                      </div>
                      <div className="p-6">
                        {generalRows.length ? (
                          <RankingTable
                            rows={generalRows}
                            withHcp={showWithHcp}
                            highlightCount={showWithHcp ? 16 : 9}
                            showComputan={false}
                          />
                        ) : (
                          <p className="text-sm text-gray-600">Sin participantes en el general.</p>
                        )}
                      </div>
                    </div>

                    {(annual.not_eligible?.length ?? 0) > 0 && (
                      <div className="bg-white rounded-lg border">
                        <div className="px-6 py-4 border-b">
                          <h2 className="text-lg font-semibold text-gray-700">
                            Fuera de Scratch/Handicap (&lt; {rules.min_rounds} torneos)
                          </h2>
                          <p className="text-xs text-gray-500">Igual figuran en el ranking general de arriba.</p>
                        </div>
                        <div className="p-6">
                          <NotEligibleTable rows={annual.not_eligible!} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {mode === 'by_tournament' && !selectedTournament && (
              <div className="bg-white rounded-lg border p-6 text-sm text-gray-600">
                Seleccioná un torneo marcado para ranking para ver su tabla.
              </div>
            )}

            {mode === 'by_tournament' && tournamentRanking && (
              <div className="bg-white rounded-lg border">
                <div className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Ranking por Torneo</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportTournamentExcel}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-green-700" />
                      Exportar Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleExportTournamentWhatsApp}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                    >
                      <ImageDown className="h-4 w-4 text-emerald-600" />
                      Descargar para WhatsApp
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-8">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Gross</h3>
                    {tournamentRanking.without_hcp?.length ? (
                      <RankingTable rows={tournamentRanking.without_hcp} withHcp={false} highlightCount={9} showRounds={false} />
                    ) : (
                      <p className="text-sm text-gray-600">No hay jugadores en gross para este torneo.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Neto</h3>
                    {tournamentRanking.with_hcp?.length ? (
                      <RankingTable rows={tournamentRanking.with_hcp} withHcp highlightCount={16} showRounds={false} />
                    ) : (
                      <p className="text-sm text-gray-600">No hay jugadores con índice y tarjeta en este torneo.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
