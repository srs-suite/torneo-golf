import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clubService } from '@/services/clubService'
import { CreateClubRequest, UpdateClubRequest } from '@/types/club'
import toast from 'react-hot-toast'

// Query keys
const QUERY_KEYS = {
  clubs: ['clubs'],
  club: (id: number) => ['clubs', id],
  stats: ['stats', Date.now()], // Timestamp único para evitar cache
  activity: ['activity'],
  overview: ['overview'],
}

// Get all clubs
export function useClubs() {
  return useQuery({
    queryKey: QUERY_KEYS.clubs,
    queryFn: clubService.getClubs,
    staleTime: 0, // Datos siempre considerados obsoletos
    refetchOnWindowFocus: true, // Refrescar al cambiar ventana
  })
}

// Get single club
export function useClub(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.club(id),
    queryFn: () => clubService.getClub(id),
    enabled: !!id,
  })
}

// Create club mutation
export function useCreateClub() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateClubRequest) => {
      console.log('Hook: Enviando datos al service:', data)
      return clubService.createClub(data)
    },
    onSuccess: () => {
      console.log('Club creado exitosamente, invalidando cache...')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clubs })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overview })
      // Forzar un refetch inmediato
      queryClient.refetchQueries({ queryKey: QUERY_KEYS.clubs })
      toast.success('Club creado exitosamente')
    },
    onError: (error: any) => {
      console.error('Error completo en hook:', error)
      console.error('Error response:', error.response)
      console.error('Error data:', error.response?.data)
      const message = error.response?.data?.message || error.message || 'Error al crear el club'
      toast.error(message)
    },
  })
}

// Update club mutation
export function useUpdateClub() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClubRequest }) =>
      clubService.updateClub(id, data),
    onSuccess: (updatedClub) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clubs })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.club(updatedClub.course_id) })
      toast.success('Club actualizado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar el club'
      toast.error(message)
    },
  })
}

// Delete club mutation
export function useDeleteClub() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: number) => clubService.deleteClub(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clubs })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overview })
      toast.success('Club eliminado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar el club'
      toast.error(message)
    },
  })
}

// Upload logo mutation
export function useUploadLogo() {
  return useMutation({
    mutationFn: (file: File) => clubService.uploadLogo(file),
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al subir el logo'
      toast.error(message)
    },
  })
}

// Dashboard data hooks
export function useStats() {
  return useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: clubService.getStats,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    // refetchInterval: desactivado para evitar spam
  })
}

export function useRecentActivity() {
  return useQuery({
    queryKey: QUERY_KEYS.activity,
    queryFn: clubService.getRecentActivity,
  })
}

export function useClubsOverview() {
  return useQuery({
    queryKey: QUERY_KEYS.overview,
    queryFn: clubService.getClubsOverview,
  })
}

// Función para invalidar el cache de stats manualmente
export function useInvalidateStats() {
  const queryClient = useQueryClient()
  
  return () => {
    console.log('🔄 Invalidating stats cache...');
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    queryClient.removeQueries({ queryKey: ['stats'] });
    queryClient.clear(); // Limpiar TODO el cache
  }
}


