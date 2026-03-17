import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, GripVertical, User, Plus, Sun, Moon, HelpCircle, X, FileText, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useTournaments, useTournamentGroups, useGenerateGroups, useAssignTeeTimes, useMovePlayerToGroup, useMoveGroupToHole, useSwapGroupNumbers, useCreateEmptyGroup, useDeleteEmptyGroup } from '@/hooks/useTournaments'
import { useUserPermissions } from '@/hooks/useUserPermissions'

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
  
  const { permissions } = useUserPermissions(clubId ?? undefined)
  const canEditTournaments = permissions.canEditTournaments
  const { data: tournaments } = useTournaments(clubIdNum)
  const tournament = tournaments?.find(t => t.tournament_id === tournamentIdNum)
  const { data: groups, refetch: refetchGroups } = useTournamentGroups(clubIdNum, tournamentIdNum)

  // Inicializar config de tee desde el torneo (salidas consecutivas/simultáneas definidas al crear el torneo)
  useEffect(() => {
    if (!tournament) return
    const t = tournament as any
    setConfig(prev => ({
      ...prev,
      startTime: t.start_time ? (t.start_time.length >= 5 ? t.start_time.slice(0, 5) : t.start_time) : '08:00',
      intervalMinutes: typeof t.tee_interval_minutes === 'number' ? t.tee_interval_minutes : 10,
      enableTwoSessions: t.enable_two_sessions === 1 || t.enable_two_sessions === true,
      enableSimultaneousStarts: t.enable_simultaneous_starts === 1 || t.enable_simultaneous_starts === true,
      afternoonStartTime: t.afternoon_start_time && t.afternoon_start_time.length >= 5 ? t.afternoon_start_time.slice(0, 5) : '14:00',
      preferredSession: t.preferred_session === 'afternoon' ? 'afternoon' : 'morning'
    }))
  }, [tournament?.tournament_id])
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
  // Modal "Reorganizar por HCP" / "Reorganizar por grupos" (un solo paso: generar + asignar tee times + ir a resultado)
  const [showReorganizeModal, setShowReorganizeModal] = useState(false)
  const [reorganizeByHcp, setReorganizeByHcp] = useState(true) // true = por HCP, false = por grupos/inscripción
  
  // Create group modal state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [newGroupConfig, setNewGroupConfig] = useState({
    hole: 1,
    time: ''
  })

  // Modal editar hora/hoyo de un grupo (click en Editar)
  const [editingGroupNumber, setEditingGroupNumber] = useState<number | null>(null)
  const [editModalValues, setEditModalValues] = useState<{ session: 'morning' | 'afternoon'; time: string; hole: number }>({ session: 'morning', time: '08:00', hole: 1 })
  
  // Session filter state
  const [sessionFilter, setSessionFilter] = useState<'all' | 'morning' | 'afternoon'>('all')
  // Ediciones manuales por grupo (sesión, hora, hoyo)
  const [groupEdits, setGroupEdits] = useState<Record<number, { session: 'morning' | 'afternoon', time: string, hole: number }>>({})
  
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

  const getTeeTimePayload = () => {
    // Siempre enviar hora de mañana y de tarde para que el backend asigne correctamente según group_tee_preference
    const startMorning = (config.startTime || '08:00').length >= 5 ? (config.startTime || '08:00').slice(0, 5) : (config.startTime || '08:00')
    const startAfternoon = (config.afternoonStartTime || '14:00').length >= 5 ? (config.afternoonStartTime || '14:00').slice(0, 5) : (config.afternoonStartTime || '14:00')
    return {
      start_time: startMorning,
      interval_minutes: config.intervalMinutes,
      course_holes: config.courseHoles,
      enable_two_sessions: config.enableTwoSessions,
      enable_simultaneous_starts: config.enableSimultaneousStarts,
      afternoon_start_time: startAfternoon,
      preferred_session: config.preferredSession
    }
  }

  const handleAssignTeeTimes = () => {
    assignTeeTimes.mutate(getTeeTimePayload(), {
      onSuccess: () => {
        refetchGroups()
        setTimeout(() => setCurrentStep(3), 1500)
      }
    })
  }

  const handleReorganize = (byHcp: boolean) => {
    setShowReorganizeModal(false)
    generateGroups.mutate(
      { preserveExistingGroups: false, byHcp },
      {
        onSuccess: async () => {
          await refetchGroups()
          assignTeeTimes.mutate(getTeeTimePayload(), {
            onSuccess: () => {
              refetchGroups().then(() => {
                setCurrentStep(3)
              })
            },
            onError: () => {
              refetchGroups().then(() => setCurrentStep(3))
            }
          })
        }
      }
    )
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
    // Si tenemos hora y grupos, validar y ajustar automáticamente si hay conflicto
    let finalTimeHHMM: string | undefined = newTeeTime ? formatTime(newTeeTime) : undefined
    if (finalTimeHHMM && groups) {
      const isConflict = (t: string) => !!groups.find(g =>
        String(g.group_number) !== String(groupNumber) &&
        g.starting_hole === newStartingHole && 
        formatTime(g.tee_time) === t &&
        getSessionFromTime(g.tee_time) === getSessionFromTime(t)
      )

      // Si hay conflicto en la hora deseada, avanzar por intervalos hasta encontrar hueco
      if (isConflict(finalTimeHHMM)) {
        const step = config.intervalMinutes && config.intervalMinutes > 0 ? config.intervalMinutes : 10
        const toMinutes = (hhmm: string) => {
          const [h, m] = hhmm.split(':').map(Number)
          return h * 60 + m
        }
        const toHHMM = (mins: number) => {
          const h = Math.floor(mins / 60) % 24
          const m = mins % 60
          return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`
        }

        let attempts = 0
        let candidate = finalTimeHHMM
        while (attempts < 72 && isConflict(candidate)) { // hasta 12 horas si step=10
          candidate = toHHMM(toMinutes(candidate) + step)
          attempts += 1
        }

        if (candidate !== finalTimeHHMM) {
          alert(`Hora ajustada automáticamente a ${candidate} por conflicto en el hoyo ${newStartingHole}.`)
          finalTimeHHMM = candidate
        }
      }
    }

    const normalized = finalTimeHHMM ? toHHMMSS(finalTimeHHMM) : undefined
    moveGroup.mutate(
      { groupNumber, newStartingHole, newTeeTime: normalized },
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

  // Formatear hora en 24h (Argentina: sin AM/PM), ej. 08:00 o 14:00
  const formatTime = (timeString: string | null): string => {
    if (!timeString) return "Sin asignar"
    const str = String(timeString).trim()
    const match = str.match(/^(\d{1,2}):(\d{2})/)
    if (match) return `${match[1].padStart(2, '0')}:${match[2]}`
    if (str.includes(':')) {
      const [h, m] = str.split(':').map(Number)
      if (!isNaN(h) && !isNaN(m)) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
    return str
  }

  // Normalizar a HH:MM:SS para enviar al backend (MySQL TIME)
  const toHHMMSS = (time: string): string => {
    if (!time) return time
    const parts = time.split(':')
    if (parts.length === 2) return `${parts[0].padStart(2,'0')}:${parts[1].padStart(2,'0')}:00`
    if (parts.length === 3) return `${parts[0].padStart(2,'0')}:${parts[1].padStart(2,'0')}:${parts[2].padStart(2,'0')}`
    return time
  }

  // Usar la hora de inicio de tarde del torneo (ej. 14:00) para clasificar
  const afternoonStartHour = (() => {
    const t = (config.afternoonStartTime || '14:00').trim()
    const [h] = t.split(':').map(Number)
    return !isNaN(h) ? h : 13
  })()

  // Función para determinar la sesión basada en la hora
  const getSessionFromTime = (timeString: string | null): 'morning' | 'afternoon' => {
    if (!timeString) return 'morning'
    const str = String(timeString).trim()
    const [hours] = str.split(':').map(Number)
    return !isNaN(hours) && hours >= afternoonStartHour ? 'afternoon' : 'morning'
  }

  // Respetar preferencia del grupo (inscripción pública) si existe; si no, derivar de la hora
  const getGroupSession = (group: { tee_time?: string | null; group_tee_preference?: string | null }): 'morning' | 'afternoon' => {
    const pref = String(group.group_tee_preference || '').toLowerCase().trim()
    if (pref === 'afternoon') return 'afternoon'
    return getSessionFromTime(group.tee_time ?? null)
  }

  // Hoyo: 0 = "Sin asignar", solo mostrar número cuando esté realmente asignado
  const getDisplayHole = (group: { starting_hole?: number | null }): number => {
    const h = group.starting_hole
    if (h == null || h === 0) return 0
    return h
  }

  // Hora a mostrar: si el grupo es turno tarde pero tee_time está en rango mañana (ej. 08:00), mostrar hora de tarde
  const getDisplayTimeForGroup = (group: { tee_time?: string | null; group_tee_preference?: string | null }): string => {
    const raw = formatTime(group.tee_time ?? null)
    if (raw === 'Sin asignar') return ''
    const pref = String(group.group_tee_preference || '').toLowerCase().trim()
    if (pref === 'afternoon') {
      const [h] = (group.tee_time || '').split(':').map(Number)
      if (!isNaN(h) && h < 12) return config.afternoonStartTime || '14:00'
    }
    return raw
  }

  // Función para filtrar grupos por sesión
  const getFilteredGroups = () => {
    if (!groups) return []
    
    if (sessionFilter === 'all') return groups
    
    return groups.filter(group => getGroupSession(group) === sessionFilter)
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

  // Exportar grupos (Ver resultado) a Excel
  const handleExportGroupsExcel = () => {
    if (!groups || groups.length === 0) {
      alert('No hay grupos para exportar.')
      return
    }
    const sessionLabel = (g: { tee_time?: string | null; group_tee_preference?: string | null }) =>
      getGroupSession(g) === 'afternoon' ? 'Tarde' : 'Mañana'
    const tipoAgrupacion = (tournament as any)?.groups_by_hcp ? 'Por HCP (serpentina)' : 'Por grupos (inscripción)'
    const excelData = [
      { 'Grupo': 'Tipo de agrupación', 'Turno': tipoAgrupacion, 'Hora': '', 'Hoyo': '', 'Jugador 1': '', 'HCP 1': '', 'Jugador 2': '', 'HCP 2': '', 'Jugador 3': '', 'HCP 3': '', 'Jugador 4': '', 'HCP 4': '' },
      ...groups.map((group) => {
      const participants = group.participants || []
      const row: Record<string, string | number> = {
        'Grupo': group.group_number,
        'Turno': sessionLabel(group),
        'Hora': getDisplayTimeForGroup(group) || 'Sin asignar',
        'Hoyo': getDisplayHole(group) === 0 ? 'Sin asignar' : getDisplayHole(group)
      }
      ;[1, 2, 3, 4].forEach((i) => {
        const p = participants[i - 1]
        row[`Jugador ${i}`] = p?.player_name ?? ''
        row[`HCP ${i}`] = p?.handicap_local != null ? p.handicap_local : ''
      })
      return row
      })
    ]
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const colWidths = [
      { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
      { wch: 28 }, { wch: 6 }, { wch: 28 }, { wch: 6 },
      { wch: 28 }, { wch: 6 }, { wch: 28 }, { wch: 6 }
    ]
    worksheet['!cols'] = colWidths
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grupos')
    const safeName = (tournament?.tournament_name || 'Torneo').replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_')
    const date = new Date().toLocaleDateString('es-AR').replace(/\//g, '-')
    XLSX.writeFile(workbook, `Grupos_${safeName}_${date}.xlsx`)
  }

  // handleSwitchSession eliminado: la sesión se gestiona manualmente por panel

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
        
        {/* Header: título con modo (Por Grupos) o (Por HCP) */}
        <div style={{backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'}}>
            <div style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px'}}>
              <button
                onClick={() => navigate(`/club/${clubId}/admin`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={20} />
                <span style={{marginLeft: '8px'}}>Volver</span>
              </button>
              <h1 style={{fontSize: '24px', fontWeight: 'bold', margin: 0}}>
                Gestión de Tee Times - {tournament.tournament_name} ({(tournament as any)?.groups_by_hcp ? 'Por HCP' : 'Por Grupos'})
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
              1. Generar grupos
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
              2. Asignar horarios
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
            <h2 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '20px'}}>
              Paso 1: Generar grupos
            </h2>
            
            <div style={{backgroundColor: '#f0f9ff', padding: '16px 20px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #bae6fd'}}>
              <h3 style={{fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: '#0c4a6e'}}>Configuración de salidas (definida en el torneo)</h3>
              <p style={{fontSize: '14px', color: '#075985', margin: 0}}>
                <strong>Tipo de salida:</strong> {config.enableSimultaneousStarts ? 'Salidas simultáneas (shotgun)' : 'Salidas consecutivas'}
                {!config.enableSimultaneousStarts && config.intervalMinutes != null && ` • Intervalo: ${config.intervalMinutes} min`}
                {config.enableSimultaneousStarts && config.enableTwoSessions && ' • Dos tandas (mañana y tarde)'}
                {config.enableSimultaneousStarts && ` • Sesión preferida: ${config.preferredSession === 'morning' ? 'Mañana' : 'Tarde'}`}
              </p>
              <p style={{fontSize: '12px', color: '#0369a1', marginTop: '8px', marginBottom: 0}}>
                Para cambiar esta configuración, editá el torneo desde el listado de torneos.
              </p>
            </div>
            
            <div style={{textAlign: 'center'}}>
              {!canEditTournaments && (
                <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '16px'}}>
                  Solo el administrador (o usuarios con permiso de editar torneos) puede generar o reorganizar grupos por handicap.
                </p>
              )}
              {canEditTournaments && (
                <>
                  {groups && groups.length > 0 && (
                    <div style={{
                      fontSize: '14px',
                      color: '#92400e',
                      marginBottom: '16px',
                      maxWidth: '480px',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      padding: '12px 16px',
                      backgroundColor: '#fef3c7',
                      border: '1px solid #f59e0b',
                      borderRadius: '8px',
                      textAlign: 'left'
                    }}>
                      <strong>Ya hay grupos configurados</strong> (por ejemplo los que armaron los jugadores por la web). Si decidiste armar por handicap, usá el botón de abajo: se reemplazarán por nuevos grupos ordenados por HCP.
                    </div>
                  )}
                  <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '12px', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto'}}>
                    Si los jugadores ya formaron grupos por la inscripción web, podés usar este botón para reorganizar por handicap; el sistema creará nuevos grupos según HCP y podés asignar tee times después.
                  </p>
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
                </>
              )}
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
          <>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap'}}>
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
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                {canEditTournaments && (
                  <button
                    type="button"
                    onClick={() => {
                      setReorganizeByHcp(!((tournament as any)?.groups_by_hcp === 1 || (tournament as any)?.groups_by_hcp === true))
                      setShowReorganizeModal(true)
                    }}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#374151',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {(tournament as any)?.groups_by_hcp ? 'Reorganizar por grupos' : 'Reorganizar por HCP'}
                  </button>
                )}
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
            
            {/* Resumen Mañana / Tarde: fila arriba a ancho completo (formato antiguo) */}
            {groups && groups.length > 0 && (
              <div style={{ width: '100%', marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  gap: '20px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  width: '100%',
                  boxSizing: 'border-box'
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
                      if (sessionFilter !== 'morning') e.currentTarget.style.backgroundColor = '#f3f4f6'
                    }}
                    onMouseLeave={(e) => {
                      if (sessionFilter !== 'morning') e.currentTarget.style.backgroundColor = 'white'
                    }}
                  >
                    <div style={{display: 'flex', justifyContent: 'center', marginBottom: '8px'}}>
                      <Sun size={20} style={{color: sessionFilter === 'morning' ? '#3b82f6' : '#6b7280'}} />
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: sessionFilter === 'morning' ? '#1e40af' : '#111827' }}>
                      {groups.filter(g => getGroupSession(g) === 'morning').length}
                    </div>
                    <div style={{ fontSize: '14px', color: sessionFilter === 'morning' ? '#3b82f6' : '#6b7280', fontWeight: sessionFilter === 'morning' ? 'bold' : 'normal' }}>
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
                      if (sessionFilter !== 'afternoon') e.currentTarget.style.backgroundColor = '#f3f4f6'
                    }}
                    onMouseLeave={(e) => {
                      if (sessionFilter !== 'afternoon') e.currentTarget.style.backgroundColor = 'white'
                    }}
                  >
                    <div style={{display: 'flex', justifyContent: 'center', marginBottom: '8px'}}>
                      <Moon size={20} style={{color: sessionFilter === 'afternoon' ? '#f59e0b' : '#6b7280'}} />
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: sessionFilter === 'afternoon' ? '#92400e' : '#111827' }}>
                      {groups.filter(g => getGroupSession(g) === 'afternoon').length}
                    </div>
                    <div style={{ fontSize: '14px', color: sessionFilter === 'afternoon' ? '#f59e0b' : '#6b7280', fontWeight: sessionFilter === 'afternoon' ? 'bold' : 'normal' }}>
                      Grupos Tarde {sessionFilter === 'afternoon' && '✓'}
                    </div>
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
                  width: '100%',
                  boxSizing: 'border-box',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '20px',
                  minHeight: '280px',
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
                      <div style={{display: 'flex', alignItems: 'center'}}>
                        <Users size={16} style={{marginRight: '5px', color: '#6b7280'}} />
                        <span>{group.participants?.length || 0} jugadores</span>
                      </div>
                    </div>

                    {/* Resumen Turno / Hora / Hoyo + Editar (abre modal) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 12px',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px'
                    }}>
                      <span style={{ fontSize: '13px', color: '#374151' }}>
                        <strong>Turno:</strong> {((groupEdits[group.group_number]?.session) ?? getGroupSession(group)) === 'afternoon' ? 'Tarde' : 'Mañana'}
                        {' · '}
                        <strong>Hora:</strong> {(groupEdits[group.group_number]?.time) ?? (getDisplayTimeForGroup(group) || '—')}
                        {' · '}
                        <strong>Hoyo:</strong> {getDisplayHole(group) === 0 ? 'Sin asignar' : getDisplayHole(group)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const session = (groupEdits[group.group_number]?.session) ?? getGroupSession(group)
                          const time = (groupEdits[group.group_number]?.time) ?? (getDisplayTimeForGroup(group) || (session === 'morning' ? config.startTime : config.afternoonStartTime))
                          const rawHole = (groupEdits[group.group_number]?.hole) ?? getDisplayHole(group) ?? 0
                          const hole = config.enableSimultaneousStarts ? rawHole : (rawHole || 1)
                          setEditModalValues({ session, time: time || '08:00', hole })
                          setEditingGroupNumber(group.group_number)
                        }}
                        style={{
                          padding: '6px 12px',
                          fontSize: '13px',
                          fontWeight: '500',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          background: 'white',
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGroupEdits(prev => {
                            const clone = { ...prev }
                            delete clone[group.group_number]
                            return clone
                          })
                        }}
                        style={{
                          padding: '6px 10px',
                          fontSize: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          background: 'white',
                          color: '#6b7280',
                          cursor: 'pointer'
                        }}
                      >
                        Restablecer
                      </button>
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
                    
                </div>

                
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  minHeight: '98px',
                  width: '100%',
                  boxSizing: 'border-box',
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
                          flex: '0 0 calc((100% - 24px) / 4)',
                          width: 'calc((100% - 24px) / 4)',
                          maxWidth: 'calc((100% - 24px) / 4)',
                          minHeight: '60px',
                          height: '60px',
                          boxSizing: 'border-box',
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
            
            {/* Botones de acción: una sola línea (Crear grupo, Reporte, Excel, Reconfigurar, Cerrar). Config. tee time = editando torneo. */}
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', alignItems: 'center'}}>
              <button
                onClick={handleCreateEmptyGroup}
                disabled={createEmptyGroup.isLoading}
                style={{
                  backgroundColor: 'white',
                  color: '#374151',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  cursor: 'pointer',
                  fontSize: '13px',
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
                  const morningGroups = groups?.filter(g => getGroupSession(g) === 'morning') || [];
                  const afternoonGroups = groups?.filter(g => getGroupSession(g) === 'afternoon') || [];
                  
                  // Función para generar carátula
                  const formatDate = (value?: string) => {
                    if (!value) return 'N/A'
                    const d = new Date(value)
                    const dd = d.getDate().toString().padStart(2, '0')
                    const mm = (d.getMonth() + 1).toString().padStart(2, '0')
                    const yyyy = d.getFullYear().toString()
                    return `${dd}/${mm}/${yyyy}`
                  }
                  const tipoAgrupacionPrint = (tournament as any)?.groups_by_hcp ? 'Por HCP (serpentina)' : 'Por grupos (inscripción)'
                  const generateHeader = (sessionName: string, sessionIcon: string) => `
                    <div class="page-header">
                      <h1 style="text-align:center;">${sessionIcon} ${sessionName}</h1>
                      <div class="tournament-info">
                        <p><strong>Torneo:</strong> ${tournament?.tournament_name || 'N/A'}</p>
                        <p><strong>Fecha:</strong> ${formatDate(tournament?.tournament_date)}${tournament?.start_time ? ` - ${tournament.start_time}` : ''}</p>
                        <p><strong>Tipo de agrupación:</strong> ${tipoAgrupacionPrint}</p>
                      </div>
                    </div>
                  `;
                  
                  // Función para formatear hora (solo HH:MM)
                  const _formatTime = (timeString: string | null): string => {
                    if (!timeString) return 'N/A';
                    if (timeString.includes(':')) {
                      const [hours, minutes] = timeString.split(':').map(Number);
                      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    }
                    return timeString;
                  };
                  void _formatTime; // avoid unused lint
                  // Función para generar tabla de grupos con el MISMO header en thead (se repite en cada página)
                  const generateGroupTable = (sessionGroups: any[], headerHtml: string) => `
                    <table>
                      <thead>
                        <tr>
                          <th colspan="2">${headerHtml}</th>
                        </tr>
                        <tr>
                          <th>Grupo - Hora - Hoyo</th>
                          <th>Jugadores</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${sessionGroups.map(group => `
                          <tr class="group-header">
                            <td>Grupo ${group.group_number} - ${getDisplayTimeForGroup(group) || 'Sin asignar'} - Hoyo ${group.starting_hole === null || group.starting_hole === 0 ? 'Sin asignar' : group.starting_hole}</td>
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
                              padding: 20px 0 10px 0;
                              border-bottom: none;
                              display: block;
                              width: 100%;
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
                              thead { display: table-header-group; }
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
                              /* Repetir header en cada página */
                              .page-header { display: table-header-group; text-align: center; }
                              .session-separator { page-break-before: always; }
                            }
                          </style>
                        </head>
                        <body>
                          ${morningGroups.length > 0 ? `
                          ${generateGroupTable(morningGroups, generateHeader('Grupos de Mañana', '☀️'))}
                          ` : ''}
                          
                          ${afternoonGroups.length > 0 ? `
                            <div class="session-separator">
                              ${generateGroupTable(afternoonGroups, generateHeader('Grupos de Tarde', '🌙'))}
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
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
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
              <button
                type="button"
                onClick={handleExportGroupsExcel}
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#047857'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669'
                }}
              >
                <FileSpreadsheet size={16} />
                Exportar a Excel
              </button>
              <button
                type="button"
                title="Volver al paso 1 para regenerar grupos (ej. si agregaste o sacaste jugadores)"
                onClick={() => {
                  setIsReconfiguring(true)
                  setManualNavigation(true)
                  setCurrentStep(1)
                }}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ← Reconfigurar Grupos
              </button>
              <button
                type="button"
                onClick={() => navigate(`/club/${clubId}`)}
                style={{
                  backgroundColor: '#374151',
                  color: 'white',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Cerrar
              </button>
            </div>

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
          </div>
          </>
        )}

      {/* Modal Reorganizar: por HCP o por grupos (un solo paso: generar + asignar tee times + ir a resultado) */}
      {showReorganizeModal && (
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
            zIndex: 1001
          }}
          onClick={() => setShowReorganizeModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#111827' }}>
              {reorganizeByHcp ? 'Reorganizar grupos por handicap' : 'Reorganizar por grupos'}
            </h3>
            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '20px', lineHeight: 1.5 }}>
              {reorganizeByHcp
                ? 'Se reemplazarán todos los grupos por nuevos ordenados por HCP y se asignarán los horarios de salida con la configuración actual. Verás el resultado en la pantalla de grupos.'
                : 'Se reemplazarán los grupos por orden de inscripción y se asignarán los horarios de salida con la configuración actual. Verás el resultado en la pantalla de grupos.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowReorganizeModal(false)}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleReorganize(reorganizeByHcp)}
                disabled={generateGroups.isLoading}
                style={{
                  padding: '10px 18px',
                  backgroundColor: reorganizeByHcp ? '#f59e0b' : '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: generateGroups.isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {generateGroups.isLoading ? 'Reorganizando...' : 'Reorganizar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                {config.enableSimultaneousStarts && <option value={0}>Sin asignar</option>}
                {Array.from({ length: config.courseHoles || 18 }, (_, i) => i + 1).map(hole => (
                  <option key={hole} value={hole}>Hoyo {hole}</option>
                ))}
              </select>
            </div>
            
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>
                Horario (opcional, 24h):
              </label>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                {(() => {
                  const raw = newGroupConfig.time || ''
                  const [h = 14, m = 0] = raw ? raw.split(':').map(Number) : [14, 0]
                  const hour = isNaN(h) ? 14 : Math.max(0, Math.min(23, h))
                  const min = isNaN(m) ? 0 : Math.max(0, Math.min(59, m))
                  const setT = (newH: number, newM: number) => setNewGroupConfig(prev => ({ ...prev, time: `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}` }))
                  return (
                    <>
                      <select value={hour} onChange={(e) => setT(Number(e.target.value), min)} style={{ padding: '8px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                        {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
                      </select>
                      <span style={{ fontWeight: 'bold', color: '#6b7280' }}>:</span>
                      <select value={min} onChange={(e) => setT(hour, Number(e.target.value))} style={{ padding: '8px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                        {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
                      </select>
                      {['08:00', '12:00', '14:00'].map(quick => {
                        const [qh, qm] = quick.split(':').map(Number)
                        return <button key={quick} type="button" onClick={() => setT(qh, qm)} style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f9fafb', cursor: 'pointer' }}>{quick}</button>
                      })}
                      <button type="button" onClick={() => setNewGroupConfig(prev => ({ ...prev, time: '' }))} style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fef2f2', color: '#991b1b', cursor: 'pointer' }}>Sin hora</button>
                    </>
                  )
                })()}
              </div>
              <p style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>
                Deja en blanco con &quot;Sin hora&quot; si no quieres asignar horario
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

      {/* Modal Editar horario y hoyo del grupo */}
      {editingGroupNumber != null && (
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
          onClick={() => setEditingGroupNumber(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              width: '380px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
              Editar grupo {editingGroupNumber}
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Turno</label>
              <select
                value={editModalValues.session}
                onChange={(e) => {
                  const newSession = e.target.value as 'morning' | 'afternoon'
                  const currentH = parseInt((editModalValues.time || '08:00').split(':')[0], 10) || 8
                  const isMorningHour = currentH < 12
                  const newTime = newSession === 'morning'
                    ? (isMorningHour ? editModalValues.time : (config.startTime || '08:00'))
                    : (isMorningHour ? (config.afternoonStartTime || '14:00') : editModalValues.time)
                  setEditModalValues(prev => ({ ...prev, session: newSession, time: newTime || (newSession === 'morning' ? '08:00' : '14:00') }))
                }}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
              >
                <option value="morning">Mañana</option>
                <option value="afternoon">Tarde</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Hora (24h)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {(() => {
                  const [h = 8, m = 0] = (editModalValues.time || '08:00').split(':').map(Number)
                  const hour = isNaN(h) ? 8 : Math.max(0, Math.min(23, h))
                  const min = isNaN(m) ? 0 : Math.max(0, Math.min(59, m))
                  const setTime = (newH: number, newM: number) =>
                    setEditModalValues(prev => ({ ...prev, time: `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}` }))
                  const isTarde = editModalValues.session === 'afternoon'
                  const quickTimes = isTarde ? ['14:00', '15:00', '16:00'] : ['08:00', '09:00', '10:00']
                  return (
                    <>
                      <select value={hour} onChange={(e) => setTime(Number(e.target.value), min)} style={{ padding: '8px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                        {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
                      </select>
                      <span style={{ fontWeight: 'bold', color: '#6b7280' }}>:</span>
                      <select value={min} onChange={(e) => setTime(hour, Number(e.target.value))} style={{ padding: '8px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                        {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}</option>)}
                      </select>
                      <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>Rápido ({isTarde ? 'tarde' : 'mañana'}):</span>
                      {quickTimes.map(quick => {
                        const [qh, qm] = quick.split(':').map(Number)
                        return (
                          <button key={quick} type="button" onClick={() => setTime(qh, qm)} style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f9fafb', cursor: 'pointer' }}>
                            {quick}
                          </button>
                        )
                      })}
                    </>
                  )
                })()}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Hoyo de salida</label>
              <select
                value={editModalValues.hole}
                onChange={(e) => setEditModalValues(prev => ({ ...prev, hole: parseInt(e.target.value) }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
              >
                {config.enableSimultaneousStarts && <option value={0}>Sin asignar</option>}
                {Array.from({ length: config.courseHoles || 18 }, (_, i) => i + 1).map(h => (
                  <option key={h} value={h}>Hoyo {h}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setEditingGroupNumber(null)}
                style={{ padding: '8px 16px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f9fafb', color: '#374151', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalTime = editModalValues.time || (editModalValues.session === 'morning' ? config.startTime : config.afternoonStartTime)
                  const normalized = toHHMMSS(finalTime)
                  setGroupEdits(prev => ({ ...prev, [editingGroupNumber]: { session: editModalValues.session, time: finalTime, hole: editModalValues.hole } }))
                  handleMoveGroup(editingGroupNumber, editModalValues.hole || 0, normalized)
                  setEditingGroupNumber(null)
                }}
                style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '6px', background: '#374151', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  )
}
