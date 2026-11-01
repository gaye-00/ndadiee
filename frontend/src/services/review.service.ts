import { api } from './api';
import type { ApiResponse, PageResponse } from '@/types/common.types';
import type { PullRequest, RepositorySync, ReviewFilters, ReviewOverview } from '@/types/review.types';

const BASE = '/v1/reviews';

/** Revues de code : les pull requests des projets et leurs relecteurs (ReviewController.java). */
export const reviewService = {
  /** Les PR d'un onglet pour le membre connecté, filtrables par mot-clé et par projet. */
  getAll: (params: ReviewFilters) =>
    api.get<ApiResponse<PageResponse<PullRequest>>>(BASE, { params }).then((r) => r.data.data),

  /** Totaux des onglets, équipes qui ont des PR ouvertes, bilan de relecteur. */
  getOverview: () => api.get<ApiResponse<ReviewOverview>>(`${BASE}/overview`).then((r) => r.data.data),

  /** Se propose comme relecteur (PR de son équipe, ou ouverte à la revue communautaire). */
  claim: (id: number) => api.post<ApiResponse<PullRequest>>(`${BASE}/${id}/claim`).then((r) => r.data.data),

  /** Se retire d'une revue qu'on avait prise, tant qu'on n'a rien rendu. */
  release: (id: number) => api.delete<ApiResponse<PullRequest>>(`${BASE}/${id}/claim`).then((r) => r.data.data),

  /** Les PR d'un projet et son dépôt GitHub : dernière lecture, erreur, PR ouvertes (RepositorySyncController.java). */
  getRepositorySync: (slug: string) =>
    api.get<ApiResponse<RepositorySync>>(`/v1/projects/${slug}/repository-sync`).then((r) => r.data.data),

  /** Relit tout de suite les PR du dépôt GitHub (porteur ou mainteneur). */
  syncRepository: (slug: string) =>
    api.post<ApiResponse<RepositorySync>>(`/v1/projects/${slug}/repository-sync`).then((r) => r.data.data),
};
