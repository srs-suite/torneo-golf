import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { administratorService } from '@/services/administratorService'
import { CreateAdministratorRequest, UpdateAdministratorRequest } from '@/types/administrator'
import toast from 'react-hot-toast'

// Query keys
const QUERY_KEYS = {
  administrators: ['administrators'],
  administrator: (id: number) => ['administrators', id],
  clubAdministrators: (clubId: number) => ['administrators', 'club', clubId],
}

// Get all administrators
export function useAdministrators() {
  return useQuery({
    queryKey: QUERY_KEYS.administrators,
    queryFn: administratorService.getAdministrators,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

// Get single administrator
export function useAdministrator(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.administrator(id),
    queryFn: () => administratorService.getAdministrator(id),
    enabled: !!id,
  })
}

// Get administrators by club
export function useClubAdministrators(clubId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.clubAdministrators(clubId),
    queryFn: () => administratorService.getAdministratorsByClub(clubId),
    enabled: !!clubId,
  })
}

// Create administrator mutation
export function useCreateAdministrator() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateAdministratorRequest) => {
      console.log('Hook: Creando administrador:', data)
      return administratorService.createAdministrator(data)
    },
    onSuccess: (newAdmin) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.administrators })
      if (newAdmin.course_id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clubAdministrators(newAdmin.course_id) })
      }
      toast.success('Administrador creado exitosamente')
    },
    onError: (error: any) => {
      console.error('Error al crear administrador:', error)
      const message = error.response?.data?.message || error.message || 'Error al crear el administrador'
      toast.error(message)
    },
  })
}

// Update administrator mutation
export function useUpdateAdministrator() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAdministratorRequest }) =>
      administratorService.updateAdministrator(id, data),
    onSuccess: (updatedAdmin) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.administrators })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.administrator(updatedAdmin.admin_id) })
      if (updatedAdmin.course_id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clubAdministrators(updatedAdmin.course_id) })
      }
      toast.success('Administrador actualizado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar el administrador'
      toast.error(message)
    },
  })
}

// Delete administrator mutation
export function useDeleteAdministrator() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: number) => administratorService.deleteAdministrator(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.administrators })
      toast.success('Administrador eliminado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar el administrador'
      toast.error(message)
    },
  })
}

// Reset password mutation
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      administratorService.resetPassword(id, password),
    onSuccess: () => {
      toast.success('Contraseña restablecida exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al restablecer la contraseña'
      toast.error(message)
    },
  })
}
