import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Trash2 } from 'lucide-react'
import { Club, CreateClubRequest } from '@/types/club'
import { useCreateClub, useUpdateClub, useUploadLogo, useClub } from '@/hooks/useClubs'
import { useClubAdministrators } from '@/hooks/useAdministrators'
import { toast } from 'react-hot-toast'

// Create dynamic validation schema
const createClubSchema = (isEditMode: boolean) => z.object({
  clubCode: z.string().min(1, 'Código del club es requerido').max(20, 'Máximo 20 caracteres'),
  clubName: z.string().min(1, 'Nombre del club es requerido'),
  address: z.string().min(1, 'Dirección es requerida'),
  city: z.string().min(1, 'Ciudad es requerida'),
  country: z.string().min(1, 'País es requerido'),
  phone: z.string().optional().or(z.literal('')),
  email: z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
  website: z.union([z.string().url('URL inválida'), z.literal('')]).optional(),
  enableFieldCharacteristics: z.boolean().optional(),
  par: z.union([z.number().min(54, 'Par mínimo 54').max(80, 'Par máximo 80'), z.undefined()]).optional(),
  physicalHoles: z.union([z.number().int().min(9).max(18), z.undefined()]).optional(),
  slopeRating: z.union([z.number().int().min(55, 'Slope mínimo 55').max(155, 'Slope máximo 155'), z.undefined()]).optional(),
  courseRating: z.union([z.number().min(40, 'Course Rating mínimo 40').max(85, 'Course Rating máximo 85'), z.undefined()]).optional(),

  // Admin fields (required for both creation and editing)
  adminName: z.string().min(1, 'Nombre del administrador es requerido'),
  adminEmail: z.string().email('Email del administrador inválido').min(1, 'Email del administrador es requerido'),
  adminUsername: z.string().min(1, 'Usuario del administrador es requerido'),
  adminPassword: isEditMode ? z.string().optional() : z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
})

type ClubFormData = z.infer<ReturnType<typeof createClubSchema>>

interface CreateClubModalProps {
  isOpen: boolean
  onClose: () => void
  editClub?: Club
}

const countries = [
  { code: 'AR', name: 'Argentina', timezone: 'America/Argentina/Buenos_Aires', currency: 'ARS' },
  { code: 'BR', name: 'Brasil', timezone: 'America/Sao_Paulo', currency: 'BRL' },
  { code: 'CL', name: 'Chile', timezone: 'America/Santiago', currency: 'CLP' },
  { code: 'UY', name: 'Uruguay', timezone: 'America/Montevideo', currency: 'UYU' },
  { code: 'PY', name: 'Paraguay', timezone: 'America/Asuncion', currency: 'PYG' },
  { code: 'US', name: 'Estados Unidos', timezone: 'America/New_York', currency: 'USD' },
  { code: 'ES', name: 'España', timezone: 'Europe/Madrid', currency: 'EUR' },
  { code: 'MX', name: 'México', timezone: 'America/Mexico_City', currency: 'MXN' },
]

function normalizeCountryCode(country: string | undefined): string {
  const raw = (country ?? '').trim()
  if (!raw) return ''
  if (countries.some((c) => c.code === raw)) return raw
  const byName = countries.find((c) => c.name.toLowerCase() === raw.toLowerCase())
  return byName?.code ?? raw
}

function clubToFormValues(club: Club) {
  return {
    clubCode: club.club_code || '',
    clubName: club.course_name || '',
    address: club.address || '',
    city: club.city || '',
    country: normalizeCountryCode(club.country),
    phone: club.phone || '',
    email: club.email || '',
    website: club.website || '',
    enableFieldCharacteristics: club.enable_field_characteristics !== false,
    par: club.par ?? undefined,
    physicalHoles: club.physical_holes === 9 ? 9 : 18,
    slopeRating: club.slope_rating ?? undefined,
    courseRating: club.course_rating ?? undefined,
    adminName: '',
    adminEmail: '',
    adminUsername: '',
    adminPassword: '',
  }
}

