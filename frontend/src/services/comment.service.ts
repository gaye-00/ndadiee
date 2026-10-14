import { api } from './api';
import type { ApiResponse, ContentType, PageResponse, PaginationParams } from '@/types/common.types';
import type { Comment, CommentRequest } from '@/types/interaction.types';

const BASE = '/v1/comments';

export const commentService = {
  /** Du plus ancien au plus récent. */
  getByTarget: (targetType: ContentType, targetId: number, params?: PaginationParams) =>
    api
      .get<ApiResponse<PageResponse<Comment>>>(BASE, { params: { targetType, targetId, ...params } })
      .then((r) => r.data.data),

  create: (body: CommentRequest) => api.post<ApiResponse<Comment>>(BASE, body).then((r) => r.data.data),

  update: (id: number, body: string) =>
    api.put<ApiResponse<Comment>>(`${BASE}/${id}`, { body }).then((r) => r.data.data),

  delete: (id: number) => api.delete<ApiResponse<void>>(`${BASE}/${id}`).then((r) => r.data),
};
