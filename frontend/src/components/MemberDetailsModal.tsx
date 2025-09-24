import { useState, useEffect } from 'react';
import { X, Trophy, FileText, TrendingUp, User, Phone, Mail, Calendar, Award } from 'lucide-react';
import type { Member } from '@/types/member';

interface Tournament {
  tournament_id: number;
  tournament_name: string;
  start_date: string;
  end_date: string;
  status: string;
  position?: number;
  total_score?: number;
  participation_date: string;
}

interface Scorecard {
  scorecard_id: number;
  tournament_name: string;
  date: string;
  total_gross: number;
  front_nine: number;
  back_nine: number;
  holes_completed: number;
}

interface HandicapHistory {
  date: string;
  handicap_index: number;
  handicap_local: number;
  tournament_name?: string;
}

interface MemberDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  clubId: number;
}

export function MemberDetailsModal({ isOpen, onClose, member, clubId }: MemberDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'tournaments' | 'scorecards' | 'handicap'>('info');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [handicapHistory, setHandicapHistory] = useState<HandicapHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && member) {
      loadMemberData();
    }
  }, [isOpen, member, clubId]);

  const loadMemberData = async () => {
    if (!member) return;
    
    setLoading(true);
    try {
      // Cargar datos en paralelo
      const [tournamentsRes, scorecardsRes, handicapRes] = await Promise.allSettled([
        fetch(`/api/club/${clubId}/members/${member.member_id}/tournaments`),
        fetch(`/api/club/${clubId}/members/${member.member_id}/scorecards`),
        fetch(`/api/club/${clubId}/members/${member.member_id}/handicap-history`)
      ]);

      // Procesar torneos
      if (tournamentsRes.status === 'fulfilled' && tournamentsRes.value.ok) {
        const tournamentsData = await tournamentsRes.value.json();
        setTournaments(tournamentsData.data || []);
      }

      // Procesar scorecards
      if (scorecardsRes.status === 'fulfilled' && scorecardsRes.value.ok) {
        const scorecardsData = await scorecardsRes.value.json();
        setScorecards(scorecardsData.data || []);
      }

      // Procesar historial de handicap
      if (handicapRes.status === 'fulfilled' && handicapRes.value.ok) {
        const handicapData = await handicapRes.value.json();
        setHandicapHistory(handicapData.data || []);
      }
    } catch (error) {
      console.error('Error loading member data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'active': { text: 'Activo', className: 'bg-green-100 text-green-800' },
      'completed': { text: 'Completado', className: 'bg-blue-100 text-blue-800' },
      'upcoming': { text: 'Próximo', className: 'bg-yellow-100 text-yellow-800' },
      'cancelled': { text: 'Cancelado', className: 'bg-red-100 text-red-800' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { text: status, className: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.text}
      </span>
    );
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="w-8 h-8 text-gray-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {member.first_name} {member.last_name}
                </h2>
                <p className="text-sm text-gray-500">
                  Miembro desde {formatDate(member.created_at || '')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'info', label: 'Información', icon: User },
              { id: 'tournaments', label: 'Torneos', icon: Trophy },
              { id: 'scorecards', label: 'Tarjetas', icon: FileText },
              { id: 'handicap', label: 'Evolución HCP', icon: TrendingUp }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-3 text-gray-600">Cargando datos...</span>
            </div>
          ) : (
            <>
              {/* Información básica */}
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Datos Personales</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <User className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Nombre Completo</p>
                            <p className="text-sm text-gray-500">{member.first_name} {member.last_name}</p>
                          </div>
                        </div>
                        
                        {member.email && (
                          <div className="flex items-center space-x-3">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Email</p>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                          </div>
                        )}
                        
                        {member.phone && (
                          <div className="flex items-center space-x-3">
                            <Phone className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Teléfono</p>
                              <p className="text-sm text-gray-500">{member.phone}</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Estado</p>
                            <p className="text-sm text-gray-500">{getStatusBadge(member.membership_status)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Información de Golf</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Award className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Handicap Index</p>
                            <p className="text-sm text-gray-500">{member.handicap_index || 'No definido'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <TrendingUp className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">HCP Local</p>
                            <p className="text-sm text-gray-500">{member.handicap_local || 'No definido'}</p>
                          </div>
                        </div>
                        
                        {member.member_number && (
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Número de Socio</p>
                              <p className="text-sm text-gray-500">{member.member_number}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {member.notes && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Notas</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-700">{member.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Torneos */}
              {activeTab === 'tournaments' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Torneos Participados</h3>
                  {tournaments.length > 0 ? (
                    <div className="space-y-3">
                      {tournaments.map((tournament) => (
                        <div key={tournament.tournament_id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{tournament.tournament_name}</h4>
                              <p className="text-sm text-gray-500">
                                {formatDate(tournament.start_date)} - {formatDate(tournament.end_date)}
                              </p>
                              {tournament.position && (
                                <p className="text-sm font-medium text-blue-600">
                                  Posición: {tournament.position}°
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {getStatusBadge(tournament.status)}
                              {tournament.total_score && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Score: {tournament.total_score}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                      <h4 className="mt-2 text-sm font-medium text-gray-900">Sin torneos registrados</h4>
                      <p className="mt-1 text-sm text-gray-500">
                        Este socio aún no ha participado en torneos.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Scorecards */}
              {activeTab === 'scorecards' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Tarjetas Guardadas</h3>
                  {scorecards.length > 0 ? (
                    <div className="space-y-3">
                      {scorecards.map((scorecard) => (
                        <div key={scorecard.scorecard_id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{scorecard.tournament_name}</h4>
                              <p className="text-sm text-gray-500">{formatDate(scorecard.date)}</p>
                              <p className="text-sm text-gray-500">
                                Hoyos completados: {scorecard.holes_completed}/18
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-gray-900">{scorecard.total_gross}</p>
                              <p className="text-sm text-gray-500">
                                Ida: {scorecard.front_nine} | Vuelta: {scorecard.back_nine}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h4 className="mt-2 text-sm font-medium text-gray-900">Sin tarjetas guardadas</h4>
                      <p className="mt-1 text-sm text-gray-500">
                        No hay tarjetas de score registradas para este socio.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Evolución Handicap */}
              {activeTab === 'handicap' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Evolución del Handicap</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900">Index Actual</h4>
                      <p className="text-2xl font-bold text-blue-600">{member.handicap_index || '0.0'}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-medium text-green-900">HCP Local Actual</h4>
                      <p className="text-2xl font-bold text-green-600">{member.handicap_local || '0'}</p>
                    </div>
                  </div>
                  
                  {handicapHistory.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Historial de Cambios</h4>
                      {handicapHistory.map((entry, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{formatDate(entry.date)}</p>
                              {entry.tournament_name && (
                                <p className="text-sm text-gray-500">{entry.tournament_name}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-900">
                                Index: <span className="font-medium">{entry.handicap_index}</span>
                              </p>
                              <p className="text-sm text-gray-900">
                                HCP: <span className="font-medium">{entry.handicap_local}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                      <h4 className="mt-2 text-sm font-medium text-gray-900">Sin historial</h4>
                      <p className="mt-1 text-sm text-gray-500">
                        No hay cambios registrados en el handicap.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
