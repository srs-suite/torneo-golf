import { useState, useEffect } from 'react'
// FORCE RELOAD: 20250820-122300
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft,
  Clock,
  Trophy,
  User,
  Users,
  Mail,
  Phone,
  GripVertical,
  Plus
} from 'lucide-react'
import { useGenerateGroups, useAssignTeeTimes, useTournamentGroups, useMovePlayerToGroup, useMoveGroupToHole, useCreateEmptyGroup } from '@/hooks/useTournaments'
import { useTournaments } from '@/hooks/useTournaments'
import { LoadingSpinner } from '@/components/LoadingSpinner'

interface TeeTimeConfig {
  startTime: string
  intervalMinutes: number
  courseHoles: number
  enableTwoSessions: boolean
  enableSimultaneousStarts: boolean
  useInterval: boolean
  afternoonStartTime: string
}

export default function TeeTimeManager() {
  const { clubId, tournamentId } = useParams<{ clubId: string; tournamentId: string }>()
  const navigate = useNavigate()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [config, setConfig] = useState<TeeTimeConfig>({
    startTime: "08:00",
    intervalMinutes: 12,
    courseHoles: 18,
    enableTwoSessions: false,
    enableSimultaneousStarts: false,
    useInterval: false,
    afternoonStartTime: "14:00"
  })
  const [hasManualChanges, setHasManualChanges] = useState(false)
  const [showReconfigModal, setShowReconfigModal] = useState(false)
  const [draggedPlayer, setDraggedPlayer] = useState<any>(null)
  const [dragOverGroup, setDragOverGroup] = useState<number | null>(null)
  const [draggedGroup, setDraggedGroup] = useState<any>(null)
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null)

  const clubIdNum = clubId ? parseInt(clubId) : 0
  const tournamentIdNum = tournamentId ? parseInt(tournamentId) : 0
  
  console.log('🔥 NEW TEETIME COMPONENT LOADED! TIMESTAMP:', new Date().toISOString());

  // Hooks
  const { data: tournaments } = useTournaments(clubIdNum)
  const tournament = tournaments?.find(t => t.tournament_id === tournamentIdNum)
  
  const generateGroups = useGenerateGroups(clubIdNum, tournamentIdNum)
  const assignTeeTimes = useAssignTeeTimes(clubIdNum, tournamentIdNum)
  const { data: groups, refetch: refetchGroups } = useTournamentGroups(clubIdNum, tournamentIdNum)
  const movePlayer = useMovePlayerToGroup(clubIdNum, tournamentIdNum)
  const moveGroup = useMoveGroupToHole(clubIdNum, tournamentIdNum)
  const createEmptyGroup = useCreateEmptyGroup(clubIdNum, tournamentIdNum)

  // Auto navigation
  useEffect(() => {
    if (generateGroups.isSuccess && !groups?.length) {
      setCurrentStep(2)
    }
    if (assignTeeTimes.isSuccess) {
      setCurrentStep(3)
    }
  }, [generateGroups.isSuccess, assignTeeTimes.isSuccess, groups])

  const handleGenerateGroups = async () => {
    try {
      const options = { preserveExistingGroups: hasManualChanges }
      await generateGroups.mutateAsync(options)
      setCurrentStep(2)
    } catch (error) {
      console.error("Error generating groups:", error)
    }
  }

  const handleAssignTeeTimes = async () => {
    try {
      await assignTeeTimes.mutateAsync({
        start_time: config.startTime,
        interval_minutes: config.intervalMinutes,
        course_holes: config.courseHoles,
        enable_two_sessions: config.enableTwoSessions,
        enable_simultaneous_starts: config.enableSimultaneousStarts,
        afternoon_start_time: config.afternoonStartTime
      })
      setCurrentStep(3)
    } catch (error) {
      console.error("Error assigning tee times:", error)
    }
  }

  const handleCreateEmptyGroup = async () => {
    try {
      console.log("Creating empty group...")
      await createEmptyGroup.mutateAsync({ hole: 1, time: null })
      setHasManualChanges(true)
    } catch (error) {
      console.error("Error creating empty group:", error)
    }
  }

  const handleMovePlayer = async (participationId: number, newGroupNumber: number) => {
    console.log("Moving player:", { participationId, newGroupNumber })
    try {
      await movePlayer.mutateAsync({ participationId, newGroupNumber })
      setHasManualChanges(true)
      refetchGroups()
    } catch (error) {
      console.error("Error moving player:", error)
    }
  }


  const handleSwapGroups = async (group1: any, group2: any) => {
    try {
      console.log("Attempting to swap groups:", { 
        group1: group1.group_number, 
        group2: group2.group_number,
        group1_hole: group1.starting_hole,
        group1_time: group1.tee_time,
        group2_hole: group2.starting_hole,
        group2_time: group2.tee_time
      })

      if (!group1 || !group2) {
        console.error("Invalid groups provided:", { group1, group2 })
        return
      }
      
      // Intercambio simple: Solo mover group1 a la posicion de group2
      console.log("Simple swap: Moving group 1 to group 2 position")
      
      await moveGroup.mutateAsync({ 
        groupNumber: group1.group_number, 
        newStartingHole: group2.starting_hole,
        newTeeTime: group2.tee_time
      })
      
      console.log("Group moved successfully")
      setHasManualChanges(true)
      refetchGroups()
    } catch (error) {
      console.error("Error moving group:", error)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.data?.message) {
          console.error("Server error:", axiosError.response.data.message)
        }
      }
      if (error && typeof error === 'object' && 'message' in error) {
        console.error("Error message:", (error as any).message)
      }
    }
  }

  const handleReconfigureClick = () => {
    if (hasManualChanges) {
      setShowReconfigModal(true)
    } else {
      handleGenerateGroups()
    }
  }

  // Funciones para drag and drop de grupos
  const handleGroupDragStart = (e: React.DragEvent, group: any) => {
    console.log("Group drag start:", { 
      group: group.group_number,
      hole: group.starting_hole,
      time: group.tee_time
    })
    setDraggedGroup(group)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `group-${group.group_number}`)
    e.stopPropagation()
  }

  const handleGroupDragOver = (e: React.DragEvent, targetGroup: any) => {
    if (draggedGroup && !draggedPlayer) { // Solo para grupos, no jugadores
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      console.log("Group drag over:", {
        draggedGroup: draggedGroup?.group_number,
        targetGroup: targetGroup.group_number
      })
      setDragOverPosition(targetGroup.group_number)
    }
  }

  const handleGroupDragLeave = () => {
    setDragOverPosition(null)
  }

  const handleGroupDrop = (e: React.DragEvent, targetGroup: any) => {
    e.preventDefault()
    e.stopPropagation()
    console.log("Group drop triggered:", {
      draggedGroup: draggedGroup?.group_number,
      targetGroup: targetGroup.group_number,
      draggedPlayer: draggedPlayer?.participation_id
    })
    
    if (draggedGroup && draggedGroup.group_number !== targetGroup.group_number) {
      console.log("Group drop valid, swapping groups:", {
        draggedGroup: draggedGroup.group_number,
        targetGroup: targetGroup.group_number
      })
      handleSwapGroups(draggedGroup, targetGroup)
    }
    setDragOverPosition(null)
  }

  const handleGroupDragEnd = () => {
    console.log("Group drag end")
    setDraggedGroup(null)
    setDragOverPosition(null)
  }

  const handleAddNewPlayers = async () => {
    try {
      const options = { preserveExistingGroups: true }
      await generateGroups.mutateAsync(options)
      setShowReconfigModal(false)
    } catch (error) {
      console.error("Error adding new players:", error)
    }
  }

  const handleFullReconfig = async () => {
    try {
      setHasManualChanges(false)
      const options = { preserveExistingGroups: false }
      await generateGroups.mutateAsync(options)
      setShowReconfigModal(false)
    } catch (error) {
      console.error("Error reconfiguring:", error)
    }
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Torneo no encontrado</h2>
          <button
            onClick={() => navigate(`/club/${clubId}`)}
            className="text-blue-600 hover:text-blue-800"
          >
            Volver al panel del club
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(`/club/${clubId}`)}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Gestion de Tee Times
                </h1>
                <p className="text-sm text-gray-500">
                  {tournament.tournament_name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {tournament.start_time ? new Date(tournament.start_time).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center">
            {[1, 2, 3].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= step 
                    ? 'bg-gray-800 border-gray-800 text-white' 
                    : 'border-gray-300 text-gray-300'
                }`}>
                  {step}
                </div>
                {index < 2 && (
                  <div className={`h-0.5 w-16 mx-2 ${
                    currentStep > step ? 'bg-gray-800' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex mt-2">
            <div className="w-8 text-xs text-gray-600">Configurar</div>
            <div className="w-16"></div>
            <div className="w-8 text-xs text-gray-600 ml-2">Agrupar</div>
            <div className="w-16"></div>
            <div className="w-8 text-xs text-gray-600 ml-2">Resultado</div>
          </div>
        </div>

        {/* Step 1: Configuration */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Configuracion de Horarios
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de inicio
                  </label>
                  <input
                    type="time"
                    value={config.startTime}
                    onChange={(e) => setConfig({...config, startTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hoyos del campo
                  </label>
                  <select
                    value={config.courseHoles}
                    onChange={(e) => setConfig({...config, courseHoles: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <option value={9}>9 hoyos</option>
                    <option value={18}>18 hoyos</option>
                  </select>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Tipo de Salida</h4>
                <div className="space-y-4">
                  {/* Salidas Consecutivas */}
                  <div className="border border-gray-300 rounded-lg p-3 bg-white">
                    <label className="flex items-start">
                      <input
                        type="radio"
                        name="startType"
                        checked={!config.enableSimultaneousStarts}
                        onChange={() => setConfig({...config, enableSimultaneousStarts: false})}
                        className="mt-1 text-gray-600 focus:ring-gray-500"
                      />
                      <div className="ml-3 flex-1">
                        <span className="text-sm font-medium text-gray-700">Salidas consecutivas</span>
                        <p className="text-xs text-gray-500 mt-1">
                          Un grupo sale cada X minutos desde el hoyo 1
                        </p>
                        
                        {/* Configuración para salidas consecutivas */}
                        {!config.enableSimultaneousStarts && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Intervalo entre grupos (minutos)
                            </label>
                            <input
                              type="number"
                              value={config.intervalMinutes}
                              onChange={(e) => setConfig({...config, intervalMinutes: parseInt(e.target.value)})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                              min="5"
                              max="30"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Tiempo entre cada grupo individual
                            </p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  {/* Salidas Simultaneas */}
                  <div className="border border-gray-300 rounded-lg p-3 bg-white">
                    <label className="flex items-start">
                      <input
                        type="radio"
                        name="startType"
                        checked={config.enableSimultaneousStarts}
                        onChange={() => setConfig({...config, enableSimultaneousStarts: true})}
                        className="mt-1 text-gray-600 focus:ring-gray-500"
                      />
                      <div className="ml-3 flex-1">
                        <span className="text-sm font-medium text-gray-700">Salidas simultaneas</span>
                        <p className="text-xs text-gray-500 mt-1">
                          Grupos salen desde diferentes hoyos a la misma hora (shotgun)
                        </p>
                        
                        {/* Configuración para salidas simultaneas */}
                        {config.enableSimultaneousStarts && (
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-4">
                            <div>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={config.enableTwoSessions}
                                  onChange={(e) => setConfig({...config, enableTwoSessions: e.target.checked})}
                                  className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                  Habilitar dos tandas (mañana y tarde)
                                </span>
                              </label>
                              <p className="text-xs text-gray-500 mt-1 ml-6">
                                Divide los grupos en sesiones de mañana y tarde
                              </p>

                              {config.enableTwoSessions && (
                                <div className="mt-4 ml-6">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Inicio de la tanda vespertina
                                    </label>
                                    <input
                                      type="time"
                                      value={config.afternoonStartTime}
                                      onChange={(e) => setConfig({...config, afternoonStartTime: e.target.value})}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      Los grupos de la mañana salen a partir de la hora de inicio principal
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Opción de intervalo independiente */}
                            <div>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={config.useInterval || false}
                                  onChange={(e) => setConfig({...config, useInterval: e.target.checked})}
                                  className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                  Usar intervalo entre grupos
                                </span>
                              </label>
                              <p className="text-xs text-gray-500 mt-1 ml-6">
                                Solo si hay múltiples grupos por hoyo saliendo en horarios diferentes
                              </p>

                              {config.useInterval && (
                                <div className="mt-3 ml-6">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Intervalo entre grupos (minutos)
                                  </label>
                                  <input
                                    type="number"
                                    value={config.intervalMinutes}
                                    onChange={(e) => setConfig({...config, intervalMinutes: parseInt(e.target.value)})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                                    min="5"
                                    max="30"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Tiempo entre salidas de grupos del mismo hoyo
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleGenerateGroups}
                disabled={generateGroups.isLoading}
                className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center"
              >
                {generateGroups.isLoading ? (
                  <>
                    <LoadingSpinner />
                    <span className="ml-2">Generando...</span>
                  </>
                ) : (
                  'Generar Grupos'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Groups Generated */}
        {currentStep === 2 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Grupos Generados
              </h3>
              <button
                onClick={handleReconfigureClick}
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                Reconfigurar
              </button>
            </div>

            {hasManualChanges && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md border-l-4 border-gray-400">
                <div className="flex items-center">
                  <User className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-700">Editado manualmente</span>
                </div>
              </div>
            )}

            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <div className="flex items-center mb-2">
                <Users className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">Instrucciones:</span>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Arrastra jugadores entre grupos para reorganizar</li>
                <li>• Arrastra un grupo completo sobre otro para intercambiar posiciones</li>
              </ul>
            </div>

            {groups && groups.length > 0 ? (
              <div className="space-y-4 mb-6">
                {groups.map((group) => (
                  <div
                    key={group.group_number}
                    className={`border rounded-lg p-4 transition-colors ${
                      dragOverPosition === group.group_number 
                        ? 'border-gray-400 bg-gray-50' 
                        : 'border-gray-200'
                    }`}
                    onDragOver={(e) => handleGroupDragOver(e, group)}
                    onDragLeave={handleGroupDragLeave}
                    onDrop={(e) => handleGroupDrop(e, group)}
                  >
                    {/* Group Header - Draggable */}
                    <div
                      draggable={true}
                      onDragStart={(e) => handleGroupDragStart(e, group)}
                      onDragEnd={handleGroupDragEnd}
                      className="flex items-center justify-between mb-3 cursor-move bg-gray-50 rounded p-2"
                    >
                      <div className="flex items-center">
                        <GripVertical className="w-4 h-4 text-gray-400 mr-2" />
                        <h4 className="font-medium text-gray-900">Grupo {group.group_number}</h4>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1 text-gray-500" />
                          <span>{group.tee_time}</span>
                        </div>
                        <div className="flex items-center">
                          <Trophy className="w-3 h-3 mr-1 text-gray-500" />
                          <span>Hoyo {group.starting_hole}</span>
                        </div>
                        <div className="flex items-center">
                          <User className="w-3 h-3 mr-1 text-gray-500" />
                          <span>{group.participants?.length || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Participants Drop Zone */}
                    <div 
                      className={`p-4 space-y-3 transition-colors min-h-[120px] border-2 border-dashed ${
                        dragOverGroup === group.group_number && draggedPlayer
                          ? 'bg-gray-50 border-gray-300' 
                          : 'border-transparent'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (draggedPlayer && !draggedGroup) {
                          setDragOverGroup(group.group_number)
                        }
                      }}
                      onDragLeave={(e) => {
                        e.stopPropagation()
                        setDragOverGroup(null)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (draggedPlayer && draggedPlayer.group_number !== group.group_number) {
                          handleMovePlayer(draggedPlayer.participation_id, group.group_number)
                        }
                        setDraggedPlayer(null)
                        setDragOverGroup(null)
                      }}
                    >
                      {group.participants?.map((participant) => (
                        <div
                          key={participant.participation_id || participant.participant_id}
                          draggable={true}
                          onDragStart={(e) => {
                            console.log("Player drag start:", participant.player_name, participant.participation_id || participant.participant_id)
                            setDraggedPlayer(participant)
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', (participant.participation_id || participant.participant_id).toString())
                          }}
                          onDragEnd={() => {
                            console.log("Player drag end")
                            setDraggedPlayer(null)
                            setDragOverGroup(null)
                          }}
                          className="bg-white border border-gray-200 rounded-lg p-3 cursor-move hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-medium text-gray-900">{participant.player_name}</h5>
                              <div className="text-sm text-gray-600 mt-1 space-y-1">
                                <div className="flex items-center">
                                  <Trophy className="w-3 h-3 mr-1 text-gray-500" />
                                  <span>HCP: {participant.handicap_local !== null && participant.handicap_local !== undefined ? participant.handicap_local : "N/A"}</span>
                                </div>
                                {(participant as any).email && (
                                  <div className="flex items-center">
                                    <Mail className="w-3 h-3 mr-1 text-gray-500" />
                                    <span>{(participant as any).email}</span>
                                  </div>
                                )}
                                {(participant as any).phone && (
                                  <div className="flex items-center">
                                    <Phone className="w-3 h-3 mr-1 text-gray-500" />
                                    <span>{(participant as any).phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <GripVertical className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No se han generado grupos aun
              </div>
            )}

            <div className="flex justify-between items-center">
              <button
                onClick={handleCreateEmptyGroup}
                disabled={createEmptyGroup.isLoading}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center"
              >
                {createEmptyGroup.isLoading ? (
                  <>
                    <LoadingSpinner />
                    <span className="ml-2">Creando...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-2" />
                    Crear Grupo Vacío
                  </>
                )}
              </button>
              
              <button
                onClick={handleAssignTeeTimes}
                disabled={!groups?.length || assignTeeTimes.isLoading}
                className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center"
              >
                {assignTeeTimes.isLoading ? (
                  <>
                    <LoadingSpinner />
                    <span className="ml-2">Asignando...</span>
                  </>
                ) : (
                  'Asignar Horarios'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Resultado Final
            </h3>

            {groups && groups.length > 0 ? (
              <div className="space-y-3 mb-6">
                {groups.map((group) => (
                  <div 
                    key={group.group_number} 
                    className={`border rounded-lg p-3 transition-colors ${
                      dragOverGroup === group.group_number 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-200 bg-white'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOverGroup(group.group_number)
                    }}
                    onDragLeave={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const x = e.clientX
                      const y = e.clientY
                      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                        setDragOverGroup(null)
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOverGroup(null)
                      if (draggedPlayer && draggedPlayer.participation_id) {
                        handleMovePlayer(draggedPlayer.participation_id, group.group_number)
                      }
                    }}
                  >
                    {/* Header del grupo en una línea */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-4">
                        <h4 className="font-medium text-gray-900">Grupo {group.group_number}</h4>
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1 text-gray-500" />
                            <span>{group.tee_time || "Sin asignar"}</span>
                          </div>
                          <div className="flex items-center">
                            <Trophy className="w-3 h-3 mr-1 text-gray-500" />
                            <span>Hoyo {group.starting_hole}</span>
                          </div>
                          <div className="flex items-center">
                            <User className="w-3 h-3 mr-1 text-gray-500" />
                            <span>{group.participants?.length || 0} jugadores</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Jugadores en tabla horizontal (MÉTODO QUE FUNCIONA) */}
                    <table style={{width: '100%', backgroundColor: 'white', border: '2px solid #ddd', borderCollapse: 'collapse', marginBottom: '10px'}}>
                      <tr>
                        {group.participants && group.participants.length > 0 && group.participants.map((participant) => (
                          <td 
                            key={participant.participation_id || participant.participant_id} 
                            style={{
                              padding: '10px',
                              border: '1px solid #ccc',
                              backgroundColor: '#f8f9fa',
                              textAlign: 'center',
                              cursor: 'move'
                            }}
                            draggable
                            onDragStart={(e) => {
                              setDraggedPlayer(participant)
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragEnd={() => {
                              setDraggedPlayer(null)
                            }}
                          >
                            <div style={{fontWeight: 'bold'}}>{participant.player_name}</div>
                            <div style={{fontSize: '12px', color: '#666'}}>HC: {participant.handicap_index || "N/A"}</div>
                            {participant.player_type === 'external' && (
                              <div style={{fontSize: '10px', color: '#007bff'}}>Externo</div>
                            )}
                          </td>
                        ))}
                        {(!group.participants || group.participants.length === 0) && (
                          <td style={{padding: '20px', textAlign: 'center', color: '#999'}}>
                            Arrastra jugadores aquí
                          </td>
                        )}
                      </tr>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay grupos configurados
              </div>
            )}

            <div className="flex justify-between py-8">
              <button
                onClick={() => setCurrentStep(2)}
                className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300"
              >
                Volver a Editar
              </button>
              <button
                onClick={() => navigate(`/club/${clubId}`)}
                className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Reconfigure Modal */}
        {showReconfigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Reconfigurar Grupos
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Has realizado cambios manuales. Que deseas hacer?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowReconfigModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddNewPlayers}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  Solo nuevos jugadores
                </button>
                <button
                  onClick={handleFullReconfig}
                  className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  Reconfigurar todo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}