import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import type { AdminActionFilters, AdminContentFilters, AdminUserFilters, ModeratedContent } from '@/types/admin.types';
import type { Role } from '@/types/user.types';

export const ADMIN_PAGE_SIZE = 20;

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: adminService.getOverview,
    staleTime: 1000 * 30,
  });
}

/** Une page de comptes ; la page précédente reste affichée pendant que la suivante arrive. */
export function useAdminUsers(filters: AdminUserFilters) {
  return useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: () => adminService.getUsers({ size: ADMIN_PAGE_SIZE, ...filters }),
    placeholderData: keepPreviousData,
  });
}

export function useAdminContent(filters: AdminContentFilters) {
  return useQuery({
    queryKey: ['admin', 'content', filters],
    queryFn: () => adminService.getContent({ size: ADMIN_PAGE_SIZE, ...filters }),
    placeholderData: keepPreviousData,
  });
}

export function useAdminActions(filters: AdminActionFilters) {
  return useQuery({
    queryKey: ['admin', 'actions', filters],
    queryFn: () => adminService.getActions({ size: ADMIN_PAGE_SIZE, ...filters }),
    placeholderData: keepPreviousData,
  });
}

// Une décision change les chiffres, les listes et le journal du back-office ; masquer ou supprimer un contenu
// change aussi les pages publiques déjà en cache
function refreshAfterDecision(qc: QueryClient, publicContent = false) {
  void qc.invalidateQueries({ queryKey: ['admin'] });
  if (publicContent) {
    for (const key of ['questions', 'question', 'answers', 'projects', 'project', 'openings', 'feed', 'search']) {
      void qc.invalidateQueries({ queryKey: [key] });
    }
  }
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => adminService.blockUser(id, reason),
    onSuccess: () => refreshAfterDecision(qc),
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminService.unblockUser(id),
    onSuccess: () => refreshAfterDecision(qc),
  });
}

export function useChangeRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) => adminService.changeRole(id, role),
    onSuccess: () => refreshAfterDecision(qc),
  });
}

export function useHideContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, reason }: { type: ModeratedContent; id: number; reason: string }) =>
      adminService.hideContent(type, id, reason),
    onSuccess: () => refreshAfterDecision(qc, true),
  });
}

export function useUnhideContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id }: { type: ModeratedContent; id: number }) => adminService.unhideContent(type, id),
    onSuccess: () => refreshAfterDecision(qc, true),
  });
}

export function useDeleteContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, reason }: { type: ModeratedContent; id: number; reason?: string }) =>
      adminService.deleteContent(type, id, reason),
    onSuccess: () => refreshAfterDecision(qc, true),
  });
}
