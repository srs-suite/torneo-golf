import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Trophy, Calendar, DollarSign } from 'lucide-react'
import { useCreateTournament, useUpdateTournament } from '@/hooks/useTournaments'
import { Tournament, CreateTournamentData } from '@/types/tournament'
import { 
  getCurrentDateHTML
} from '@/utils/dateFormatter'
import { DateInput } from './DateInput'
import { TimeInput } from './TimeInput'

const tournamentSchema = z.object({
  tournament_name: z.string().min(1, 'El nombre del torneo es requerido').max(255, 'Máximo 255 caracteres'),
  tournament_date: z.string().min(1, 'La fecha del torneo es requerida'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  tournament_type: z.enum(['stroke_play', 'match_play', 'scramble', 'best_ball']),
  status: z.enum(['draft', 'open', 'closed', 'in_progress', 'completed', 'cancelled']).optional(),
  max_participants: z.number().min(1, 'Mínimo 1 participante').max(200, 'Máximo 200 participantes').optional(),
  registration_deadline: z.string().optional(),
  entry_fee: z.number().min(0, 'La tarifa debe ser mayor o igual a 0').default(0),
  prize_pool: z.number().min(0, 'El premio debe ser mayor o igual a 0').optional().default(0),
  description: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  rules: z.string().max(2000, 'Máximo 2000 caracteres').optional()
})

interface CreateTournamentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  tournament?: Tournament | null
  clubId: number
}

export function CreateTournamentModalSimple({ isOpen, onClose, onSuccess, tournament, clubId }: CreateTournamentModalProps) {
  const isEditMode = !!tournament

  const createTournament = useCreateTournament(clubId)
  const updateTournament = useUpdateTournament(clubId, tournament?.tournament_id || 0)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue
  } = useForm<CreateTournamentData>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      tournament_name: tournament?.tournament_name || '',
      tournament_date: tournament?.tournament_date?.split('T')[0] || '',
      start_time: tournament?.start_time || '',
      end_time: tournament?.end_time || '',
      tournament_type: tournament?.tournament_type || 'stroke_play',
      status: tournament?.status || 'draft',
      max_participants: tournament?.max_participants || undefined,
      registration_deadline: tournament?.registration_deadline?.split('T')[0] || '',
      entry_fee: tournament?.entry_fee || 0,
      prize_pool: tournament?.prize_pool || 0,
      description: tournament?.description || '',
      rules: tournament?.rules || ''
    }
  })


  const onSubmit = async (data: CreateTournamentData) => {
    console.log('Enviando datos del torneo:', data)
    try {
      if (isEditMode) {
        await updateTournament.mutateAsync(data)
      } else {
        await createTournament.mutateAsync(data)
      }
      // Si llegamos aquí, la operación fue exitosa
      handleClose()
      onSuccess()
    } catch (error) {
      console.error('Error saving tournament:', error)
      // Solo mostrar error si realmente falló la creación
      // El toast de error ya se maneja en el hook
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const tournamentTypeOptions = [
    { value: 'stroke_play', label: 'Stroke Play', description: 'Juego por golpes' },
    { value: 'match_play', label: 'Match Play', description: 'Juego por hoyos' },
    { value: 'scramble', label: 'Scramble', description: 'Equipo - mejor posición' },
    { value: 'best_ball', label: 'Best Ball', description: 'Equipo - mejor score' }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Trophy className="w-6 h-6" />
            <h2 className="text-xl font-bold">
              {isEditMode ? 'Editar Torneo' : 'Crear Nuevo Torneo'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Información Básica */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Información Básica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre del Torneo */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Torneo *
                  </label>
                  <input
                    type="text"
                    {...register('tournament_name')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Ej: Copa Primavera 2024"
                  />
                  {errors.tournament_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.tournament_name.message}</p>
                  )}
                </div>

                {/* Fecha del Torneo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha del Torneo *
                  </label>
                  <DateInput
                    value={watch('tournament_date') || ''}
                    onChange={(value) => setValue('tournament_date', value)}
                    placeholder="dd/mm/yyyy"
                    required
                    min={getCurrentDateHTML()}
                    error={errors.tournament_date?.message}
                  />
                </div>

                {/* Tipo de Torneo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Torneo *
                  </label>
                  <select
                    {...register('tournament_type')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  >
                    {tournamentTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estado del Torneo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado del Torneo
                  </label>
                  <select
                    {...register('status')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  >
                    <option value="draft">🔸 Borrador - En configuración (no público)</option>
                    <option value="open">🟢 Abierto - Inscripciones abiertas</option>
                    <option value="closed">🟡 Cerrado - Inscripciones cerradas</option>
                    <option value="in_progress">🔵 En Progreso - Torneo ejecutándose</option>
                    <option value="completed">🟣 Completado - Torneo finalizado</option>
                    <option value="cancelled">🔴 Cancelado - Torneo cancelado</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Cambiar a "Abierto" cuando esté listo para recibir inscripciones
                  </p>
                </div>

                {/* Horarios */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de Inicio
                  </label>
                  <TimeInput
                    value={watch('start_time') || ''}
                    onChange={(value) => setValue('start_time', value)}
                    placeholder="HH:mm (ej: 14:30)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de Fin
                  </label>
                  <TimeInput
                    value={watch('end_time') || ''}
                    onChange={(value) => setValue('end_time', value)}
                    placeholder="HH:mm (ej: 18:00)"
                  />
                </div>
              </div>
            </div>

            {/* Configuración */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Configuración
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Participantes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Máximo de Participantes
                  </label>
                  <input
                    type="number"
                    {...register('max_participants', { valueAsNumber: true })}
                    min="1"
                    max="200"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Sin límite"
                  />
                  {errors.max_participants && (
                    <p className="mt-1 text-sm text-red-600">{errors.max_participants.message}</p>
                  )}
                </div>

                {/* Fecha Límite */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Límite de Inscripción
                  </label>
                  <DateInput
                    value={watch('registration_deadline') || ''}
                    onChange={(value) => setValue('registration_deadline', value)}
                    placeholder="dd/mm/yyyy"
                    min={getCurrentDateHTML()}
                  />
                </div>

                {/* Tarifas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tarifa de Inscripción (ARS $)
                  </label>
                  <input
                    type="number"
                    {...register('entry_fee', { valueAsNumber: true })}
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-gray-500">Moneda: Pesos Argentinos (ARS)</p>
                  {errors.entry_fee && (
                    <p className="mt-1 text-sm text-red-600">{errors.entry_fee.message}</p>
                  )}
                </div>

                {/* Pozo de Premios comentado - no se necesita según usuario
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pozo de Premios ($)
                  </label>
                  <input
                    type="number"
                    {...register('prize_pool', { valueAsNumber: true })}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  {errors.prize_pool && (
                    <p className="mt-1 text-sm text-red-600">{errors.prize_pool.message}</p>
                  )}
                </div>
                */}
              </div>
            </div>

            {/* Detalles */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Detalles Adicionales
              </h3>
              
              <div className="space-y-4">
                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción del Torneo
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Describe el torneo, premios, categorías, etc."
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>

                {/* Reglas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reglas Especiales
                  </label>
                  <textarea
                    {...register('rules')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Reglas específicas del torneo, formato de juego, etc."
                  />
                  {errors.rules && (
                    <p className="mt-1 text-sm text-red-600">{errors.rules.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="border-t border-gray-200 pt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isSubmitting && (
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{isSubmitting ? 'Guardando...' : (isEditMode ? 'Actualizar Torneo' : 'Crear Torneo')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
