import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Calendar, DollarSign, Users, Trophy } from 'lucide-react'
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

export function CreateTournamentModal({ isOpen, onClose, onSuccess, tournament, clubId }: CreateTournamentModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
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
      max_participants: tournament?.max_participants || undefined,
      registration_deadline: tournament?.registration_deadline?.split('T')[0] || '',
      entry_fee: tournament?.entry_fee || 0,
      prize_pool: tournament?.prize_pool || 0,
      description: tournament?.description || '',
      rules: tournament?.rules || ''
    }
  })

  const tournamentType = watch('tournament_type')

  const onSubmit = async (data: CreateTournamentData) => {
    try {
      if (isEditMode) {
        await updateTournament.mutateAsync(data)
      } else {
        await createTournament.mutateAsync(data)
      }
      handleClose()
      onSuccess()
    } catch (error) {
      console.error('Error saving tournament:', error)
    }
  }

  const handleClose = () => {
    reset()
    setCurrentStep(1)
    onClose()
  }

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1))

  const tournamentTypeOptions = [
    { value: 'stroke_play', label: 'Stroke Play', description: 'Juego por golpes - suma total de golpes' },
    { value: 'match_play', label: 'Match Play', description: 'Juego por hoyos - gana quien gana más hoyos' },
    { value: 'scramble', label: 'Scramble', description: 'Todos juegan desde la mejor posición del equipo' },
    { value: 'best_ball', label: 'Best Ball', description: 'Se cuenta el mejor score de cada hoyo del equipo' }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
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

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex items-center ${step < 3 ? 'flex-1' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setCurrentStep(step)}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm cursor-pointer
                    ${currentStep >= step 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }
                  `}
                >
                  {step}
                </button>
                <div className="ml-3">
                  <div className={`text-sm font-medium ${currentStep >= step ? 'text-gray-900' : 'text-gray-500'}`}>
                    {step === 1 && 'Información Básica'}
                    {step === 2 && 'Configuración'}
                    {step === 3 && 'Detalles'}
                  </div>
                </div>
                {step < 3 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${currentStep > step ? 'bg-gray-900' : 'bg-gray-200'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Información Básica
                </h3>

                {/* Nombre del Torneo */}
                <div>
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

                {/* Horarios */}
                <div className="grid grid-cols-2 gap-4">
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

                {/* Tipo de Torneo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de Torneo *
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {tournamentTypeOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`
                          relative flex cursor-pointer rounded-lg border p-4 transition-colors
                          ${tournamentType === option.value 
                            ? 'border-gray-900 bg-gray-50' 
                            : 'border-gray-300 hover:border-gray-400'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          {...register('tournament_type')}
                          value={option.value}
                          className="sr-only"
                        />
                        <div className="flex w-full items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{option.label}</div>
                            <div className="text-sm text-gray-500">{option.description}</div>
                          </div>
                          <div
                            className={`
                              h-4 w-4 rounded-full border-2 
                              ${tournamentType === option.value 
                                ? 'border-gray-900 bg-gray-900' 
                                : 'border-gray-300'
                              }
                            `}
                          >
                            {tournamentType === option.value && (
                              <div className="h-full w-full rounded-full bg-white scale-50" />
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Configuración del Torneo
                </h3>

                {/* Participantes y Fecha Límite */}
                <div className="grid grid-cols-2 gap-4">
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
                </div>

                {/* Tarifas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Tarifa de Inscripción
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Trophy className="w-4 h-4 inline mr-1" />
                      Pozo de Premios
                    </label>
                    <input
                      type="number"
                      {...register('prize_pool', { valueAsNumber: true })}
                      min="0"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      placeholder="0"
                    />
                    <p className="mt-1 text-xs text-gray-500">Moneda: Pesos Argentinos (ARS)</p>
                    {errors.prize_pool && (
                      <p className="mt-1 text-sm text-red-600">{errors.prize_pool.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalles Adicionales
                </h3>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción del Torneo
                  </label>
                  <textarea
                    {...register('description')}
                    rows={4}
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
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Reglas específicas del torneo, format de juego, etc."
                  />
                  {errors.rules && (
                    <p className="mt-1 text-sm text-red-600">{errors.rules.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between space-x-3">
            <div className="flex space-x-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Anterior
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Guardando...' : (isEditMode ? 'Actualizar Torneo' : 'Crear Torneo')}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
