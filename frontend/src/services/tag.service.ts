import { api } from './api';
import type { ApiResponse, PageResponse, PaginationParams } from '@/types/common.types';
import type { Tag } from '@/types/tag.types';

const BASE = '/v1/tags';

export const tagService = {
  /** Les plus utilisés d'abord ; `q` filtre par nom (autocomplétion). */
  search: (params?: PaginationParams & { q?: string }) =>
    api.get<ApiResponse<PageResponse<Tag>>>(BASE, { params }).then((r) => r.data.data),

  getBySlug: (slug: string) => api.get<ApiResponse<Tag>>(`${BASE}/${slug}`).then((r) => r.data.data),

  follow: (slug: string) => api.post<ApiResponse<void>>(`${BASE}/${slug}/follow`).then((r) => r.data),

  unfollow: (slug: string) => api.delete<ApiResponse<void>>(`${BASE}/${slug}/follow`).then((r) => r.data),
};
