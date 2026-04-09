import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Medal, Award, Crown, Printer } from 'lucide-react';
import { useTournamentScorecards } from '../hooks/useScorecards';
import { useTournaments } from '../hooks/useTournaments';
import { formatHandicapIndexForDisplay, formatHcpForDisplay } from '@/utils/scoreUtils';
import {
  compareCategoryResults,
  computeNetForResultsRow,
  dedupeScorecardsForResults,
  getEffectiveHcpForCategory,
  normalizeIdaVueltaForResults,
  sumGrossStrokesHoleRange,
} from '@/utils/tournamentResultsByCategory';

interface CategoryResult {
  position: number;
  player_name: string;
  player_type: 'member' | 'external';
  handicap_local: number | null;
  handicap_index: number | null;
  total_gross: number;
  total_net: number;
  front_nine: number;
  back_nine: number;
  vuelta_last6_gross: number | null;
  vuelta_last3_gross: number | null;
  member_number?: string;
  club_name?: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: any;
  filter: (scorecard: any) => boolean;
}

/** Fondo amarillo: 1.er y 2.do en cada categoría; en Scratch (Gross) solo 1.er */
function resultsRowHighlightClass(categoryId: string, position: number): string {
  const scratch = categoryId.startsWith('scratch')
  if (scratch) return position === 1 ? 'bg-yellow-50' : 'hover:bg-gray-50'
  return position <= 2 ? 'bg-yellow-50' : 'hover:bg-gray-50'
}

