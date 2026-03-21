import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { X, UserX, Plus, User, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useCreateExternalPlayer, useExternalPlayers, useDeleteExternalPlayer, useUpdateExternalPlayer } from '@/hooks/useParticipants'
import { checkDuplicateExternalPlayers } from '@/services/participantService'
import { calculateHCPFromIndexDefault } from '@/utils/teeSelection'
import { lookupAagByMemberNumber } from '@/services/aagLookupService'
import { SearchInput } from './SearchInput'
import DuplicatePlayerModal from './DuplicatePlayerModal'

const externalPlayerSchema = z.object({
  full_name: z.string().min(2, 'El nombre completo es obligatorio (mínimo 2 caracteres)'),
  member_number: z.string().optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  gender: z.enum(['M', 'F', 'Other']).optional().or(z.literal('')),
  handicap_index: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().min(-10, 'Index mínimo: -10').max(54, 'Index máximo: 54').nullable()
  ),
  handicap_local: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().min(0, 'HCP mínimo: 0').max(72, 'HCP máximo: 72').nullable()
  ),
  home_club: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal(''))
})

type ExternalPlayerFormData = z.infer<typeof externalPlayerSchema>

interface CreateExternalPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (player: any) => void
  clubId: number
  initialName?: string
  editingPlayer?: any
  /** Si true, abre directo el formulario de alta (p. ej. desde gestión de externos) */
  openDirectlyToCreateForm?: boolean
}

