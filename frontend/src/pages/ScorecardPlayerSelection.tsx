import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, User, CheckCircle, Search, X, Trophy, Printer, Edit } from 'lucide-react';
import { useTournamentParticipants, useTournaments } from '../hooks/useTournaments';
import { isTournamentStatusClosed } from '../types/tournament';
import { useTournamentScorecards } from '../hooks/useScorecards';
import { getScoreStyle, formatHcpForDisplay, computeNetScore } from '../utils/scoreUtils';
import { TournamentClosedNotice, TORNEO_CERRADO_ALERT } from '../components/TournamentClosedNotice';

// Score styling moved to shared utility

/** Misma clave que al indexar scorecards por member_id / external_player_id (no usar participant_id para socios). */
function participantToScorecardKey(participant: any): string | null {
  const pt = String(participant?.player_type || '').toLowerCase()
  if (pt === 'external') {
    if (participant.external_player_id == null || participant.external_player_id === '') return null
    return `external_${Number(participant.external_player_id)}`
  }
  if (participant.member_id == null || participant.member_id === '') return null
  return `member_${Number(participant.member_id)}`
}

// Componente Modal para mostrar la tarjeta
function ScorecardModal({
  scorecard,
  onClose,
  readOnly = false,
}: {
  scorecard: any
  onClose: () => void
  readOnly?: boolean
}) {
  const { clubId, tournamentId } = useParams<{ clubId: string; tournamentId: string }>();
  const navigate = useNavigate();
  const sanitizeAscii = (text: string | undefined | null) => {
    const base = (text ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '')
    return base.replace(/\s+/g, ' ').trim()
  }
  
  if (!scorecard) return null;
  
  console.log('🏌️ ScorecardModal received scorecard:', scorecard);
  console.log('🏌️ ScorecardModal scores:', scorecard.scores);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-green-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Tarjeta de {scorecard.player_name}
              </h2>
              <p className="text-sm text-gray-600">
                {scorecard.player_type === 'external' ? 'Jugador Externo' : 'Socio'} • HCP: {formatHcpForDisplay(scorecard.handicap_local, scorecard.handicap_index)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                onClick={() => {
                  const playerId = scorecard.member_id || scorecard.external_player_id;
                  navigate(`/club/${clubId}/tournaments/${tournamentId}/manual-entry/${playerId}`, {
                    state: { manualEntryBack: 'scorecard-selection' as const },
                  });
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                title="Editar tarjeta"
              >
                <Edit className="h-4 w-4" />
                Editar
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const scorecardId = scorecard.scorecard_id;
                if (!scorecardId) return;
                window.open(`/club/${clubId}/tournaments/${tournamentId}/scorecard/${scorecardId}/print?autoprint=true`, '_blank');
              }}
              disabled={!scorecard.scorecard_id}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Imprimir tarjeta"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        
        <div className="p-6">
          {readOnly && (
            <div className="mb-4">
              <TournamentClosedNotice layout="box">
                <span>Solo lectura e impresión. Los golpes y el HCP del torneo no se pueden cambiar hasta reabrir el torneo.</span>
              </TournamentClosedNotice>
            </div>
          )}
          {/* Información del jugador */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Jugador:</span>
                <p className="font-medium">{scorecard.player_name}</p>
              </div>
              <div>
                <span className="text-gray-600">Tipo:</span>
                <p className="font-medium">{scorecard.player_type === 'external' ? 'Externo' : 'Socio'}</p>
              </div>
              <div>
                <span className="text-gray-600">Handicap:</span>
                <p className="font-medium">{formatHcpForDisplay(scorecard.handicap_local, scorecard.handicap_index)}</p>
              </div>
              <div>
                <span className="text-gray-600">Club:</span>
                <p className="font-medium">{sanitizeAscii(scorecard.player_club) || 'Sin club'}</p>
              </div>
            </div>
          </div>

          {/* Scorecard con formato de tabla como en el formulario */}
          <div className="space-y-6">
            {(() => {
              const hasScores = scorecard.scores && scorecard.scores.length > 0;
              console.log('🔍 Modal score check:', {
                hasScores,
                scores: scorecard.scores,
                length: scorecard.scores?.length
              });
              return hasScores;
            })() ? (
              <>
                {/* Ida 9 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ida 9</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left border-r border-gray-300">Hoyo</th>
                          {Array.from({length: 9}, (_, i) => (
                            <th key={i + 1} className="px-3 py-2 text-center border-r border-gray-300">
                              {i + 1}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 font-medium border-r border-gray-300">Par</td>
                          {Array.from({length: 9}, (_, i) => {
                            const hole = scorecard.scores.find((s: any) => s.hole === i + 1);
                            return (
                              <td key={i + 1} className="px-3 py-2 text-center border-r border-gray-300">
                                {hole?.par || 4}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center font-bold">
                            {scorecard.scores.slice(0, 9).reduce((sum: number, s: any) => sum + (s.par || 4), 0)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-medium border-r border-gray-300">HCP</td>
                          {Array.from({length: 9}, (_, i) => {
                            const hole = scorecard.scores.find((s: any) => s.hole === i + 1);
                            return (
                              <td key={i + 1} className="px-3 py-2 text-center border-r border-gray-300 text-sm">
                                {hole?.handicap || i + 1}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2"></td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="px-3 py-2 font-bold border-r border-gray-300">Score</td>
                          {Array.from({length: 9}, (_, i) => {
                            const hole = scorecard.scores.find((s: any) => s.hole === i + 1);
                            const score = hole?.strokes;
                            const par = hole?.par || 4;
                            return (
                              <td key={i + 1} className="px-3 py-2 text-center border-r border-gray-300">
                                {score !== undefined ? (
                                  (() => {
                                    const style = getScoreStyle(score, par);
                                    return (
                                      <div className="flex flex-col items-center">
                                        <span className={`font-bold px-2 py-1 border-2 ${style.bgColor} ${style.textColor} ${style.borderColor} ${style.shape} min-w-[28px] text-center `}>
                                          {score}
                                        </span>

                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center font-bold text-lg">
                            {scorecard.scores.slice(0, 9).reduce((sum: number, s: any) => sum + (s.strokes || 0), 0) || ''}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Vuelta 9 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Vuelta 9</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left border-r border-gray-300">Hoyo</th>
                          {Array.from({length: 9}, (_, i) => (
                            <th key={i + 10} className="px-3 py-2 text-center border-r border-gray-300">
                              {i + 10}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 font-medium border-r border-gray-300">Par</td>
                          {Array.from({length: 9}, (_, i) => {
                            const hole = scorecard.scores.find((s: any) => s.hole === i + 10);
                            return (
                              <td key={i + 10} className="px-3 py-2 text-center border-r border-gray-300">
                                {hole?.par || 4}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center font-bold">
                            {scorecard.scores.slice(9, 18).reduce((sum: number, s: any) => sum + (s.par || 4), 0)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-medium border-r border-gray-300">HCP</td>
                          {Array.from({length: 9}, (_, i) => {
                            const hole = scorecard.scores.find((s: any) => s.hole === i + 10);
                            return (
                              <td key={i + 10} className="px-3 py-2 text-center border-r border-gray-300 text-sm">
                                {hole?.handicap || i + 10}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2"></td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="px-3 py-2 font-bold border-r border-gray-300">Score</td>
                          {Array.from({length: 9}, (_, i) => {
                            const hole = scorecard.scores.find((s: any) => s.hole === i + 10);
                            const score = hole?.strokes;
                            const par = hole?.par || 4;
                            return (
                              <td key={i + 10} className="px-3 py-2 text-center border-r border-gray-300">
                                {score !== undefined ? (
                                  (() => {
                                    const style = getScoreStyle(score, par);
                                    return (
                                      <div className="flex flex-col items-center">
                                        <span className={`font-bold px-2 py-1 border-2 ${style.bgColor} ${style.textColor} ${style.borderColor} ${style.shape} min-w-[28px] text-center `}>
                                          {score}
                                        </span>

                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center font-bold text-lg">
                            {scorecard.scores.slice(9, 18).reduce((sum: number, s: any) => sum + (s.strokes || 0), 0) || ''}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No hay scores registrados para esta tarjeta</p>
              </div>
            )}

            {/* Estado de la tarjeta y totales */}
            {scorecard.scores && scorecard.scores.length > 0 && (() => {
              // Calcular valores una sola vez
              const totalGolpes = scorecard.scores.reduce((sum: number, score: any) => sum + (score.strokes || 0), 0);
              const hcp = Math.round(scorecard.handicap_local) || 0;
              const neto = totalGolpes - hcp;
              const completedHoles = scorecard.scores.filter((s: any) => s.strokes > 0).length;
              const isComplete = completedHoles === 18;
              
              return (
                <div className="mt-6 space-y-4">
                  {/* Estado de la tarjeta */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">Estado:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        isComplete 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {isComplete ? '✓ Completa' : `Parcial (${completedHoles}/18)`}
                      </span>
                    </div>
                    
                    {/* Leyenda de colores */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium">Leyenda:</span>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 bg-yellow-400 rounded-full border"></span>
                        <span>HIO</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 bg-red-500 rounded-full border"></span>
                        <span>Eagle</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 bg-blue-500 rounded-full border"></span>
                        <span>Birdie</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 bg-gray-100 rounded border border-gray-300"></span>
                        <span>Par</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 bg-white rounded-sm border-2 border-black"></span>
                        <span>Bogey</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 bg-white rounded-sm border-2 border-black shadow-[inset_0_0_0_1px_white,inset_0_0_0_2px_black]"></span>
                        <span>2+</span>
                      </div>
                    </div>
                    
                    {scorecard.verified_card && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        Verificada
                      </span>
                    )}
                  </div>

                  {/* Totales */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-600">Total Golpes</p>
                        <p className="text-2xl font-bold text-gray-900">{totalGolpes}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">HCP</p>
                        <p className="text-2xl font-bold text-gray-900">{hcp}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Neto</p>
                        <p className={`text-2xl font-bold ${
                          neto < 72 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {neto}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Fecha</p>
                        <p className="text-lg font-medium text-gray-900">
                          {scorecard.created_at ? new Date(scorecard.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          }) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScorecardPlayerSelection() {
  const { clubId, tournamentId } = useParams<{ clubId: string; tournamentId: string }>();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'pending' | 'completed' | 'all' | 'no_show'>('pending')
  const [selectedScorecard, setSelectedScorecard] = useState<any>(null)
  
  function holeScoresRecordToModalRows(holeScores: Record<string | number, unknown> | null | undefined): any[] {
    if (!holeScores || typeof holeScores !== 'object') return []
    const out: any[] = []
    for (const k of Object.keys(holeScores)) {
      const hole = parseInt(String(k), 10)
      const strokes = Number((holeScores as any)[k])
      if (!Number.isFinite(hole) || hole < 1 || hole > 18) continue
      if (!Number.isFinite(strokes)) continue
      out.push({ hole, strokes, par: 4, handicap: hole })
    }
    out.sort((a, b) => a.hole - b.hole)
    return out
  }

  /** Debe recibir el participante completo (no solo participant_id): la tarjeta se cruza por member_id / external_player_id. */
  const fetchScorecardDetails = async (participant: any) => {
    try {
      const pk = participantToScorecardKey(participant)
      const existingScorecard = scorecards?.find((sc: any) => {
        const sk =
          sc.member_id != null && sc.member_id !== ''
            ? `member_${Number(sc.member_id)}`
            : sc.external_player_id != null && sc.external_player_id !== ''
              ? `external_${Number(sc.external_player_id)}`
              : null
        return sk != null && sk === pk
      })

      const participantData = participant

      if (existingScorecard) {
        const scRow = existingScorecard as unknown as Record<string, unknown>
        const scorecardData: any = {
          ...existingScorecard,
          player_name: participantData?.player_name || 'Sin nombre',
          player_type: participantData?.player_type || 'member',
          player_club: participantData?.player_club || 'Sin club',
          handicap_local:
            (scRow.handicap_local as number | undefined) ?? participantData?.handicap_local,
          handicap_index:
            (scRow.handicap_index as number | undefined) ?? (participantData as any)?.handicap_index,
          scores: [] as any[],
        }

        let loaded: any[] = []

        if (existingScorecard.scorecard_id) {
          try {
            const detailUrl = `/api/club/${clubId}/tournaments/${tournamentId}/scorecard/${existingScorecard.scorecard_id}`
            const detailResponse = await fetch(detailUrl)
            if (detailResponse.ok) {
              const detailData = await detailResponse.json()
              const apiData = detailData.data || detailData
              const holes = apiData.holes || apiData.scores
              if (Array.isArray(holes) && holes.length > 0) {
                loaded = holes
              } else if (apiData.hole_scores && typeof apiData.hole_scores === 'object') {
                loaded = holeScoresRecordToModalRows(apiData.hole_scores)
              }
              if (apiData.player_name) scorecardData.player_name = apiData.player_name
              if (apiData.player_type) scorecardData.player_type = apiData.player_type
              if (apiData.player_club) scorecardData.player_club = apiData.player_club
              if (apiData.handicap_local !== undefined) scorecardData.handicap_local = apiData.handicap_local
              if (apiData.handicap_index !== undefined) scorecardData.handicap_index = apiData.handicap_index
            }
          } catch (detailError) {
            console.error('❌ Exception fetching scorecard scores:', detailError)
          }
        }

        if (!loaded.length && scRow.hole_scores) {
          loaded = holeScoresRecordToModalRows(scRow.hole_scores as Record<string | number, unknown>)
        }

        scorecardData.scores = loaded
        setSelectedScorecard(scorecardData)
      } else if (participantData) {
        const basicScorecardData = {
          player_name: participantData.player_name || 'Sin nombre',
          player_type: participantData.player_type || 'member',
          player_club: participantData.player_club || 'Sin club',
          handicap_local: participantData.handicap_local,
          scores: [] as any[],
          created_at: new Date().toISOString(),
          scorecard_id: null,
          member_id: participantData.member_id,
          external_player_id: participantData.external_player_id,
        }

        setSelectedScorecard(basicScorecardData)
      }
    } catch (error) {
      console.error('Error fetching scorecard details:', error)
    }
  }
  
  const clubIdNum = parseInt(clubId || '0')
  const tournamentIdNum = parseInt(tournamentId || '0')

  const { data: tournaments = [] } = useTournaments(clubIdNum)
  const tournamentMeta = tournaments.find((t: any) => t.tournament_id === tournamentIdNum)
  const tournamentClosed = tournamentMeta ? isTournamentStatusClosed(tournamentMeta.status) : false

  const {
    data: participants = [],
    isLoading: participantsLoading,
    error: participantsError
  } = useTournamentParticipants(clubIdNum, tournamentIdNum)

  const {
    data: scorecards = [],
    isLoading: scorecardsLoading,
    error: scorecardsError
  } = useTournamentScorecards(clubIdNum, tournamentIdNum, true);

  // Separate participants into completed, pending, and no-show
  const participantsWithScorecards = useMemo(() => {
    if (!participants.length || !Array.isArray(scorecards)) return [];
    
    const playersWithScorecard = new Set();
    
    scorecards.forEach((scorecard: any) => {
      if (!scorecard.did_not_present || scorecard.did_not_present === 0) {
        if (scorecard.member_id != null && scorecard.member_id !== '') {
          playersWithScorecard.add(`member_${Number(scorecard.member_id)}`);
        }
        if (scorecard.external_player_id != null && scorecard.external_player_id !== '') {
          playersWithScorecard.add(`external_${Number(scorecard.external_player_id)}`);
        }
      }
    });

    const result = participants.filter((participant: any) => {
      const playerKey = participantToScorecardKey(participant)
      return playerKey != null && playersWithScorecard.has(playerKey)
    });
    
    return result;
  }, [participants, scorecards]);

  // Jugadores que NO presentaron tarjeta
  const participantsNoShow = useMemo(() => {
    if (!participants.length || !Array.isArray(scorecards)) return [];
    
    const playersNoShow = new Set();
    
    scorecards.forEach((scorecard: any) => {
      if (scorecard.did_not_present === 1 || scorecard.did_not_present === true) {
        if (scorecard.member_id != null && scorecard.member_id !== '') {
          playersNoShow.add(`member_${Number(scorecard.member_id)}`);
        }
        if (scorecard.external_player_id != null && scorecard.external_player_id !== '') {
          playersNoShow.add(`external_${Number(scorecard.external_player_id)}`);
        }
      }
    });

    const result = participants.filter((participant: any) => {
      const playerKey = participantToScorecardKey(participant)
      return playerKey != null && playersNoShow.has(playerKey)
    });
    
    return result;
  }, [participants, scorecards]);

  // Filtrar jugadores que NO tienen tarjeta cargada (ni presentada ni no-presentada)
  const playersWithoutScorecard = useMemo(() => {
    if (!participants.length || !Array.isArray(scorecards)) return participants;
    
    const playersWithAnyScorecard = new Set();
    
    scorecards.forEach((scorecard: any) => {
      if (scorecard.member_id != null && scorecard.member_id !== '') {
        playersWithAnyScorecard.add(`member_${Number(scorecard.member_id)}`);
      }
      if (scorecard.external_player_id != null && scorecard.external_player_id !== '') {
        playersWithAnyScorecard.add(`external_${Number(scorecard.external_player_id)}`);
      }
    });

    return participants.filter((participant: any) => {
      const playerKey = participantToScorecardKey(participant)
      return playerKey == null || !playersWithAnyScorecard.has(playerKey)
    });
  }, [participants, scorecards]);

  // Apply filters and search
  const filteredParticipants = useMemo(() => {
    let baseList: any[] = []
    
    switch (selectedFilter) {
      case 'pending':
        baseList = playersWithoutScorecard  // Jugadores sin tarjeta
        break
      case 'completed':
        baseList = participantsWithScorecards  // Jugadores con tarjeta
        break
      case 'no_show':
        baseList = participantsNoShow  // Jugadores que no presentaron
        break
      case 'all':
        baseList = participants
        break
    }

    if (!searchTerm) return baseList

    return baseList.filter((p: any) =>
      (p.player_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.member_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.player_club || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [participants, playersWithoutScorecard, participantsWithScorecards, participantsNoShow, selectedFilter, searchTerm]);



  if (participantsLoading || scorecardsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando jugadores...</p>
        </div>
      </div>
    );
  }

  if (participantsError || scorecardsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error al cargar los datos</p>
          <p className="text-sm text-gray-600 mb-4">
            {(participantsError as any)?.message || (scorecardsError as any)?.message || 'Error desconocido'}
          </p>
          <button
            onClick={() => navigate(`/club/${clubId}/admin?tab=tournaments`)}
            className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/club/${clubId}/admin?tab=tournaments`)}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Volver
              </button>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  Ingreso Manual de Tarjetas
                </h1>
                <p className="text-sm text-gray-600">
                  Selecciona un jugador para cargar su tarjeta
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Botón eliminado - ahora la funcionalidad está en las pestañas */}
            </div>
          </div>
        </div>
      </div>

      {tournamentClosed && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-4">
          <TournamentClosedNotice layout="box">
            <span>
              No se pueden <strong>cargar ni editar</strong> tarjetas. Sí podés <strong>ver</strong> cada tarjeta e{' '}
              <strong>imprimirla</strong>. El HCP de este torneo es el registrado al cerrarlo, no el actual del socio.
            </span>
          </TournamentClosedNotice>
        </div>
      )}

      {/* Stats Cards - Clickeable */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`bg-white rounded-lg shadow p-4 transition-all hover:shadow-lg hover:scale-105 text-left ${
              selectedFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
          >
            <div className="flex items-center">
              <User className="h-6 w-6 text-blue-600" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Total Participantes</p>
                <p className="text-xl font-bold text-gray-900">{participants.length}</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setSelectedFilter('completed')}
            className={`bg-white rounded-lg shadow p-4 transition-all hover:shadow-lg hover:scale-105 text-left ${
              selectedFilter === 'completed' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:bg-green-50'
            }`}
          >
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Tarjetas Cargadas</p>
                <p className="text-xl font-bold text-gray-900">{participantsWithScorecards.length}</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setSelectedFilter('pending')}
            className={`bg-white rounded-lg shadow p-4 transition-all hover:shadow-lg hover:scale-105 text-left ${
              selectedFilter === 'pending' ? 'ring-2 ring-orange-500 bg-orange-50' : ''
            }`}
          >
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-orange-600" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Pendientes</p>
                <p className="text-xl font-bold text-gray-900">{playersWithoutScorecard.length}</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setSelectedFilter('no_show')}
            className={`bg-white rounded-lg shadow p-4 transition-all hover:shadow-lg hover:scale-105 text-left ${
              selectedFilter === 'no_show' ? 'ring-2 ring-red-500 bg-red-50' : ''
            }`}
          >
            <div className="flex items-center">
              <X className="h-6 w-6 text-red-600" />
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">No Presentaron</p>
                <p className="text-xl font-bold text-gray-900">{participantsNoShow.length}</p>
              </div>
            </div>
          </button>
        </div>

        {/* Search Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, matrícula o club..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {searchTerm && (
            <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
              <span>{filteredParticipants.length} resultados encontrados</span>
              <button
                onClick={() => setSearchTerm('')}
                className="text-blue-600 hover:text-blue-800"
              >
                Limpiar búsqueda
              </button>
            </div>
          )}
        </div>

        {filteredParticipants.length === 0 ? (
            <div className="text-center py-12">
            {selectedFilter === 'pending' && playersWithoutScorecard.length === 0 ? (
              <>
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  ¡Todas las tarjetas han sido cargadas!
                </h3>
                <p className="text-gray-600 mb-6">
                  Todos los participantes ya tienen su tarjeta registrada.
                </p>
                <button
                  onClick={() => navigate(`/club/${clubId}/tournaments/${tournamentId}/scorecards`)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Ver Todas las Tarjetas
                </button>
              </>
            ) : searchTerm ? (
              <>
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No se encontraron resultados
                </h3>
                <p className="text-gray-600 mb-6">
                  No hay participantes que coincidan con "{searchTerm}"
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Limpiar búsqueda
                </button>
              </>
            ) : (
              <>
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay {selectedFilter === 'completed' ? 'tarjetas cargadas' : 'participantes'} para mostrar
                </h3>
              </>
            )}
            </div>
          ) : (
            <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {selectedFilter === 'pending' && 'Jugadores pendientes'}
                {selectedFilter === 'completed' && 'Tarjetas cargadas'}
                {selectedFilter === 'no_show' && 'No presentaron tarjeta'}
                {selectedFilter === 'all' && 'Todos los participantes'}
                ({filteredParticipants.length})
              </h3>
              {selectedFilter === 'completed' && (
                <span className="text-sm text-gray-500">
                  Haz click para ver tarjetas cargadas
                </span>
              )}
            </div>
            <div className="grid gap-4">
              {filteredParticipants.map((participant: any) => {
                // Verificar si el participante tiene tarjeta cargada y obtener el scorecard
                const pk = participantToScorecardKey(participant)
                const participantScorecard = scorecards?.find((sc: any) => {
                  if (sc.did_not_present === 1 || sc.did_not_present === true) return false
                  const sk =
                    sc.member_id != null && sc.member_id !== ''
                      ? `member_${Number(sc.member_id)}`
                      : sc.external_player_id != null && sc.external_player_id !== ''
                        ? `external_${Number(sc.external_player_id)}`
                        : null
                  return sk != null && sk === pk
                });
                const hasScorecard = !!participantScorecard;
                
                return (
                  <div key={participant.participant_id} className={`bg-white rounded-lg shadow p-6 transition-all hover:shadow-lg ${
                    hasScorecard ? 'border-l-4 border-green-500' : ''
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {hasScorecard ? (
                            <CheckCircle className="h-8 w-8 text-green-500" />
                          ) : (
                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                              <FileText className="h-5 w-5 text-orange-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">
                            {participant.player_name || 'Sin nombre'}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>
                              {participant.player_type === 'external' ? 'Externo' : 'Socio'}
                            </span>
                            {(participant.handicap_local != null || (participant as any).handicap_index != null) && (
                              <span>HCP: {formatHcpForDisplay(participant.handicap_local ?? (participant as any).handicap_index, (participant as any).handicap_index)}</span>
                            )}
                            {participant.member_number && (
                              <span>#{participant.member_number}</span>
                            )}
                            {participant.player_club && (
                              <span>Club: {(() => {
                                const base = (participant.player_club ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '');
                                return base.replace(/\s+/g, ' ').trim();
                              })()}</span>
                            )}
                            {hasScorecard && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                ✓ Tarjeta Cargada
                              </span>
                            )}
                            
                            {/* Score Summary for players with loaded scorecards - inline */}
                            {hasScorecard && participantScorecard && (() => {
                              const totalGolpes = (participantScorecard as any).total_gross || 0;
                              const hcp = Math.round(participant.handicap_local ?? (participant as any).handicap_index) || 0;
                              const neto = computeNetScore(totalGolpes, hcp, (participant as any).handicap_index);
                              
                              return (
                                <div className="flex items-center gap-3 ml-4 px-3 py-1 bg-green-50 rounded-lg text-xs">
                                  <div className="text-center">
                                    <span className="text-gray-500">Golpes:</span>
                                    <span className="font-bold text-gray-900 ml-1">
                                      {totalGolpes || 'N/A'}
                                    </span>
                                  </div>
                                  <div className="text-center">
                                    <span className="text-gray-500">HCP:</span>
                                    <span className="font-bold text-gray-900 ml-1">
                                      {formatHcpForDisplay(participant.handicap_local ?? (participant as any).handicap_index, (participant as any).handicap_index)}
                                    </span>
                                  </div>
                                  <div className="text-center">
                                    <span className="text-gray-500">Neto:</span>
                                    <span className={`font-bold ml-1 ${
                                      neto < 72 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {neto}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                                                  <button
                            onClick={() => {
                              if (tournamentClosed && !hasScorecard) {
                                alert(TORNEO_CERRADO_ALERT)
                                return
                              }
                              if (hasScorecard) {
                                fetchScorecardDetails(participant)
                              } else {
                                const playerId =
                                  participant.participant_id ||
                                  participant.member_id ||
                                  participant.external_player_id

                                if (playerId) {
                                  if (tournamentClosed) {
                                    alert(TORNEO_CERRADO_ALERT)
                                    return
                                  }
                                  const targetUrl = `/club/${clubId}/tournaments/${tournamentId}/manual-entry/${playerId}`
                                  navigate(targetUrl, {
                                    state: { manualEntryBack: 'scorecard-selection' as const },
                                  })
                                } else {
                                  alert('No se pudo identificar al jugador.')
                                }
                              }
                            }}
                            className={`px-6 py-2 rounded-lg transition-colors ${
                              hasScorecard 
                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {hasScorecard ? 'Ver Tarjeta' : 'Cargar Tarjeta'}
                          </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            </div>
          )}
      </div>

      {/* Modal de tarjeta */}
      {selectedScorecard && (
        <ScorecardModal
          scorecard={selectedScorecard}
          onClose={() => setSelectedScorecard(null)}
          readOnly={tournamentClosed}
        />
      )}
    </div>
  );
}
