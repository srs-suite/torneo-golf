import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Eye, Camera, Calculator, RotateCcw, CheckCircle2 } from 'lucide-react'
import { useTournaments, useTournamentParticipants } from '@/hooks/useTournaments'
import { useQuery } from '@tanstack/react-query'

interface ScorecardData {
  scores: { [hole: number]: number }
  startingHole: number
  currentHole: number
  totalGross: number
  totalNet: number
  completedHoles: number
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

export default function MobileScorecard() {
  const { clubId, tournamentId, playerId } = useParams<{ 
    clubId: string; 
    tournamentId: string; 
    playerId: string;
  }>()
  const navigate = useNavigate()
  
  const clubIdNum = clubId ? parseInt(clubId) : 0
  const tournamentIdNum = tournamentId ? parseInt(tournamentId) : 0
  const playerIdNum = playerId ? parseInt(playerId) : 0
  
  const { data: tournaments } = useTournaments(clubIdNum)
  const { data: participants } = useTournamentParticipants(clubIdNum, tournamentIdNum)
  
  // Obtener datos de los hoyos del club
  const { data: courseHoles, isLoading: holesLoading } = useQuery({
    queryKey: ['course-holes', clubIdNum],
    queryFn: async () => {
      const response = await fetch(`/api/club/${clubIdNum}/holes`)
      if (!response.ok) {
        throw new Error('Error al cargar los hoyos')
      }
      const result = await response.json()
      return result.data as CourseHole[]
    },
    enabled: !!clubIdNum
  })
  
  const tournament = tournaments?.find(t => t.tournament_id === tournamentIdNum)
  const player = participants?.find(p => p.member_id === playerIdNum || p.external_player_id === playerIdNum)
  
  const [scorecard, setScorecard] = useState<ScorecardData>({
    scores: {},
    startingHole: 1,
    currentHole: 1,
    totalGross: 0,
    totalNet: 0,
    completedHoles: 0
  })
  
  const [currentView, setCurrentView] = useState<'input' | 'table'>('input')
  const [showHoleSelector, setShowHoleSelector] = useState(true)
  
  // Usar datos reales de los hoyos del club
  const courseData = courseHoles || []

  // Calcular totales
  useEffect(() => {
    const scores = Object.values(scorecard.scores)
    const totalGross = scores.reduce((sum, score) => sum + score, 0)
    const completedHoles = scores.length
    
    // Cálculo básico del net (sería más complejo con handicap real)
    const playerHandicap = player?.handicap_index || 0
    const totalNet = totalGross - playerHandicap
    
    setScorecard(prev => ({
      ...prev,
      totalGross,
      totalNet,
      completedHoles
    }))
  }, [scorecard.scores, player])

  const selectStartingHole = (hole: number) => {
    setScorecard(prev => ({
      ...prev,
      startingHole: hole,
      currentHole: hole
    }))
    setShowHoleSelector(false)
  }

  const recordScore = (hole: number, strokes: number) => {
    setScorecard(prev => ({
      ...prev,
      scores: {
        ...prev.scores,
        [hole]: strokes
      }
    }))
  }

  const goToNextHole = () => {
    if (scorecard.currentHole < 18) {
      setScorecard(prev => ({
        ...prev,
        currentHole: prev.currentHole + 1
      }))
    }
  }

  const goToPrevHole = () => {
    if (scorecard.currentHole > 1) {
      setScorecard(prev => ({
        ...prev,
        currentHole: prev.currentHole - 1
      }))
    }
  }

  const getCurrentHoleData = () => {
    return courseData.find(h => h.hole_number === scorecard.currentHole) || courseData[0]
  }

  const saveScorecard = async () => {
    try {
      // Aquí iría la llamada a la API para guardar
      console.log('Saving scorecard:', scorecard)
      alert('¡Tarjeta guardada exitosamente!')
    } catch (error) {
      console.error('Error saving scorecard:', error)
      alert('Error al guardar la tarjeta')
    }
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

  if (!tournament || !player || holesLoading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {holesLoading ? 'Cargando información del campo...' : 'Cargando información del jugador...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView(currentView === 'input' ? 'table' : 'input')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <Eye className="h-4 w-4" />
              {currentView === 'input' ? 'Ver Tarjeta' : 'Ingresar'}
            </button>
            
            <button
              onClick={saveScorecard}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              <Save className="h-4 w-4" />
              Guardar
            </button>
          </div>
        </div>
      </div>

      {/* Tournament & Player Info */}
      <div className="bg-green-600 text-white p-4">
        <h1 className="text-lg font-bold">{tournament.tournament_name}</h1>
        <p className="text-green-100 text-sm">
          {new Date(tournament.tournament_date).toLocaleDateString('es-ES')}
        </p>
        
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="font-semibold">{player.player_name}</p>
            <p className="text-green-200 text-sm">HCP: {player.handicap_index}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{scorecard.totalGross}</p>
            <p className="text-green-200 text-sm">{scorecard.completedHoles}/18 hoyos</p>
          </div>
        </div>
      </div>

      {/* Hole Selector */}
      {showHoleSelector && (
        <div className="p-4 bg-white m-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Selecciona tu hoyo de inicio</h2>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => (
              <button
                key={hole}
                onClick={() => selectStartingHole(hole)}
                className="aspect-square bg-gray-100 hover:bg-green-100 border border-gray-300 rounded-lg flex items-center justify-center font-semibold text-lg transition-colors"
              >
                {hole}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Score Input View */}
      {currentView === 'input' && !showHoleSelector && (
        <div className="p-4">
          {/* Current Hole Info */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">Hoyo {scorecard.currentHole}</h2>
                <p className="text-gray-600">Par {getCurrentHoleData().par}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Handicap</p>
                <p className="text-lg font-semibold">{getCurrentHoleData().handicap}</p>
              </div>
            </div>

            {/* Score Input */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Golpes en este hoyo</p>
              <div className="flex items-center justify-center gap-3 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(strokes => (
                  <button
                    key={strokes}
                    onClick={() => recordScore(scorecard.currentHole, strokes)}
                    className={`w-12 h-12 rounded-full border-2 font-bold transition-all ${
                      scorecard.scores[scorecard.currentHole] === strokes
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-600'
                    }`}
                  >
                    {strokes}
                  </button>
                ))}
              </div>
              
              {scorecard.scores[scorecard.currentHole] && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">
                    {scorecard.scores[scorecard.currentHole]} golpes registrados
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goToPrevHole}
              disabled={scorecard.currentHole === 1}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
            >
              ← Hoyo Anterior
            </button>
            <button
              onClick={goToNextHole}
              disabled={scorecard.currentHole === 18}
              className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700"
            >
              Siguiente Hoyo →
            </button>
          </div>
        </div>
      )}

      {/* Scorecard Table View */}
      {currentView === 'table' && (
        <div className="p-4">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Front 9 */}
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900 mb-3">Front 9</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-2 text-left">Hoyo</th>
                      {Array.from({ length: 9 }, (_, i) => i + 1).map(hole => (
                        <th key={hole} className="px-2 py-2 text-center">{hole}</th>
                      ))}
                      <th className="px-2 py-2 text-center font-bold">OUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2 py-2 font-medium">Par</td>
                      {courseData.slice(0, 9).map(hole => (
                        <td key={hole.hole_number} className="px-2 py-2 text-center">{hole.par}</td>
                      ))}
                      <td className="px-2 py-2 text-center font-bold">
                        {courseData.slice(0, 9).reduce((sum, h) => sum + h.par, 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 font-medium">HCP</td>
                      {courseData.slice(0, 9).map(hole => (
                        <td key={hole.hole_number} className="px-2 py-2 text-center text-xs">{hole.handicap}</td>
                      ))}
                      <td className="px-2 py-2"></td>
                    </tr>
                    <tr className="bg-yellow-50">
                      <td className="px-2 py-2 font-medium">Score</td>
                      {Array.from({ length: 9 }, (_, i) => i + 1).map(hole => (
                        <td key={hole} className="px-2 py-2 text-center font-bold">
                          {scorecard.scores[hole] || ''}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center font-bold text-lg">
                        {getFront9Total() || ''}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Back 9 */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Back 9</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-2 text-left">Hoyo</th>
                      {Array.from({ length: 9 }, (_, i) => i + 10).map(hole => (
                        <th key={hole} className="px-2 py-2 text-center">{hole}</th>
                      ))}
                      <th className="px-2 py-2 text-center font-bold">IN</th>
                      <th className="px-2 py-2 text-center font-bold">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2 py-2 font-medium">Par</td>
                      {courseData.slice(9, 18).map(hole => (
                        <td key={hole.hole_number} className="px-2 py-2 text-center">{hole.par}</td>
                      ))}
                      <td className="px-2 py-2 text-center font-bold">
                        {courseData.slice(9, 18).reduce((sum, h) => sum + h.par, 0)}
                      </td>
                      <td className="px-2 py-2 text-center font-bold">
                        {courseData.reduce((sum, h) => sum + h.par, 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 py-2 font-medium">HCP</td>
                      {courseData.slice(9, 18).map(hole => (
                        <td key={hole.hole_number} className="px-2 py-2 text-center text-xs">{hole.handicap}</td>
                      ))}
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                    </tr>
                    <tr className="bg-yellow-50">
                      <td className="px-2 py-2 font-medium">Score</td>
                      {Array.from({ length: 9 }, (_, i) => i + 10).map(hole => (
                        <td key={hole} className="px-2 py-2 text-center font-bold">
                          {scorecard.scores[hole] || ''}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center font-bold text-lg">
                        {getBack9Total() || ''}
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-xl text-green-600">
                        {scorecard.totalGross || ''}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

