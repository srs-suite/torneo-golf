import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Eye, Camera, Upload } from 'lucide-react'
import { useTournaments, useTournamentParticipants } from '@/hooks/useTournaments'
import { useSaveScorecard, useTournamentScorecards } from '@/hooks/useScorecards'
import { useQuery } from '@tanstack/react-query'
import { getScoreStyle, formatHcpForDisplay } from '@/utils/scoreUtils'
import { participantPlayingHcp, participantWhIndex } from '@/utils/clubHandicap'
import { isTournamentStatusClosed } from '@/types/tournament'
import { TournamentClosedNotice, TORNEO_CERRADO_ALERT } from '@/components/TournamentClosedNotice'
// Score styling moved to shared utility

const MAX_STROKES_PER_HOLE = 20

interface ManualScorecardData {
  scores: { [hole: number]: number }
  verified: boolean
  archived: boolean
  notes: string
  entryMethod: 'manual' | 'photo' | 'mobile'
}

interface CourseHole {
  hole_id: number
  course_id: number
  hole_number: number
  par: number
  handicap: number
  distance_meters: number | null
  distance_yards: number | null
  description: string | null
}

type ManualEntryBackState = 'scorecard-history' | 'scorecard-selection'

export default function ManualScorecardEntry() {
  const { clubId, tournamentId, playerId } = useParams<{ clubId: string; tournamentId: string; playerId?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const manualEntryBack = (location.state as { manualEntryBack?: ManualEntryBackState } | null)?.manualEntryBack
  
  const clubIdNum = clubId ? parseInt(clubId) : 0
  const tournamentIdNum = tournamentId ? parseInt(tournamentId) : 0
  
  const { data: tournaments } = useTournaments(clubIdNum)
  const { data: participants } = useTournamentParticipants(clubIdNum, tournamentIdNum)
  const { data: existingScorecards } = useTournamentScorecards(clubIdNum, tournamentIdNum, true) // includeAll = true para ver también los que no presentaron
  const saveScorecard = useSaveScorecard(clubIdNum, tournamentIdNum)
  
  // Obtener datos de los hoyos del club
  const { data: courseHoles, isLoading: holesLoading } = useQuery({
    queryKey: ['course-holes', clubIdNum, tournamentIdNum],
    queryFn: async () => {
      const response = await fetch(`/api/club/${clubIdNum}/tournaments/${tournamentIdNum}/holes`)
      if (!response.ok) {
        throw new Error('Error al cargar los hoyos')
      }
      const result = await response.json()
      return result.data as CourseHole[]
    },
    enabled: !!clubIdNum && !!tournamentIdNum
  })
  
  const tournament = tournaments?.find(t => t.tournament_id === tournamentIdNum)
  const tournamentClosed = tournament ? isTournamentStatusClosed(tournament.status) : false
  
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'pending' | 'completed' | 'no_show' | 'all'>('pending')
  // Sanitize to ASCII to prevent corrupted glyphs in some environments
  const sanitizeAscii = (text: string | undefined | null) => {
    const base = (text ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')   // remove diacritics
      .replace(/[^\x20-\x7E]/g, '')      // strip non-ASCII visible characters
    return base.replace(/\s+/g, ' ').trim()
  }
  // Si viene playerId en la URL, iniciar en modo scorecard, sino en selection
  const [viewMode, setViewMode] = useState<'selection' | 'scorecard' | 'verification'>(() => {
    const initialMode = playerId ? 'scorecard' : 'selection'
    console.log('🚀 ManualScorecardEntry - Initial setup:', {
      playerId,
      initialMode,
      url: window.location.href
    })
    return initialMode
  })
  
  // Auto-seleccionar jugador si viene playerId en la URL
  useEffect(() => {
    console.log('🔍 Auto-select effect triggered:', {
      playerId,
      hasParticipants: participants && participants.length > 0,
      hasSelectedPlayer: !!selectedPlayer,
      participantsLength: participants?.length
    })
    
    if (playerId && participants && participants.length > 0 && !selectedPlayer) {
      const playerIdNum = parseInt(playerId)
      console.log('🔍 Searching for player with ID:', playerIdNum)
      
      // Buscar por participant_id, member_id o external_player_id
      const foundPlayer = participants.find(p => 
        p.participant_id === playerIdNum || 
        p.member_id === playerIdNum || 
        p.external_player_id === playerIdNum
      )
      
      if (foundPlayer) {
        console.log('🎯 Auto-selecting player from URL:', foundPlayer.player_name)
        console.log('🎯 Player data:', foundPlayer)
        setSelectedPlayer(foundPlayer)
        setCurrentStep('scorecard')
        console.log('🎯 CurrentStep set to: scorecard')
        // Ya está en modo scorecard desde el inicio
      } else {
        console.log('❌ Player not found for ID:', playerIdNum)
        console.log('❌ Available participants:', participants.map(p => ({
          name: p.player_name,
          participant_id: p.participant_id,
          member_id: p.member_id,
          external_player_id: p.external_player_id
        })))
        // Si no encuentra el jugador, volver a selection
        setViewMode('selection')
      }
    }
  }, [playerId, participants, selectedPlayer])

  // Cargar scorecard existente si el jugador ya tiene uno
  useEffect(() => {
    if (selectedPlayer && existingScorecards) {
      const existingScorecard = existingScorecards.find((sc: any) => {
        if (selectedPlayer.player_type === 'member' || selectedPlayer.member_id) {
          return sc.member_id === (selectedPlayer.member_id || selectedPlayer.participant_id);
        } else {
          return sc.external_player_id === (selectedPlayer.external_player_id || selectedPlayer.participant_id);
        }
      });

      if (existingScorecard && existingScorecard.scorecard_id) {
        console.log('📋 Found existing scorecard, loading data:', existingScorecard);
        
        // Cargar los hole scores
        fetch(`/api/club/${clubIdNum}/tournaments/${tournamentIdNum}/scorecard/${existingScorecard.scorecard_id}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              const scorecardData = data.data;
              console.log('✅ Loaded scorecard with holes:', scorecardData);
              
              // hole_scores ya viene como objeto { 1: 4, 2: 5, ... }
              const scoresObject: { [hole: number]: number } = {};
              if (scorecardData.hole_scores) {
                // Si es array, convertir
                if (Array.isArray(scorecardData.hole_scores)) {
                  scorecardData.hole_scores.forEach((hole: any) => {
                    scoresObject[hole.hole_number] = hole.strokes;
                  });
                } else {
                  // Si ya es objeto, usar directamente
                  Object.assign(scoresObject, scorecardData.hole_scores);
                }
              }
              
              console.log('📊 Scores object:', scoresObject);
              
              setScorecard({
                scores: scoresObject,
                verified: scorecardData.verified_card || false,
                archived: scorecardData.original_archived || false,
                notes: scorecardData.entry_notes || '',
                entryMethod: scorecardData.entry_method || 'manual'
              });
            }
          })
          .catch(error => {
            console.error('❌ Error loading existing scorecard:', error);
          });
      } else {
        // Reset scorecard if no existing one
        setScorecard({
          scores: {},
          verified: false,
          archived: false,
          notes: '',
          entryMethod: 'manual'
        });
      }
    }
  }, [selectedPlayer, existingScorecards, clubIdNum, tournamentIdNum]);

  const [scorecard, setScorecard] = useState<ManualScorecardData>({
    scores: {},
    verified: false,
    archived: false,
    notes: '',
    entryMethod: 'manual'
  })
  const [currentStep, setCurrentStep] = useState<'player' | 'scorecard' | 'verification'>(() => {
    const initialStep = playerId ? 'scorecard' : 'player'
    console.log('🚀 CurrentStep initial setup:', {
      playerId,
      initialStep
    })
    return initialStep
  })
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', file);
      // Aquí puedes agregar la lógica para manejar la carga de la foto
    }
  };

  // Pre-seleccionar jugador si viene en la URL (manejado por el useEffect principal arriba)

  // Usar datos reales de los hoyos del club
  const courseData = courseHoles || []

  // Separate participants into completed, pending, and no-show
  const participantsWithScorecards = participants?.filter(participant => {
    const hasScorecard = existingScorecards?.some(scorecard => {
      if (participant.player_type === 'member') {
        // Tiene scorecard Y NO es "no presentó"
        return scorecard.member_id === participant.member_id && !scorecard.did_not_present
      } else {
        return scorecard.external_player_id === participant.external_player_id && !scorecard.did_not_present
      }
    })
    return hasScorecard
  }) || []

  const participantsNoShow = participants?.filter(participant => {
    const hasNoShowScorecard = existingScorecards?.some(scorecard => {
      if (participant.player_type === 'member') {
        // Tiene scorecard marcado como "no presentó"
        return scorecard.member_id === participant.member_id && scorecard.did_not_present === true
      } else {
        return scorecard.external_player_id === participant.external_player_id && scorecard.did_not_present === true
      }
    })
    return hasNoShowScorecard
  }) || []

  const participantsWithoutScorecards = participants?.filter(participant => {
    const hasAnyScorecard = existingScorecards?.some(scorecard => {
      if (participant.player_type === 'member') {
        return scorecard.member_id === participant.member_id
      } else {
        return scorecard.external_player_id === participant.external_player_id
      }
    })
    return !hasAnyScorecard
  }) || []

  console.log('📊 Scorecards status:', {
    totalParticipants: participants?.length,
    withScorecards: participantsWithScorecards.length,
    noShow: participantsNoShow.length,
    withoutScorecards: participantsWithoutScorecards.length,
    totalScorecards: existingScorecards?.length
  })

  // Apply filters based on selected type
  const getFilteredParticipants = () => {
    let baseList: any[] = []
    
    switch (filterType) {
      case 'pending':
        baseList = participantsWithoutScorecards
        break
      case 'completed':
        baseList = participantsWithScorecards
        break
      case 'no_show':
        baseList = participantsNoShow
        break
      case 'all':
        baseList = participants || []
        break
    }

    return baseList.filter(p =>
      (p.player_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.member_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.player_club || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const filteredParticipants = getFilteredParticipants()

  const selectPlayer = (player: any) => {
    setSelectedPlayer(player)
    setCurrentStep('scorecard')
  }

  const updateScore = (hole: number, score: number) => {
    setScorecard(prev => ({
      ...prev,
      scores: {
        ...prev.scores,
        [hole]: score
      }
    }))
  }

  const clearScore = (hole: number) => {
    setScorecard(prev => {
      const newScores = { ...prev.scores }
      delete newScores[hole]
      return {
        ...prev,
        scores: newScores
      }
    })
  }

  const getTotalScore = () => {
    return Object.values(scorecard.scores).reduce((sum, score) => sum + score, 0)
  }

  const getNetScore = () => {
    const totalGross = getTotalScore()
    const playerHcp = Math.round(participantPlayingHcp(selectedPlayer) ?? participantWhIndex(selectedPlayer) ?? 0)
    return totalGross > 0 ? totalGross - Math.round(playerHcp) : 0
  }

  const getCompletedHoles = () => {
    return Object.keys(scorecard.scores).length
  }

  const getFront9Total = () => {
    return Object.entries(scorecard.scores)
      .filter(([hole]) => parseInt(hole) <= 9)
      .reduce((sum, [, score]) => sum + score, 0)
  }

  const getBack9Total = () => {
    return Object.entries(scorecard.scores)
      .filter(([hole]) => parseInt(hole) > 9)
      .reduce((sum, [, score]) => sum + score, 0)
  }

  const validateScorecard = () => {
    const completedHoles = getCompletedHoles()
    return completedHoles > 0 // Solo requiere al menos 1 hoyo
  }

  const handleSaveScorecard = async () => {
    if (tournamentClosed) {
      alert(TORNEO_CERRADO_ALERT)
      return
    }
    if (!validateScorecard()) {
      alert('Por favor complete al menos un hoyo')
      return
    }

    const completedHoles = getCompletedHoles()
    const isComplete = completedHoles === 18
    const shouldVerify = isComplete && scorecard.verified

    if (isComplete && !scorecard.verified) {
      const confirmSave = confirm('Has completado los 18 hoyos. ¿Quieres marcar la tarjeta como verificada y guardarla como completa?')
      if (!confirmSave) {
        return
      }
    }

    const data = {
      member_id: selectedPlayer.member_id || null,
      external_player_id: selectedPlayer.external_player_id || null,
      scores: scorecard.scores,
      entry_method: scorecard.entryMethod as 'manual' | 'mobile' | 'photo' | 'import',
      verified_card: shouldVerify || scorecard.verified,
      original_archived: scorecard.archived,
      entry_notes: `${scorecard.notes}${isComplete ? '' : ` (Parcial: ${completedHoles}/18 hoyos)`}`,
      is_complete: isComplete,
      did_not_present: false
    }

    console.log('🔍 Datos a enviar:', data)
    
    saveScorecard.mutate(data, {
      onSuccess: () => {
        console.log('✅ Tarjeta guardada exitosamente')
        navigate(`/club/${clubId}/tournaments/${tournamentId}/scorecard-selection`, { replace: true })
      },
      onError: (error) => {
        console.error('❌ Error al guardar tarjeta:', error)
        alert(`Error al guardar la tarjeta: ${error.response?.data?.message || error.message}`)
      }
    })
  }

  // Photo upload functionality removed - manual entry only

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del torneo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {tournamentClosed && (
        <TournamentClosedNotice layout="bar">
          <span>
            Las tarjetas y el HCP del torneo son solo lectura. Podés <strong>ver</strong> e <strong>imprimir</strong> desde la lista de
            tarjetas. Para editar datos, reabrí el torneo en{' '}
            <strong>Administración → Torneos → Editar → Abierto</strong>.
          </span>
        </TournamentClosedNotice>
      )}
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (manualEntryBack === 'scorecard-history') {
                    navigate(`/club/${clubId}/tournaments/${tournamentId}/scorecards`, { replace: true })
                  } else if (playerId) {
                    navigate(`/club/${clubId}/tournaments/${tournamentId}/scorecard-selection`, { replace: true })
                  } else {
                    navigate(`/club/${clubId}/admin?tab=tournaments`)
                  }
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                Volver
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Ingreso Manual de Tarjetas</h1>
                <p className="text-sm text-gray-500">{tournament.tournament_name}</p>
              </div>
            </div>
            
            {currentStep === 'scorecard' && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPhotoUpload(true)}
                  disabled={tournamentClosed}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="h-4 w-4" />
                  Usar Foto/OCR
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('verification')}
                  disabled={getCompletedHoles() === 0 || tournamentClosed}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Eye className="h-4 w-4" />
                  Revisar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-8">
              <div className={`flex items-center gap-2 ${currentStep === 'player' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'player' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  1
                </div>
                <span className="font-medium">Seleccionar Jugador</span>
              </div>
              
              <div className={`flex items-center gap-2 ${currentStep === 'scorecard' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'scorecard' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  2
                </div>
                <span className="font-medium">Ingresar Scores</span>
              </div>
              
              <div className={`flex items-center gap-2 ${currentStep === 'verification' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'verification' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  3
                </div>
                <span className="font-medium">Verificar y Guardar</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {holesLoading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando información del campo...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!holesLoading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Step 1: Player Selection */}
        {currentStep === 'player' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              {/* Header with Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Gestión de Tarjetas</h2>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-600">Cargadas: {participantsWithScorecards.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-gray-600">Pendientes: {participantsWithoutScorecards.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-gray-600">No Presentaron: {participantsNoShow.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">Total: {participants?.length || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Progreso de carga</span>
                    <span>{participantsWithScorecards.length} de {participants?.length || 0} tarjetas</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${participants?.length ? (participantsWithScorecards.length / participants.length) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="mb-6">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => {
                      setFilterType('pending')
                      setViewMode('selection')
                    }}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      filterType === 'pending' && viewMode === 'selection'
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      Pendientes ({participantsWithoutScorecards.length})
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/club/${clubId}/tournaments/${tournamentId}/scorecards`)
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors text-gray-600 hover:text-gray-900 hover:bg-green-50"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Cargadas ({participantsWithScorecards.length})
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setFilterType('no_show')
                      setViewMode('selection')
                    }}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      filterType === 'no_show' && viewMode === 'selection'
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      No Presentaron ({participantsNoShow.length})
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setFilterType('all')
                      setViewMode('selection')
                    }}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      filterType === 'all' && viewMode === 'selection'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Todos ({participants?.length || 0})
                    </div>
                  </button>
                </div>
              </div>

              {/* Search Input */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Buscar por nombre, matrícula, club..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Results Header */}
              <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
                <span>
                  {filteredParticipants.length} {
                    filterType === 'pending' ? 'pendientes' : 
                    filterType === 'completed' ? 'cargadas' : 
                    filterType === 'no_show' ? 'no presentaron' : 
                    'participantes'
                  }
                  {searchTerm && ` encontrados para "${searchTerm}"`}
                </span>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredParticipants.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? (
                      <div>
                        <p className="mb-2">No se encontraron jugadores que coincidan con "{searchTerm}"</p>
                        <button
                          onClick={() => setSearchTerm('')}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Limpiar búsqueda
                        </button>
                      </div>
                    ) : filterType === 'pending' && participantsWithoutScorecards.length === 0 ? (
                      <div>
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <p className="font-semibold">¡Todas las tarjetas han sido cargadas!</p>
                        <p className="text-sm">Todos los participantes ya tienen sus scorecards registrados.</p>
                      </div>
                    ) : filterType === 'completed' && participantsWithScorecards.length === 0 ? (
                      <div>
                        <p className="font-semibold">No hay tarjetas cargadas aún</p>
                        <p className="text-sm">Cambia a "Pendientes" para ver los participantes sin tarjetas.</p>
                      </div>
                    ) : (
                      <p>No se encontraron participantes</p>
                    )}
                  </div>
                ) : (
                  filteredParticipants.map((participant) => {
                    const hasScorecard = participantsWithScorecards.some(p => p.participation_id === participant.participation_id)
                    const canEdit = filterType === 'pending' || filterType === 'all'
                    
                    return (
                      <div
                        key={participant.participation_id}
                        onClick={() => canEdit && !hasScorecard ? selectPlayer(participant) : null}
                        className={`p-4 border border-gray-200 rounded-lg transition-colors ${
                          canEdit && !hasScorecard 
                            ? 'hover:bg-gray-50 cursor-pointer' 
                            : 'bg-gray-50 cursor-default'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Status Indicator */}
                            <div className="flex-shrink-0">
                              {hasScorecard ? (
                                <div className="w-3 h-3 bg-green-500 rounded-full" title="Tarjeta cargada"></div>
                              ) : (
                                <div className="w-3 h-3 bg-orange-500 rounded-full" title="Tarjeta pendiente"></div>
                              )}
                            </div>
                            
                            <div className="flex-grow">
                              <h3 className="font-semibold text-gray-900">{participant.player_name}</h3>
                              <div className="flex items-center gap-3 text-sm text-gray-600">
                                <span>HCP: {formatHcpForDisplay(participantPlayingHcp(participant), participantWhIndex(participant))}</span>
                                <span>•</span>
                                <span>{participant.is_member ? 'Socio' : 'Invitado'}</span>
                                {participant.member_number && (
                                  <>
                                    <span>•</span>
                                    <span>Matrícula: {participant.member_number}</span>
                                  </>
                                )}
                              </div>
                              {participant.player_club && (
                                <p className="text-sm text-gray-500 mt-1">{sanitizeAscii(participant.player_club)}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {hasScorecard && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                Cargada
                              </span>
                            )}
                            {canEdit && !hasScorecard && (
                              <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Scorecard Entry */}
        {currentStep === 'scorecard' && selectedPlayer && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow">
              {/* Player Info with Totals */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedPlayer.player_name}</h2>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-gray-600">
                        HCP: {Math.round(participantPlayingHcp(selectedPlayer) ?? participantWhIndex(selectedPlayer) ?? 0)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {getCompletedHoles()}/18 hoyos completados
                      </p>
                    </div>
                  </div>
                  
                  {/* Botón "No presentó" en la esquina superior derecha */}
                  <button
                    onClick={async () => {
                      if (tournamentClosed) {
                        alert(TORNEO_CERRADO_ALERT)
                        return
                      }
                      const confirmAction = confirm('¿Confirmas que este jugador NO PRESENTÓ tarjeta? No aparecerá en los resultados.')
                      if (!confirmAction) return

                      const data = {
                        member_id: selectedPlayer.member_id || null,
                        external_player_id: selectedPlayer.external_player_id || null,
                        scores: {},
                        entry_method: 'manual' as 'manual',
                        verified_card: false,
                        original_archived: false,
                        entry_notes: 'NO PRESENTÓ TARJETA',
                        is_complete: false,
                        did_not_present: true
                      }

                      saveScorecard.mutate(data, {
                        onSuccess: () => {
                          navigate(`/club/${clubId}/tournaments/${tournamentId}/scorecard-selection`, {
                            replace: true,
                          })
                        },
                        onError: (error: any) => {
                          alert(`Error: ${error.response?.data?.message || error.message}`)
                        }
                      })
                    }}
                    disabled={saveScorecard.isPending || tournamentClosed}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    ❌ No Presentó Tarjeta
                  </button>
                </div>
              </div>

              {/* Scorecard Grid */}
              <div className="p-6">
                {/* Ida 9 */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ida 9</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left border-r border-gray-300">Hoyo</th>
                          {Array.from({ length: 9 }, (_, i) => i + 1).map(hole => (
                            <th key={hole} className="px-3 py-2 text-center border-r border-gray-300 font-bold">
                              {hole}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center font-bold">OUT</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 font-medium border-r border-gray-300">Par</td>
                          {courseData.slice(0, 9).map(hole => (
                            <td key={hole.hole_number} className="px-3 py-2 text-center border-r border-gray-300">
                              {hole.par}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-bold">
                            {courseData.slice(0, 9).reduce((sum, h) => sum + h.par, 0)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-medium border-r border-gray-300">HCP</td>
                          {courseData.slice(0, 9).map(hole => (
                            <td key={hole.hole_number} className="px-3 py-2 text-center border-r border-gray-300 text-sm">
                              {hole.handicap}
                            </td>
                          ))}
                          <td className="px-3 py-2"></td>
                        </tr>
                        <tr className="bg-yellow-50">
                          <td className="px-3 py-2 font-medium border-r border-gray-300">Score</td>
                          {Array.from({ length: 9 }, (_, i) => i + 1).map(hole => {
                            const score = scorecard.scores[hole];
                            const holeData = courseData?.find(h => h.hole_number === hole);
                            const par = holeData?.par || 4;
                            const hasScore = score && score > 0;
                            const style = hasScore ? getScoreStyle(score, par) : null;
                            
                            return (
                              <td key={hole} className="px-3 py-2 text-center border-r border-gray-300">
                                <div className="flex flex-col items-center gap-1">
                                  <input
                                    type="number"
                                    min="1"
                                    max={MAX_STROKES_PER_HOLE}
                                    disabled={tournamentClosed}
                                    value={scorecard.scores[hole] || ''}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value)
                                      if (value >= 1 && value <= MAX_STROKES_PER_HOLE) {
                                        updateScore(hole, value)
                                      } else if (e.target.value === '') {
                                        clearScore(hole)
                                      }
                                    }}
                                    className={`w-12 h-8 text-center border-2 text-sm font-bold ${
                                      hasScore && style ? 
                                        `${style.bgColor} ${style.textColor} ${style.borderColor} ${style.shape}` :
                                        'border-gray-300 rounded bg-white'
                                    } disabled:opacity-60`}
                                  />

                                </div>
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center font-bold text-lg">
                            {getFront9Total() || ''}
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
                          {Array.from({ length: 9 }, (_, i) => i + 10).map(hole => (
                            <th key={hole} className="px-3 py-2 text-center border-r border-gray-300 font-bold">
                              {hole}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center font-bold">IN</th>
                          <th className="px-3 py-2 text-center font-bold">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 font-medium border-r border-gray-300">Par</td>
                          {courseData.slice(9, 18).map(hole => (
                            <td key={hole.hole_number} className="px-3 py-2 text-center border-r border-gray-300">
                              {hole.par}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-bold">
                            {courseData.slice(9, 18).reduce((sum, h) => sum + h.par, 0)}
                          </td>
                          <td className="px-3 py-2 text-center font-bold">
                            {courseData.reduce((sum, h) => sum + h.par, 0)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-medium border-r border-gray-300">HCP</td>
                          {courseData.slice(9, 18).map(hole => (
                            <td key={hole.hole_number} className="px-3 py-2 text-center border-r border-gray-300 text-sm">
                              {hole.handicap}
                            </td>
                          ))}
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2"></td>
                        </tr>
                        <tr className="bg-yellow-50">
                          <td className="px-3 py-2 font-medium border-r border-gray-300">Score</td>
                          {Array.from({ length: 9 }, (_, i) => i + 10).map(hole => {
                            const score = scorecard.scores[hole];
                            const holeData = courseData?.find(h => h.hole_number === hole);
                            const par = holeData?.par || 4;
                            const hasScore = score && score > 0;
                            const style = hasScore ? getScoreStyle(score, par) : null;
                            
                            return (
                              <td key={hole} className="px-3 py-2 text-center border-r border-gray-300">
                                <div className="flex flex-col items-center gap-1">
                                  <input
                                    type="number"
                                    min="1"
                                    max={MAX_STROKES_PER_HOLE}
                                    disabled={tournamentClosed}
                                    value={scorecard.scores[hole] || ''}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value)
                                      if (value >= 1 && value <= MAX_STROKES_PER_HOLE) {
                                        updateScore(hole, value)
                                      } else if (e.target.value === '') {
                                        clearScore(hole)
                                      }
                                    }}
                                    className={`w-12 h-8 text-center border-2 text-sm font-bold ${
                                      hasScore && style ? 
                                        `${style.bgColor} ${style.textColor} ${style.borderColor} ${style.shape}` :
                                        'border-gray-300 rounded bg-white'
                                    } disabled:opacity-60`}
                                  />

                                </div>
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center font-bold text-lg">
                            {getBack9Total() || ''}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-xl text-green-600">
                            {getTotalScore() || ''}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Verification */}
        {currentStep === 'verification' && selectedPlayer && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Verificación Final</h2>
              
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{selectedPlayer.player_name}</h3>
                    <p className="text-sm text-gray-600">
                      HCP: {Math.round(selectedPlayer?.handicap_local) || Math.round(selectedPlayer?.handicap_index) || 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex flex-col gap-1">
                      <div>
                        <p className="text-xl font-bold text-green-600">{getTotalScore()}</p>
                        <p className="text-xs text-gray-500">Total Real</p>
                      </div>
                      {getCompletedHoles() === 18 && (
                        <div className="border-t pt-1">
                          <p className="text-xl font-bold text-blue-600">{getNetScore()}</p>
                          <p className="text-xs text-blue-500">Total Neto</p>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{getCompletedHoles()} hoyos completados</p>
                  </div>
                </div>
              </div>

              {/* Verification Checkboxes */}
              <div className="space-y-4 mb-6">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={scorecard.verified}
                    disabled={tournamentClosed}
                    onChange={(e) => setScorecard(prev => ({ ...prev, verified: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    Tarjeta verificada y firmada por el jugador
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={scorecard.archived}
                    disabled={tournamentClosed}
                    onChange={(e) => setScorecard(prev => ({ ...prev, archived: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    Tarjeta original archivada
                  </span>
                </label>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={scorecard.notes}
                  disabled={tournamentClosed}
                  onChange={(e) => setScorecard(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                  placeholder="Notas sobre el ingreso de la tarjeta..."
                />
              </div>

              {/* Validation */}
              {!validateScorecard() && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-6">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-700">
                    Debe completar al menos un hoyo y verificar la tarjeta antes de guardar
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('scorecard')}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Volver a Editar
                </button>
                <button
                  onClick={handleSaveScorecard}
                  disabled={tournamentClosed || !validateScorecard() || saveScorecard.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  {saveScorecard.isPending ? 'Guardando...' : 'Guardar Tarjeta'}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Photo Upload Modal */}
      {showPhotoUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subir Foto de Tarjeta</h3>
            <p className="text-sm text-gray-600 mb-4">
              Toma una foto clara de la tarjeta o selecciona una imagen desde tu dispositivo. 
              El sistema extraerá automáticamente los scores.
            </p>
            
            <div className="space-y-3">
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-600">Seleccionar imagen</span>
                </div>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
              
              <button
                onClick={() => {
                  // Activar cámara (requiere permisos)
                  alert('Funcionalidad de cámara en desarrollo')
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                <Camera className="h-4 w-4" />
                Usar Cámara
              </button>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPhotoUpload(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