export function CreateExternalPlayerModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  clubId,
  initialName = '',
  editingPlayer = null,
  openDirectlyToCreateForm = false
}: CreateExternalPlayerModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [createdPlayerName, setCreatedPlayerName] = useState('')
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateData, setDuplicateData] = useState<any>(null)
  const [pendingPlayerData, setPendingPlayerData] = useState<any>(null)
  const [aagLookupLoading, setAagLookupLoading] = useState(false)
  // editingPlayer is now received as a prop
  
  const { data: externalPlayers = [], isLoading, refetch: refetchExternalPlayers } = useExternalPlayers(clubId)
  const createExternalPlayer = useCreateExternalPlayer(clubId)
  const updateExternalPlayer = useUpdateExternalPlayer(clubId)
  const deleteExternalPlayer = useDeleteExternalPlayer(clubId)

  const {
    register,
    watch,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<ExternalPlayerFormData>({
    resolver: zodResolver(externalPlayerSchema),
    defaultValues: {
      full_name: initialName,
      member_number: '',
      email: '',
      phone: '',
      gender: undefined,
      handicap_index: null as number | null,
      handicap_local: null as number | null,
      home_club: '',
      notes: ''
    }
  })

  const skipNextHcpCalcRef = useRef(false)
  // Reset form when initialName changes or editingPlayer is provided
  useEffect(() => {
    if (isOpen) {
      skipNextHcpCalcRef.current = true
      if (editingPlayer) {
        // Editing mode: pre-fill with existing data and show form directly
        setShowCreateForm(true)
        reset({
          full_name: editingPlayer.player_name || '',
          member_number: editingPlayer.member_number || '',
          email: editingPlayer.player_email || '',
          phone: editingPlayer.player_phone || '',
          gender: editingPlayer.gender || undefined,
          handicap_index: editingPlayer.handicap_index != null && editingPlayer.handicap_index !== '' ? Number(editingPlayer.handicap_index) : null,
          handicap_local: editingPlayer.handicap_local != null && editingPlayer.handicap_local !== '' ? Number(editingPlayer.handicap_local) : null,
          home_club: editingPlayer.player_club || '',
          notes: editingPlayer.notes || ''
        })
      } else if (initialName) {
        // Creating mode with pre-filled name
        setShowCreateForm(true)
        reset({
          full_name: initialName,
          member_number: '',
          email: '',
          phone: '',
          gender: undefined,
          handicap_index: null,
          handicap_local: null,
          home_club: '',
          notes: ''
        })
      } else if (openDirectlyToCreateForm) {
        setShowCreateForm(true)
        reset({
          full_name: '',
          member_number: '',
          email: '',
          phone: '',
          gender: undefined,
          handicap_index: null,
          handicap_local: null,
          home_club: '',
          notes: ''
        })
      }
    }
  }, [editingPlayer, initialName, isOpen, openDirectlyToCreateForm, reset])

  // Auto-calcular HCP local cuando el usuario cambia el Index (no sobrescribir al abrir/editar)
  const indexVal = watch('handicap_index')
  const genderVal = watch('gender')
  useEffect(() => {
    if (skipNextHcpCalcRef.current) {
      skipNextHcpCalcRef.current = false
      return
    }
    const idx = indexVal != null && Number.isFinite(Number(indexVal)) ? Number(indexVal) : null
    if (idx !== null) {
      const calculated = calculateHCPFromIndexDefault(idx, genderVal)
      if (calculated !== null) setValue('handicap_local', calculated)
    } else {
      setValue('handicap_local', null)
    }
  }, [indexVal, genderVal, setValue])

  // Additional effect to handle form reset when switching to create form
  useEffect(() => {
    if (showCreateForm && !editingPlayer && initialName) {
      // Only reset with initialName if we're not editing
      reset({
        full_name: initialName,
        member_number: '',
        email: '',
        phone: '',
        gender: undefined,
        handicap_index: null,
        handicap_local: null,
        home_club: '',
        notes: ''
      })
    }
  }, [initialName, showCreateForm, editingPlayer, reset])

  const handleConsultarAag = async () => {
    const mn = String(getValues('member_number') || '').trim()
    if (!mn) {
      toast.error('Ingresá una matrícula para consultar AAG')
      return
    }
    setAagLookupLoading(true)
    try {
      const res = await lookupAagByMemberNumber(clubId, 'external', mn)
      if (!res.success) {
        toast.error(res.error?.message || 'No se pudo consultar AAG')
        return
      }
      const d = res.data
      if (d.found && d.handicapIndex != null) {
        setValue('handicap_index', d.handicapIndex)
        const g = getValues('gender')
        const calculated = calculateHCPFromIndexDefault(d.handicapIndex, g || undefined)
        if (calculated !== null) setValue('handicap_local', calculated)
        toast.success(d.message || 'Index obtenido desde AAG')
      } else if (d.aagStatus === 'ERROR') {
        toast.error(d.message || 'Error al consultar AAG')
      } else {
        toast(d.message || 'Sin índice o no encontrado en AAG', { icon: 'ℹ️' })
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string }
      const msg = err?.response?.data?.error?.message || err?.message || 'Error de red al consultar AAG'
      toast.error(msg)
    } finally {
      setAagLookupLoading(false)
    }
  }

  const checkForDuplicates = async (data: ExternalPlayerFormData) => {
    try {
      console.log('🔍 Checking for duplicates:', data);
      const duplicates = await checkDuplicateExternalPlayers(clubId, data);
      
      // Si hay duplicados, mostrar modal de confirmación
      if (duplicates.byMatricula || duplicates.byNameAndClub.length > 0) {
        setPendingPlayerData(data);
        setDuplicateData(duplicates);
        setShowDuplicateModal(true);
        return false; // No continuar con la creación
      }
      
      return true; // No hay duplicados, continuar
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return true; // En caso de error, continuar normalmente
    }
  };

  const createPlayerDirectly = async (data: ExternalPlayerFormData) => {
    try {
      const newPlayer = await createExternalPlayer.mutateAsync(data);
      setCreatedPlayerName(`${data.full_name} creado`);
      onSuccess(newPlayer);
      
      // Para creación: solo ocultar formulario y mostrar mensaje
      setShowSuccessMessage(true);
      reset();
      setShowCreateForm(false);
      
      // Manually refresh the external players list
      await refetchExternalPlayers();
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
        setCreatedPlayerName('');
      }, 3000);
      
    } catch (error) {
      console.error('Error creating external player:', error);
    }
  };

  const onSubmit = async (data: ExternalPlayerFormData) => {
    try {
      console.log('🔥 Datos del formulario:', data);
      console.log('🔥 editingPlayer:', editingPlayer);
      
      if (editingPlayer) {
        // Editar jugador existente (no verificar duplicados)
        console.log('🔥 Enviando actualización con datos:', { playerId: editingPlayer.player_id, playerData: data });
        await updateExternalPlayer.mutateAsync({ 
          playerId: editingPlayer.player_id, 
          playerData: data 
        });
        setCreatedPlayerName(`${data.full_name} actualizado`);
        
        // Para edición: cerrar modal completamente y regresar a pantalla anterior
        setShowSuccessMessage(true);
        setTimeout(() => {
          onClose(); // Cierra el modal y regresa a la pantalla anterior
        }, 1500); // Espera 1.5 segundos para mostrar el mensaje de éxito
        
        // Manually refresh the external players list
        await refetchExternalPlayers();
        
      } else {
        // Crear nuevo jugador - verificar duplicados primero
        const canProceed = await checkForDuplicates(data);
        if (canProceed) {
          await createPlayerDirectly(data);
        }
        // Si hay duplicados, el modal se muestra y esperamos la decisión del usuario
      }
      
    } catch (error) {
      console.error('Error saving external player:', error);
    }
  };

  const handleUseExistingPlayer = (existingPlayer: any) => {
    console.log('🔄 Using existing player:', existingPlayer);
    
    // Usar el jugador existente y agregarlo al torneo si onSuccess lo requiere
    onSuccess({
      player_id: existingPlayer.external_id,
      player_name: existingPlayer.full_name,
      member_number: existingPlayer.member_number,
      player_email: existingPlayer.email,
      player_phone: existingPlayer.phone,
      handicap_index: existingPlayer.handicap_index,
      handicap_local: existingPlayer.handicap_local,
      player_club: existingPlayer.home_club,
      player_type: 'external'
    });
    
    setShowDuplicateModal(false);
    setPendingPlayerData(null);
    setDuplicateData(null);
    setShowSuccessMessage(true);
    setCreatedPlayerName(`${existingPlayer.full_name} agregado desde otro club`);
    reset();
    setShowCreateForm(false);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
      setCreatedPlayerName('');
    }, 3000);
  };

  const handleCreateNewPlayer = async () => {
    console.log('✨ Creating new player despite duplicates');
    setShowDuplicateModal(false);
    
    if (pendingPlayerData) {
      await createPlayerDirectly(pendingPlayerData);
    }
    
    setPendingPlayerData(null);
    setDuplicateData(null);
  };

  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false);
    setPendingPlayerData(null);
    setDuplicateData(null);
    // El formulario permanece abierto para que el usuario pueda modificar los datos
  };

  const handleClose = () => {
    reset()
    setShowCreateForm(false)
    setSearchTerm('')
    setShowSuccessMessage(false)
    setCreatedPlayerName('')
    onClose()
  }

  const handleSelectExistingPlayer = (player: any) => {
    onSuccess(player)
  }

  const handleDeletePlayer = async (playerId: number, playerName: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar a ${playerName}?`)) {
      try {
        await deleteExternalPlayer.mutateAsync(playerId)
      } catch (error) {
        console.error('Error deleting external player:', error)
      }
    }
  }

  // handleEditPlayer removed - now controlled by parent component



  // Filter external players based on search term (name or member number)
  const filteredPlayers = externalPlayers.filter(player => {
    if (!searchTerm) return true
    
    const term = searchTerm.toLowerCase()
    const nameMatch = player.player_name.toLowerCase().includes(term)
    const memberNumberMatch = player.member_number?.toLowerCase().includes(term) || false
    
    return nameMatch || memberNumberMatch
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-black text-white p-4 flex justify-between items-center rounded-t-lg">
          <div className="flex items-center space-x-2">
            <UserX className="w-5 h-5" />
            <h2 className="text-lg font-bold">
              {showCreateForm ? (editingPlayer ? 'Editar Jugador Externo' : 'Crear Nuevo Jugador Externo') : 'Agregar Jugador Externo'}
            </h2>
          </div>
          <button onClick={handleClose} className="text-gray-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mx-6 mt-4 px-4 py-3 bg-green-100 border border-green-300 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  ¡Jugador agregado exitosamente!
                </p>
                <p className="text-sm text-green-600">
                  {createdPlayerName} ha sido creado como jugador externo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {showCreateForm ? (
            /* Create Form */
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Registra un jugador que no pertenece a ningún club del sistema.
          </p>

          {/* Nombre completo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              {...register('full_name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="Ej: Juan Carlos Pérez"
            />
            {errors.full_name && (
              <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
            )}
          </div>

          {/* Número de matrícula */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Matrícula (Opcional)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                {...register('member_number')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  e.stopPropagation()
                  if (aagLookupLoading) return
                  void handleConsultarAag()
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Ej: matrícula federativa"
              />
              <button
                type="button"
                onClick={handleConsultarAag}
                disabled={aagLookupLoading}
                className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
              >
                {aagLookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Consultar AAG
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              El HCP local se recalcula con el índice y el género (fórmula por defecto del sistema).
            </p>
            {errors.member_number && (
              <p className="mt-1 text-sm text-red-600">{errors.member_number.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (Opcional)
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="ejemplo@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Género */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Género (Opcional)
            </label>
            <select
              {...register('gender')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
              <option value="">Sin especificar</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="Other">Otro</option>
            </select>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono (Opcional)
            </label>
            <input
              type="tel"
              {...register('phone')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="+54 9 11 1234-5678"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* Index y HCP en una fila */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Index */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Index (vacío = Sin HCP)
              </label>
              <input
                type="text"
                inputMode="decimal"
                {...register('handicap_index', {
                  setValueAs: (v) => {
                    const s = typeof v === 'string' ? v.trim() : v
                    if (s === '' || s === undefined || s === null) return null
                    const n = Number(s)
                    return Number.isFinite(n) ? n : null
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Sin HCP"
              />
              {errors.handicap_index && (
                <p className="mt-1 text-sm text-red-600">{errors.handicap_index.message}</p>
              )}
            </div>

            {/* HCP local */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HCP local (vacío = Sin HCP)
              </label>
              <input
                type="text"
                inputMode="decimal"
                {...register('handicap_local', {
                  setValueAs: (v) => {
                    const s = typeof v === 'string' ? v.trim() : v
                    if (s === '' || s === undefined || s === null) return null
                    const n = Number(s)
                    return Number.isFinite(n) ? n : null
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Sin HCP"
              />
              {errors.handicap_local && (
                <p className="mt-1 text-sm text-red-600">{errors.handicap_local.message}</p>
              )}
            </div>
          </div>

          {/* Club de origen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Club de Origen (Opcional)
            </label>
            <input
              type="text"
              {...register('home_club')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="Ej: Club de Golf San Isidro"
            />
            {errors.home_club && (
              <p className="mt-1 text-sm text-red-600">{errors.home_club.message}</p>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (Opcional)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              placeholder="Información adicional sobre el jugador..."
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>

              {/* Footer */}
              <div className="flex justify-between space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ← Volver a Lista
                </button>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || createExternalPlayer.isPending || updateExternalPlayer.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting || createExternalPlayer.isPending || updateExternalPlayer.isPending ? 
                      (editingPlayer ? 'Actualizando...' : 'Creando...') : 
                      (editingPlayer ? 'Actualizar Jugador' : 'Crear Jugador')}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* List View */
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Selecciona un jugador externo existente o crea uno nuevo.
              </p>

              {/* Search */}
              <div className="mb-4">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Buscar por nombre o número de matrícula..."
                />
              </div>

              {/* Create New Button */}
              <button
                onClick={() => {
                  setShowCreateForm(true)
                  // If there's a search term, use it as initial name
                  if (searchTerm) {
                    reset({
                      full_name: searchTerm,
                      member_number: '',
                      email: '',
                      phone: '',
                      handicap_index: 0,
                      home_club: '',
                      notes: ''
                    })
                  }
                }}
                className="w-full mb-4 flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nuevo Jugador Externo</span>
              </button>

              {/* Players List */}
              <div className="border rounded-lg max-h-80 overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-500">
                    Cargando jugadores externos...
                  </div>
                ) : filteredPlayers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {searchTerm ? 'No se encontraron jugadores que coincidan con la búsqueda' : 'No hay jugadores externos registrados'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredPlayers.map((player) => (
                      <div
                        key={player.player_id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div 
                            className="flex items-center space-x-3 cursor-pointer flex-1"
                            onClick={() => handleSelectExistingPlayer(player)}
                          >
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{player.player_name}</div>
                              <div className="text-sm text-gray-500">
                                {player.member_number && `N°: ${player.member_number} • `}
                                {player.player_club || 'Sin club'} • Index: {player.handicap_index != null ? player.handicap_index : 'Sin HCP'} • HCP: {player.handicap_local != null ? player.handicap_local : 'Sin HCP'}
                              </div>
                              {player.player_email && (
                                <div className="text-xs text-gray-400">{player.player_email}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeletePlayer(player.player_id!, player.player_name)
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded border border-red-700 transition-colors"
                              title="Eliminar jugador"
                            >
                              <Trash2 className="w-3 h-3" />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación de duplicados */}
      <DuplicatePlayerModal
        isOpen={showDuplicateModal}
        onClose={handleCloseDuplicateModal}
        onUseExisting={handleUseExistingPlayer}
        onCreateNew={handleCreateNewPlayer}
        playerData={pendingPlayerData || {}}
        duplicates={duplicateData || { byMatricula: null, byNameAndClub: [] }}
      />
    </div>
  )
}
