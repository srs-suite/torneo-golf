import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Calendar, GripVertical, User, Plus, Sun, Moon, HelpCircle, X, FileText } from 'lucide-react'
import { useTournaments, useTournamentGroups, useGenerateGroups, useAssignTeeTimes, useMovePlayerToGroup, useMoveGroupToHole, useSwapGroupNumbers, useCreateEmptyGroup, useDeleteEmptyGroup } from '@/hooks/useTournaments'

interface TeeTimeConfig {
  startTime: string
  intervalMinutes: number
  courseHoles: number
  enableTwoSessions: boolean
  enableSimultaneousStarts: boolean
  useInterval: boolean
  afternoonStartTime: string
  preferredSession: 'morning' | 'afternoon' // Nueva opción
}

export default function TeeTimeManagerSimple() {
  const { clubId, tournamentId } = useParams<{ clubId: string; tournamentId: string }>()
  const navigate = useNavigate()
  
  const clubIdNum = clubId ? parseInt(clubId) : 0
  const tournamentIdNum = tournamentId ? parseInt(tournamentId) : 0
  
  console.log('🚀 TeeTimeManagerSimple LOADED!')
  
  const [currentStep, setCurrentStep] = useState(1)
  const [manualNavigation, setManualNavigation] = useState(false)
  const [isReconfiguring, setIsReconfiguring] = useState(false)
  const [config, setConfig] = useState<TeeTimeConfig>({
    startTime: "08:00",
    intervalMinutes: 10,
    courseHoles: 18,
    enableTwoSessions: false,
    enableSimultaneousStarts: false,
    useInterval: false,
    afternoonStartTime: "14:00",
    preferredSession: 'morning'
  })
  
  const { data: tournaments } = useTournaments(clubIdNum)
  const tournament = tournaments?.find(t => t.tournament_id === tournamentIdNum)
  const { data: groups, refetch: refetchGroups } = useTournamentGroups(clubIdNum, tournamentIdNum)
  const generateGroups = useGenerateGroups(clubIdNum, tournamentIdNum)
  const assignTeeTimes = useAssignTeeTimes(clubIdNum, tournamentIdNum)
  const movePlayer = useMovePlayerToGroup(clubIdNum, tournamentIdNum)
  const moveGroup = useMoveGroupToHole(clubIdNum, tournamentIdNum)
  const swapGroupNumbers = useSwapGroupNumbers(clubIdNum, tournamentIdNum)
  const createEmptyGroup = useCreateEmptyGroup(clubIdNum, tournamentIdNum)
  const deleteEmptyGroup = useDeleteEmptyGroup(clubIdNum, tournamentIdNum)
  
  // Drag & Drop states
  const [draggedPlayer, setDraggedPlayer] = useState<any>(null)
  const [draggedGroup, setDraggedGroup] = useState<any>(null)
  const [dragOverGroup, setDragOverGroup] = useState<number | null>(null)
  
  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false)
  
  // Create group modal state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [newGroupConfig, setNewGroupConfig] = useState({
    hole: 1,
    time: ''
  })
  
  // Session filter state
  const [sessionFilter, setSessionFilter] = useState<'all' | 'morning' | 'afternoon'>('all')
  
  // Auto refetch groups when generated
  useEffect(() => {
    if (generateGroups.isSuccess && !groups?.length) {
      refetchGroups()
    }
  }, [generateGroups.isSuccess, groups, refetchGroups])

  // Auto-detectar si ya hay grupos configurados y saltar directamente al paso 3
  useEffect(() => {
    if (groups && groups.length > 0 && !manualNavigation && !isReconfiguring) {
      const groupsWithParticipants = groups.filter(g => g.participants && g.participants.length > 0)
      
      if (groupsWithParticipants.length > 0) {
        // Si hay grupos con participantes, ir directamente al paso 3 (ver grupos)
        if (currentStep === 1) {
          console.log('✅ Grupos existentes detectados, saltando al paso 3 (ver grupos)')
          setCurrentStep(3)
        }
        // Si acabamos de generar grupos exitosamente, ir al paso 2
        else if (generateGroups.isSuccess && currentStep === 1) {
          console.log('✅ Grupos generados exitosamente, avanzando al paso 2')
          setCurrentStep(2)
        }
      }
    }
  }, [groups, currentStep, generateGroups.isSuccess, manualNavigation, isReconfiguring])

  const handleGenerateGroups = () => {
    // Advertencia si ya hay grupos configurados
    if (groups && groups.length > 0) {
      const confirmRegenerate = window.confirm(
        `⚠️ ADVERTENCIA: Ya tienes ${groups.length} grupos configurados.\n\n` +
        `Si continúas, se PERDERÁN todas tus modificaciones manuales.\n\n` +
        `¿Estás seguro de que quieres regenerar los grupos?`
      )
      
      if (!confirmRegenerate) {
        return // Cancelar si el usuario no confirma
      }
    }
    
    generateGroups.mutate({
      preserveExistingGroups: false
    }, {
      onSuccess: () => {
        console.log('✅ Groups generated successfully, moving to step 2')
        setIsReconfiguring(false) // Desactivar modo reconfiguración
        setManualNavigation(false) // Desactivar navegación manual
        setCurrentStep(2)
      }
    })
  }

  const handleAssignTeeTimes = () => {
    // Si se prefiere la tarde, usar la hora de la tarde como inicio principal
    const actualStartTime = config.preferredSession === 'afternoon' ? config.afternoonStartTime : config.startTime;
    
    assignTeeTimes.mutate({
      start_time: actualStartTime,
      interval_minutes: config.intervalMinutes,
      course_holes: config.courseHoles,
      enable_two_sessions: config.enableTwoSessions,
      enable_simultaneous_starts: config.enableSimultaneousStarts,
      afternoon_start_time: config.afternoonStartTime,
      preferred_session: config.preferredSession
    }, {
      onSuccess: () => {
        console.log('✅ Tee times assigned successfully')
        refetchGroups()
        // Agregar un pequeño delay para que el usuario vea el progreso
        setTimeout(() => {
          console.log('✅ Moving to step 3 after delay')
          setCurrentStep(3)
        }, 1500) // 1.5 segundos de delay
      }
    })
  }

  const handleConfigChange = (field: keyof TeeTimeConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  // Drag & Drop handlers
  const handleMovePlayer = (participationId: number, targetGroupNumber: number) => {
    movePlayer.mutate(
      { participationId, newGroupNumber: targetGroupNumber },
      {
        onSuccess: () => {
          refetchGroups()
        },
        onError: (error) => {
          console.error('Error moving player:', error)
        }
      }
    )
  }

  const handleMoveGroup = (groupNumber: number, newStartingHole: number, newTeeTime?: string | null) => {
    // Validar conflictos de horario en el mismo hoyo
    if (newTeeTime && groups) {
      const conflictingGroup = groups.find(g => 
        g.group_number !== groupNumber && 
        g.starting_hole === newStartingHole && 
        formatTime(g.tee_time) === newTeeTime
      )
      
      if (conflictingGroup) {
        alert(`⚠️ Conflicto de horario: El grupo ${conflictingGroup.group_number} ya está programado para salir del hoyo ${newStartingHole} a las ${newTeeTime}. Por favor, elije una hora diferente.`)
        return
      }
    }
    
    moveGroup.mutate(
      { groupNumber, newStartingHole, newTeeTime: newTeeTime || undefined },
      {
        onSuccess: () => {
          refetchGroups()
        },
        onError: (error) => {
          console.error('Error moving group:', error)
        }
      }
    )
  }

  const handleCreateEmptyGroup = () => {
    setShowCreateGroupModal(true)
  }

  const handleConfirmCreateGroup = () => {
    // Validar conflictos de horario
    if (newGroupConfig.time && groups) {
      const conflictingGroup = groups.find(g => 
        g.starting_hole === newGroupConfig.hole && 
        formatTime(g.tee_time) === newGroupConfig.time
      )
      
      if (conflictingGroup) {
        alert(`⚠️ Conflicto de horario: El grupo ${conflictingGroup.group_number} ya está programado para salir del hoyo ${newGroupConfig.hole} a las ${newGroupConfig.time}. Por favor, elije una hora diferente.`)
        return
      }
    }
    
    console.log('🔄 Creating empty group with config:', newGroupConfig)
    createEmptyGroup.mutate({
      hole: newGroupConfig.hole,
      time: newGroupConfig.time || null
    }, {
      onSuccess: (data) => {
        console.log('✅ Empty group created successfully:', data)
        setShowCreateGroupModal(false)
        setNewGroupConfig({ hole: 1, time: '' })
        refetchGroups()
      },
      onError: (error) => {
        console.error('❌ Error creating empty group:', error)
        alert(`Error al crear grupo vacío: ${error.response?.data?.message || error.message}`)
      }
    })
  }

  // Función para formatear tiempo a HH:MM
  const formatTime = (timeString: string | null): string => {
    if (!timeString) return "Sin asignar"
    
    // Si el tiempo ya está en formato HH:MM, devolverlo tal como está
    if (timeString.match(/^\d{1,2}:\d{2}$/)) {
      const [hours, minutes] = timeString.split(':').map(Number)
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
    
    // Si tiene segundos (HH:MM:SS), removerlos
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':').map(Number)
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
    
    return timeString
  }

  // Función para determinar la sesión basada en la hora
  const getSessionFromTime = (timeString: string | null): 'morning' | 'afternoon' => {
    if (!timeString) return 'morning'
    
    const [hours] = timeString.split(':').map(Number)
    // Consideramos que la tarde empieza a partir de las 13:00 (1 PM)
    return hours >= 13 ? 'afternoon' : 'morning'
  }

  // Función para filtrar grupos por sesión
  const getFilteredGroups = () => {
    if (!groups) return []
    
    if (sessionFilter === 'all') return groups
    
    return groups.filter(group => getSessionFromTime(group.tee_time) === sessionFilter)
  }

  // Función para toggle del filtro de sesión
  const handleSessionFilterToggle = (session: 'morning' | 'afternoon') => {
    if (sessionFilter === session) {
      // Si ya está activo este filtro, mostrar todos
      setSessionFilter('all')
    } else {
      // Activar el filtro seleccionado
      setSessionFilter(session)
    }
  }

  // Función para cambiar la sesión de un grupo
  const handleSwitchSession = (groupNumber: number, currentTime: string | null) => {
    const currentSession = getSessionFromTime(currentTime)
    const newSession = currentSession === 'morning' ? 'afternoon' : 'morning'
    
    // Calcular la nueva hora considerando otros grupos en la sesión destino
    let newTime: string
    
    if (newSession === 'afternoon') {
      // Buscar el último grupo de la tarde para asignar el siguiente horario
      const afternoonGroups = groups?.filter(g => 
        getSessionFromTime(g.tee_time) === 'afternoon' && g.group_number !== groupNumber
      ) || []
      
      if (afternoonGroups.length === 0) {
        // Si no hay grupos en la tarde, usar la hora de inicio de la tarde
        newTime = config.afternoonStartTime
      } else {
        // Buscar la última hora y agregar el intervalo
        const latestTime = afternoonGroups
          .map(g => g.tee_time)
          .filter(Boolean)
          .sort()
          .pop()
        
        if (latestTime) {
          const [hours, minutes] = latestTime.split(':').map(Number)
          const newMinutes = minutes + config.intervalMinutes
          const newHours = hours + Math.floor(newMinutes / 60)
          const finalMinutes = newMinutes % 60
          newTime = `${newHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`
        } else {
          newTime = config.afternoonStartTime
        }
      }
    } else {
      // Buscar el último grupo de la mañana para asignar el siguiente horario
      const morningGroups = groups?.filter(g => 
        getSessionFromTime(g.tee_time) === 'morning' && g.group_number !== groupNumber
      ) || []
      
      if (morningGroups.length === 0) {
        // Si no hay grupos en la mañana, usar la hora de inicio
        newTime = config.startTime
      } else {
        // Buscar la última hora y agregar el intervalo
        const latestTime = morningGroups
          .map(g => g.tee_time)
          .filter(Boolean)
          .sort()
          .pop()
        
        if (latestTime) {
          const [hours, minutes] = latestTime.split(':').map(Number)
          const newMinutes = minutes + config.intervalMinutes
          const newHours = hours + Math.floor(newMinutes / 60)
          const finalMinutes = newMinutes % 60
          newTime = `${newHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`
        } else {
          newTime = config.startTime
        }
      }
    }

    // Llamar a la función para mover el grupo (reutilizamos la función existente)
    const targetGroup = groups?.find(g => g.group_number === groupNumber)
    if (targetGroup) {
      console.log(`🔄 Switching group ${groupNumber} from ${currentSession} to ${newSession} at ${newTime}`)
      handleMoveGroup(groupNumber, targetGroup.starting_hole || 1, newTime)
    }
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Torneo no encontrado</h2>
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight: '100vh', backgroundColor: '#f9fafb', padding: '20px'}}>
      <div style={{maxWidth: '1200px', margin: '0 auto'}}>
        
        {/* Header */}
        <div style={{backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div style={{display: 'flex', alignItems: 'center'}}>
              <button
                onClick={() => navigate(`/club/${clubId}/admin`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  marginRight: '20px'
                }}
              >
                <ArrowLeft size={20} />
                <span style={{marginLeft: '8px'}}>Volver</span>
              </button>
              <h1 style={{fontSize: '24px', fontWeight: 'bold', margin: 0}}>
                Gestión de Tee Times - {tournament.tournament_name}
              </h1>
            </div>
          </div>
        </div>

        {/* Steps Navigation */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 16px',
              backgroundColor: currentStep === 1 ? '#374151' : '#e5e7eb',
              color: currentStep === 1 ? 'white' : '#6b7280',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              1. Configurar Grupos
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 16px',
              backgroundColor: currentStep === 2 ? '#374151' : '#e5e7eb',
              color: currentStep === 2 ? 'white' : '#6b7280',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              2. Configurar Tee Times
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 16px',
              backgroundColor: currentStep === 3 ? '#374151' : '#e5e7eb',
              color: currentStep === 3 ? 'white' : '#6b7280',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              3. Ver Resultado
            </div>
          </div>
        </div>

        {/* Step 1: Configure Groups */}
        {currentStep === 1 && (
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '30px'}}>
              Paso 1: Configurar Grupos
            </h2>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px'}}>
              
              {/* Basic Settings */}
              <div>
                <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '15px'}}>Configuración Básica</h3>
                
                <div style={{marginBottom: '15px'}}>
                  <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                    Hora de inicio:
                  </label>
                  <input
                    type="time"
                    value={config.startTime}
                    onChange={(e) => handleConfigChange('startTime', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px'
                    }}
                  />
                </div>
                
                        <div style={{marginBottom: '15px'}}>
          <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
            Modalidad del torneo:
          </label>
          <select
            value={config.courseHoles}
            onChange={(e) => handleConfigChange('courseHoles', parseInt(e.target.value))}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px'
            }}
          >
            <option value="18">18 hoyos (recomendado)</option>
            <option value="9">9 hoyos (solo para clubes con limitaciones)</option>
          </select>

        </div>

        {/* Nueva opción: Sesión preferida */}
        <div style={{marginBottom: '15px'}}>
          <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
            Sesión preferida para grupos principales:
          </label>
          <div style={{display: 'flex', gap: '15px', marginBottom: '10px'}}>
            <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
              <input
                type="radio"
                name="preferredSession"
                value="morning"
                checked={config.preferredSession === 'morning'}
                onChange={(e) => handleConfigChange('preferredSession', e.target.value)}
                style={{marginRight: '8px'}}
              />
              Mañana (grupos principales temprano)
            </label>
            <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
              <input
                type="radio"
                name="preferredSession"
                value="afternoon"
                checked={config.preferredSession === 'afternoon'}
                onChange={(e) => handleConfigChange('preferredSession', e.target.value)}
                style={{marginRight: '8px'}}
              />
              Tarde (grupos principales en la tarde)
            </label>
          </div>

        </div>
              </div>

              {/* Start Type Settings */}
              <div>
                <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '15px'}}>Tipo de Salida</h3>
                
                <div style={{marginBottom: '15px'}}>
                  <label style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                    <input
                      type="radio"
                      checked={!config.enableSimultaneousStarts}
                      onChange={() => handleConfigChange('enableSimultaneousStarts', false)}
                      style={{marginRight: '8px'}}
                    />
                    Salidas consecutivas
                  </label>

                  
                  {!config.enableSimultaneousStarts && (
                    <div style={{marginLeft: '25px', marginBottom: '15px'}}>
                      <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>
                        Intervalo entre grupos (minutos):
                      </label>
                      <input
                        type="number"
                        value={config.intervalMinutes}
                        onChange={(e) => handleConfigChange('intervalMinutes', parseInt(e.target.value))}
                        style={{
                          width: '100px',
                          padding: '6px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  )}
                  
                  <label style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                    <input
                      type="radio"
                      checked={config.enableSimultaneousStarts}
                      onChange={() => handleConfigChange('enableSimultaneousStarts', true)}
                      style={{marginRight: '8px'}}
                    />
                    Salidas simultáneas (shotgun)
                  </label>

                  
                  
                  {config.enableSimultaneousStarts && (
                    <div style={{marginLeft: '25px', marginTop: '10px'}}>
                      <label style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                        <input
                          type="checkbox"
                          checked={config.enableTwoSessions}
                          onChange={(e) => handleConfigChange('enableTwoSessions', e.target.checked)}
                          style={{marginRight: '8px'}}
                        />
                        Habilitar dos tandas (mañana y tarde)
                      </label>
                      
                      {config.enableTwoSessions && (
                        <div style={{marginLeft: '25px'}}>
                          <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>
                            Inicio tanda vespertina:
                          </label>
                          <input
                            type="time"
                            value={config.afternoonStartTime}
                            onChange={(e) => handleConfigChange('afternoonStartTime', e.target.value)}
                            style={{
                              padding: '6px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px'
                            }}
                          />
                        </div>
                      )}
                      
                      <label style={{display: 'flex', alignItems: 'center', marginTop: '10px'}}>
                        <input
                          type="checkbox"
                          checked={config.useInterval}
                          onChange={(e) => handleConfigChange('useInterval', e.target.checked)}
                          style={{marginRight: '8px'}}
                        />
                        Usar intervalo entre grupos (opcional)
                      </label>
                      
                      {config.useInterval && (
                        <div style={{marginLeft: '25px', marginTop: '5px'}}>
                          <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>
                            Intervalo (minutos):
                          </label>
                          <input
                            type="number"
                            value={config.intervalMinutes}
                            onChange={(e) => handleConfigChange('intervalMinutes', parseInt(e.target.value))}
                            style={{
                              width: '100px',
                              padding: '6px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div style={{textAlign: 'center'}}>
              <button
                onClick={() => {
                  handleGenerateGroups()
                  setCurrentStep(2)
                }}
                style={{
                  backgroundColor: '#374151',
                  color: 'white',
                  padding: '15px 30px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
                disabled={generateGroups.isLoading}
              >
                {generateGroups.isLoading ? 'Generando Grupos...' : 'Generar Grupos y Continuar'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configure Tee Times */}
        {currentStep === 2 && (() => {
          console.log('🔍 Renderizando Paso 2 - currentStep:', currentStep)
          return (
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '20px'}}>
              Paso 2: Revisar y Confirmar
            </h2>
            
            <div style={{backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '30px'}}>
              <h3 style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '15px'}}>Configuración Actual</h3>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                <div>
                  <p><strong>Hora de inicio:</strong> {config.startTime}</p>
                  <p><strong>Modalidad:</strong> {config.courseHoles === 9 ? '9 hoyos (limitado)' : '18 hoyos (estándar)'}</p>
                  <p><strong>Sesión preferida:</strong> {config.preferredSession === 'morning' ? 'Mañana - TODOS los grupos empezarán temprano' : 'Tarde - TODOS los grupos empezarán en la tarde'}</p>
                  <p><strong>Tipo de salida:</strong> {config.enableSimultaneousStarts ? 'Salidas simultáneas (shotgun)' : 'Salidas consecutivas'}</p>
                </div>
                <div>
                  {!config.enableSimultaneousStarts && (
                    <p><strong>Intervalo:</strong> {config.intervalMinutes} minutos</p>
                  )}
                  {config.enableSimultaneousStarts && config.enableTwoSessions && (
                    <p><strong>Dos tandas:</strong> Sí - Tarde inicia a las {config.afternoonStartTime}</p>
                  )}
                  {config.enableSimultaneousStarts && config.useInterval && (
                    <p><strong>Intervalo opcional:</strong> {config.intervalMinutes} minutos</p>
                  )}
                </div>
              </div>
            </div>
            

            
            <div style={{display: 'flex', gap: '10px'}}>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('🔙 Usuario navegando manualmente al paso 1 - currentStep actual:', currentStep)
                  setManualNavigation(true) // Activar navegación manual
                  setCurrentStep(1)
                  console.log('🔙 setCurrentStep(1) ejecutado')
                  // Resetear navegación manual después de un tiempo
                  setTimeout(() => setManualNavigation(false), 1000)
                }}
                style={{
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Volver
              </button>
              <button
                onClick={handleAssignTeeTimes}
                style={{
                  backgroundColor: '#374151',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
                disabled={assignTeeTimes.isLoading}
              >
                {assignTeeTimes.isLoading ? 'Procesando...' : 'Confirmar y Generar Tee Times'}
              </button>
            </div>
          </div>
          )
        })()}

        {/* Step 3: Groups Display */}
        {currentStep === 3 && groups && groups.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                <h2 style={{fontSize: '24px', fontWeight: 'bold', margin: 0}}>
                  Paso 3: Grupos con Tee Times Asignados
                </h2>
                {groups && groups.length > 0 && (
                  <div style={{
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    ✅ {groups.length} grupos configurados
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowHelpModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                  e.currentTarget.style.borderColor = '#9ca3af'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.borderColor = '#d1d5db'
                }}
              >
                <HelpCircle size={16} />
                Ayuda
              </button>
            </div>
            
            {/* Filtros de sesiones - Clicables */}
            {groups && groups.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '20px',
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div 
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '15px',
                    backgroundColor: sessionFilter === 'morning' ? '#dbeafe' : 'white',
                    borderRadius: '8px',
                    border: sessionFilter === 'morning' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: sessionFilter === 'morning' ? 'scale(1.02)' : 'scale(1)'
                  }}
                  onClick={() => handleSessionFilterToggle('morning')}
                  onMouseEnter={(e) => {
                    if (sessionFilter !== 'morning') {
                      e.currentTarget.style.backgroundColor = '#f3f4f6'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sessionFilter !== 'morning') {
                      e.currentTarget.style.backgroundColor = 'white'
                    }
                  }}
                >
                  <div style={{display: 'flex', justifyContent: 'center', marginBottom: '8px'}}>
                    <Sun size={20} style={{color: sessionFilter === 'morning' ? '#3b82f6' : '#6b7280'}} />
                  </div>
                  <div style={{
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: sessionFilter === 'morning' ? '#1e40af' : '#111827'
                  }}>
                    {groups.filter(g => getSessionFromTime(g.tee_time) === 'morning').length}
                  </div>
                  <div style={{
                    fontSize: '14px', 
                    color: sessionFilter === 'morning' ? '#3b82f6' : '#6b7280',
                    fontWeight: sessionFilter === 'morning' ? 'bold' : 'normal'
                  }}>
                    Grupos Mañana {sessionFilter === 'morning' && '✓'}
                  </div>
                </div>
                <div 
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '15px',
                    backgroundColor: sessionFilter === 'afternoon' ? '#fef3c7' : 'white',
                    borderRadius: '8px',
                    border: sessionFilter === 'afternoon' ? '2px solid #f59e0b' : '1px solid #d1d5db',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: sessionFilter === 'afternoon' ? 'scale(1.02)' : 'scale(1)'
                  }}
                  onClick={() => handleSessionFilterToggle('afternoon')}
                  onMouseEnter={(e) => {
                    if (sessionFilter !== 'afternoon') {
                      e.currentTarget.style.backgroundColor = '#f3f4f6'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sessionFilter !== 'afternoon') {
                      e.currentTarget.style.backgroundColor = 'white'
                    }
                  }}
                >
                  <div style={{display: 'flex', justifyContent: 'center', marginBottom: '8px'}}>
                    <Moon size={20} style={{color: sessionFilter === 'afternoon' ? '#f59e0b' : '#6b7280'}} />
                  </div>
                  <div style={{
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: sessionFilter === 'afternoon' ? '#92400e' : '#111827'
                  }}>
                    {groups.filter(g => getSessionFromTime(g.tee_time) === 'afternoon').length}
                  </div>
                  <div style={{
                    fontSize: '14px', 
                    color: sessionFilter === 'afternoon' ? '#f59e0b' : '#6b7280',
                    fontWeight: sessionFilter === 'afternoon' ? 'bold' : 'normal'
                  }}>
                    Grupos Tarde {sessionFilter === 'afternoon' && '✓'}
                  </div>
                </div>
              </div>
            )}
            
            {/* Indicador de filtro activo */}
            {sessionFilter !== 'all' && (
              <div style={{
                marginBottom: '20px',
                padding: '12px 16px',
                backgroundColor: sessionFilter === 'morning' ? '#dbeafe' : '#fef3c7',
                border: `1px solid ${sessionFilter === 'morning' ? '#3b82f6' : '#f59e0b'}`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: sessionFilter === 'morning' ? '#1e40af' : '#92400e',
                  fontWeight: 'bold'
                }}>
                  {sessionFilter === 'morning' ? <Sun size={16} /> : <Moon size={16} />}
                  Mostrando solo grupos de {sessionFilter === 'morning' ? 'mañana' : 'tarde'} 
                  ({getFilteredGroups().length} de {groups?.length || 0})
                </div>
                <button
                  onClick={() => setSessionFilter('all')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: sessionFilter === 'morning' ? '#3b82f6' : '#f59e0b',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textDecoration: 'underline'
                  }}
                >
                  Mostrar todos
                </button>
              </div>
            )}
            
            {getFilteredGroups().map((group) => (
              <div 
                key={group.group_number} 
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: dragOverGroup === group.group_number ? '2px solid #3b82f6' : 
                         ((group.participants?.length || 0) >= 4 ? '2px solid #9ca3af' : '1px solid #e5e7eb')
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (draggedPlayer || draggedGroup) {
                    // Solo permitir drag over si no es un jugador a un grupo lleno
                    if (draggedPlayer) {
                      const currentPlayerCount = group.participants?.length || 0
                      if (currentPlayerCount < 4 || draggedPlayer.group_number === group.group_number) {
                        setDragOverGroup(group.group_number)
                      }
                    } else {
                      setDragOverGroup(group.group_number)
                    }
                  }
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
                  
                  if (draggedPlayer) {
                    if (draggedPlayer.group_number !== group.group_number) {
                      // Validar que el grupo destino no tenga más de 4 jugadores
                      const currentPlayerCount = group.participants?.length || 0
                      if (currentPlayerCount >= 4) {
                        alert('No se puede mover el jugador: el grupo ya tiene 4 jugadores (máximo permitido)')
                        return
                      }
                      handleMovePlayer(draggedPlayer.participation_id, group.group_number)
                    }
                  } else if (draggedGroup) {
                    if (draggedGroup.group_number !== group.group_number) {
                      // Intercambiar números de grupo (renumeración)
                      console.log('🔄 Swapping group numbers:', {
                        group1: draggedGroup.group_number,
                        group2: group.group_number
                      })
                      
                      swapGroupNumbers.mutate({
                        groupNumber1: draggedGroup.group_number,
                        groupNumber2: group.group_number
                      }, {
                        onSuccess: () => {
                          refetchGroups()
                        },
                        onError: (error) => {
                          console.error('❌ Error al intercambiar números de grupo:', error)
                        }
                      })
                    }
                  }
                }}
              >
                {/* Group Header - Draggable for group movement */}
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '15px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'move'
                  }}
                  draggable
                  onDragStart={(e) => {
                    setDraggedGroup({
                      group_number: group.group_number,
                      starting_hole: group.starting_hole,
                      tee_time: group.tee_time
                    })
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => {
                    setDraggedGroup(null)
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'center'}}>
                    <GripVertical size={16} style={{marginRight: '8px', color: '#6b7280'}} />
                    <h3 style={{fontSize: '18px', fontWeight: 'bold', margin: 0}}>
                      Grupo {group.group_number}
                    </h3>
                    {(group.participants?.length || 0) >= 4 && (
                      <span style={{
                        marginLeft: '10px',
                        padding: '2px 8px',
                        backgroundColor: '#e5e7eb',
                        color: '#374151',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        border: '1px solid #d1d5db'
                      }}>
                        COMPLETO
                      </span>
                    )}
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <input
                        type="time"
                        step="60"
                        value={formatTime(group.tee_time) === "Sin asignar" ? "" : formatTime(group.tee_time)}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleMoveGroup(group.group_number, group.starting_hole || 1, e.target.value)
                          }
                        }}
                        style={{
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '14px',
                          width: '90px'
                        }}
                      />
                      {group.tee_time && formatTime(group.tee_time) !== "Sin asignar" && (
                        <button
                          onClick={() => {
                            handleMoveGroup(group.group_number, group.starting_hole || 1, null)
                          }}
                          style={{
                            backgroundColor: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            padding: '4px 6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#6b7280'
                          }}
                          title="Cancelar horario"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                      <Calendar size={16} style={{marginRight: '5px', color: '#6b7280'}} />
                      <span>Hoyo {group.starting_hole}</span>
                      {groups && groups.filter(g => g.starting_hole === group.starting_hole).length > 1 && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '12px',
                          backgroundColor: '#fbbf24',
                          color: '#92400e',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontWeight: 'bold'
                        }}>
                          {groups.filter(g => g.starting_hole === group.starting_hole).length} grupos
                        </span>
                      )}
                    </div>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                      <Users size={16} style={{marginRight: '5px', color: '#6b7280'}} />
                      <span>{group.participants?.length || 0} jugadores</span>
                    </div>
                    {/* Indicador de sesión */}
                    <div style={{display: 'flex', alignItems: 'center'}}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: getSessionFromTime(group.tee_time) === 'morning' ? '#f3f4f6' : '#e5e7eb',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {getSessionFromTime(group.tee_time) === 'morning' ? (
                          <>
                            <Sun size={12} style={{color: '#6b7280'}} />
                            Mañana
                          </>
                        ) : (
                          <>
                            <Moon size={12} style={{color: '#6b7280'}} />
                            Tarde
                          </>
                        )}
                      </span>
                    </div>
                    {/* Botón para eliminar grupo vacío */}
                    {(!group.participants || group.participants.length === 0) && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Estás seguro de que quieres eliminar el grupo ${group.group_number}?`)) {
                            deleteEmptyGroup.mutate(group.group_number)
                          }
                        }}
                        style={{
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          marginRight: '8px'
                        }}
                        title="Eliminar grupo vacío"
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                    
                    {/* Botón para cambiar sesión */}
                    <button
                      onClick={() => handleSwitchSession(group.group_number, group.tee_time)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                        e.currentTarget.style.borderColor = '#9ca3af'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white'
                        e.currentTarget.style.borderColor = '#d1d5db'
                      }}
                    >
                      {getSessionFromTime(group.tee_time) === 'morning' ? (
                        <>
                          <Moon size={12} style={{color: '#6b7280'}} />
                          Cambiar a Tarde
                        </>
                      ) : (
                        <>
                          <Sun size={12} style={{color: '#6b7280'}} />
                          Cambiar a Mañana
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Players Horizontal Layout with Drag & Drop */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  minHeight: '80px',
                  border: dragOverGroup === group.group_number ? '2px dashed #3b82f6' : '1px solid #e5e7eb'
                }}>
                  {group.participants && group.participants.length > 0 ? (
                    group.participants.map((participant) => (
                      <div
                        key={participant.participation_id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedPlayer({
                            participation_id: participant.participation_id,
                            player_name: participant.player_name,
                            group_number: group.group_number
                          })
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragEnd={() => {
                          setDraggedPlayer(null)
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: 'white',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          cursor: 'move',
                          fontSize: '14px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                      >
                        <GripVertical size={12} style={{color: '#9ca3af'}} />
                        <User size={12} style={{color: '#6b7280'}} />
                        <span style={{fontWeight: '500', color: '#111827'}}>
                          {participant.player_name}
                        </span>
                        <span style={{color: '#6b7280', fontSize: '12px'}}>
                          (HCP: {participant.handicap_local !== null && participant.handicap_local !== undefined ? participant.handicap_local : "N/A"})
                        </span>
                        {participant.player_type === 'external' && (
                          <span style={{
                            padding: '2px 6px',
                            backgroundColor: '#e0e7ff',
                            color: '#3730a3',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }}>
                            Ext
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      padding: '20px',
                      color: '#6b7280',
                      fontStyle: 'italic'
                    }}>
                      Arrastra jugadores aquí o arrastra este grupo a otro hoyo
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Botones de acción */}
            <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
              <button
                onClick={handleCreateEmptyGroup}
                disabled={createEmptyGroup.isLoading}
                style={{
                  backgroundColor: 'white',
                  color: '#374151',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                  e.currentTarget.style.borderColor = '#9ca3af'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.borderColor = '#d1d5db'
                }}
              >
                <Plus size={16} />
                {createEmptyGroup.isLoading ? 'Creando...' : 'Crear Grupo Vacío'}
              </button>
              
              <button
                onClick={() => {
                  // Separar grupos por sesión
                  const morningGroups = groups?.filter(g => getSessionFromTime(g.tee_time) === 'morning') || [];
                  const afternoonGroups = groups?.filter(g => getSessionFromTime(g.tee_time) === 'afternoon') || [];
                  
                  // Función para generar carátula
                  const generateHeader = (sessionName: string, sessionIcon: string) => `
                    <div class="page-header">
                      <h1>${sessionIcon} ${sessionName}</h1>
                      <div class="tournament-info">
                        <p><strong>Torneo:</strong> ${tournament?.tournament_name || 'N/A'}</p>
                        <p><strong>Fecha:</strong> ${tournament?.start_time || 'N/A'}</p>
                        <p><strong>Generado:</strong> ${new Date().toLocaleString()}</p>
                      </div>
                    </div>
                  `;
                  
                  // Función para formatear hora (solo HH:MM)
                  const formatTime = (timeString: string | null): string => {
                    if (!timeString) return 'N/A';
                    // Si tiene segundos (HH:MM:SS), removerlos
                    if (timeString.includes(':')) {
                      const [hours, minutes] = timeString.split(':').map(Number);
                      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    }
                    return timeString;
                  };
                  
                  // Función para generar tabla de grupos
                  const generateGroupTable = (sessionGroups: any[]) => `
                    <table>
                      <thead>
                        <tr>
                          <th>Grupo - Hora - Hoyo</th>
                          <th>Jugadores</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${sessionGroups.map(group => `
                          <tr class="group-header">
                            <td>Grupo ${group.group_number} - ${formatTime(group.tee_time)} - Hoyo ${group.starting_hole || 'N/A'}</td>
                            <td>${group.participants?.length || 0} jugadores</td>
                          </tr>
                          ${group.participants?.map((p: any) => `
                            <tr>
                              <td></td>
                              <td>${p.player_name} (HCP: ${p.handicap_local !== null && p.handicap_local !== undefined ? p.handicap_local : 'N/A'})</td>
                            </tr>
                          `).join('') || ''}
                        `).join('') || '<tr><td colspan="2">No hay grupos en esta sesión</td></tr>'}
                      </tbody>
                    </table>
                  `;
                  
                  // Generar reporte imprimible en nueva ventana
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Reporte Tee Times - ${tournament?.tournament_name || 'Torneo'}</title>
                          <style>
                            body { 
                              font-family: Arial, sans-serif; 
                              margin: 0; 
                              padding: 20px;
                              line-height: 1.4;
                            }
                            .page-header {
                              text-align: center;
                              margin-bottom: 30px;
                              padding: 20px;
                              border-bottom: 3px solid #333;
                            }
                            .page-header h1 {
                              color: #333;
                              font-size: 28px;
                              margin: 0 0 15px 0;
                            }
                            .tournament-info {
                              background-color: #f8f9fa;
                              padding: 15px;
                              border-radius: 8px;
                              display: inline-block;
                            }
                            .tournament-info p {
                              margin: 5px 0;
                              font-size: 14px;
                            }
                            .session-separator {
                              page-break-before: always;
                              margin-top: 40px;
                            }
                            table { 
                              border-collapse: collapse; 
                              width: 100%; 
                              margin: 20px 0;
                              font-size: 12px;
                            }
                            th, td { 
                              border: 1px solid #ddd; 
                              padding: 8px; 
                              text-align: left; 
                            }
                            th { 
                              background-color: #f2f2f2; 
                              font-weight: bold;
                            }
                            .group-header { 
                              background-color: #e8f4fd; 
                              font-weight: bold; 
                            }
                            .session-title {
                              font-size: 20px;
                              color: #2563eb;
                              margin: 30px 0 15px 0;
                              text-align: center;
                            }
                            @media print { 
                              body { margin: 0; padding: 15px; }
                              .page-header { margin-bottom: 20px; }
                            }
                          </style>
                        </head>
                        <body>
                          ${morningGroups.length > 0 ? `
                            ${generateHeader('Grupos de Mañana', '☀️')}
                            ${generateGroupTable(morningGroups)}
                          ` : ''}
                          
                          ${afternoonGroups.length > 0 ? `
                            <div class="session-separator">
                              ${generateHeader('Grupos de Tarde', '🌙')}
                              ${generateGroupTable(afternoonGroups)}
                            </div>
                          ` : ''}
                          
                          ${morningGroups.length === 0 && afternoonGroups.length === 0 ? `
                            ${generateHeader('Reporte de Tee Times', '🏌️')}
                            <p style="text-align: center; color: #666; font-style: italic;">No hay grupos configurados</p>
                          ` : ''}
                          
                          <script>
                            window.onload = function() {
                              setTimeout(() => {
                                window.print();
                              }, 500);
                            }
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6'
                }}
              >
                <FileText size={16} />
                Ver Reporte para Imprimir
              </button>
            </div>

            <div style={{display: 'flex', gap: '10px', marginTop: '30px', justifyContent: 'space-between'}}>
              <div style={{display: 'flex', gap: '10px'}}>
                <button
                  onClick={() => {
                    console.log('🔙 Usuario navegando manualmente del paso 3 al paso 1 (RECONFIGURAR GRUPOS)')
                    setIsReconfiguring(true) // Activar modo reconfiguración
                    setManualNavigation(true) // Activar navegación manual
                    setCurrentStep(1)
                    console.log('🔧 Modo reconfiguración activado - permanecerá en Paso 1')
                  }}
                  style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  ← Reconfigurar Grupos
                </button>
                <button
                  onClick={() => {
                    console.log('🔙 Usuario navegando manualmente del paso 3 al paso 2 (CAMBIAR CONFIGURACIÓN)')
                    setManualNavigation(true) // Activar navegación manual
                    setCurrentStep(2)
                    // Resetear navegación manual después de un tiempo
                    setTimeout(() => setManualNavigation(false), 1000)
                  }}
                  style={{
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  ← Cambiar Configuración Tee Times
                </button>
              </div>
              <button
                onClick={() => navigate(`/club/${clubId}`)}
                style={{
                  backgroundColor: '#374151',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Modal de Ayuda */}
        {showHelpModal && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={() => setShowHelpModal(false)}
          >
            <div 
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '30px',
                maxWidth: '600px',
                maxHeight: '80vh',
                overflow: 'auto',
                margin: '20px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h3 style={{fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827'}}>
                  Instrucciones de Uso
                </h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#6b7280'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#374151'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#6b7280'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              
              <ul style={{margin: 0, paddingLeft: '20px', color: '#374151', lineHeight: '1.6'}}>
                <li style={{marginBottom: '8px'}}>
                  <strong>Sesión inicial:</strong> Todos los grupos se crean en la sesión que elegiste como preferida
                </li>
                <li style={{marginBottom: '8px'}}>
                  <strong>Cambiar sesión:</strong> Usa el botón "Cambiar a Mañana/Tarde" para mover solo los grupos que quieren otra sesión
                </li>
                <li style={{marginBottom: '8px'}}>
                  <strong>Indicadores de sesión:</strong> <Sun size={12} style={{display: 'inline', marginLeft: '4px', marginRight: '4px'}} /> = Mañana, <Moon size={12} style={{display: 'inline', marginLeft: '4px', marginRight: '4px'}} /> = Tarde
                </li>
                <li style={{marginBottom: '8px'}}>
                  <strong>Mover jugadores:</strong> Arrastra cualquier jugador hacia otro grupo (máximo 4 por grupo)
                </li>
                <li style={{marginBottom: '8px'}}>
                  <strong>Grupos completos:</strong> Los grupos con 4 jugadores se marcan como "COMPLETO" y tienen borde gris
                </li>
                <li style={{marginBottom: '8px'}}>
                  <strong>Intercambiar grupos:</strong> Arrastra el header del grupo (con el ícono ⋮⋮) hacia otro grupo para intercambiar posiciones
                </li>
                <li style={{marginBottom: '8px'}}>
                  <strong>Crear grupos adicionales:</strong> Usa el botón "Crear Grupo Vacío" para facilitar reorganización
                </li>
              </ul>
              
              <div style={{marginTop: '20px', textAlign: 'right'}}>
                <button
                  onClick={() => setShowHelpModal(false)}
                  style={{
                    backgroundColor: '#374151',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

        {(!groups || groups.length === 0) && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            color: '#6c757d'
          }}>
            No hay grupos configurados. Haz clic en "Generar Grupos" para comenzar.
          </div>
        )}
      </div>

      {/* Modal para crear grupo vacío */}
      {showCreateGroupModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '400px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '20px'}}>
              Crear Grupo Vacío
            </h3>
            
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>
                Hoyo de salida:
              </label>
              <select
                value={newGroupConfig.hole}
                onChange={(e) => setNewGroupConfig(prev => ({ ...prev, hole: parseInt(e.target.value) }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => (
                  <option key={hole} value={hole}>Hoyo {hole}</option>
                ))}
              </select>
            </div>
            
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>
                Horario (opcional):
              </label>
              <input
                type="time"
                step="60"
                value={newGroupConfig.time}
                onChange={(e) => setNewGroupConfig(prev => ({ ...prev, time: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                pattern="[0-9]{2}:[0-9]{2}"
                placeholder="00:00"
              />
              <p style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>
                Deja vacío si no quieres asignar horario específico
              </p>
            </div>
            
            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
              <button
                onClick={() => {
                  setShowCreateGroupModal(false)
                  setNewGroupConfig({ hole: 1, time: '' })
                }}
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCreateGroup}
                disabled={createEmptyGroup.isLoading}
                style={{
                  backgroundColor: '#374151',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {createEmptyGroup.isLoading ? 'Creando...' : 'Crear Grupo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
