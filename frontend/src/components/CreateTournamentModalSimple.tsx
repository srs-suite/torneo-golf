import { useForm } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Trophy, Calendar, DollarSign, Link2, Upload } from 'lucide-react'
import { tournamentService } from '@/services/tournamentService'
import { resolveFlyerDisplayUrl } from '@/utils/flyerUrl'
import { useCreateTournament, useUpdateTournament } from '@/hooks/useTournaments'
import { Tournament, CreateTournamentData } from '@/types/tournament'
import { toast } from 'react-hot-toast'
import { 
  getCurrentDateHTML
} from '@/utils/dateFormatter'
import { DateInput } from './DateInput'
import { TimeInput } from './TimeInput'

/** Estado del formulario: solo Abierto / Cerrado (legacy draft/en_progreso → abierto; completado/cancelado → cerrado). */
function tournamentFormStatus(t: Tournament | null | undefined): 'open' | 'closed' {
  if (!t?.status) return 'open'
  if (t.status === 'closed' || t.status === 'completed' || t.status === 'cancelled') return 'closed'
  return 'open'
}

const tournamentSchemaCreate = z.object({
  tournament_name: z.string().min(1, 'El nombre del torneo es requerido').max(255, 'Máximo 255 caracteres'),
  tournament_date: z.string().min(1, 'La fecha del torneo es requerida'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  tournament_type: z.enum(['stroke_play', 'match_play', 'scramble', 'best_ball']),
  status: z.enum(['open', 'closed']),
  max_participants: z.number().min(1, 'Mínimo 1 participante').max(200, 'Máximo 200 participantes').optional(),
  registration_deadline: z.string().optional(),
  entry_fee: z.number().min(0, 'La tarifa debe ser mayor o igual a 0').default(0),
  description: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  rules: z.string().max(2000, 'Máximo 2000 caracteres').optional()
})

const tournamentSchemaEdit = tournamentSchemaCreate.extend({
  tournament_date: z.string().optional()
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
  const [isRankingEvent, setIsRankingEvent] = useState<boolean>((tournament as any)?.is_ranking_event === 1 || (tournament as any)?.is_ranking_event === true)
  const readResultsMode = (t: any): 'standard' | 'scratch_bands' => {
    const v = t?.results_mode
    if (v === 'scratch_bands' || (typeof v === 'string' && v.toLowerCase() === 'scratch_bands')) return 'scratch_bands'
    return 'standard'
  }
  const [resultsMode, setResultsMode] = useState<'standard' | 'scratch_bands'>(readResultsMode(tournament as any))
  const [separateLadies, setSeparateLadies] = useState<boolean>((tournament as any)?.separate_ladies === 1 || (tournament as any)?.separate_ladies === true)
  const [ladiesByHcp, setLadiesByHcp] = useState<boolean>((tournament as any)?.ladies_by_hcp === 1 || (tournament as any)?.ladies_by_hcp === true)
  const [publicInscription, setPublicInscription] = useState<boolean>((tournament as any)?.public_inscription === 1 || (tournament as any)?.public_inscription === true)
  const [publicInscriptionAllowGroups, setPublicInscriptionAllowGroups] = useState<boolean>((tournament as any)?.public_inscription_allow_groups !== 0 && (tournament as any)?.public_inscription_allow_groups !== false)
  const [flyerUrl, setFlyerUrl] = useState<string>((tournament as any)?.flyer_url || '')
  const [uploadingFlyer, setUploadingFlyer] = useState(false)
  /** Al crear torneo, si el usuario eligió un archivo, se guarda aquí y se sube después de crear. */
  const [pendingFlyerDataUrl, setPendingFlyerDataUrl] = useState<string | null>(null)
  const [pendingFlyerFileName, setPendingFlyerFileName] = useState<string | null>(null)
  /** Campo URL externa opcional; no hace falta para archivos subidos desde la PC. */
  const [showFlyerUrlInput, setShowFlyerUrlInput] = useState(false)
  const [teeSimultaneousStarts, setTeeSimultaneousStarts] = useState<boolean>((tournament as any)?.enable_simultaneous_starts === 1 || (tournament as any)?.enable_simultaneous_starts === true)
  const [teeIntervalMinutes, setTeeIntervalMinutes] = useState<number>(typeof (tournament as any)?.tee_interval_minutes === 'number' ? (tournament as any).tee_interval_minutes : 10)
  const [teePreferredSession, setTeePreferredSession] = useState<'morning' | 'afternoon'>(((tournament as any)?.preferred_session === 'afternoon') ? 'afternoon' : 'morning')
  const [teeAfternoonStartTime, setTeeAfternoonStartTime] = useState<string>((tournament as any)?.afternoon_start_time || '14:00')
  const [teeTwoSessions, setTeeTwoSessions] = useState<boolean>((tournament as any)?.enable_two_sessions === 1 || (tournament as any)?.enable_two_sessions === true)

  useEffect(() => {
    if (isOpen) {
      if (tournament) {
        const t = tournament as any
        setPublicInscription(t?.public_inscription === 1 || t?.public_inscription === true)
        setPublicInscriptionAllowGroups(t?.public_inscription_allow_groups !== 0 && t?.public_inscription_allow_groups !== false)
        const existingFlyer = t?.flyer_url || ''
        setFlyerUrl(existingFlyer)
        setShowFlyerUrlInput(/^https?:\/\//i.test(existingFlyer))
        setPendingFlyerDataUrl(null)
        setPendingFlyerFileName(null)
        setResultsMode(readResultsMode(t))
      setSeparateLadies(t?.separate_ladies === 1 || t?.separate_ladies === true)
      setLadiesByHcp(t?.ladies_by_hcp === 1 || t?.ladies_by_hcp === true)
      setIsRankingEvent(t?.is_ranking_event === 1 || t?.is_ranking_event === true)
      setTeeSimultaneousStarts(t?.enable_simultaneous_starts === 1 || t?.enable_simultaneous_starts === true)
      setTeeIntervalMinutes(typeof t?.tee_interval_minutes === 'number' ? t.tee_interval_minutes : 10)
      setTeePreferredSession(t?.preferred_session === 'afternoon' ? 'afternoon' : 'morning')
      setTeeAfternoonStartTime(t?.afternoon_start_time || '14:00')
      setTeeTwoSessions(t?.enable_two_sessions === 1 || t?.enable_two_sessions === true)
      } else {
        setFlyerUrl('')
        setShowFlyerUrlInput(false)
        setPendingFlyerDataUrl(null)
        setPendingFlyerFileName(null)
      }
    }
  }, [isOpen, tournament])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue
  } = useForm<CreateTournamentData>({
    resolver: zodResolver(isEditMode ? tournamentSchemaEdit : tournamentSchemaCreate),
    defaultValues: {
      tournament_name: tournament?.tournament_name || '',
      tournament_date: tournament?.tournament_date 
        ? new Date(tournament.tournament_date).toISOString().split('T')[0] 
        : '',
      start_time: tournament?.start_time || '',
      end_time: tournament?.end_time || '',
      tournament_type: tournament?.tournament_type || 'stroke_play',
      status: tournamentFormStatus(tournament),
      max_participants: tournament?.max_participants || undefined,
      registration_deadline: tournament?.registration_deadline 
        ? new Date(tournament.registration_deadline).toISOString().split('T')[0]
        : '',
      entry_fee: tournament?.entry_fee || 0,
      description: tournament?.description || '',
      rules: tournament?.rules || ''
    }
  })

  useEffect(() => {
    if (isOpen && tournament) {
      setValue('status', tournamentFormStatus(tournament))
    }
  }, [isOpen, tournament, setValue])

  const onSubmit = async (data: CreateTournamentData) => {
    console.log('Enviando datos del torneo:', data)
    const tId = toast.loading(isEditMode ? 'Actualizando torneo…' : 'Creando torneo…')
    try {
      const safeData: CreateTournamentData = {
        ...data,
        tournament_date: (isEditMode && (!data.tournament_date || data.tournament_date === ''))
          ? (tournament?.tournament_date ? new Date(tournament.tournament_date).toISOString().split('T')[0] : '')
          : data.tournament_date
      }
      const teePayload = {
        enable_simultaneous_starts: teeSimultaneousStarts,
        afternoon_start_time: teeAfternoonStartTime,
        preferred_session: teePreferredSession,
        tee_interval_minutes: teeIntervalMinutes,
        enable_two_sessions: teeTwoSessions
      }
      if (isEditMode) {
        await updateTournament.mutateAsync({ 
          ...safeData, 
          is_ranking_event: isRankingEvent,
          results_mode: resultsMode,
          separate_ladies: separateLadies,
          ladies_by_hcp: ladiesByHcp,
          public_inscription: publicInscription,
          public_inscription_allow_groups: publicInscriptionAllowGroups,
          flyer_url: flyerUrl.trim() || undefined,
          ...teePayload
        })
      } else {
        const newTournament = await createTournament.mutateAsync({ 
          ...safeData, 
          is_ranking_event: isRankingEvent,
          results_mode: resultsMode,
          separate_ladies: separateLadies,
          ladies_by_hcp: ladiesByHcp,
          public_inscription: publicInscription,
          public_inscription_allow_groups: publicInscriptionAllowGroups,
          flyer_url: flyerUrl.trim() || undefined,
          ...teePayload
        })
        if (pendingFlyerDataUrl && newTournament?.tournament_id) {
          try {
            const { url } = await tournamentService.uploadFlyer(clubId, newTournament.tournament_id, pendingFlyerDataUrl)
            await tournamentService.updateTournament(clubId, newTournament.tournament_id, { flyer_url: url })
          } catch (e) {
            console.error('Error subiendo flyer tras crear torneo:', e)
            toast.error('Torneo creado pero no se pudo subir el flyer. Podés editarlo y subir la imagen de nuevo.')
          }
        }
      }
      // Si llegamos aquí, la operación fue exitosa
      handleClose()
      onSuccess()
    } catch (error) {
      console.error('Error saving tournament:', error)
      // Solo mostrar error si realmente falló la creación
      // El toast de error ya se maneja en el hook
    } finally {
      toast.dismiss(tId)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const tournamentTypeOptions = [
    { value: 'stroke_play', label: 'Stroke Play (por HCP / neto)', description: 'Juego por golpes; resultados con handicap' },
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
          <form 
            onSubmit={handleSubmit(onSubmit, (errs) => {
              console.warn('❌ Validación de formulario fallida:', errs)
              const requiredMissing = []
              if (errs.tournament_name) requiredMissing.push('Nombre del Torneo')
              if (errs.tournament_date) requiredMissing.push('Fecha del Torneo')
              if (errs.tournament_type) requiredMissing.push('Tipo de Torneo')
              if (requiredMissing.length) {
                toast.error(`Completá: ${requiredMissing.join(', ')}`)
              } else {
                toast.error('Revisá los campos marcados en rojo')
              }
            })}
            className="p-6 space-y-6"
          >
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
                    required={!isEditMode}
                    /* Al editar, permitir fechas pasadas; al crear, exigir fecha mínima hoy */
                    min={isEditMode ? undefined : getCurrentDateHTML()}
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
                  <p className="mt-1 text-xs text-gray-500">
                    Para torneo por handicap (neto): elegí <strong>Stroke Play (por HCP / neto)</strong>. Las salidas se pueden agrupar por HCP en Gestión de tee times → Generar grupos.
                  </p>
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
                    <option value="open">Abierto — inscripciones y datos editables</option>
                    <option value="closed">Cerrado — congela índice y HCP del torneo (histórico)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Al pasar a Cerrado se guardan en cada inscripto el índice y HCP usados en el torneo; no se pueden crear ni editar tarjetas; los resultados no siguen al HCP actual del socio. Reabrí con Abierto
                    para permitir correcciones y volvé a Cerrado para congelar de nuevo.
                  </p>
                </div>

                {/* Inscripción por web */}
                <div className="md:col-span-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={publicInscription}
                        onChange={(e) => setPublicInscription(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <Link2 className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Inscripción por web: los jugadores podrán anotarse desde un enlace público
                      </span>
                    </label>
                    <p className="text-xs text-blue-700 mt-2">
                      Si activás esta opción, el sistema generará una URL para publicar (WhatsApp, redes, etc.). Los jugadores ingresan con su teléfono y eligen turno y grupo. Después podés reorganizar salidas por handicap si lo necesitás.
                    </p>
                    {publicInscription && (
                      <label className="flex items-center gap-3 cursor-pointer mt-3 pt-3 border-t border-blue-200">
                        <input
                          type="checkbox"
                          checked={publicInscriptionAllowGroups}
                          onChange={(e) => setPublicInscriptionAllowGroups(e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-blue-900">
                          Permitir que los inscriptos formen grupos o se unan a uno
                        </span>
                      </label>
                    )}
                    {publicInscription && !publicInscriptionAllowGroups && (
                      <p className="text-xs text-amber-700 mt-1">
                        Si desactivás esta opción (por ejemplo porque vas a organizar por HCP), en la web solo podrán inscribirse de forma individual; la opción de crear o unirse a grupos quedará deshabilitada.
                      </p>
                    )}
                  </div>
                </div>

                {/* Flyer del torneo (inscripción pública) */}
                <div className="md:col-span-2">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Flyer del torneo
                    </label>
                    <p className="text-xs text-gray-600 mb-2">
                      Si la inscripción es por web, podés agregar una imagen del flyer (cartel). Se mostrará en la página de inscripción. Usá <strong>Subir archivo</strong> para elegir una imagen de tu computadora (PNG, JPG, GIF o WebP, máx. 5 MB). No hace falta pegar ninguna URL.
                    </p>
                    <div className="flex flex-wrap gap-2 items-center mb-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Upload className="w-4 h-4" />
                        {isEditMode ? 'Subir archivo' : 'Elegir archivo'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                          className="sr-only"
                          disabled={uploadingFlyer}
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const maxSize = 5 * 1024 * 1024
                            if (file.size > maxSize) {
                              toast.error('La imagen no debe superar 5 MB')
                              e.target.value = ''
                              return
                            }
                            const dataUrl = await new Promise<string>((resolve, reject) => {
                              const r = new FileReader()
                              r.onload = () => resolve(r.result as string)
                              r.onerror = () => reject(new Error('Error al leer el archivo'))
                              r.readAsDataURL(file)
                            })
                            setShowFlyerUrlInput(false)
                            setPendingFlyerFileName(file.name)
                            setPendingFlyerDataUrl(dataUrl)
                            if (isEditMode && tournament?.tournament_id) {
                              setUploadingFlyer(true)
                              try {
                                const { url } = await tournamentService.uploadFlyer(clubId, tournament.tournament_id, dataUrl)
                                setFlyerUrl(url)
                                await tournamentService.updateTournament(clubId, tournament.tournament_id, { flyer_url: url })
                                toast.success('Flyer subido y guardado')
                              } catch (err: any) {
                                setPendingFlyerDataUrl(null)
                                setPendingFlyerFileName(null)
                                toast.error(err?.response?.data?.error || err?.message || 'Error al subir la imagen')
                              } finally {
                                setUploadingFlyer(false)
                                e.target.value = ''
                              }
                            } else {
                              setFlyerUrl('')
                              toast.success('Imagen lista. Guardá el torneo para subirla.')
                            }
                            e.target.value = ''
                          }}
                        />
                      </label>
                      {!showFlyerUrlInput && (
                        <button
                          type="button"
                          onClick={() => setShowFlyerUrlInput(true)}
                          className="text-xs text-gray-600 underline hover:text-gray-800"
                        >
                          O pegar URL externa (opcional)
                        </button>
                      )}
                    </div>
                    {showFlyerUrlInput && (
                      <div className="mb-2">
                        <input
                          type="text"
                          value={flyerUrl}
                          onChange={(e) => setFlyerUrl(e.target.value)}
                          placeholder="https://ejemplo.com/flyer.jpg"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowFlyerUrlInput(false)
                            if (!/^https?:\/\//i.test(flyerUrl)) setFlyerUrl('')
                          }}
                          className="mt-1 text-xs text-gray-500 underline hover:text-gray-700"
                        >
                          Ocultar campo URL
                        </button>
                      </div>
                    )}
                    {uploadingFlyer && <p className="text-xs text-amber-600 mb-1">Subiendo imagen…</p>}
                    {(pendingFlyerFileName || (flyerUrl.trim() && !showFlyerUrlInput)) && !uploadingFlyer && (
                      <p className="text-xs text-green-700 mb-1">
                        {pendingFlyerFileName
                          ? (isEditMode ? `Archivo subido: ${pendingFlyerFileName}` : `Archivo seleccionado: ${pendingFlyerFileName}. Guardá el torneo para subirlo.`)
                          : 'Flyer guardado en el servidor.'}
                      </p>
                    )}
                    {(flyerUrl.trim() || pendingFlyerDataUrl) && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1">Vista previa:</p>
                        <img
                          src={pendingFlyerDataUrl || resolveFlyerDisplayUrl(flyerUrl) || ''}
                          alt="Flyer del torneo"
                          className="max-w-full max-h-40 object-contain rounded border border-gray-200 bg-white"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement
                            if (pendingFlyerDataUrl && img.src !== pendingFlyerDataUrl) {
                              img.src = pendingFlyerDataUrl
                              return
                            }
                            img.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>
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
                    {...register('max_participants', { 
                      valueAsNumber: true,
                      setValueAs: (v) => {
                        // Convertir vacío/NaN a undefined para que pase zod .optional()
                        const num = typeof v === 'string' ? v.trim() : v
                        const parsed = num === '' || num === null || num === undefined ? undefined : Number(num)
                        return Number.isNaN(parsed) ? undefined : parsed
                      }
                    })}
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
                    /* Idem: al editar permitir fechas pasadas si ya pasó la inscripción */
                    min={isEditMode ? undefined : getCurrentDateHTML()}
                  />
                </div>

                {/* Tarifas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tarifa de Inscripción (ARS $)
                  </label>
                  <input
                    type="number"
                    {...register('entry_fee', { 
                      valueAsNumber: true,
                      setValueAs: (v) => {
                        const num = typeof v === 'string' ? v.trim() : v
                        const parsed = num === '' || num === null || num === undefined ? 0 : Number(num)
                        return Number.isNaN(parsed) ? 0 : parsed
                      }
                    })}
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

          {/* Ranking flag */}
          <div className="px-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isRankingEvent}
                  onChange={(e) => setIsRankingEvent(e.target.checked)}
                  className="h-4 w-4 text-yellow-600 border-gray-300 rounded"
                />
                <span className="text-sm text-yellow-800 font-medium">
                  Contabilizar este torneo para el ranking anual del club
                </span>
              </label>
              <p className="text-xs text-yellow-700 mt-2">
                Ranking del club: <strong>Gross</strong> (top 9; solo cuentan tarjetas con golpes cargados, gross 0 = no presentó) y <strong>Neto</strong> (índice WHS; quienes entran al top 9 Gross no repiten en Neto). Invitados no suman al acumulado anual.
              </p>
            </div>
          </div>

          {/* Resultados - Configuración de categorías */}
          <div className="px-6 mt-4">
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Resultados - Configuración</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad de categorías</label>
                  <select
                    value={resultsMode}
                    onChange={(e) => setResultsMode(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="standard">Estándar (0–7.9, 8–13.9, 14–21.9, 22–53.9)</option>
                    <option value="scratch_bands">Scratch (Gross) + Bandas (-5 a 7.9, 8 a 13.9, 14 a 21.9, 22 a 54)</option>
                  </select>
                  
                  {/* Descripción de la modalidad seleccionada */}
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-gray-700">
                    {resultsMode === 'standard' ? (
                      <div className="space-y-1">
                        <p className="font-semibold text-blue-900">Modalidad Estándar:</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-2">
                          <li><strong>1ra Categoría:</strong> HCP 0 - 7.9</li>
                          <li><strong>2da Categoría:</strong> HCP 8.0 - 13.9</li>
                          <li><strong>3ra Categoría:</strong> HCP 14.0 - 21.9</li>
                          <li><strong>4ta Categoría:</strong> HCP 22.0 - 53.9</li>
                          <li><strong>Sin HCP:</strong> Jugadores sin handicap asignado (agrupados por separado)</li>
                        </ul>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-semibold text-blue-900">Modalidad Scratch:</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-2">
                          <li><strong>Scratch (Gross):</strong> Por score bruto (todos, o solo caballeros si «Separar Damas»)</li>
                          <li><strong>1ra Banda:</strong> HCP -5 a 7.9 (Net)</li>
                          <li><strong>2da Banda:</strong> HCP 8 a 13.9 (Net)</li>
                          <li><strong>3ra Banda:</strong> HCP 14 a 21.9 (Net)</li>
                          <li><strong>4ta Banda:</strong> HCP 22 a 54 (Net)</li>
                          <li><strong>Sin HCP:</strong> Jugadores sin handicap asignado (agrupados por separado)</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={separateLadies}
                      onChange={(e) => setSeparateLadies(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 font-medium">Separar Damas</span>
                  </label>
                  
                  {separateLadies && (
                    <div className="ml-6 space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={ladiesByHcp}
                          onChange={(e) => setLadiesByHcp(e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Damas por handicap (mismas categorías/bandas)</span>
                      </label>
                      
                      <div className="p-2 bg-purple-50 border border-purple-200 rounded text-xs text-gray-700">
                        {ladiesByHcp ? (
                          <p>✓ Las damas se dividirán en las mismas categorías/bandas que los caballeros</p>
                        ) : (
                          <p>✓ Todas las damas competirán en un único grupo</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Salidas: Consecutivas / Simultáneas (se usa en Gestión de Tee Times) */}
          <div className="px-6 mt-4">
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Salidas del torneo</h4>
              <p className="text-xs text-gray-600 mb-3">Define cómo se asignarán los horarios de salida. Esta configuración se usará en Gestión de Tee Times.</p>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="teeStarts"
                      checked={!teeSimultaneousStarts}
                      onChange={() => setTeeSimultaneousStarts(false)}
                      className="h-4 w-4 text-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-800">Salidas consecutivas</span>
                  </label>
                  <p className="text-xs text-gray-600 ml-6">Cada grupo sale a intervalos (ej. cada 10 min).</p>
                  {!teeSimultaneousStarts && (
                    <div className="ml-6 flex items-center gap-2">
                      <label className="text-sm text-gray-700">Intervalo (min):</label>
                      <input
                        type="number"
                        min={5}
                        max={30}
                        value={teeIntervalMinutes}
                        onChange={(e) => setTeeIntervalMinutes(Number(e.target.value) || 10)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="teeStarts"
                      checked={teeSimultaneousStarts}
                      onChange={() => setTeeSimultaneousStarts(true)}
                      className="h-4 w-4 text-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-800">Salidas simultáneas (shotgun)</span>
                  </label>
                  <p className="text-xs text-gray-600 ml-6">Todos los grupos salen a la misma hora desde distintos hoyos.</p>
                  {teeSimultaneousStarts && (
                    <div className="ml-6 space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={teeTwoSessions}
                          onChange={(e) => setTeeTwoSessions(e.target.checked)}
                          className="h-4 w-4 text-gray-600"
                        />
                        <span className="text-sm text-gray-700">Dos tandas (mañana y tarde)</span>
                      </label>
                      {teeTwoSessions && (
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-700">Inicio tanda tarde (24h):</label>
                          <input
                            type="text"
                            value={teeAfternoonStartTime}
                            onChange={(e) => setTeeAfternoonStartTime(e.target.value)}
                            onBlur={(e) => {
                              let v = e.target.value.replace(/\D/g, '')
                              if (v.length >= 2) v = v.slice(0, 2) + ':' + v.slice(2, 4)
                              if (v.length === 5) setTeeAfternoonStartTime(v)
                            }}
                            placeholder="14:00"
                            maxLength={5}
                            className="px-2 py-1 border border-gray-300 rounded text-sm w-20"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="teePreferred"
                            checked={teePreferredSession === 'morning'}
                            onChange={() => setTeePreferredSession('morning')}
                            className="h-3 w-3"
                          />
                          <span className="text-sm">Mañana</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="teePreferred"
                            checked={teePreferredSession === 'afternoon'}
                            onChange={() => setTeePreferredSession('afternoon')}
                            className="h-3 w-3"
                          />
                          <span className="text-sm">Tarde</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
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
