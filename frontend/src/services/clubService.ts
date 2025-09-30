import { api } from '@/lib/api'
import { Club, CreateClubRequest, UpdateClubRequest, ApiResponse } from '@/types/club'

export const clubService = {
  // Get all clubs
  getClubs: async (): Promise<Club[]> => {
    const response = await api.get<ApiResponse<Club[]>>('/system/clubs')
    const clubs = response.data.data || []
    
    // Normalizar structure - algunos clubes usan golf_course_id en lugar de course_id
    return clubs.map(club => ({
      ...club,
      course_id: club.course_id || (club as any).golf_course_id || 0,
      // Asegurar que todos los campos requeridos existan
      current_members: (club as any).current_members || 0,
      total_tournaments: club.total_tournaments || 0,
      administrators: club.administrators || 0,
    }))
  },

  // Get club by ID
  getClub: async (id: number): Promise<Club> => {
    const response = await api.get<ApiResponse<Club>>(`/system/clubs/${id}`)
    return response.data.data!
  },

  // Create new club
  createClub: async (data: CreateClubRequest): Promise<{ club: Club; admin: any }> => {
    console.log('Service: Enviando petición POST a /system/clubs con:', data)
    try {
      const response = await api.post<ApiResponse<{ club: Club; admin: any }>>('/system/clubs', data)
      console.log('Service: Respuesta recibida:', response.data)
      return response.data.data!
    } catch (error) {
      console.error('Service: Error en petición:', error)
      throw error
    }
  },

  // Update club
  updateClub: async (id: number, data: UpdateClubRequest): Promise<Club> => {
    const response = await api.put<ApiResponse<Club>>(`/system/clubs/${id}`, data)
    return response.data.data!
  },

  // Delete club (soft delete)
  deleteClub: async (id: number): Promise<void> => {
    await api.delete(`/system/clubs/${id}`)
  },

  // Upload logo
  uploadLogo: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('logo', file)
    
    const response = await api.post<ApiResponse<{ logoPath: string }>>('/system/upload-logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    return response.data.data!.logoPath
  },

  // Get system stats
  getStats: async () => {
    const response = await api.get('/system/stats')
    const data = response.data.data
    
    console.log('🔥 STATS RAW DATA:', data);
    
    // Transform snake_case to camelCase para compatibilidad con el Dashboard
    const transformedData = {
      totalClubs: data.total_clubs,
      totalPlayers: data.total_members, // members -> players en el frontend
      totalTournaments: data.total_tournaments,
      totalAdministrators: data.total_administrators,
      // Valores mock para campos que no existen en la API
      monthlyRevenue: 45600,
      clubGrowth: 1,
      playerGrowth: 12,
      tournamentGrowth: 2,
      revenueGrowth: 8,
      // Timestamp para evitar cache
      _timestamp: Date.now()
    };
    
    console.log('🔥 STATS TRANSFORMED:', transformedData);
    return transformedData;
  },

  // Get recent activity
  getRecentActivity: async () => {
    const response = await api.get('/system/activity/recent')
    return response.data.data
  },

  // Get clubs overview
  getClubsOverview: async () => {
    const response = await api.get('/system/clubs/overview')
    return response.data.data
  }
}
