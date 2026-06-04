import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, LogOut, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import axios from 'axios';
import { buildCategoryDefinitions, computeResultsByCategory } from '@/utils/tournamentResultsByCategory';
import { formatHandicapIndexForDisplay } from '@/utils/scoreUtils';

interface PortalTournament {
  tournament_id: number;
  tournament_name: string;
  tournament_date: string;
  status?: string;
  results_mode?: string;
  is_ranking_event?: number;
  total_gross?: number | null;
  total_net?: number | null;
  /** Neto calculado como en la grilla de resultado (no el campo guardado en tarjeta). */
  display_net?: number | null;
  did_not_present?: number | null;
  handicap_used?: number | null;
}

interface PortalResultsPayload {
  tournament: {
    tournament_id: number;
    tournament_name: string;
    results_mode: string;
    separate_ladies: boolean;
    ladies_by_hcp: boolean;
  };
  scorecards: Record<string, unknown>[];
}

interface AnnualPayload {
  year: number;
  with_hcp: { position?: number; player_name: string; rounds: number; total_gross: number; total_net: number; member_number?: string }[];
  without_hcp: { player_name: string; rounds: number; total_gross: number; member_number?: string }[];
}

function formatShortDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Año calendario YYYY desde fecha de torneo (evita desfase por zona horaria de `new Date(iso)`). */
function tournamentDateYear(iso: string | undefined | null): number {
  if (!iso) return NaN;
  const y = parseInt(String(iso).slice(0, 10).slice(0, 4), 10);
  return Number.isFinite(y) ? y : NaN;
}

function categoryPanelKey(tournamentId: number, categoryId: string): string {
  return `${tournamentId}:${categoryId}`;
}

/** Neto para la línea resumen: coincide con la grilla (display_net desde API). */
function summaryNetDisplay(t: PortalTournament): number | null {
  const d = t.display_net;
  if (d != null && !Number.isNaN(Number(d))) {
    const n = Math.round(Number(d));
    // Si el API mandó 0 pero hay gross, es dato inválido: no mostrar neto 0 engañoso
    if (n === 0 && t.total_gross != null && Number(t.total_gross) > 0) return null;
    return n;
  }
  const legacy = t.total_net;
  if (legacy != null && Number(legacy) > 0 && !Number.isNaN(Number(legacy))) return Math.round(Number(legacy));
  return null;
}

