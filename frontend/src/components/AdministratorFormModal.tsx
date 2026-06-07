import { useEffect, useState } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { Administrator } from '@/types/administrator'
import { useCreateAdministrator, useUpdateAdministrator } from '@/hooks/useAdministrators'
import { useClubs } from '@/hooks/useClubs'

interface AdministratorFormModalProps {
  isOpen: boolean
  onClose: () => void
  administrator?: Administrator | null
}

const emptyForm = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  role: 'club_admin' as 'system_admin' | 'club_admin',
  courseId: '',
  isPrimaryAdmin: false,
}

export function AdministratorFormModal({
  isOpen,
  onClose,
  administrator,
}: AdministratorFormModalProps) {
  const isEdit = !!administrator
  const createAdmin = useCreateAdministrator()
  const updateAdmin = useUpdateAdministrator()
  const { data: clubs = [] } = useClubs()
  const [form, setForm] = useState(emptyForm)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (administrator) {
      setForm({
        fullName: administrator.full_name || '',
        username: administrator.username || '',
        email: administrator.email || '',
        password: '',
        role: administrator.role,
        courseId: administrator.course_id ? String(administrator.course_id) : '',
        isPrimaryAdmin: administrator.is_primary_admin || false,
      })
    } else {
      setForm(emptyForm)
    }
    setShowPassword(false)
  }, [isOpen, administrator])

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!form.fullName.trim() || !form.username.trim() || !form.email.trim()) {
      return
    }
    if (!isEdit && (!form.password || form.password.length < 6)) {
      return
    }
    if (form.role === 'club_admin' && !isEdit && !form.courseId) {
      return
    }

    try {
      if (isEdit && administrator) {
        const data: Record<string, unknown> = {
          fullName: form.fullName.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
        }
        if (form.password) {
          data.password = form.password
        }
        if (administrator.role === 'club_admin') {
          data.isPrimaryAdmin = form.isPrimaryAdmin
        }
        await updateAdmin.mutateAsync({ id: administrator.admin_id, data })
      } else {
        await createAdmin.mutateAsync({
          fullName: form.fullName.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          courseId: form.role === 'club_admin' ? parseInt(form.courseId, 10) : undefined,
          isPrimaryAdmin: form.role === 'club_admin' ? form.isPrimaryAdmin : false,
        })
      }
      onClose()
    } catch {
      // toast handled in hooks
    }
  }

  const isPending = createAdmin.isPending || updateAdmin.isPending

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
        <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-lg w-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {isEdit ? 'Editar Administrador' : 'Nuevo Administrador'}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isEdit ? 'Nueva contraseña' : 'Contraseña'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                    placeholder={isEdit ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {!isEdit && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <select
                      value={form.role}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          role: e.target.value as 'system_admin' | 'club_admin',
                          courseId: '',
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                    >
                      <option value="club_admin">Administrador de Club</option>
                      <option value="system_admin">Administrador del Sistema</option>
                    </select>
                  </div>

                  {form.role === 'club_admin' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Club</label>
                        <select
                          value={form.courseId}
                          onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                        >
                          <option value="">Seleccionar club...</option>
                          {clubs.map((club) => (
                            <option key={club.course_id} value={club.course_id}>
                              {club.course_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.isPrimaryAdmin}
                          onChange={(e) => setForm({ ...form, isPrimaryAdmin: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">Administrador principal del club</span>
                      </label>
                    </>
                  )}
                </>
              )}

              {isEdit && administrator?.role === 'club_admin' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPrimaryAdmin}
                    onChange={(e) => setForm({ ...form, isPrimaryAdmin: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Administrador principal del club</span>
                </label>
              )}

              {isEdit && administrator?.club_name && (
                <p className="text-sm text-gray-600">
                  Club: <span className="font-medium">{administrator.club_name}</span>
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear administrador'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
