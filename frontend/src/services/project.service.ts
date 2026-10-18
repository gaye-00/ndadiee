import { api } from './api';
import type { ApiResponse, PageResponse, PaginationParams } from '@/types/common.types';
import type {
  DevlogEntry,
  FeedbackCall,
  FeedbackRequest,
  JoinProjectRequest,
  MemberDecisionRequest,
  NewProjectRequest,
  Project,
  ProjectFacetFilters,
  ProjectFacets,
  ProjectFilters,
  ProjectMember,
  ProjectRequest,
} from '@/types/project.types';

const BASE = '/v1/projects';

export const projectService = {
  getAll: (params?: ProjectFilters) =>
    api.get<ApiResponse<PageResponse<Project>>>(BASE, { params }).then((r) => r.data.data),

  /** Facettes de la vitrine : projets par rôle recherché, technologie et pays, avec les autres filtres. */
  getFacets: (params?: ProjectFacetFilters) =>
    api.get<ApiResponse<ProjectFacets>>(`${BASE}/facets`, { params }).then((r) => r.data.data),

  getBySlug: (slug: string) => api.get<ApiResponse<Project>>(`${BASE}/${slug}`).then((r) => r.data.data),

  /** Publie un projet, avec sa galerie et ses rôles recherchés : la page du projet en retour */
  create: (body: NewProjectRequest) => api.post<ApiResponse<Project>>(BASE, body).then((r) => r.data.data),

  update: (id: number, body: ProjectRequest) =>
    api.put<ApiResponse<Project>>(`${BASE}/${id}`, body).then((r) => r.data.data),

  delete: (id: number) => api.delete<ApiResponse<void>>(`${BASE}/${id}`).then((r) => r.data),

  /** Membres acceptés ; le propriétaire et les mainteneurs reçoivent aussi les demandes en attente. */
  getMembers: (id: number) => api.get<ApiResponse<ProjectMember[]>>(`${BASE}/${id}/members`).then((r) => r.data.data),

  /** Demande à contribuer, à un rôle ou non : crée une participation PENDING. */
  join: (id: number, body?: JoinProjectRequest) =>
    api.post<ApiResponse<ProjectMember>>(`${BASE}/${id}/join`, body).then((r) => r.data.data),

  /** Quitte le projet, ou annule sa demande en attente. */
  leave: (id: number) => api.delete<ApiResponse<void>>(`${BASE}/${id}/join`).then((r) => r.data),

  decide: (id: number, memberId: number, body: MemberDecisionRequest) =>
    api.put<ApiResponse<ProjectMember>>(`${BASE}/${id}/members/${memberId}`, body).then((r) => r.data.data),

  /** Devlog, les entrées les plus récentes d'abord. */
  getDevlog: (id: number, params?: PaginationParams) =>
    api.get<ApiResponse<PageResponse<DevlogEntry>>>(`${BASE}/${id}/devlog`, { params }).then((r) => r.data.data),

  /** Demandes de retours ouvertes, avec les retours reçus. */
  getFeedbackCalls: (id: number) =>
    api.get<ApiResponse<FeedbackCall[]>>(`${BASE}/${id}/feedback-calls`).then((r) => r.data.data),

  /** Donne son avis (une fois par demande) ; renvoie la demande avec ce retour compté. */
  giveFeedback: (id: number, callId: number, body: FeedbackRequest) =>
    api.post<ApiResponse<FeedbackCall>>(`${BASE}/${id}/feedback-calls/${callId}/feedback`, body).then((r) => r.data.data),
};