export default function TournamentResults() {
  const { clubId, tournamentId } = useParams<{ clubId: string; tournamentId: string }>();
  const navigate = useNavigate();
  
  const clubIdNum = clubId ? parseInt(clubId) : 0;
  const tournamentIdNum = tournamentId ? parseInt(tournamentId) : 0;
  
  const { data: tournaments } = useTournaments(clubIdNum);
  const { data: scorecards, isLoading } = useTournamentScorecards(clubIdNum, tournamentIdNum);
  
  const tournament = tournaments?.find(t => t.tournament_id === tournamentIdNum);

  // Sanitize to ASCII to avoid corrupted glyphs in some environments
  const sanitizeAscii = (text: string | undefined | null) => {
    const base = (text ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')   // remove diacritics
      .replace(/[^\x20-\x7E]/g, '')      // strip non-ASCII visible characters
    return base.replace(/\s+/g, ' ').trim();
  }
  
  // Configuración del torneo (solo lectura, viene de la base de datos)
  const [separateLadies, setSeparateLadies] = useState<boolean>(false);
  const [ladiesByHcp, setLadiesByHcp] = useState<boolean>(false);
  const resultsMode = (tournament as any)?.results_mode || 'standard';

  // Actualizar valores cuando el torneo cambie
  useEffect(() => {
    if (tournament) {
      setSeparateLadies((tournament as any)?.separate_ladies === 1 || (tournament as any)?.separate_ladies === true);
      setLadiesByHcp((tournament as any)?.ladies_by_hcp === 1 || (tournament as any)?.ladies_by_hcp === true);
    }
  }, [tournament]);

  // Definir las categorías (dependen de separateLadies y resultsMode)
  const categories: Category[] = resultsMode === 'standard' ? [
    {
      id: 'primera',
      name: '1ra Categoría',
      description: 'HCP 0 - 7.9',
      color: 'bg-yellow-50 border-yellow-200',
      icon: Crown,
      filter: (scorecard) => {
        if (separateLadies && scorecard.gender === 'F') return false
        const hcp = getEffectiveHcpForCategory(scorecard)
        return hcp !== null && hcp >= 0 && hcp <= 7.9
      }
    },
    {
      id: 'segunda', 
      name: '2da Categoría',
      description: 'HCP 8 - 13.9',
      color: 'bg-blue-50 border-blue-200',
      icon: Trophy,
      filter: (scorecard) => {
        if (separateLadies && scorecard.gender === 'F') return false
        const hcp = getEffectiveHcpForCategory(scorecard)
        return hcp !== null && hcp >= 8 && hcp <= 13.9
      }
    },
    {
      id: 'tercera',
      name: '3ra Categoría', 
      description: 'HCP 14 - 21.9',
      color: 'bg-green-50 border-green-200',
      icon: Medal,
      filter: (scorecard) => {
        if (separateLadies && scorecard.gender === 'F') return false
        const hcp = getEffectiveHcpForCategory(scorecard)
        return hcp !== null && hcp >= 14 && hcp <= 21.9
      }
    },
    {
      id: 'cuarta',
      name: '4ta Categoría',
      description: 'HCP 22 - 53.9', 
      color: 'bg-purple-50 border-purple-200',
      icon: Award,
      filter: (scorecard) => {
        if (separateLadies && scorecard.gender === 'F') return false
        const hcp = getEffectiveHcpForCategory(scorecard)
        return hcp !== null && hcp >= 22 && hcp <= 53.9
      }
    },
    // Categorías de Damas
    ...(separateLadies
      ? (ladiesByHcp
        ? [
          {
            id: 'damas_primera',
            name: 'Damas 1ra',
            description: 'HCP 0 - 7.9 (Femenino)',
            color: 'bg-pink-50 border-pink-200',
            icon: Crown,
            filter: (s: any) => {
              if (s.gender !== 'F') return false
              const hcp = getEffectiveHcpForCategory(s)
              return hcp !== null && hcp >= 0 && hcp <= 7.9
            }
          },
          {
            id: 'damas_segunda',
            name: 'Damas 2da',
            description: 'HCP 8 - 13.9 (Femenino)',
            color: 'bg-pink-50 border-pink-200',
            icon: Trophy,
            filter: (s: any) => {
              if (s.gender !== 'F') return false
              const hcp = getEffectiveHcpForCategory(s)
              return hcp !== null && hcp >= 8 && hcp <= 13.9
            }
          },
          {
            id: 'damas_tercera',
            name: 'Damas 3ra',
            description: 'HCP 14 - 21.9 (Femenino)',
            color: 'bg-pink-50 border-pink-200',
            icon: Medal,
            filter: (s: any) => {
              if (s.gender !== 'F') return false
              const hcp = getEffectiveHcpForCategory(s)
              return hcp !== null && hcp >= 14 && hcp <= 21.9
            }
          },
          {
            id: 'damas_cuarta',
            name: 'Damas 4ta',
            description: 'HCP 22 - 53.9 (Femenino)',
            color: 'bg-pink-50 border-pink-200',
            icon: Award,
            filter: (s: any) => {
              if (s.gender !== 'F') return false
              const hcp = getEffectiveHcpForCategory(s)
              return hcp !== null && hcp >= 22 && hcp <= 53.9
            }
          }
        ]
        : [{
          id: 'damas',
          name: 'Damas',
          description: 'Categoría Femenina (todas juntas)',
          color: 'bg-pink-50 border-pink-200',
          icon: Crown,
          filter: (scorecard: any) => scorecard.gender === 'F'
        } as Category])
      : []),
    {
      id: 'no_hcp',
      name: 'Sin HCP',
      description: 'Jugadores sin Handicap',
      color: 'bg-gray-50 border-gray-200',
      icon: Award,
      filter: (scorecard) => {
        if (getEffectiveHcpForCategory(scorecard) !== null) return false
        // Con "Damas" en un solo grupo, esas jugadoras ya están ahí; no duplicar en Sin HCP
        if (separateLadies && !ladiesByHcp && scorecard.gender === 'F') return false
        return true
      }
    },
    {
      id: 'principiantes',
      name: 'Principiantes',
      description: 'Categoría Principiantes',
      color: 'bg-orange-50 border-orange-200',
      icon: Award,
      filter: (scorecard) => {
        return scorecard.category === 'principiantes';
      }
    }
  ] : [
    // Scratch (gross): todos, o solo caballeros si "Separar Damas" (no hay Damas Scratch gross)
    {
      id: 'scratch_general',
      name: 'Scratch (Gross)',
      description: separateLadies
        ? 'Clasificación por golpes — solo caballeros'
        : 'Clasificación por golpes (todos)',
      color: 'bg-yellow-50 border-yellow-200',
      icon: Crown,
      filter: (s: any) => !separateLadies || s.gender !== 'F'
    } as Category,
    // Bandas de HCP: 1ra (-5 a 7.9), 2da (8 a 13.9), 3ra (14 a 21.9), 4ta (22 a 54)
    {
      id: 'band_1',
      name: '1ra (-5 a 7.9)',
      description: 'Clasificación por neto dentro de banda',
      color: 'bg-blue-50 border-blue-200',
      icon: Trophy,
      filter: (s: any) => {
        if (separateLadies && s.gender === 'F') return false
        const hcp = getEffectiveHcpForCategory(s)
        return hcp !== null && hcp >= -5 && hcp <= 7.9
      }
    },
    {
      id: 'band_2',
      name: '2da (8 a 13.9)',
      description: 'Clasificación por neto dentro de banda',
      color: 'bg-green-50 border-green-200',
      icon: Medal,
      filter: (s: any) => {
        if (separateLadies && s.gender === 'F') return false
        const hcp = getEffectiveHcpForCategory(s)
        return hcp !== null && hcp >= 8 && hcp <= 13.9
      }
    },
    {
      id: 'band_3',
      name: '3ra (14 a 21.9)',
      description: 'Clasificación por neto dentro de banda',
      color: 'bg-purple-50 border-purple-200',
      icon: Award,
      filter: (s: any) => {
        if (separateLadies && s.gender === 'F') return false
        const hcp = getEffectiveHcpForCategory(s)
        return hcp !== null && hcp >= 14 && hcp <= 21.9
      }
    },
    {
      id: 'band_4',
      name: '4ta (22 a 54)',
      description: 'Clasificación por neto dentro de banda',
      color: 'bg-amber-50 border-amber-200',
      icon: Award,
      filter: (s: any) => {
        if (separateLadies && s.gender === 'F') return false
        const hcp = getEffectiveHcpForCategory(s)
        return hcp !== null && hcp >= 22 && hcp <= 54
      }
    },
    // Damas por bandas si corresponde
    ...(separateLadies && ladiesByHcp ? [
      {
        id: 'damas_band_1',
        name: 'Damas 1ra (-5 a 7.9)',
        description: 'Femenino por neto',
        color: 'bg-pink-50 border-pink-200',
        icon: Trophy,
        filter: (s: any) => {
          if (s.gender !== 'F') return false
          const hcp = getEffectiveHcpForCategory(s)
          return hcp !== null && hcp >= -5 && hcp <= 7.9
        }
      } as Category,
      {
        id: 'damas_band_2',
        name: 'Damas 2da (8 a 13.9)',
        description: 'Femenino por neto',
        color: 'bg-pink-50 border-pink-200',
        icon: Medal,
        filter: (s: any) => {
          if (s.gender !== 'F') return false
          const hcp = getEffectiveHcpForCategory(s)
          return hcp !== null && hcp >= 8 && hcp <= 13.9
        }
      } as Category,
      {
        id: 'damas_band_3',
        name: 'Damas 3ra (14 a 21.9)',
        description: 'Femenino por neto',
        color: 'bg-pink-50 border-pink-200',
        icon: Award,
        filter: (s: any) => {
          if (s.gender !== 'F') return false
          const hcp = getEffectiveHcpForCategory(s)
          return hcp !== null && hcp >= 14 && hcp <= 21.9
        }
      } as Category,
      {
        id: 'damas_band_4',
        name: 'Damas 4ta (22 a 54)',
        description: 'Femenino por neto',
        color: 'bg-pink-50 border-pink-200',
        icon: Award,
        filter: (s: any) => {
          if (s.gender !== 'F') return false
          const hcp = getEffectiveHcpForCategory(s)
          return hcp !== null && hcp >= 22 && hcp <= 54
        }
      } as Category
    ] : []),
    ...(separateLadies && !ladiesByHcp ? [{
      id: 'damas',
      name: 'Damas',
      description: 'Categoría femenina (todas juntas, neto)',
      color: 'bg-pink-50 border-pink-200',
      icon: Crown,
      filter: (s: any) => s.gender === 'F'
    } as Category] : []),
    // Listado de jugadores sin HCP (para scratch_bands también)
    {
      id: 'no_hcp',
      name: 'Sin HCP',
      description: 'Jugadores sin Handicap',
      color: 'bg-gray-50 border-gray-200',
      icon: Award,
      filter: (s: any) => {
        if (getEffectiveHcpForCategory(s) !== null) return false
        if (separateLadies && !ladiesByHcp && s.gender === 'F') return false
        return true
      }
    } as Category
  ];

  // Procesar los resultados por categoría
  const resultsByCategory = useMemo(() => {
    if (!scorecards) return {};

    const uniqueScorecards = dedupeScorecardsForResults(scorecards);
    const results: { [key: string]: CategoryResult[] } = {};

    categories.forEach(category => {
      const categoryScores = uniqueScorecards
        .filter(category.filter)
        .map((scorecard) => {
          const rawNet = computeNetForResultsRow(scorecard, category.id)
          const { front: ida, back: vuelta } = normalizeIdaVueltaForResults(scorecard)
          return {
            player_name: scorecard.player_name,
            player_type: (scorecard as any).player_type || 'member',
            handicap_local: (scorecard as any).handicap_local,
            handicap_index:
              scorecard.handicap_index != null ? Number(scorecard.handicap_index) : null,
            total_gross: scorecard.total_gross || 0,
            total_net: Math.round(rawNet),
            front_nine: ida,
            back_nine: vuelta,
            vuelta_last6_gross: sumGrossStrokesHoleRange(scorecard, 13, 18),
            vuelta_last3_gross: sumGrossStrokesHoleRange(scorecard, 16, 18),
            member_number: (scorecard as any).member_number,
            club_name: (scorecard as any).club_name,
            position: 0,
          }
        })
        .sort(compareCategoryResults)
        .map((result, index) => ({
          ...result,
          position: index + 1
        }));

      results[category.id] = categoryScores;
    });

    // Regla: el ganador de Scratch (gross) no puede ganar también en 1ra banda neto
    const getIdKey = (r: CategoryResult | undefined) => {
      if (!r) return '';
      const keyName = sanitizeAscii(r.player_name || '').toLowerCase();
      const keyMat = (r.member_number || '').toString().trim().toLowerCase();
      return keyMat ? `m:${keyMat}` : `n:${keyName}`;
    };

    const scratchWinnerGeneral = results['scratch_general'] && results['scratch_general'][0];
    const scratchGeneralKey = getIdKey(scratchWinnerGeneral);
    const computeKey = (r: CategoryResult) => getIdKey(r);

    if (results['band_1'] && scratchGeneralKey) {
      results['band_1'] = results['band_1']
        .filter(r => computeKey(r) !== scratchGeneralKey)
        .map((r, idx) => ({ ...r, position: idx + 1 }));
    }

    return results;
  }, [scorecards, separateLadies, ladiesByHcp, resultsMode]);

  const getPositionDisplay = (position: number) => {
    return <span className="text-gray-900 font-bold text-lg">{position}</span>;
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando resultados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/club/${clubId}/admin?tab=tournaments`)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Resultados Finales
                </h1>
                <p className="text-sm text-gray-600">
                  {tournament?.tournament_name}
                </p>
              </div>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* Título para impresión */}
      <div className="hidden print:block text-center py-6">
        <h1 className="text-3xl font-bold text-gray-900">Resultados Finales</h1>
        <h2 className="text-xl text-gray-700 mt-2">{tournament?.tournament_name}</h2>
        <p className="text-gray-600 mt-1">
          {tournament?.start_time && new Date(tournament.start_time).toLocaleDateString('es-ES')}
        </p>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {categories.map((category, categoryIndex) => {
            const categoryResults = resultsByCategory[category.id] || [];
            const IconComponent = category.icon;
            
            if (categoryResults.length === 0) return null;

            // Determinar si esta categoría necesita una página separada
            const needsPageBreak = categoryResults.length > 12; // Más de 12 jugadores = página separada
            const shouldStartNewPage = categoryIndex > 0 && needsPageBreak;

            return (
              <div key={category.id} className={`bg-white rounded-lg shadow-lg border-2 ${category.color} overflow-hidden ${shouldStartNewPage ? 'print:break-before-page' : 'print:break-inside-avoid'}`}>
                {/* Título de torneo para páginas separadas */}
                {shouldStartNewPage && (
                  <div className="hidden print:block text-center py-6 border-b">
                    <h1 className="text-2xl font-bold text-gray-900">{tournament?.tournament_name}</h1>
                    <h2 className="text-lg text-gray-700 mt-1">Resultados Finales - {category.name}</h2>
                    <p className="text-gray-600 text-sm mt-1">
                      {tournament?.start_time && new Date(tournament.start_time).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                )}
                
                {/* Header de categoría */}
                <div className={`px-6 py-4 border-b ${category.color}`}>
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-6 w-6 text-gray-700" />
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{category.name}</h2>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                    <div className="ml-auto text-sm text-gray-600">
                      {categoryResults.length} participante{categoryResults.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Tabla de resultados */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pos</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jugador</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Neto</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">HCP</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Gross</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ida</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Vuelta</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Club</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {categoryResults.map((result, index) => {
                        const indexLabel = formatHandicapIndexForDisplay(result.handicap_index);
                        return (
                        <tr key={index} className={resultsRowHighlightClass(category.id, result.position)}>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {getPositionDisplay(result.position)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {result.player_name}
                              {indexLabel ? (
                                <span className="text-gray-600 font-normal"> ({indexLabel})</span>
                              ) : null}
                            </div>
                            {result.member_number && (
                              <div className="text-xs text-gray-500">#{result.member_number}</div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-xl font-bold text-blue-600">
                            {result.total_net}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                            {formatHcpForDisplay(
                              result.handicap_local != null ? Number(result.handicap_local) : (result.handicap_index != null ? Math.round(Number(result.handicap_index)) : null),
                              result.handicap_index
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900 font-medium">
                            {result.total_gross}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                            {result.front_nine}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                            {result.back_nine}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sanitizeAscii(result.club_name) || 'Sin club'}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* Nota al pie */}
        <div className="mt-8 text-center text-sm text-gray-500 print:mt-12">
          <p>
            Resultados por score neto (Gross − HCP; índice negativo: Gross + HCP). Empates en neto (o en gross en Scratch):
            mejor vuelta (menor golpes en la segunda mitad); si empatan, menor gross en hoyos 13–18; si empatan, en 16–18;
            si empatan, menor handicap índice; luego mejor ida y gross total. Si en un tramo (13–18 o 16–18) solo uno
            tiene todos los golpes cargados por hoyo, se lo favorece en ese paso. Ida/vuelta se ajustan al gross si falta cargar una mitad.
          </p>
          <p className="mt-1">Generado el {new Date().toLocaleDateString('es-ES')} a las {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          body { margin: 0; }
          .print\\:break-inside-avoid { break-inside: avoid; }
          .print\\:break-before-page { 
            break-before: page; 
            page-break-before: always; 
          }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:mt-12 { margin-top: 3rem !important; }
          
          /* Repetir header del torneo en cada página */
          .print\\:break-before-page::before {
            content: "";
            display: block;
            position: relative;
            top: 0;
            left: 0;
            right: 0;
            height: 80px;
            background: white;
            text-align: center;
            padding-top: 20px;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          
          /* Optimizar tamaño de tabla para impresión */
          table { font-size: 12px; }
          th, td { padding: 8px 4px !important; }
          .text-xl { font-size: 16px !important; }
          .text-lg { font-size: 14px !important; }
        }
      `}</style>
    </div>
  );
}
