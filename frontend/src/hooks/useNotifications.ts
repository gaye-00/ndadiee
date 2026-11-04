import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { notificationLink } from '@/lib/notificationLink';
import { notificationService } from '@/services/notification.service';
import { useAuthStore } from '@/store/useAuthStore';
import type { PaginationParams } from '@/types/common.types';
import type { Notification } from '@/types/notification.types';

/** @param enabled false pour attendre (la liste de la cloche ne se charge qu'à l'ouverture) */
export function useNotifications(params?: PaginationParams, { enabled = true }: { enabled?: boolean } = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationService.getMine(params),
    enabled: isAuthenticated && enabled,
  });
}

const FEED_PAGE_SIZE = 20;

/** Toutes les notifications, page après page (page des notifications). */
export function useNotificationFeed() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useInfiniteQuery({
    queryKey: ['notifications', 'feed'],
    queryFn: ({ pageParam }) => notificationService.getMine({ page: pageParam, size: FEED_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    enabled: isAuthenticated,
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

/**
 * Ouvrir une notification : elle passe à « lue » et mène à ce qu'elle concerne.
 *
 * @param onOpen appelé juste avant de partir (la cloche referme son panneau)
 */
export function useOpenNotification(onOpen?: () => void) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const markOne = useMarkNotificationAsRead();

  return (notification: Notification) => {
    if (!notification.read) {
      markOne.mutate(notification.id);
    }
    const to = notificationLink(notification, user?.username);
    onOpen?.();
    if (to) {
      void navigate(to, { viewTransition: true });
    }
  };
}