export function CreateClubModal({ isOpen, onClose, editClub }: CreateClubModalProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const formPopulatedForClubId = useRef<number | null>(null)
  
  const isEditMode = !!editClub
  const { data: clubDetails, isLoading: isLoadingClub } = useClub(isEditMode && isOpen ? (editClub?.course_id || 0) : 0)
  const { data: clubAdministrators, isLoading: isLoadingAdmins } = useClubAdministrators(isEditMode && isOpen ? (editClub?.course_id || 0) : 0)
  
  const createClub = useCreateClub()
  const updateClub = useUpdateClub()
  const uploadLogo = useUploadLogo()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<ClubFormData>({
    resolver: zodResolver(createClubSchema(isEditMode)),
    defaultValues: {
      // Solo valores por defecto para campos numéricos opcionales
      enableFieldCharacteristics: true,
      par: undefined,
      phone: '',
      email: '',
      website: '',
      adminName: '',
      adminEmail: '',
      adminUsername: '',
      adminPassword: '',
    }
  })
  
  // Watch the enableFieldCharacteristics value
  const watchEnableFieldCharacteristics = watch('enableFieldCharacteristics')



  // Cargar datos del club al abrir edición (una sola vez por club; no pisa lo que el usuario escribe)
  useEffect(() => {
    if (!isOpen) {
      formPopulatedForClubId.current = null
      return
    }
    if (!isEditMode || !editClub) {
      reset({
        enableFieldCharacteristics: true,
        par: undefined,
        phone: '',
        email: '',
        website: '',
        adminName: '',
        adminEmail: '',
        adminUsername: '',
        adminPassword: '',
      })
      setLogoFile(null)
      setLogoPreview('')
      formPopulatedForClubId.current = null
      return
    }

    if (isLoadingClub && !clubDetails) return
    if (formPopulatedForClubId.current === editClub.course_id) return

    const source = clubDetails ?? editClub
    reset(clubToFormValues(source))
    formPopulatedForClubId.current = editClub.course_id
    setLogoFile(null)
    setLogoPreview(source.logo_path || '')
  }, [isOpen, isEditMode, editClub, clubDetails, isLoadingClub, reset])

  // Datos del administrador (no resetea el resto del formulario)
  useEffect(() => {
    if (!isOpen || !isEditMode || !clubAdministrators?.length) return
    const admin = clubAdministrators[0]
    setValue('adminName', admin.full_name || '')
    setValue('adminEmail', admin.email || '')
    setValue('adminUsername', admin.username || '')
  }, [isOpen, isEditMode, clubAdministrators, setValue])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido')
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Tamaño máximo: 2MB')
      return
    }

    setLogoFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview('')
  }

  const onSubmit = async (data: ClubFormData) => {
    console.log('Enviando datos del formulario:', data)
    
    try {
      let logoPath = ''
      
      // Upload logo if there's a new file
      if (logoFile) {
        try {
          logoPath = await uploadLogo.mutateAsync(logoFile)
        } catch (error) {
          console.warn('Logo upload failed, continuing without logo:', error)
          // Continue without logo if upload fails
        }
      } else if (isEditMode && editClub?.logo_path) {
        logoPath = editClub.logo_path
      }

      // Get country data
      const country = countries.find(c => c.code === data.country)
      
      if (isEditMode && editClub) {
        await updateClub.mutateAsync({
          id: editClub.course_id,
          data: {
            clubCode: data.clubCode,
            clubName: data.clubName,
            address: data.address,
            city: data.city,
            country: data.country,
            timezone: country?.timezone || '',
            currency: country?.currency || '',
            phone: data.phone || '',
            email: data.email || '',
            website: data.website || '',
            logoPath,
            enableFieldCharacteristics: data.enableFieldCharacteristics ?? true,
            par: data.par || 72,
            physicalHoles: data.physicalHoles || 18,
            slopeRating: data.slopeRating,
            courseRating: data.courseRating,
            adminName: data.adminName,
            adminEmail: data.adminEmail,
            adminUsername: data.adminUsername,
            adminPassword: data.adminPassword || undefined,
          }
        })
      } else {
        // Create new club
        const createData: CreateClubRequest = {
          clubCode: data.clubCode,
          clubName: data.clubName,
          address: data.address,
          city: data.city,
          country: data.country,
          timezone: country?.timezone || '',
          currency: country?.currency || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          logoPath,
          enableFieldCharacteristics: data.enableFieldCharacteristics ?? true,
          par: data.par || 72,
          physicalHoles: data.physicalHoles || 18,
          slopeRating: data.slopeRating,
          courseRating: data.courseRating,
          adminName: data.adminName!,
          adminEmail: data.adminEmail!,
          adminUsername: data.adminUsername!,
          adminPassword: data.adminPassword!,
        }
        
        console.log('Datos a enviar al backend:', createData)
        await createClub.mutateAsync(createData)
      }
      
      onClose()
    } catch (error: any) {
      console.error('Error completo al enviar formulario:', error)
      const message = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Error al guardar el club'
      toast.error(message)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal max-w-4xl">
        {/* Header */}
        <div className={`modal-header ${isEditMode ? 'bg-gray-800' : ''}`}>
          <h2 className={`modal-title ${isEditMode ? 'text-white' : ''}`}>
            {isEditMode ? 'Editar Club' : 'Crear Nuevo Club'}
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded ${isEditMode ? 'text-white hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {isEditMode && isLoadingClub && (
            <p className="text-sm text-gray-500 mb-4">Cargando datos del club…</p>
          )}
          <form onSubmit={handleSubmit(onSubmit, (errs) => {
            const first = Object.values(errs)[0]
            toast.error(first?.message?.toString() || 'Revisá los campos marcados')
          })} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Código del Club *</label>
                  <input
                    {...register('clubCode')}
                    className={`input ${errors.clubCode ? 'input-error' : ''}`}
                    placeholder="Ej: CLUB001"
                    maxLength={20}
                  />
                  {errors.clubCode && (
                    <p className="error-message">{errors.clubCode.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="label">Nombre del Club *</label>
                  <input
                    {...register('clubName')}
                    className={`input ${errors.clubName ? 'input-error' : ''}`}
                    placeholder="Nombre completo del club"
                  />
                  {errors.clubName && (
                    <p className="error-message">{errors.clubName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Dirección Completa *</label>
                  <input
                    {...register('address')}
                    className={`input ${errors.address ? 'input-error' : ''}`}
                    placeholder=""
                  />
                  {errors.address && (
                    <p className="error-message">{errors.address.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="label">Ciudad *</label>
                  <input
                    {...register('city')}
                    className={`input ${errors.city ? 'input-error' : ''}`}
                    placeholder=""
                  />
                  {errors.city && (
                    <p className="error-message">{errors.city.message}</p>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="label">País *</label>
                <select
                  {...register('country')}
                  className={`input ${errors.country ? 'input-error' : ''}`}
                >
                  <option value="">Seleccionar país...</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
                {errors.country && (
                  <p className="error-message">{errors.country.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Teléfono</label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className="input"
                    placeholder=""
                  />
                </div>

                <div className="form-group">
                  <label className="label">Email del Club</label>
                  <input
                    {...register('email')}
                    type="email"
                    className={`input ${errors.email ? 'input-error' : ''}`}
                    placeholder=""
                  />
                  {errors.email && (
                    <p className="error-message">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="label">Sitio Web</label>
                <input
                  {...register('website')}
                  type="text"
                  className={`input ${errors.website ? 'input-error' : ''}`}
                  placeholder="https://..."
                />
                {errors.website && (
                  <p className="error-message">{errors.website.message}</p>
                )}
              </div>

              {/* Logo Upload */}
              <div className="form-group">
                <label className="label">Logo del Club (Opcional)</label>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="input"
                  />
                  
                  {logoPreview && (
                    <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                      <img
                        src={logoPreview}
                        alt="Vista previa del logo"
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Logo seleccionado</p>
                        <p className="text-xs text-gray-500">
                          {logoFile ? logoFile.name : 'Logo actual'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  <p className="help-text">
                    Formatos: JPG, PNG, SVG. Tamaño máximo: 2MB (Opcional)
                  </p>
                </div>
              </div>

              {/* Field Characteristics Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Características del Campo</h3>
                  <label className="flex items-center space-x-3">
                    <input
                      {...register('enableFieldCharacteristics')}
                      type="checkbox"
                      className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-700">
                      {watchEnableFieldCharacteristics ? 'Activado' : 'Desactivado'}
                    </span>
                  </label>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">
                    <strong>Activado:</strong> El sistema calculará automáticamente el HCP usando Course Rating y Slope Rating.<br/>
                    <strong>Desactivado:</strong> Los administradores podrán editar manualmente el HCP de los socios.
                  </p>
                </div>

                <div className={`space-y-4 ${!watchEnableFieldCharacteristics ? 'opacity-50' : ''}`}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="label">Par del Campo</label>
                      <input
                        {...register('par', { valueAsNumber: true })}
                        type="number"
                        className="input"
                        placeholder="72"
                        min="54"
                        max="80"
                        disabled={!watchEnableFieldCharacteristics}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="label">Slope Rating</label>
                      <input
                        {...register('slopeRating', { valueAsNumber: true })}
                        type="number"
                        className="input"
                        placeholder="113"
                        min="55"
                        max="155"
                        disabled={!watchEnableFieldCharacteristics}
                      />
                      <p className="help-text">
                        Valor estándar entre 55-155 (113 = neutro)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="label">Course Rating</label>
                      <input
                        {...register('courseRating', { valueAsNumber: true })}
                        type="number"
                        step="0.1"
                        className="input"
                        placeholder="72.0"
                        min="40"
                        max="85"
                        disabled={!watchEnableFieldCharacteristics}
                      />
                      <p className="help-text">
                        Dificultad del campo (ej: 72.3)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="form-group mt-4">
                  <label className="label">Hoyos Físicos del Campo</label>
                  <select
                    {...register('physicalHoles', { valueAsNumber: true })}
                    className="input"
                  >
                    <option value={18}>18 hoyos físicos</option>
                    <option value={9}>9 hoyos físicos (dos vueltas)</option>
                  </select>
                  <p className="help-text">
                    Hoyos físicos reales del campo (no vueltas). Siempre editable.
                  </p>
                </div>
              </div>
            </div>

            {/* Admin Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {(isEditMode) ? 'Administrador Principal (Editar)' : 'Administrador Principal'}
                {isEditMode && isLoadingAdmins && (
                  <span className="ml-2 text-sm text-gray-500">Cargando datos...</span>
                )}
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="label">Nombre Completo *</label>
                    <input
                      {...register('adminName')}
                      className={`input ${errors.adminName ? 'input-error' : ''}`}
                      placeholder="Nombre del administrador"
                    />
                    {errors.adminName && (
                      <p className="error-message">{errors.adminName.message}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="label">Email *</label>
                    <input
                      {...register('adminEmail')}
                      type="email"
                      className={`input ${errors.adminEmail ? 'input-error' : ''}`}
                      placeholder="admin@club.com"
                    />
                    {errors.adminEmail && (
                      <p className="error-message">{errors.adminEmail.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="label">Usuario *</label>
                    <input
                      {...register('adminUsername')}
                      className={`input ${errors.adminUsername ? 'input-error' : ''}`}
                      placeholder="admin_club"
                    />
                    {errors.adminUsername && (
                      <p className="error-message">{errors.adminUsername.message}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="label">Contraseña {(!isEditMode) ? '*' : '(opcional)'}</label>
                    <input
                      {...register('adminPassword')}
                      type="password"
                      className={`input ${errors.adminPassword ? 'input-error' : ''}`}
                      placeholder={isEditMode ? 'Dejar vacío para mantener actual' : 'Mínimo 6 caracteres'}
                    />
                    {errors.adminPassword && (
                      <p className="error-message">{errors.adminPassword.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createClub.isPending || updateClub.isPending || uploadLogo.isPending}
              >
                {(createClub.isPending || updateClub.isPending || uploadLogo.isPending)
                  ? 'Procesando...'
                  : isEditMode
                  ? 'Actualizar Club'
                  : 'Crear Club'
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
