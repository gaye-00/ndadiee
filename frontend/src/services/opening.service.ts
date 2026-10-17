import { api } from './api';
import type { ApiResponse, PageResponse } from '@/types/common.types';
import type {
  OpeningFilters,
  OpeningRoleSummary,
  OpeningStackSummary,
  ProjectOpening,
  ProjectOpeningRequest,
} from '@/types/project.types';

/** Annonces : les rôles recherchés par les projets (ProjectOpeningController.java). */
export const openingService = {
  /** Rôles ouverts, les plus récents d'abord, avec leur projet. */
  getAll: (params?: OpeningFilters) =>
    api.get<ApiResponse<PageResponse<ProjectOpening>>>('/v1/openings', { params }).then((r) => r.data.data),

  /** Pour chaque rôle où l'on recrute : annonces, places et projets (bande des rôles de l'accueil). */
  getRoleSummary: () =>
    api.get<ApiResponse<OpeningRoleSummary[]>>('/v1/openings/roles').then((r) => r.data.data),

  /** Technologies des projets qui recrutent, les plus demandées d'abord (`limit` : 12 par défaut, 30 au plus). */
  getStackSummary: (limit?: number) =>
    api
      .get<ApiResponse<OpeningStackSummary[]>>('/v1/openings/stacks', { params: { limit } })
      .then((r) => r.data.data),

  create: (projectId: number, body: ProjectOpeningRequest) =>
    api.post<ApiResponse<ProjectOpening>>(`/v1/projects/${projectId}/openings`, body).then((r) => r.data.data),

  update: (id: number, body: ProjectOpeningRequest) =>
    api.put<ApiResponse<ProjectOpening>>(`/v1/openings/${id}`, body).then((r) => r.data.data),

  /** Ferme un rôle pourvu (false) ou le rouvre (true). */
  setOpen: (id: number, open: boolean) =>
    api.patch<ApiResponse<ProjectOpening>>(`/v1/openings/${id}/open`, null, { params: { open } }).then((r) => r.data.data),

  delete: (id: number) => api.delete<ApiResponse<void>>(`/v1/openings/${id}`).then((r) => r.data),
};
