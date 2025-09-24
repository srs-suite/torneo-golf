import React from 'react';
import { AlertTriangle, User, MapPin, Hash, Trophy } from 'lucide-react';

interface DuplicatePlayer {
  external_id: number;
  full_name: string;
  member_number?: string;
  home_club: string;
  club_name: string;
  handicap_index?: number;
  handicap_local?: number;
  email?: string;
  phone?: string;
}

interface DuplicatePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseExisting: (player: DuplicatePlayer) => void;
  onCreateNew: () => void;
  playerData: {
    full_name: string;
    member_number?: string;
    home_club?: string;
  };
  duplicates: {
    byMatricula: DuplicatePlayer | null;
    byNameAndClub: DuplicatePlayer[];
  };
}

export default function DuplicatePlayerModal({
  isOpen,
  onClose,
  onUseExisting,
  onCreateNew,
  playerData,
  duplicates
}: DuplicatePlayerModalProps) {
  if (!isOpen) return null;

  const { byMatricula, byNameAndClub } = duplicates;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Posibles Jugadores Duplicados
            </h2>
            <p className="text-gray-600">
              Encontramos jugadores similares en el sistema
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Jugador que se está creando */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Jugador a crear:</h3>
            <div className="flex items-center gap-2 text-blue-800">
              <User className="w-4 h-4" />
              <span className="font-medium">{playerData.full_name}</span>
              {playerData.member_number && (
                <>
                  <Hash className="w-4 h-4 ml-2" />
                  <span>Mat: {playerData.member_number}</span>
                </>
              )}
              {playerData.home_club && (
                <>
                  <MapPin className="w-4 h-4 ml-2" />
                  <span>{playerData.home_club}</span>
                </>
              )}
            </div>
          </div>

          {/* Duplicado por matrícula (más confiable) */}
          {byMatricula && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Coincidencia exacta por matrícula
              </h3>
              <div className="bg-white rounded-lg p-3 border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="font-medium">{byMatricula.full_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {byMatricula.member_number && (
                      <div className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        <span>{byMatricula.member_number}</span>
                      </div>
                    )}
                    {(byMatricula.handicap_local || byMatricula.handicap_index) && (
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        <span>HCP: {byMatricula.handicap_local || byMatricula.handicap_index}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{byMatricula.home_club}</span>
                  </div>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    Club: {byMatricula.club_name}
                  </span>
                </div>
                {(byMatricula.email || byMatricula.phone) && (
                  <div className="mt-2 text-xs text-gray-500">
                    {byMatricula.email && <div>📧 {byMatricula.email}</div>}
                    {byMatricula.phone && <div>📱 {byMatricula.phone}</div>}
                  </div>
                )}
              </div>
              <div className="mt-3">
                <button
                  onClick={() => onUseExisting(byMatricula)}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Usar este jugador existente
                </button>
              </div>
            </div>
          )}

          {/* Duplicados por nombre + club (menos confiable) */}
          {byNameAndClub.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-3">
                Posibles coincidencias por nombre y club
              </h3>
              <div className="space-y-2">
                {byNameAndClub.map((player, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="font-medium">{player.full_name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {player.member_number && (
                          <div className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            <span>{player.member_number}</span>
                          </div>
                        )}
                        {(player.handicap_local || player.handicap_index) && (
                          <div className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            <span>HCP: {player.handicap_local || player.handicap_index}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{player.home_club}</span>
                        </div>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          Club: {player.club_name}
                        </span>
                      </div>
                      <button
                        onClick={() => onUseExisting(player)}
                        className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
                      >
                        Usar este
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onCreateNew}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Crear nuevo jugador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
