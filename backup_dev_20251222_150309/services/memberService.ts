import { api } from '@/lib/api';
import type { Member, CreateMemberRequest, UpdateMemberRequest, ApiResponse } from '@/types/member';

export const memberService = {
  // Obtener todos los miembros de un club
  async getMembers(clubId: number): Promise<Member[]> {
    const response = await api.get<ApiResponse<Member[]>>(`/club/${clubId}/members`);
    return response.data.data;
  },

  // Obtener un miembro por ID
  async getMember(clubId: number, memberId: number): Promise<Member> {
    const response = await api.get<ApiResponse<Member>>(`/club/${clubId}/members/${memberId}`);
    return response.data.data;
  },

  // Crear un nuevo miembro
  async createMember(clubId: number, memberData: CreateMemberRequest): Promise<Member> {
    const response = await api.post<ApiResponse<Member>>(`/club/${clubId}/members`, {
      ...memberData,
      course_id: clubId
    });
    return response.data.data;
  },

  // Actualizar un miembro
  async updateMember(clubId: number, memberId: number, memberData: UpdateMemberRequest): Promise<Member> {
    const response = await api.put<ApiResponse<Member>>(`/club/${clubId}/members/${memberId}`, memberData);
    return response.data.data;
  },

  // Eliminar un miembro
  async deleteMember(clubId: number, memberId: number): Promise<void> {
    await api.delete(`/club/${clubId}/members/${memberId}`);
  },

  // Cambiar estado de un miembro
  async updateMemberStatus(clubId: number, memberId: number, status: string): Promise<void> {
    await api.put(`/club/${clubId}/members/${memberId}/status`, { status });
  },

  // Buscar miembros
  async searchMembers(clubId: number, searchTerm: string): Promise<Member[]> {
    const response = await api.get<ApiResponse<Member[]>>(`/club/${clubId}/members/search?q=${encodeURIComponent(searchTerm)}`);
    return response.data.data;
  },

  // Limpiar todos los socios de un club
  async clearClubMembers(clubId: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/club/${clubId}/members`);
    return response.data;
  }
};
