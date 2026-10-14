import { api } from './api';
import type { Article, ArticleFilters, ArticleRequest, ArticleStatus, ArticleSummary } from '@/types/article.types';
import type { ApiResponse, PageResponse, PaginationParams } from '@/types/common.types';

const BASE = '/v1/articles';

export const articleService = {
  /** Articles publiés uniquement. */
  getAll: (params?: ArticleFilters) =>
    api.get<ApiResponse<PageResponse<ArticleSummary>>>(BASE, { params }).then((r) => r.data.data),

  /** Mes articles, brouillons compris. */
  getMine: (params?: PaginationParams & { status?: ArticleStatus }) =>
    api.get<ApiResponse<PageResponse<ArticleSummary>>>(`${BASE}/me`, { params }).then((r) => r.data.data),

  /** Compte une vue. Un brouillon n'est visible que de son auteur (404 pour les autres). */
  getBySlug: (slug: string) => api.get<ApiResponse<Article>>(`${BASE}/${slug}`).then((r) => r.data.data),

  create: (body: ArticleRequest) => api.post<ApiResponse<Article>>(BASE, body).then((r) => r.data.data),

  update: (id: number, body: ArticleRequest) =>
    api.put<ApiResponse<Article>>(`${BASE}/${id}`, body).then((r) => r.data.data),

  publish: (id: number) => api.post<ApiResponse<Article>>(`${BASE}/${id}/publish`).then((r) => r.data.data),

  delete: (id: number) => api.delete<ApiResponse<void>>(`${BASE}/${id}`).then((r) => r.data),
};
