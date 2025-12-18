import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Eye, Printer, Edit, Search, X } from 'lucide-react';
import { useTournamentScorecards } from '../hooks/useScorecards';

export default function ScorecardHistory() {
  const { clubId, tournamentId } = useParams<{ clubId: string; tournamentId: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
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
    error: (error as any)?.message,
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

  // Filter scorecards by search term
  const filteredScorecards = useMemo(() => {
    if (!searchTerm) return scorecards;
    
    const term = searchTerm.toLowerCase().trim();
    return scorecards.filter((scorecard: any) => {
      const playerName = (scorecard.player_name || '').toLowerCase();
      const memberNumber = (scorecard.member_number || '').toLowerCase();
      const club = (scorecard.club_name || '').toLowerCase();
      
      return playerName.includes(term) || 
             memberNumber.includes(term) || 
             club.includes(term);
    });
  }, [scorecards, searchTerm]);

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
            {(error as any)?.message || 'Error desconocido'}
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
                  {filteredScorecards.length} {filteredScorecards.length === 1 ? 'tarjeta' : 'tarjetas'} 
                  {searchTerm ? ` encontradas` : ` registradas`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, matrícula o club..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {filteredScorecards.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron tarjetas' : 'No hay tarjetas registradas'}
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? `No hay tarjetas que coincidan con "${searchTerm}"`
                : 'Las tarjetas aparecerán aquí una vez que se registren scores.'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredScorecards.map((scorecard: any, index: number) => (
              <div key={`scorecard_${index}`} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium">
                      {scorecard.player_name || `Jugador ${index + 1}`}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Total: {scorecard.total_gross || 0} golpes</span>
                      {scorecard.member_number && (
                        <span>Matrícula: {scorecard.member_number}</span>
                      )}
                      {scorecard.club_name && (
                        <span>Club: {scorecard.club_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const playerId = scorecard.member_id || scorecard.external_player_id;
                        navigate(`/club/${clubId}/tournaments/${tournamentId}/manual-entry/${playerId}`);
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                      title="Editar tarjeta"
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </button>
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