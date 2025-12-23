import { useState, useEffect } from 'react'
import { X, Clock, Play, RefreshCw, GripVertical, User, Trophy, Mail, Phone } from 'lucide-react'
import { Tournament } from '@/types/tournament'
import { useGenerateGroups, useAssignTeeTimes, useTournamentGroups, useMovePlayerToGroup, useMoveGroupToHole } from '@/hooks/useTournaments'
import { LoadingSpinner } from '@/components/LoadingSpinner'

interface TeeTimeManagerModalProps {
  isOpen: boolean
  onClose: () => void
  tournament: Tournament
  clubId: number
}

interface TeeTimeSettings {
  start_time: string
  interval_minutes: number
  groups_per_tee_time: number
  course_holes: number
  enable_two_sessions: boolean
  morning_end_time: string
  afternoon_start_time: string
  groupSize: number
  autoAssignByHandicap: boolean
}

interface Group {
  group_number: number;
  tee_time: string;
  starting_hole?: number;
  participants?: Participant[];
}

interface Participant {
  participation_id?: number;
  player_name?: string;
  handicap_local?: number | null;
  player_type?: 'member' | 'visitor' | 'external';
  email?: string;
  phone?: string;
}


export function TeeTimeManagerModal({ 
  isOpen, 
  onClose, 
  tournament, 
  clubId 
}: TeeTimeManagerModalProps) {
  const [currentStep, setCurrentStep] = useState<'groups' | 'teetimes' | 'view'>('groups')
  const [settings, setSettings] = useState<TeeTimeSettings>({
    start_time: '08:00',
    interval_minutes: 12,
    groups_per_tee_time: 1,
    course_holes: 18,
    enable_two_sessions: false,
    morning_end_time: '12:00',
    afternoon_start_time: '14:00',
    groupSize: 4,
    autoAssignByHandicap: true
  })

  const generateGroups = useGenerateGroups(clubId, tournament.tournament_id)
  const assignTeeTimes = useAssignTeeTimes(clubId, tournament.tournament_id)
  const { data: groups = [], isLoading: groupsLoading, refetch: refetchGroups } = useTournamentGroups(clubId, tournament.tournament_id)
  const movePlayer = useMovePlayerToGroup(clubId, tournament.tournament_id)
  const moveGroup = useMoveGroupToHole(clubId, tournament.tournament_id)

  // Estados para drag and drop
  const [draggedPlayer, setDraggedPlayer] = useState<any>(null)
  const [dragOverGroup, setDragOverGroup] = useState<number | null>(null)
  
  // Estados para drag and drop de grupos
  const [draggedGroup, setDraggedGroup] = useState<any>(null)
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null)
  
  // Estados para gestión de reconfiguración
  const [hasManualChanges, setHasManualChanges] = useState(false)
  const [showReconfigModal, setShowReconfigModal] = useState(false)

  // Verificar si ya hay configuración de tee times
  const hasExistingGroups = groups.length > 0
  const hasAssignedTeeTimes = groups.some(g => g.tee_time)
  const isFullyConfigured = hasExistingGroups && hasAssignedTeeTimes

  // Efecto para navegar automáticamente al paso correcto
  useEffect(() => {
    if (!groupsLoading && isOpen) {
      if (isFullyConfigured) {
        setCurrentStep('view')
      } else if (hasExistingGroups && !hasAssignedTeeTimes) {
        setCurrentStep('teetimes')
      } else {
        setCurrentStep('groups')
      }
    }
  }, [groupsLoading, hasExistingGroups, hasAssignedTeeTimes, isFullyConfigured, isOpen])

  const handleMovePlayer = async (participationId: number, newGroupNumber: number) => {
    try {
      console.log('🔄 Moving player:', { participationId, newGroupNumber })
      
      // Verificar que el grupo destino existe
      const targetGroupExists = groups.some(g => g.group_number === newGroupNumber)
      if (!targetGroupExists) {
        console.error('❌ Target group does not exist:', newGroupNumber)
        return
      }

      await movePlayer.mutateAsync({ participationId, newGroupNumber })
      console.log('✅ Player moved successfully')
      setHasManualChanges(true) // Marcar que hay cambios manuales
      refetchGroups()
    } catch (error) {
      console.error('❌ Error moving player:', error)
      // Handle missing properties
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.data?.message) {
          console.error('Server error:', axiosError.response.data.message);
        } else if (axiosError.message) {
          console.error('Error message:', axiosError.message);
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        console.error('Error message:', (error as any).message);
      }
    }
  }

  const handleMoveGroup = async (groupNumber: number, newStartingHole: number, newTeeTime?: string) => {
    try {
      console.log('🔄 Moving group:', { groupNumber, newStartingHole, newTeeTime })
      await moveGroup.mutateAsync({ groupNumber, newStartingHole, newTeeTime })
      console.log('✅ Group moved successfully')
      setHasManualChanges(true) // Marcar que hay cambios manuales
      refetchGroups()
    } catch (error) {
      console.error('❌ Error moving group:', error)
      // Handle missing properties
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.data?.message) {
          console.error('Server error:', axiosError.response.data.message);
        } else if (axiosError.message) {
          console.error('Error message:', axiosError.message);
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        console.error('Error message:', (error as any).message);
      }
    }
  }

  const handleSwapGroups = async (group1: any, group2: any) => {
    try {
      console.log('🔄 Testing simple group move:', { 
        group1: group1.group_number, 
        group2: group2.group_number,
        group1_hole: group1.starting_hole,
        group1_time: group1.tee_time,
        group2_hole: group2.starting_hole,
        group2_time: group2.tee_time
      })

      if (!group1 || !group2) {
        console.error('❌ Invalid groups provided:', { group1, group2 })
        return
      }
      
      // Por ahora, solo mover group1 al hoyo del group2 para test
      console.log('🔄 Simple test: Moving group 1 to group 2 position')
      console.log('🎯 About to call moveGroup.mutateAsync with:', {
        groupNumber: group1.group_number,
        newStartingHole: group2.starting_hole,
        newTeeTime: group2.tee_time
      })
      
      await moveGroup.mutateAsync({ 
        groupNumber: group1.group_number, 
        newStartingHole: group2.starting_hole, 
        newTeeTime: group2.tee_time 
      })
      
      console.log('✅ Simple move completed successfully')
      setHasManualChanges(true)
      refetchGroups()
    } catch (error) {
      console.error('❌ Error in simple move:', error)
      // Mostrar el error específico al usuario
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.data?.message) {
          console.error('Server error:', axiosError.response.data.message)
        }
      }
      if (error && typeof error === 'object' && 'message' in error) {
        console.error('Error message:', (error as any).message)
      }
    }
  }

  // Funciones para drag and drop de grupos
  const handleGroupDragStart = (e: React.DragEvent, group: any) => {
    console.log('🎯 Group drag start:', { 
      group: group.group_number,
      starting_hole: group.starting_hole,
      tee_time: group.tee_time
    })
    e.stopPropagation() // Evitar conflictos con otros drag handlers
    setDraggedGroup(group)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'group', group: group.group_number }))
  }

  const handleGroupDragOver = (e: React.DragEvent, targetGroup: any) => {
    if (draggedGroup && draggedGroup.group_number !== targetGroup.group_number) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverPosition(targetGroup.group_number)
      console.log('🎯 Group drag over:', { 
        draggedGroup: draggedGroup.group_number,
        targetGroup: targetGroup.group_number 
      })
    }
  }

  const handleGroupDragLeave = () => {
    setDragOverPosition(null)
  }

  const handleGroupDrop = async (e: React.DragEvent, targetGroup: any) => {
    e.preventDefault()
    e.stopPropagation()
    
    const dragData = e.dataTransfer.getData('text/plain')
    console.log('🎯 Group drop triggered:', { 
      draggedGroup: draggedGroup?.group_number || 'none',
      targetGroup: targetGroup.group_number,
      hasDraggedGroup: !!draggedGroup,
      dragData
    })
    
    // Verificar que es un drag de grupo válido
    if (draggedGroup && draggedGroup.group_number !== targetGroup.group_number) {
      console.log('🎯 Group drop valid, swapping groups:', { 
        draggedGroup: draggedGroup.group_number,
        targetGroup: targetGroup.group_number 
      })
      
      await handleSwapGroups(draggedGroup, targetGroup)
    } else {
      console.log('🎯 Group drop invalid or same group')
    }
    
    setDraggedGroup(null)
    setDragOverPosition(null)
  }

  const handleGroupDragEnd = () => {
    setDraggedGroup(null)
    setDragOverPosition(null)
  }

  // Funciones para drag and drop de jugadores
  const handleDragStart = (e: React.DragEvent, player: any) => {
    console.log('🎯 Drag start:', { 
      player: player.player_name,
      participation_id: player.participation_id,
      current_group: player.group_number 
    })
    setDraggedPlayer(player)
    e.dataTransfer.effectAllowed = 'move'
    // Establecer datos para transferencia
    e.dataTransfer.setData('text/plain', JSON.stringify(player))
  }

  const handleDragOver = (e: React.DragEvent, groupNumber: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverGroup(groupNumber)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Solo limpiar si realmente salimos del contenedor del grupo
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverGroup(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetGroupNumber: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverGroup(null)

    console.log('🎯 Drop event:', { 
      draggedPlayer: draggedPlayer?.participation_id,
      currentGroup: draggedPlayer?.group_number,
      targetGroup: targetGroupNumber 
    })

    if (draggedPlayer && draggedPlayer.group_number !== targetGroupNumber) {
      console.log('🔄 Moving player to different group')
      await handleMovePlayer(draggedPlayer.participation_id, targetGroupNumber)
    } else {
      console.log('❌ Not moving - same group or no dragged player')
    }
    setDraggedPlayer(null)
  }

  const handleDragEnd = () => {
    setDraggedPlayer(null)
    setDragOverGroup(null)
  }

  // Funciones para manejo de reconfiguración
  const handleReconfigureClick = () => {
    if (hasManualChanges) {
      setShowReconfigModal(true)
    } else {
      setCurrentStep('groups')
    }
  }

  const handleAddNewPlayer = async () => {
    // Solo agregar nuevos participantes manteniendo la estructura actual
    try {
      await generateGroups.mutateAsync({
        groupSize: settings.groupSize,
        autoAssignByHandicap: settings.autoAssignByHandicap,
        preserveExistingGroups: true
      })
      console.log('✅ Added new players while preserving existing groups')
      refetchGroups()
      setShowReconfigModal(false)
      setCurrentStep('view')
    } catch (error) {
      console.error('Error adding new players:', error)
      setShowReconfigModal(false)
    }
  }

  const handleFullReconfig = async () => {
    // Regenerar todo desde cero
    setHasManualChanges(false)
    setCurrentStep('groups')
    setShowReconfigModal(false)
  }

  const handleGenerateGroups = async () => {
    try {
      await generateGroups.mutateAsync({
        groupSize: settings.groupSize,
        autoAssignByHandicap: settings.autoAssignByHandicap
      })
      setHasManualChanges(false) // Resetear flag de cambios manuales
      refetchGroups()
      setCurrentStep('teetimes')
    } catch (error) {
      console.error('Error generating groups:', error)
    }
  }

  const handleAssignTeeTimes = async () => {
    try {
      await assignTeeTimes.mutateAsync({
        start_time: settings.start_time,
        interval_minutes: settings.interval_minutes,
        course_holes: settings.course_holes,
        enable_two_sessions: settings.enable_two_sessions,
        enable_simultaneous_starts: false,
        morning_end_time: settings.morning_end_time,
        afternoon_start_time: settings.afternoon_start_time
      })
      refetchGroups()
      setCurrentStep('view')
    } catch (error) {
      console.error('Error assigning tee times:', error)
    }
  }

  const handleClose = () => {
    setCurrentStep('groups')
    onClose()
  }

  const formatTeeTime = (teeTime: string) => {
    if (!teeTime) return 'Sin asignar'
    return new Date(`2000-01-01 ${teeTime}`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
         onDrop={(e) => {
           e.preventDefault()
           console.log('🚫 Drop on modal background - preventing default')
           setDraggedPlayer(null)
           setDragOverGroup(null)
         }}
         onDragOver={(e) => e.preventDefault()}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Gestión de Tee Times</h2>
              <p className="text-gray-300">{tournament.tournament_name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${
              currentStep === 'groups' ? 'text-gray-800' : 
              groups.length > 0 ? 'text-gray-700' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStep === 'groups' ? 'bg-gray-800 text-white' :
                groups.length > 0 ? 'bg-gray-600 text-white' : 'bg-gray-200'
              }`}>1</div>
              <span>Generar Grupos</span>
            </div>
            
            <div className={`w-8 h-1 ${groups.length > 0 ? 'bg-gray-600' : 'bg-gray-200'}`} />
            
            <div className={`flex items-center space-x-2 ${
              currentStep === 'teetimes' ? 'text-gray-800' : 
              groups.some(g => g.tee_time) ? 'text-gray-700' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStep === 'teetimes' ? 'bg-gray-800 text-white' :
                groups.some(g => g.tee_time) ? 'bg-gray-600 text-white' : 'bg-gray-200'
              }`}>2</div>
              <span>Asignar Horarios</span>
            </div>
            
            <div className={`w-8 h-1 ${groups.some(g => g.tee_time) ? 'bg-gray-600' : 'bg-gray-200'}`} />
            
            <div className={`flex items-center space-x-2 ${
              currentStep === 'view' ? 'text-gray-800' : 
              groups.some(g => g.tee_time) ? 'text-gray-700' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStep === 'view' ? 'bg-gray-800 text-white' :
                groups.some(g => g.tee_time) ? 'bg-gray-600 text-white' : 'bg-gray-200'
              }`}>3</div>
              <span>Ver Resultado</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {/* Estado de configuración existente */}
          {isFullyConfigured && (
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Tee Times Configurados
                    </h3>
                    <p className="text-gray-700">
                      Este torneo ya tiene {groups.length} grupos con horarios asignados. Puedes editarlos abajo o reconfigurar todo.
                      {hasManualChanges && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                          Editado manualmente
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleReconfigureClick}
                    className="px-4 py-2 text-sm bg-white border border-gray-400 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    {hasManualChanges ? 'Agregar Jugadores' : 'Reconfigurar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {hasExistingGroups && !hasAssignedTeeTimes && (
            <div className="mb-6 bg-gray-50 border border-gray-300 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Grupos Creados - Faltan Tee Times
                  </h3>
                  <p className="text-gray-700">
                    Los grupos están listos. Asigna los horarios en el Paso 2.
                  </p>
                </div>
              </div>
            </div>
          )}
          {currentStep === 'groups' && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Paso 1: Configuración de Grupos
                </h3>
                <p className="text-gray-700">
                  Configura cómo quieres organizar a los participantes en grupos para el torneo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Participantes por grupo
                    </label>
                    <select
                      value={settings.groupSize}
                      onChange={(e) => setSettings(prev => ({ ...prev, groupSize: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={2}>2 participantes</option>
                      <option value={3}>3 participantes</option>
                      <option value={4}>4 participantes</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.autoAssignByHandicap}
                        onChange={(e) => setSettings(prev => ({ ...prev, autoAssignByHandicap: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Organizar automáticamente por handicap
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Los handicaps más bajos jugarán en los primeros grupos
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Vista previa</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Grupos de {settings.groupSize} participantes</p>
                    <p>• {settings.autoAssignByHandicap ? 'Ordenados por handicap' : 'Orden de inscripción'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateGroups}
                  disabled={generateGroups.isPending}
                  className="flex items-center space-x-2 px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
                >
                  {generateGroups.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span>Generar Grupos</span>
                </button>
              </div>
            </div>
          )}

          {currentStep === 'teetimes' && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Paso 2: Asignación de Tee Times
                </h3>
                <p className="text-gray-700">
                  Configura los horarios de salida para cada grupo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Configuración básica</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora de inicio
                    </label>
                    <input
                      type="time"
                      value={settings.start_time}
                      onChange={(e) => setSettings(prev => ({ ...prev, start_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Intervalo entre grupos (minutos)
                    </label>
                    <select
                      value={settings.interval_minutes}
                      onChange={(e) => setSettings(prev => ({ ...prev, interval_minutes: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={8}>8 minutos</option>
                      <option value={10}>10 minutos</option>
                      <option value={12}>12 minutos</option>
                      <option value={15}>15 minutos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hoyos del campo
                    </label>
                    <select
                      value={settings.course_holes}
                      onChange={(e) => setSettings(prev => ({ ...prev, course_holes: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={9}>9 hoyos</option>
                      <option value={18}>18 hoyos</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Turnos múltiples</h4>
                  
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.enable_two_sessions}
                        onChange={(e) => setSettings(prev => ({ ...prev, enable_two_sessions: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Habilitar turno mañana y tarde
                      </span>
                    </label>
                  </div>

                  {settings.enable_two_sessions && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fin turno mañana
                        </label>
                        <input
                          type="time"
                          value={settings.morning_end_time}
                          onChange={(e) => setSettings(prev => ({ ...prev, morning_end_time: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Inicio turno tarde
                        </label>
                        <input
                          type="time"
                          value={settings.afternoon_start_time}
                          onChange={(e) => setSettings(prev => ({ ...prev, afternoon_start_time: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('groups')}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Volver
                </button>
                <button
                  onClick={handleAssignTeeTimes}
                  disabled={assignTeeTimes.isPending}
                  className="flex items-center space-x-2 px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
                >
                  {assignTeeTimes.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span>Asignar Horarios</span>
                </button>
              </div>
            </div>
          )}

          {currentStep === 'view' && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Tee Times Asignados
                </h3>
                <p className="text-gray-700">
                  Revisa y ajusta los horarios asignados según sea necesario.
                </p>
              </div>

              {groupsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Instrucciones de drag and drop */}
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                    <p className="text-sm text-gray-700">
                      <strong>Arrastra y suelta:</strong>
                    </p>
                    <ul className="text-sm text-gray-600 mt-1 ml-4 list-disc">
                      <li>Jugadores individuales entre grupos</li>
                      <li>Grupos completos para intercambiar posiciones</li>
                    </ul>
                  </div>

                  {groups.map((group: Group) => (
                    <div 
                      key={group.group_number} 
                      className={`bg-white border-2 rounded-lg p-4 shadow-sm transition-all duration-200 ${
                        dragOverGroup === group.group_number 
                          ? 'border-gray-400 bg-gray-50 shadow-lg' 
                          : dragOverPosition === group.group_number
                          ? 'border-blue-400 bg-blue-50 shadow-lg'
                          : 'border-gray-200'
                      }`}
                      onDragOver={(e) => {
                        // Si estamos arrastrando un jugador, usar la función de jugador
                        if (draggedPlayer) {
                          handleDragOver(e, group.group_number)
                        } 
                        // Si estamos arrastrando un grupo, usar la función de grupo
                        else if (draggedGroup) {
                          handleGroupDragOver(e, group)
                        }
                      }}
                      onDragLeave={(e) => {
                        if (draggedPlayer) {
                          handleDragLeave(e)
                        } else if (draggedGroup) {
                          handleGroupDragLeave()
                        }
                      }}
                      onDrop={(e) => {
                        // Si estamos arrastrando un jugador, usar la función de jugador
                        if (draggedPlayer) {
                          handleDrop(e, group.group_number)
                        } 
                        // Si estamos arrastrando un grupo, usar la función de grupo
                        else if (draggedGroup) {
                          handleGroupDrop(e, group)
                        }
                      }}
                    >
                      <div 
                        className="flex items-center justify-between mb-3 cursor-move"
                        draggable={true}
                        onDragStart={(e) => handleGroupDragStart(e, group)}
                        onDragEnd={handleGroupDragEnd}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                            <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
                              Grupo {group.group_number}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 text-lg font-semibold text-gray-700">
                            <Clock className="w-4 h-4 text-gray-500" />
                            {formatTeeTime(group.tee_time)}
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <Trophy className="w-4 h-4 text-gray-500" />
                            Hoyo {group.starting_hole}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <User className="w-4 h-4 text-gray-500" />
                            {group.participants?.length || 0} jugador{(group.participants?.length || 0) !== 1 ? 'es' : ''}
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-600">Hoyo:</label>
                            <select
                              value={group.starting_hole}
                              onChange={(e) => {
                                const newHole = parseInt(e.target.value)
                                if (newHole !== group.starting_hole) {
                                  handleMoveGroup(group.group_number, newHole, group.tee_time)
                                }
                              }}
                              className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-700 focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                              disabled={moveGroup.isPending}
                            >
                              {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => (
                                <option key={hole} value={hole}>
                                  {hole}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 min-h-[60px]">
                        {group.participants?.map((participant: Participant) => (
                          <div 
                            key={participant.participation_id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, { ...participant, group_number: group.group_number })}
                            onDragEnd={handleDragEnd}
                            className={`bg-gray-50 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md hover:bg-gray-100 ${
                              draggedPlayer?.participation_id === participant.participation_id 
                                ? 'opacity-50 scale-95' 
                                : ''
                            }`}
                          >
                            <div className="flex items-start space-x-2">
                              <GripVertical className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">{participant.player_name}</div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <div className="flex items-center space-x-1">
                                    <Trophy className="w-3 h-3 text-gray-500" />
                                    <span>HCP: {participant.handicap_local !== null && participant.handicap_local !== undefined ? participant.handicap_local : 'N/A'}</span>
                                    {participant.player_type === 'external' && (
                                      <span className="ml-1 text-xs text-gray-600">(Externo)</span>
                                    )}
                                  </div>
                                  {participant.email && (
                                    <div className="flex items-center space-x-1">
                                      <Mail className="w-3 h-3 text-gray-500" />
                                      <span className="text-xs truncate">{participant.email}</span>
                                    </div>
                                  )}
                                  {participant.phone && (
                                    <div className="flex items-center space-x-1">
                                      <Phone className="w-3 h-3 text-gray-500" />
                                      <span className="text-xs">{participant.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Zona de drop cuando el grupo está vacío */}
                        {(!group.participants || group.participants.length === 0) && (
                          <div className="col-span-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500">
                            Grupo vacío - arrastra jugadores aquí
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-8 py-8 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {groups.length > 0 && (
                <span>
                  {groups.length} grupos • {groups.reduce((acc, g) => acc + (g.participants?.length || 0), 0)} participantes
                </span>
              )}
            </div>
            
            <div className="flex space-x-4">
              {groups.length > 0 && currentStep !== 'view' && (
                <button
                  onClick={() => setCurrentStep('view')}
                  className="px-5 py-2 text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Ver Resultado
                </button>
              )}
              <button
                onClick={handleClose}
                className="px-8 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de reconfiguración */}
      {showReconfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Has realizado cambios manuales
              </h3>
              <p className="text-gray-700 mb-6">
                Detectamos que has movido jugadores manualmente. ¿Qué quieres hacer?
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={handleAddNewPlayer}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium"
                >
                  Agregar nuevos jugadores
                  <div className="text-sm text-gray-100 mt-1">
                    Mantiene los grupos actuales y añade nuevos participantes
                  </div>
                </button>
                
                <button
                  onClick={handleFullReconfig}
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium"
                >
                  Reconfigurar todo desde cero
                  <div className="text-sm text-gray-100 mt-1">
                    Reorganiza todos los jugadores perdiendo cambios manuales
                  </div>
                </button>
                
                <button
                  onClick={() => setShowReconfigModal(false)}
                  className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
