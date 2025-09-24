import { useState, useMemo } from 'react';
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
  
  // Definir las categorías
  const categories: Category[] = [
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
    {
      id: 'damas',
      name: 'Damas',
      description: 'Categoría Femenina',
      color: 'bg-pink-50 border-pink-200', 
      icon: Crown,
      filter: (scorecard) => {
        // Asumiendo que hay un campo gender o se puede determinar por otros medios
        // Por ahora usaremos una lógica temporal
        return scorecard.gender === 'F' || scorecard.category === 'damas';
      }
    },
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
        
        // No tiene handicap_index válido (incluyendo '0.0' que indica sin HCP)
        const noHcpIndex = hcp_index === null || hcp_index === undefined || hcp_index === '' || hcp_index === '0.0' || hcp_index === 0;
        
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
          player_type: scorecard.player_type || 'member',
          handicap_local: scorecard.handicap_local,
          handicap_index: scorecard.handicap_index,
          total_gross: scorecard.total_gross || 0,
          total_net: (scorecard.total_gross || 0) - Math.round(scorecard.handicap_local || scorecard.handicap_index || 0),
          front_nine: scorecard.front_nine || 0,
          back_nine: scorecard.back_nine || 0,
          member_number: scorecard.member_number,
          club_name: scorecard.club_name,
          position: 0
        }))
        .sort((a, b) => a.total_net - b.total_net) // Ordenar por score neto (menor es mejor)
        .map((result, index) => ({
          ...result,
          position: index + 1
        }));

      results[category.id] = categoryScores;
    });

    return results;
  }, [scorecards]);

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
          {tournament?.start_date && new Date(tournament.start_date).toLocaleDateString('es-ES')}
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
                      {tournament?.start_date && new Date(tournament.start_date).toLocaleDateString('es-ES')}
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
                            {Math.round(result.handicap_local || result.handicap_index || 0)}
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
                            {result.club_name || 'Sin club'}
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
