import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { memberService } from '@/services/memberService';
import type { CreateMemberRequest, UpdateMemberRequest } from '@/types/member';

export const MEMBER_QUERY_KEYS = {
  members: (clubId: number) => ['members', clubId] as const,
  member: (clubId: number, memberId: number) => ['members', clubId, memberId] as const,
};

export function useMembers(clubId: number) {
  return useQuery({
    queryKey: MEMBER_QUERY_KEYS.members(clubId),
    queryFn: () => memberService.getMembers(clubId),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useMember(clubId: number, memberId: number) {
  return useQuery({
    queryKey: MEMBER_QUERY_KEYS.member(clubId, memberId),
    queryFn: () => memberService.getMember(clubId, memberId),
    enabled: !!memberId,
  });
}

export function useCreateMember(clubId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberData: CreateMemberRequest) => memberService.createMember(clubId, memberData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBER_QUERY_KEYS.members(clubId) });
      toast.success('Miembro creado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error creating member:', error);
      toast.error(`Error al crear el miembro: ${error.message}`);
    },
  });
}

export function useUpdateMember(clubId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMemberRequest) => 
      memberService.updateMember(clubId, data.memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBER_QUERY_KEYS.members(clubId) });
      queryClient.invalidateQueries({ queryKey: ['participants', clubId] });
      toast.success('Miembro actualizado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error updating member:', error);
      toast.error(`Error al actualizar el miembro: ${error.message}`);
    },
  });
}

export function useDeleteMember(clubId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: number) => memberService.deleteMember(clubId, memberId),
    // Optimistic update to avoid having to click twice
    onMutate: async (memberId: number) => {
      await queryClient.cancelQueries({ queryKey: MEMBER_QUERY_KEYS.members(clubId) });
      const previous = queryClient.getQueryData(MEMBER_QUERY_KEYS.members(clubId));
      queryClient.setQueryData(MEMBER_QUERY_KEYS.members(clubId), (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((m) => m.member_id !== memberId);
      });
      return { previous };
    },
    onError: (error: Error, _memberId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(MEMBER_QUERY_KEYS.members(clubId), context.previous);
      }
      console.error('Error deleting member:', error);
      toast.error(`Error al eliminar el miembro: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: MEMBER_QUERY_KEYS.members(clubId) });
    },
    onSuccess: () => {
      toast.success('Miembro eliminado exitosamente');
    },
  });
}

export function useUpdateMemberStatus(clubId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, status }: { memberId: number; status: string }) => 
      memberService.updateMemberStatus(clubId, memberId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBER_QUERY_KEYS.members(clubId) });
      toast.success('Estado del miembro actualizado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error updating member status:', error);
      toast.error(`Error al actualizar el estado: ${error.message}`);
    },
  });
}

export function useSearchMembers(clubId: number, searchTerm: string) {
  return useQuery({
    queryKey: ['members', clubId, 'search', searchTerm],
    queryFn: () => memberService.searchMembers(clubId, searchTerm),
    enabled: !!searchTerm && searchTerm.length > 2,
  });
}

export function useClearClubMembers(clubId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => memberService.clearClubMembers(clubId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: MEMBER_QUERY_KEYS.members(clubId) });
      toast.success(data.message || 'Socios eliminados exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error clearing members:', error);
      toast.error(`Error al limpiar socios: ${error.message}`);
    },
  });
}