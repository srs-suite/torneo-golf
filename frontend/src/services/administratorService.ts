import { api } from '@/lib/api'
import { Administrator, CreateAdministratorRequest, UpdateAdministratorRequest, ApiResponse } from '@/types/administrator'

export const administratorService = {
  // Get all administrators
  getAdministrators: async (): Promise<Administrator[]> => {
    const response = await api.get<ApiResponse<Administrator[]>>('/system/administrators')
    return response.data.data || []
  },

  // Get administrator by ID
  getAdministrator: async (id: number): Promise<Administrator> => {
    const response = await api.get<ApiResponse<Administrator>>(`/system/administrators/${id}`)
    return response.data.data!
  },

  // Create new administrator
  createAdministrator: async (data: CreateAdministratorRequest): Promise<Administrator> => {
    const response = await api.post<ApiResponse<Administrator>>('/system/administrators', data)
    return response.data.data!
  },

  // Update administrator
  updateAdministrator: async (id: number, data: UpdateAdministratorRequest): Promise<Administrator> => {
    const response = await api.put<ApiResponse<Administrator>>(`/system/administrators/${id}`, data)
    return response.data.data!
  },

  // Delete administrator (soft delete)
  deleteAdministrator: async (id: number): Promise<void> => {
    await api.delete(`/system/administrators/${id}`)
  },

  // Reset administrator password
  resetPassword: async (id: number, newPassword: string): Promise<void> => {
    await api.post(`/system/administrators/${id}/reset-password`, { password: newPassword })
  },

  // Get administrators by club
  getAdministratorsByClub: async (clubId: number): Promise<Administrator[]> => {
    console.log('AdministratorService: Fetching administrators for club ID:', clubId)
    try {
      const response = await api.get<ApiResponse<Administrator[]>>(`/system/administrators?clubId=${clubId}`)
      console.log('AdministratorService: Response received:', response.data)
      return response.data.data || []
    } catch (error) {
      console.error('AdministratorService: Error fetching administrators:', error)
      throw error
    }
  }
}
