import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notification.service';
import { useAuthStore } from '@/store/useAuthStore';
import type { PaginationParams } from '@/types/common.types';

/** @param enabled false pour attendre (la liste de la cloche ne se charge qu'à l'ouverture) */
export function useNotifications(params?: PaginationParams, { enabled = true }: { enabled?: boolean } = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationService.getMine(params),
    enabled: isAuthenticated && enabled,
  });
}

/** Pastille de la cloche : revérifiée toutes les minutes tant que l'utilisateur est connecté. */
export function useUnreadNotificationCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationService.countUnread,
    enabled: isAuthenticated,
    refetchInterval: 1000 * 60,
  });
}

export function useMarkNotificationAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
