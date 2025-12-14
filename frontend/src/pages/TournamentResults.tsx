import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Medal, Award, Crown, Printer } from 'lucide-react';
import { useTournamentScorecards } from '../hooks/useScorecards';
import { useTournaments } from '../hooks/useTournaments';

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
  
  // Toggle: separar Damas o combinarlas; y opción de dividir Damas por handicap
  const [separateLadies, setSeparateLadies] = useState<boolean>((tournament as any)?.separate_ladies === 1 || (tournament as any)?.separate_ladies === true);
  const [ladiesByHcp, setLadiesByHcp] = useState<boolean>((tournament as any)?.ladies_by_hcp === 1 || (tournament as any)?.ladies_by_hcp === true);
  const resultsMode = (tournament as any)?.results_mode || 'standard';

  // Definir las categorías (dependen de separateLadies y resultsMode)
  const categories: Category[] = resultsMode === 'standard' ? [
    {
      id: 'primera',
      name: '1ra Categoría',
      description: 'HCP 0 - 7.9',
      color: 'bg-yellow-50 border-yellow-200',
      icon: Crown,
      filter: (scorecard) => {
        // Verificar que el jugador realmente tenga un HCP válido asignado
        const hcp_local = scorecard.handicap_local;
        const hcp_index = scorecard.handicap_index;
        // Si se separan damas, excluir género femenino de categorías generales
        if (separateLadies && (scorecard.gender === 'F')) return false;
        
        // Si tiene handicap_local válido, usarlo
        if (hcp_local !== null && hcp_local !== undefined && hcp_local !== '') {
          const hcp = parseFloat(hcp_local);
          return !isNaN(hcp) && hcp >= 0 && hcp <= 7.9;
        }
        
        // Si no tiene handicap_local, revisar handicap_index
        if (hcp_index !== null && hcp_index !== undefined && hcp_index !== '' && hcp_index !== '0.0' && hcp_index !== 0) {
          const hcp = parseFloat(hcp_index);
          return !isNaN(hcp) && hcp >= 0 && hcp <= 7.9;
        }
        
        return false; // No tiene HCP válido
      }
    },
    {
      id: 'segunda', 
      name: '2da Categoría',
      description: 'HCP 8 - 13.9',
      color: 'bg-blue-50 border-blue-200',
      icon: Trophy,
      filter: (scorecard) => {
        const hcp_local = scorecard.handicap_local;
        const hcp_index = scorecard.handicap_index;
        if (separateLadies && (scorecard.gender === 'F')) return false;
        
        if (hcp_local !== null && hcp_local !== undefined && hcp_local !== '') {
          const hcp = parseFloat(hcp_local);
          return !isNaN(hcp) && hcp >= 8 && hcp <= 13.9;
        }
        
        if (hcp_index !== null && hcp_index !== undefined && hcp_index !== '' && hcp_index !== '0.0' && hcp_index !== 0) {
          const hcp = parseFloat(hcp_index);
          return !isNaN(hcp) && hcp >= 8 && hcp <= 13.9;
        }
        
        return false;
      }
    },
    {
      id: 'tercera',
      name: '3ra Categoría', 
      description: 'HCP 14 - 21.9',
      color: 'bg-green-50 border-green-200',
      icon: Medal,
      filter: (scorecard) => {
        const hcp_local = scorecard.handicap_local;
        const hcp_index = scorecard.handicap_index;
        if (separateLadies && (scorecard.gender === 'F')) return false;
        
        if (hcp_local !== null && hcp_local !== undefined && hcp_local !== '') {
          const hcp = parseFloat(hcp_local);
          return !isNaN(hcp) && hcp >= 14 && hcp <= 21.9;
        }
        
        if (hcp_index !== null && hcp_index !== undefined && hcp_index !== '' && hcp_index !== '0.0' && hcp_index !== 0) {
          const hcp = parseFloat(hcp_index);
          return !isNaN(hcp) && hcp >= 14 && hcp <= 21.9;
        }
        
        return false;
      }
    },
    {
      id: 'cuarta',
      name: '4ta Categoría',
      description: 'HCP 22 - 53.9', 
      color: 'bg-purple-50 border-purple-200',
      icon: Award,
      filter: (scorecard) => {
        const hcp_local = scorecard.handicap_local;
        const hcp_index = scorecard.handicap_index;
        if (separateLadies && (scorecard.gender === 'F')) return false;
        
        if (hcp_local !== null && hcp_local !== undefined && hcp_local !== '') {
          const hcp = parseFloat(hcp_local);
          return !isNaN(hcp) && hcp >= 22 && hcp <= 53.9;
        }
        
        if (hcp_index !== null && hcp_index !== undefined && hcp_index !== '' && hcp_index !== '0.0' && hcp_index !== 0) {
          const hcp = parseFloat(hcp_index);
          return !isNaN(hcp) && hcp >= 22 && hcp <= 53.9;
        }
        
        return false;
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
              const hl = s.handicap_local, hi = s.handicap_index
              if (hl !== null && hl !== undefined && hl !== '') { const h = parseFloat(hl); return !isNaN(h) && h >= 0 && h <= 7.9 }
              if (hi !== null && hi !== undefined && hi !== '' && hi !== '0.0' && hi !== 0) { const h = parseFloat(hi); return !isNaN(h) && h >= 0 && h <= 7.9 }
              return false
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
              const hl = s.handicap_local, hi = s.handicap_index
              if (hl !== null && hl !== undefined && hl !== '') { const h = parseFloat(hl); return !isNaN(h) && h >= 8 && h <= 13.9 }
              if (hi !== null && hi !== undefined && hi !== '' && hi !== '0.0' && hi !== 0) { const h = parseFloat(hi); return !isNaN(h) && h >= 8 && h <= 13.9 }
              return false
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
              const hl = s.handicap_local, hi = s.handicap_index
              if (hl !== null && hl !== undefined && hl !== '') { const h = parseFloat(hl); return !isNaN(h) && h >= 14 && h <= 21.9 }
              if (hi !== null && hi !== undefined && hi !== '' && hi !== '0.0' && hi !== 0) { const h = parseFloat(hi); return !isNaN(h) && h >= 14 && h <= 21.9 }
              return false
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
              const hl = s.handicap_local, hi = s.handicap_index
              if (hl !== null && hl !== undefined && hl !== '') { const h = parseFloat(hl); return !isNaN(h) && h >= 22 && h <= 53.9 }
              if (hi !== null && hi !== undefined && hi !== '' && hi !== '0.0' && hi !== 0) { const h = parseFloat(hi); return !isNaN(h) && h >= 22 && h <= 53.9 }
              return false
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
        const hcp_local = scorecard.handicap_local;
        const hcp_index = scorecard.handicap_index;
        
        // No tiene handicap_local válido
        const noHcpLocal = hcp_local === null || hcp_local === undefined || hcp_local === '';
        
        // No tiene handicap_index válido (0 y '0.0' son válidos - scratch)
        const noHcpIndex = hcp_index === null || hcp_index === undefined || hcp_index === '';
        
        return noHcpLocal && noHcpIndex;
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
    // scratch mode: agregar categoría Scratch (gross)
    ...(separateLadies ? [] : [{
      id: 'scratch_general',
      name: 'Scratch (Gross)',
      description: 'Clasificación por golpes (sin HCP)',
      color: 'bg-yellow-50 border-yellow-200',
      icon: Crown,
      filter: (_s: any) => true
    } as Category]),
    // Si se separan damas, scratch exclusivo damas
    ...(separateLadies ? [{
      id: 'scratch_damas',
      name: 'Damas Scratch (Gross)',
      description: 'Clasificación por golpes (sin HCP)',
      color: 'bg-pink-50 border-pink-200',
      icon: Crown,
      filter: (s: any) => s.gender === 'F'
    } as Category] : []),
    // Bandas de HCP: -5–7.9, 8–15.8, 15.9–54 (excluir damas si se separan)
    {
      id: 'band_1',
      name: 'HCP -5 a 7.9',
      description: 'Clasificación por neto dentro de banda',
      color: 'bg-blue-50 border-blue-200',
      icon: Trophy,
      filter: (s: any) => {
        if (separateLadies && s.gender === 'F') return false
        const hl = s.handicap_local, hi = s.handicap_index
        const val = hl !== null && hl !== undefined && hl !== '' ? parseFloat(hl) : (hi !== null && hi !== undefined && hi !== '' ? parseFloat(hi) : NaN)
        return !isNaN(val) && val >= -5 && val <= 7.9
      }
    },
    {
      id: 'band_2',
      name: 'HCP 8 a 15.8',
      description: 'Clasificación por neto dentro de banda',
      color: 'bg-green-50 border-green-200',
      icon: Medal,
      filter: (s: any) => {
        if (separateLadies && s.gender === 'F') return false
        const hl = s.handicap_local, hi = s.handicap_index
        const val = hl !== null && hl !== undefined && hl !== '' ? parseFloat(hl) : (hi !== null && hi !== undefined && hi !== '' ? parseFloat(hi) : NaN)
        return !isNaN(val) && val >= 8 && val <= 15.8
      }
    },
    {
      id: 'band_3',
      name: 'HCP 15.9 a 54',
      description: 'Clasificación por neto dentro de banda',
      color: 'bg-purple-50 border-purple-200',
      icon: Award,
      filter: (s: any) => {
        if (separateLadies && s.gender === 'F') return false
        const hl = s.handicap_local, hi = s.handicap_index
        const val = hl !== null && hl !== undefined && hl !== '' ? parseFloat(hl) : (hi !== null && hi !== undefined && hi !== '' ? parseFloat(hi) : NaN)
        return !isNaN(val) && val >= 15.9 && val <= 54
      }
    },
    // Damas por bandas si corresponde
    ...(separateLadies && ladiesByHcp ? [
      {
        id: 'damas_band_1',
        name: 'Damas HCP -5 a 7.9',
        description: 'Femenino por neto',
        color: 'bg-pink-50 border-pink-200',
        icon: Trophy,
        filter: (s: any) => {
          if (s.gender !== 'F') return false
          const hl = s.handicap_local, hi = s.handicap_index
          const val = hl !== null && hl !== undefined && hl !== '' ? parseFloat(hl) : (hi !== null && hi !== undefined && hi !== '' ? parseFloat(hi) : NaN)
          return !isNaN(val) && val >= -5 && val <= 7.9
        }
      } as Category,
      {
        id: 'damas_band_2',
        name: 'Damas HCP 8 a 15.8',
        description: 'Femenino por neto',
        color: 'bg-pink-50 border-pink-200',
        icon: Medal,
        filter: (s: any) => {
          if (s.gender !== 'F') return false
          const hl = s.handicap_local, hi = s.handicap_index
          const val = hl !== null && hl !== undefined && hl !== '' ? parseFloat(hl) : (hi !== null && hi !== undefined && hi !== '' ? parseFloat(hi) : NaN)
          return !isNaN(val) && val >= 8 && val <= 15.8
        }
      } as Category,
      {
        id: 'damas_band_3',
        name: 'Damas HCP 15.9 a 54',
        description: 'Femenino por neto',
        color: 'bg-pink-50 border-pink-200',
        icon: Award,
        filter: (s: any) => {
          if (s.gender !== 'F') return false
          const hl = s.handicap_local, hi = s.handicap_index
          const val = hl !== null && hl !== undefined && hl !== '' ? parseFloat(hl) : (hi !== null && hi !== undefined && hi !== '' ? parseFloat(hi) : NaN)
          return !isNaN(val) && val >= 15.9 && val <= 54
        }
      } as Category
    ] : [])
    ,
    // Listado de jugadores sin HCP (para scratch_bands también)
    {
      id: 'no_hcp',
      name: 'Sin HCP',
      description: 'Jugadores sin Handicap',
      color: 'bg-gray-50 border-gray-200',
      icon: Award,
      filter: (s: any) => {
        const hl = s.handicap_local
        const hi = s.handicap_index
        const noLocal = hl === null || hl === undefined || hl === ''
        const noIndex = hi === null || hi === undefined || hi === ''
        return noLocal && noIndex
      }
    } as Category
  ];

  // Procesar los resultados por categoría
  const resultsByCategory = useMemo(() => {
    if (!scorecards) return {};

    const results: { [key: string]: CategoryResult[] } = {};

    categories.forEach(category => {
      const categoryScores = scorecards
        .filter(category.filter)
        .map(scorecard => ({
          player_name: scorecard.player_name,
          player_type: (scorecard as any).player_type || 'member',
          handicap_local: (scorecard as any).handicap_local,
          handicap_index: scorecard.handicap_index || null,
          total_gross: scorecard.total_gross || 0,
          // Calcular neto: si hay handicap_local usar redondeado; si no, usar index tal cual (puede ser negativo)
          total_net: (() => {
            // En categorías scratch, ordenar por gross: usamos gross como "neto" para el sort
            if (category.id.startsWith('scratch')) {
              return scorecard.total_gross || 0
            }
            return (scorecard.total_gross || 0) - (
              (scorecard as any).handicap_local !== null && (scorecard as any).handicap_local !== undefined
                ? Math.round((scorecard as any).handicap_local)
                : Math.round(scorecard.handicap_index || 0)
            )
          })(),
          front_nine: scorecard.front_nine || 0,
          back_nine: scorecard.back_nine || 0,
          member_number: (scorecard as any).member_number,
          club_name: (scorecard as any).club_name,
          position: 0
        }))
        .sort((a, b) => a.total_net - b.total_net) // Ordenar por score neto (menor es mejor)
        .map((result, index) => ({
          ...result,
          position: index + 1
        }));

      results[category.id] = categoryScores;
    });

    // Regla: el ganador de Scratch no puede ganar en HCP -5 a 7.9
    // - General: excluir ganador de 'scratch_general' de 'band_1'
    // - Damas: excluir ganador de 'scratch_damas' de 'damas_band_1'
    const getIdKey = (r: CategoryResult | undefined) => {
      if (!r) return '';
      const keyName = sanitizeAscii(r.player_name || '').toLowerCase();
      const keyMat = (r.member_number || '').toString().trim().toLowerCase();
      return keyMat ? `m:${keyMat}` : `n:${keyName}`;
    };

    const scratchWinnerGeneral = results['scratch_general'] && results['scratch_general'][0];
    const scratchWinnerLadies = results['scratch_damas'] && results['scratch_damas'][0];

    const scratchGeneralKey = getIdKey(scratchWinnerGeneral);
    const scratchLadiesKey = getIdKey(scratchWinnerLadies);

    const computeKey = (r: CategoryResult) => getIdKey(r);

    if (results['band_1'] && scratchGeneralKey) {
      results['band_1'] = results['band_1']
        .filter(r => computeKey(r) !== scratchGeneralKey)
        .map((r, idx) => ({ ...r, position: idx + 1 }));
    }

    if (results['damas_band_1'] && scratchLadiesKey) {
      results['damas_band_1'] = results['damas_band_1']
        .filter(r => computeKey(r) !== scratchLadiesKey)
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
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Separar Damas</label>
                <input
                  type="checkbox"
                  checked={separateLadies}
                  onChange={(e) => setSeparateLadies(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  title="Mostrar categoría Damas aparte"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Damas por handicap</label>
                <input
                  type="checkbox"
                  checked={ladiesByHcp}
                  onChange={(e) => setLadiesByHcp(e.target.checked)}
                  disabled={!separateLadies}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded disabled:opacity-50"
                  title="Dividir Damas en categorías por HCP"
                />
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
                      {categoryResults.map((result, index) => (
                        <tr key={index} className={`${index < 3 ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {getPositionDisplay(result.position)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{result.player_name}</div>
                            {result.member_number && (
                              <div className="text-xs text-gray-500">#{result.member_number}</div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-xl font-bold text-blue-600">
                            {result.total_net}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                            {(() => {
                              const hl = result.handicap_local
                              const hi = result.handicap_index
                              if (hl !== null && hl !== undefined) return Math.round(Number(hl))
                              if (hi !== null && hi !== undefined) return Math.round(Number(hi))
                              return 'N/A'
                            })()}
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* Nota al pie */}
        <div className="mt-8 text-center text-sm text-gray-500 print:mt-12">
          <p>Resultados ordenados por score neto (Total Gross - HCP)</p>
          <p className="mt-1">Generado el {new Date().toLocaleDateString('es-ES')} a las {new Date().toLocaleTimeString('es-ES')}</p>
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
