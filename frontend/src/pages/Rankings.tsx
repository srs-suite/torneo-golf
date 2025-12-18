import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import { tournamentService } from '@/services/tournamentService'
import { useTournaments } from '@/hooks/useTournaments'

interface AnnualRankings {
  year: number
  club_id: number
  with_hcp: { member_id: number; player_name: string; member_number?: string; rounds: number; total_gross: number; total_net: number }[]
  without_hcp: { member_id: number; player_name: string; member_number?: string; rounds: number; total_gross: number }[]
  top_cuts: {
    without_hcp: any[]
    with_hcp: any[]
  }
}

export default function Rankings() {
  const { clubId } = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const clubIdNum = clubId ? parseInt(clubId) : 0

  const { data: tournaments = [] } = useTournaments(clubIdNum)

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState<number>(currentYear)
  const [mode, setMode] = useState<'annual' | 'by_tournament'>('annual')
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [annual, setAnnual] = useState<AnnualRankings | null>(null)
  const [tournamentRanking, setTournamentRanking] = useState<any>(null)
  const [showWithHcp, setShowWithHcp] = useState<boolean>(true)

  const rankingTournaments = useMemo(
    () => tournaments.filter((t: any) => t.is_ranking_event === 1 || t.is_ranking_event === true),
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
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clubIdNum, year, mode, selectedTournament])

  const sanitizeAscii = (text: string | undefined | null) => {
    const base = (text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '')
    return base.replace(/\s+/g, ' ').trim()
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
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Neto</th>
            ) : (
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Gross</th>
            )}
            {withHcp && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Gross</th>}
            {'rounds' in (rows[0] || {}) && (
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rondas</th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((r, i) => (
            <tr key={r.member_id || i} className={i < (withHcp ? 16 : 8) ? 'bg-yellow-50' : ''}>
              <td className="px-4 py-2">{i + 1}</td>
              <td className="px-4 py-2">{sanitizeAscii(r.player_name)}</td>
              <td className="px-4 py-2">{r.member_number || '-'}</td>
              {withHcp ? <td className="px-4 py-2 font-semibold">{r.total_net}</td> : <td className="px-4 py-2 font-semibold">{r.total_gross}</td>}
              {withHcp && <td className="px-4 py-2">{r.total_gross}</td>}
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
          )}

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-gray-700">Mostrar</label>
            <select
              value={showWithHcp ? 'with' : 'without'}
              onChange={(e) => setShowWithHcp(e.target.value === 'with')}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="with">Con HCP (Neto)</option>
              <option value="without">Sin HCP (Gross)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border p-6 text-center text-gray-600">Cargando ranking...</div>
        ) : (
          <>
            {mode === 'annual' && annual && (
              <div className="bg-white rounded-lg border">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Acumulado {annual.year}</h2>
                  <div className="text-sm text-gray-500">
                    Clasificados: Sin HCP top 8 • Con HCP top 16
                  </div>
                </div>
                <div className="p-6">
                  {showWithHcp ? (
                    <Table rows={annual.with_hcp} withHcp />
                  ) : (
                    <Table rows={annual.without_hcp} withHcp={false} />
                  )}
                </div>
              </div>
            )}

            {mode === 'by_tournament' && tournamentRanking && (
              <div className="bg-white rounded-lg border">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Ranking por Torneo</h2>
                </div>
                <div className="p-6">
                  {showWithHcp ? (
                    <Table rows={tournamentRanking.with_hcp} withHcp />
                  ) : (
                    <Table rows={tournamentRanking.without_hcp} withHcp={false} />
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


