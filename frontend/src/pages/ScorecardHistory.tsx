import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Eye, Printer } from 'lucide-react';
import { useTournamentScorecards } from '../hooks/useScorecards';

export default function ScorecardHistory() {
  const { clubId, tournamentId } = useParams<{ clubId: string; tournamentId: string }>();
  const navigate = useNavigate();
  
  const {
    data: scorecards = [],
    isLoading,
    error,
    refetch
  } = useTournamentScorecards(
    parseInt(clubId || '0'),
    parseInt(tournamentId || '0')
  );

  // Debug logging
  console.log('🔍 ScorecardHistory Debug:', {
    clubId,
    tournamentId,
    isLoading,
    error: error?.message,
    scorecards: scorecards?.length,
    data: scorecards
  });

  // Force refresh on mount to clear any cached errors
  useEffect(() => {
    if (clubId && tournamentId) {
      console.log('🔄 Forcing scorecard refresh...')
      refetch()
    }
  }, [clubId, tournamentId, refetch]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando historial de tarjetas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('❌ ScorecardHistory Error:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error al cargar el historial</p>
          <p className="text-sm text-gray-600 mb-4">
            {error.message || 'Error desconocido'}
          </p>
          <div className="space-x-4">
            <button
              onClick={() => {
                console.log('🔄 Manual refetch triggered');
                refetch();
              }}
              className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
            >
              Recargar Página
            </button>
          </div>
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
                onClick={() => navigate(`/club/${clubId}/admin`)}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Volver
              </button>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  Historial de Tarjetas
                </h1>
                <p className="text-sm text-gray-600">
                  {scorecards.length} tarjetas registradas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {scorecards.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay tarjetas registradas
            </h3>
            <p className="text-gray-600">
              Las tarjetas aparecerán aquí una vez que se registren scores.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {scorecards.length} tarjetas encontradas
            </h3>
            {scorecards.map((scorecard: any, index: number) => (
              <div key={`scorecard_${index}`} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium">
                      {scorecard.player_name || `Jugador ${index + 1}`}
                    </h4>
                    <p className="text-gray-600">
                      Total: {scorecard.total_gross || 0} golpes
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/club/${clubId}/tournaments/${tournamentId}/scorecard/${scorecard.scorecard_id}`)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                      title="Ver detalle"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/club/${clubId}/tournaments/${tournamentId}/scorecard/${scorecard.scorecard_id}/print`)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                      title="Imprimir"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}