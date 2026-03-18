import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useGetScorecardForPrint } from '../hooks/useScorecards';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { formatHcpForDisplay } from '@/utils/scoreUtils';

export default function PrintableScorecard() {
  const { clubId, tournamentId, scorecardId } = useParams<{ 
    clubId: string; 
    tournamentId: string; 
    scorecardId: string; 
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const {
    data: scorecard,
    isLoading,
    error
  } = useGetScorecardForPrint(
    parseInt(clubId || '0'),
    parseInt(tournamentId || '0'),
    parseInt(scorecardId || '0')
  );

  // Obtener datos de los hoyos del club
  const { data: courseHoles } = useQuery({
    queryKey: ['course-holes', clubId],
    queryFn: async () => {
      const response = await fetch(`/api/club/${clubId}/holes`)
      if (!response.ok) {
        throw new Error('Error al cargar los hoyos')
      }
      const result = await response.json()
      return result.data
    },
    enabled: !!clubId
  });

  const handlePrint = () => {
    window.print();
  };

  // Auto-print when autoprint parameter is present
  useEffect(() => {
    const shouldAutoPrint = searchParams.get('autoprint') === 'true';
    if (shouldAutoPrint && scorecard && !isLoading) {
      // Wait a bit for the page to fully render, then print and close
      const timer = setTimeout(() => {
        window.print();
        // Close the window after printing
        setTimeout(() => {
          window.close();
        }, 1000);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, scorecard, isLoading]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Net = Gross − HCP; si índice negativo, Net = Gross + HCP
  const calculateNetScore = () => {
    if (!scorecard) return 0;
    const totalGross = scorecard.total_gross || 0;
    const hcp = Math.round(scorecard.handicap_local) || 0;
    const idx = scorecard.handicap_index != null ? Number(scorecard.handicap_index) : null;
    if (idx !== null && !Number.isNaN(idx) && idx < 0) return totalGross + hcp;
    return totalGross - hcp;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tarjeta para imprimir...</p>
        </div>
      </div>
    );
  }

  if (error || !scorecard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error al cargar la tarjeta</p>
          <button
            onClick={() => navigate(`/club/${clubId}/tournaments/${tournamentId}/scorecards`)}
            className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
          >
            Volver al Historial
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * { visibility: hidden; }
            #printable-scorecard, #printable-scorecard * { visibility: visible; }
            #printable-scorecard { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%; 
              background: white !important;
            }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .bg-green-600 { background: #f3f4f6 !important; color: black !important; border: 2px solid black !important; }
            .text-white { color: black !important; }
            .text-green-100 { color: #374151 !important; }
            .bg-gray-50 { background: white !important; }
            .shadow-lg { box-shadow: none !important; }
            @page { 
              margin: 0.8cm; 
              size: A4;
            }
            #printable-scorecard {
              page-break-after: avoid;
              height: auto;
              max-height: 100vh;
            }
            .bg-white.rounded-lg.shadow-lg {
              box-shadow: none !important;
              page-break-inside: avoid;
            }
            .grid { 
              display: grid !important; 
            }
            .grid-cols-3 { 
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important; 
            }
            .print\\:gap-2 { gap: 0.5rem !important; }
            .print\\:p-2 { padding: 0.5rem !important; }
            .print\\:text-sm { font-size: 0.875rem !important; }
            .print\\:text-lg { font-size: 1.125rem !important; }
            .print\\:text-xs { font-size: 0.75rem !important; }
            /* Reduce spacing to fit in one page */
            .space-y-6 { margin-top: 0 !important; margin-bottom: 0 !important; }
            .space-y-6 > * + * { margin-top: 1rem !important; }
            .py-4 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
            .py-6 { padding-top: 1rem !important; padding-bottom: 1rem !important; }
            .mb-2 { margin-bottom: 0.25rem !important; }
            .mt-2 { margin-top: 0.25rem !important; }
            .mt-3 { margin-top: 0.5rem !important; }
            .mt-4 { margin-top: 0.5rem !important; }
          }
          .print-only { display: none; }
        `
      }} />

      <div className="min-h-screen bg-gray-50">
        {/* Navigation Header - No Print */}
        <div className={`no-print bg-white shadow-sm border-b ${searchParams.get('autoprint') === 'true' ? 'hidden' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(`/club/${clubId}/tournaments/${tournamentId}/scorecard/${scorecardId}`)}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Volver al Detalle
                </button>
                <div className="border-l border-gray-300 pl-4">
                  <h1 className="text-xl font-semibold text-gray-900">
                    Vista de Impresión
                  </h1>
                  <p className="text-sm text-gray-600">
                    Tarjeta #{scorecard.scorecard_id}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </button>
            </div>
          </div>
        </div>

        {/* Printable Scorecard */}
        <div id="printable-scorecard" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-200">
            {/* Scorecard Header */}
            <div className="bg-green-600 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold">{scorecard.tournament_name || 'Torneo de Golf'}</h1>
                  <p className="text-green-100">{formatDate(scorecard.tournament_date || scorecard.created_at)}</p>
                </div>
                {scorecard.logo_url && (
                  <img src={scorecard.logo_url} alt="Club Logo" className="h-12 w-12 object-contain" />
                )}
              </div>
            </div>

            {/* Player Information */}
            <div className="px-6 py-4 bg-gray-50 border-b">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{scorecard.player_name}</h3>
                  <p className="text-sm text-gray-600">
                    {scorecard.member_number ? `Matrícula: ${scorecard.member_number}` : 'Jugador Invitado'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Index: 
                    <span className="font-semibold text-gray-900 ml-1">
                      {scorecard.handicap_index || 'N/A'}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">HCP: 
                    <span className="font-semibold text-gray-900 ml-1">
                      {formatHcpForDisplay(scorecard.handicap_local, scorecard.handicap_index)}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{scorecard.course_name}</p>
                  <p className="text-sm text-gray-600">{scorecard.club_name}</p>
                </div>
              </div>
            </div>

            {/* Scorecard Grid - Traditional Golf Style */}
            <div className="p-6">
              {scorecard.hole_scores && Object.keys(scorecard.hole_scores).length > 0 ? (
                <div className="space-y-6">
                  {/* Front 9 */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">IDA (Front 9)</h4>
                    <div className="grid grid-cols-10 gap-1 text-sm">
                      {/* Headers */}
                      <div className="font-semibold text-center py-2 bg-gray-100 border border-gray-300">Hoyo</div>
                      {[1,2,3,4,5,6,7,8,9].map(hole => (
                        <div key={hole} className="font-semibold text-center py-2 bg-gray-100 border border-gray-300">{hole}</div>
                      ))}
                      
                      {/* Par */}
                      <div className="font-semibold text-center py-2 bg-green-50 border border-gray-300">Par</div>
                      {[1,2,3,4,5,6,7,8,9].map(hole => {
                        const holeData = courseHoles?.find((h: any) => h.hole_number === hole);
                        return (
                          <div key={hole} className="text-center py-2 border border-gray-300 bg-green-50">
                            {holeData?.par || 4}
                          </div>
                        );
                      })}
                      
                      {/* Handicap */}
                      <div className="font-semibold text-center py-2 bg-yellow-50 border border-gray-300">HCP</div>
                      {[1,2,3,4,5,6,7,8,9].map(hole => {
                        const holeData = courseHoles?.find((h: any) => h.hole_number === hole);
                        return (
                          <div key={hole} className="text-center py-2 border border-gray-300 bg-yellow-50 text-xs">
                            {holeData?.handicap || hole}
                          </div>
                        );
                      })}
                      
                      {/* Strokes */}
                      <div className="font-semibold text-center py-2 bg-blue-50 border border-gray-300">Golpes</div>
                      {[1,2,3,4,5,6,7,8,9].map(hole => (
                        <div key={hole} className="text-center py-2 border border-gray-300 bg-white font-semibold">
                          {scorecard.hole_scores[hole] || '-'}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-sm text-gray-600">Total IDA: </span>
                      <span className="text-lg font-bold text-blue-600">{scorecard.front_nine || 0}</span>
                    </div>
                  </div>

                  {/* Back 9 */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">VUELTA (Back 9)</h4>
                    <div className="grid grid-cols-10 gap-1 text-sm">
                      {/* Headers */}
                      <div className="font-semibold text-center py-2 bg-gray-100 border border-gray-300">Hoyo</div>
                      {[10,11,12,13,14,15,16,17,18].map(hole => (
                        <div key={hole} className="font-semibold text-center py-2 bg-gray-100 border border-gray-300">{hole}</div>
                      ))}
                      
                      {/* Par */}
                      <div className="font-semibold text-center py-2 bg-green-50 border border-gray-300">Par</div>
                      {[10,11,12,13,14,15,16,17,18].map(hole => {
                        const holeData = courseHoles?.find((h: any) => h.hole_number === hole);
                        return (
                          <div key={hole} className="text-center py-2 border border-gray-300 bg-green-50">
                            {holeData?.par || 4}
                          </div>
                        );
                      })}
                      
                      {/* Handicap */}
                      <div className="font-semibold text-center py-2 bg-yellow-50 border border-gray-300">HCP</div>
                      {[10,11,12,13,14,15,16,17,18].map(hole => {
                        const holeData = courseHoles?.find((h: any) => h.hole_number === hole);
                        return (
                          <div key={hole} className="text-center py-2 border border-gray-300 bg-yellow-50 text-xs">
                            {holeData?.handicap || hole}
                          </div>
                        );
                      })}
                      
                      {/* Strokes */}
                      <div className="font-semibold text-center py-2 bg-blue-50 border border-gray-300">Golpes</div>
                      {[10,11,12,13,14,15,16,17,18].map(hole => (
                        <div key={hole} className="text-center py-2 border border-gray-300 bg-white font-semibold">
                          {scorecard.hole_scores[hole] || '-'}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-sm text-gray-600">Total VUELTA: </span>
                      <span className="text-lg font-bold text-blue-600">{scorecard.back_nine || 0}</span>
                    </div>
                  </div>

                  {/* Total Scores - Horizontal Layout for Print */}
                  <div className="border-t-2 border-gray-300 pt-4">
                    <div className="grid grid-cols-3 gap-4 print:gap-2">
                      {/* Total Gross */}
                      <div className="bg-green-50 p-3 rounded text-center border border-gray-300 print:p-2">
                        <h4 className="text-base font-semibold text-gray-900 print:text-sm">TOTAL GROSS</h4>
                        <div className="text-xl font-bold text-green-600 mt-1 print:text-lg">{scorecard.total_gross || 0}</div>
                        <div className="text-xs text-gray-600">golpes</div>
                      </div>

                      {/* HCP Local */}
                      <div className="bg-blue-50 p-3 rounded text-center border border-gray-300 print:p-2">
                        <h4 className="text-base font-semibold text-gray-900 print:text-sm">HCP LOCAL</h4>
                        <div className="text-xl font-bold text-blue-600 mt-1 print:text-lg">{formatHcpForDisplay(scorecard.handicap_local, scorecard.handicap_index)}</div>
                        <div className="text-xs text-gray-600">golpes</div>
                      </div>

                      {/* Total Net */}
                      <div className="bg-yellow-50 p-3 rounded text-center border-2 border-yellow-400 print:p-2">
                        <h4 className="text-base font-semibold text-gray-900 print:text-sm">TOTAL NETO</h4>
                        <div className="text-xl font-bold text-yellow-600 mt-1 print:text-lg">{calculateNetScore()}</div>
                        <div className="text-xs text-gray-600">golpes netos</div>
                      </div>
                    </div>
                    
                    {/* Additional Info */}
                    <div className="mt-3 text-center text-xs text-gray-600 print:text-xs">
                      <p>{formatDate(scorecard.created_at)} • {scorecard.entry_method || 'Manual'}</p>
                      <p className="mt-1">Index: {scorecard.handicap_index ?? 0} • Cálculo: {scorecard.total_gross || 0} {(scorecard.handicap_index != null && Number(scorecard.handicap_index) < 0) ? '+' : '−'} {Math.abs(Math.round(scorecard.handicap_local) || 0)} = {calculateNetScore()}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No hay scores registrados para esta tarjeta</p>
                </div>
              )}
            </div>

            {/* Signatures Section */}
            <div className="px-6 py-4 bg-gray-50 border-t">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Firma del Jugador:</p>
                  <div className="border-b-2 border-gray-400 h-12 mt-4"></div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Firma del Marcador:</p>
                  <div className="border-b-2 border-gray-400 h-12 mt-4"></div>
                </div>
              </div>
              {scorecard.entry_notes && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Notas:</span> {scorecard.entry_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}