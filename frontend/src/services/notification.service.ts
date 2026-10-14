import { api } from './api';
import type { ApiResponse, PageResponse, PaginationParams } from '@/types/common.types';
import type { Notification } from '@/types/notification.types';

const BASE = '/v1/notifications';

export const notificationService = {
  /** Les plus récentes d'abord. */
  getMine: (params?: PaginationParams) =>
    api.get<ApiResponse<PageResponse<Notification>>>(BASE, { params }).then((r) => r.data.data),

  countUnread: () => api.get<ApiResponse<number>>(`${BASE}/unread-count`).then((r) => r.data.data),

  markAsRead: (id: number) => api.put<ApiResponse<Notification>>(`${BASE}/${id}/read`).then((r) => r.data.data),

  /** @returns le nombre de notifications passées à « lue » */
  markAllAsRead: () => api.put<ApiResponse<number>>(`${BASE}/read-all`).then((r) => r.data.data),
};