export default function PublicMemberPortal() {
  const { clubId } = useParams<{ clubId: string }>();
  const tokenKey = `memberPortalToken_${clubId}`;
  const nameKey = `memberPortalName_${clubId}`;

  const [step, setStep] = useState<'matricula' | 'app'>('matricula');
  const [matricula, setMatricula] = useState('');
  const [token, setToken] = useState('');
  const [memberName, setMemberName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tournaments, setTournaments] = useState<PortalTournament[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [openRankingId, setOpenRankingId] = useState<number | null>(null);
  const [resultsByTournament, setResultsByTournament] = useState<Record<number, PortalResultsPayload>>({});
  const [loadingRankingId, setLoadingRankingId] = useState<number | null>(null);

  const currentYear = new Date().getFullYear();
  /** Año seleccionado: filtra torneos y define el ranking anual cargado. */
  const [portalYear, setPortalYear] = useState(currentYear);
  const [annual, setAnnual] = useState<AnnualPayload | null>(null);
  const [annualError, setAnnualError] = useState('');
  const [loadingAnnual, setLoadingAnnual] = useState(false);
  /** Ranking anual colapsado por defecto para acortar la página. */
  const [annualExpanded, setAnnualExpanded] = useState(false);
  /** Categorías de resultado por torneo: clave `tournamentId:categoryId`, cerradas por defecto. */
  const [expandedCategoryKeys, setExpandedCategoryKeys] = useState<Record<string, boolean>>({});

  const loadTournaments = useCallback(
    async (t: string) => {
      if (!clubId || !t) return;
      setLoadingList(true);
      setError('');
      try {
        const res = await axios.get(`/api/public/member/${clubId}/tournaments`, {
          params: { token: t }
        });
        setTournaments(res.data.tournaments || []);
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string }; status?: number } };
        if (err.response?.status === 401) {
          localStorage.removeItem(tokenKey);
          localStorage.removeItem(nameKey);
          setToken('');
          setMemberName('');
          setStep('matricula');
          setError('Sesión vencida. Ingresá de nuevo tu matrícula.');
        } else {
          setError(err.response?.data?.error || 'No se pudieron cargar los torneos.');
        }
      } finally {
        setLoadingList(false);
      }
    },
    [clubId, tokenKey, nameKey]
  );

  const yearOptions = useMemo(() => {
    const set = new Set<number>();
    tournaments.forEach((t) => {
      const y = tournamentDateYear(t.tournament_date);
      if (!Number.isNaN(y)) set.add(y);
    });
    for (let y = currentYear + 1; y >= currentYear - 15; y--) set.add(y);
    set.add(portalYear);
    return Array.from(set).sort((a, b) => b - a);
  }, [tournaments, currentYear, portalYear]);

  const tournamentsForYear = useMemo(
    () =>
      tournaments.filter((t) => {
        const y = tournamentDateYear(t.tournament_date);
        return !Number.isNaN(y) && y === portalYear;
      }),
    [tournaments, portalYear]
  );

  useEffect(() => {
    const savedT = localStorage.getItem(tokenKey);
    const savedN = localStorage.getItem(nameKey);
    if (savedT && savedN && clubId) {
      setToken(savedT);
      setMemberName(savedN);
      setStep('app');
      loadTournaments(savedT);
    }
  }, [clubId, tokenKey, nameKey, loadTournaments]);

  const handleMatricula = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const v = matricula.trim();
    if (!v) {
      setError('Ingresá tu número de matrícula.');
      return;
    }
    if (!clubId) return;
    setLoading(true);
    try {
      const res = await axios.post(`/api/public/member/${clubId}/verify`, { matricula: v });
      if (res.data.success) {
        const { token: newToken, memberName: name } = res.data;
        setToken(newToken);
        setMemberName(name);
        localStorage.setItem(tokenKey, newToken);
        localStorage.setItem(nameKey, name);
        setStep('app');
        await loadTournaments(newToken);
      }
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string } } };
      setError(e2.response?.data?.error || 'Matrícula no encontrada o socio inactivo.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(nameKey);
    setToken('');
    setMemberName('');
    setTournaments([]);
    setOpenRankingId(null);
    setResultsByTournament({});
    setAnnual(null);
    setAnnualExpanded(false);
    setExpandedCategoryKeys({});
    setStep('matricula');
    setMatricula('');
  };

  const fetchResultsForTournament = async (tournamentId: number) => {
    if (!token || !clubId) return;
    setLoadingRankingId(tournamentId);
    setError('');
    try {
      const res = await axios.get(`/api/public/member/${clubId}/tournaments/${tournamentId}/results`, {
        params: { token }
      });
      const payload: PortalResultsPayload = {
        tournament: res.data.tournament,
        scorecards: res.data.scorecards || []
      };
      setResultsByTournament((prev) => ({ ...prev, [tournamentId]: payload }));
    } catch (e: unknown) {
      const er = e as { response?: { data?: { error?: string } } };
      setError(er.response?.data?.error || 'No se pudo cargar el resultado del torneo.');
      setOpenRankingId(null);
    } finally {
      setLoadingRankingId(null);
    }
  };

  const toggleRankingOpen = (tournamentId: number) => {
    if (openRankingId === tournamentId) {
      setOpenRankingId(null);
      setExpandedCategoryKeys((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`${tournamentId}:`)) delete next[k];
        });
        return next;
      });
      return;
    }
    setOpenRankingId(tournamentId);
    if (!resultsByTournament[tournamentId]) {
      void fetchResultsForTournament(tournamentId);
    }
  };

  const toggleCategoryPanel = (tournamentId: number, categoryId: string) => {
    const k = categoryPanelKey(tournamentId, categoryId);
    setExpandedCategoryKeys((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const loadAnnual = useCallback(
    async (year: number) => {
      if (!token || !clubId) return;
      setAnnualError('');
      setLoadingAnnual(true);
      setAnnual(null);
      try {
        const res = await axios.get(`/api/public/member/${clubId}/rankings/annual/${year}`, {
          params: { token }
        });
        if (res.data.success) {
          setAnnual({
            year: res.data.year,
            with_hcp: res.data.with_hcp || [],
            without_hcp: res.data.without_hcp || []
          });
        }
      } catch (e: unknown) {
        const er = e as { response?: { data?: { message?: string; error?: string }; status?: number } };
        if (er.response?.status === 401) {
          localStorage.removeItem(tokenKey);
          localStorage.removeItem(nameKey);
          setToken('');
          setMemberName('');
          setTournaments([]);
          setStep('matricula');
          setError('Sesión vencida. Ingresá de nuevo tu matrícula.');
          return;
        }
        setAnnualError(
          er.response?.data?.message ||
            er.response?.data?.error ||
            'No tenés acceso al ranking de este año o no hay datos.'
        );
      } finally {
        setLoadingAnnual(false);
      }
    },
    [clubId, token, tokenKey, nameKey]
  );

  useEffect(() => {
    if (step !== 'app' || !token || !clubId) return;
    void loadAnnual(portalYear);
  }, [step, token, clubId, portalYear, loadAnnual]);

  const onPortalYearChange = (y: number) => {
    if (!Number.isFinite(y)) return;
    setPortalYear(y);
    setOpenRankingId(null);
    setResultsByTournament({});
    setAnnual(null);
    setAnnualError('');
    setAnnualExpanded(false);
    setExpandedCategoryKeys({});
  };

  if (!clubId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <p className="text-gray-600">URL incompleta.</p>
      </div>
    );
  }

  if (step === 'matricula') {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
          <div className="flex justify-center mb-4 text-green-700">
            <Trophy className="w-12 h-12" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 text-center mb-1">Mis torneos y rankings</h1>
          <p className="text-sm text-gray-600 text-center mb-6">
            Ingresá tu matrícula para ver los torneos en los que participaste y el ranking del club cuando corresponda.
          </p>
          <form onSubmit={handleMatricula} className="space-y-4">
            <div>
              <label htmlFor="matricula" className="block text-sm font-medium text-gray-700 mb-1">
                Matrícula
              </label>
              <input
                id="matricula"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ej: 1234"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Verificando…' : 'Continuar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-8">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Socio</p>
              <p className="font-semibold text-gray-900 truncate">{memberName}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 shrink-0"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-6">
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>}

        <section>
          <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-green-700 shrink-0" />
              Mis torneos
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="portal-year-tournaments" className="text-sm text-gray-700">
                Año
              </label>
              <select
                id="portal-year-tournaments"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[6.5rem]"
                value={portalYear}
                onChange={(e) => onPortalYearChange(parseInt(e.target.value, 10))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {loadingList ? (
            <div className="flex justify-center py-8 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : tournaments.length === 0 ? (
            <p className="text-gray-600 text-sm bg-white rounded-lg p-4 border border-gray-200">
              No hay torneos registrados con tu participación.
            </p>
          ) : tournamentsForYear.length === 0 ? (
            <p className="text-gray-600 text-sm bg-white rounded-lg p-4 border border-gray-200">
              No hay torneos en los que hayas participado durante <strong>{portalYear}</strong>. Elegí otro año
              al lado de &quot;Mis torneos&quot;.
            </p>
          ) : (
            <ul className="space-y-2">
              {tournamentsForYear.map((t) => {
                const open = openRankingId === t.tournament_id;
                const resultsPayload = resultsByTournament[t.tournament_id];
                const loadingR = loadingRankingId === t.tournament_id;
                const netSummary = summaryNetDisplay(t);
                const categories =
                  resultsPayload &&
                  buildCategoryDefinitions(
                    resultsPayload.tournament.separate_ladies,
                    resultsPayload.tournament.ladies_by_hcp,
                    resultsPayload.tournament.results_mode
                  );
                const byCategory =
                  categories && resultsPayload
                    ? computeResultsByCategory(resultsPayload.scorecards, categories)
                    : null;
                return (
                  <li key={t.tournament_id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleRankingOpen(t.tournament_id)}
                      className="w-full text-left px-4 py-3 flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{t.tournament_name}</p>
                        <p className="text-sm text-gray-500">{formatShortDate(t.tournament_date)}</p>
                        {t.total_gross != null && t.total_gross > 0 && (
                          <p className="text-sm text-gray-700 mt-1">
                            Tu tarjeta: gross {t.total_gross}
                            {netSummary != null ? ` · neto ${netSummary}` : ''}
                          </p>
                        )}
                        {Number(t.did_not_present) === 1 ? (
                          <p className="text-sm text-amber-700 mt-1">No presentó / sin tarjeta válida</p>
                        ) : null}
                      </div>
                      {loadingR ? (
                        <Loader2 className="w-5 h-5 shrink-0 animate-spin text-gray-400" />
                      ) : open ? (
                        <ChevronUp className="w-5 h-5 shrink-0 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 shrink-0 text-gray-400" />
                      )}
                    </button>
                    {open && resultsPayload && categories && byCategory && (
                      <div className="px-4 pb-3 border-t border-gray-100 text-sm space-y-3">
                        <p className="text-xs text-gray-500 pt-2">
                          Mismo criterio que &quot;Resultados finales&quot; del club (por categoría).
                        </p>
                        {categories.map((cat) => {
                          const rows = byCategory[cat.id] || [];
                          if (!rows.length) return null;
                          const ck = categoryPanelKey(t.tournament_id, cat.id);
                          const catOpen = !!expandedCategoryKeys[ck];
                          return (
                            <div key={cat.id} className={`rounded-lg border-2 overflow-hidden ${cat.color}`}>
                              <button
                                type="button"
                                onClick={() => toggleCategoryPanel(t.tournament_id, cat.id)}
                                className="w-full text-left px-3 py-2 border-b border-inherit bg-white/80 flex items-start justify-between gap-2 hover:bg-white"
                              >
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900">{cat.name}</p>
                                  <p className="text-xs text-gray-600">{cat.description}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {rows.length} jugador{rows.length !== 1 ? 'es' : ''}
                                    {catOpen ? '' : ' · tocá para ver'}
                                  </p>
                                </div>
                                {catOpen ? (
                                  <ChevronUp className="w-5 h-5 shrink-0 text-gray-400 mt-0.5" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 shrink-0 text-gray-400 mt-0.5" />
                                )}
                              </button>
                              {catOpen && (
                                <div className="divide-y divide-gray-100 bg-white/90 max-h-72 overflow-y-auto">
                                  <div className="px-3 py-1.5 grid grid-cols-[1.75rem_minmax(0,1fr)_3rem_3rem] gap-x-2 text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide bg-gray-50/90">
                                    <span className="text-center">#</span>
                                    <span>Jugador</span>
                                    <span className="text-center">Neto</span>
                                    <span className="text-center">Gross</span>
                                  </div>
                                  {rows.map((row, idx) => {
                                    const indexLabel = formatHandicapIndexForDisplay(row.handicap_index)
                                    return (
                                      <div
                                        key={`${cat.id}-${idx}`}
                                        className="px-3 py-2 grid grid-cols-[1.75rem_minmax(0,1fr)_3rem_3rem] gap-x-2 items-center text-xs sm:text-sm"
                                      >
                                        <span className="font-bold text-gray-800 text-center">{row.position}</span>
                                        <span className="min-w-0">
                                          <span className="font-medium text-gray-900 block truncate">
                                            {row.player_name}
                                            {indexLabel ? (
                                              <span className="text-gray-600 font-normal"> ({indexLabel})</span>
                                            ) : null}
                                          </span>
                                          {row.member_number ? (
                                            <span className="text-gray-500">#{row.member_number}</span>
                                          ) : null}
                                        </span>
                                        <span className="text-center font-semibold text-blue-700 tabular-nums">
                                          {row.total_net}
                                        </span>
                                        <span className="text-center text-gray-800 tabular-nums">{row.total_gross}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setAnnualExpanded((v) => !v)}
            className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50"
          >
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-800">
                Ranking anual del club ({portalYear})
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {annualExpanded ? 'Tocá para ocultar' : 'Tocá para ver el acumulado del año'}
              </p>
            </div>
            {annualExpanded ? (
              <ChevronUp className="w-5 h-5 shrink-0 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 shrink-0 text-gray-400" />
            )}
          </button>
          {annualExpanded && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mt-3 mb-3">
                Se muestra si participaste en algún torneo de ranking del año o si figurás en el acumulado gross/neto.
                El año es el mismo que elegís al lado de <strong>Mis torneos</strong>.
              </p>
              {loadingAnnual && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando ranking…
                </div>
              )}
              {annualError && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded p-2 mb-2">
                  {annualError}
                </p>
              )}
              {annual && (
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-800 mb-1">Acumulado gross (sin hándicap / grilla gross)</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-gray-700 max-h-64 overflow-y-auto">
                      {(annual.without_hcp || []).map((row, i) => (
                        <li key={`a-g-${i}`}>
                          {row.player_name}: {row.total_gross} ({row.rounds} rondas)
                        </li>
                      ))}
                    </ol>
                  </div>
                  {(annual.with_hcp || []).length > 0 && (
                    <div>
                      <p className="font-medium text-gray-800 mb-1">Acumulado neto</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-gray-700 max-h-64 overflow-y-auto">
                        {(annual.with_hcp || []).map((row, i) => (
                          <li key={`a-n-${i}`}>
                            {row.player_name}: neto {row.total_net} · gross {row.total_gross} ({row.rounds} rondas)
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
