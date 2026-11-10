import { api } from './api';
import type { ProjectCode, ProjectCodeFile } from '@/types/code.types';
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
  ProjectUpdateRequest,
  ProjectSettingsRequest,
  TeamRole,
} from '@/types/project.types';

const BASE = '/v1/projects';

export const projectService = {
  getAll: (params?: ProjectFilters) =>
    api.get<ApiResponse<PageResponse<Project>>>(BASE, { params }).then((r) => r.data.data),

  /** Facettes de la vitrine : projets par rôle recherché, technologie et pays, avec les autres filtres. */
  getFacets: (params?: ProjectFacetFilters) =>
    api.get<ApiResponse<ProjectFacets>>(`${BASE}/facets`, { params }).then((r) => r.data.data),

  getBySlug: (slug: string) => api.get<ApiResponse<Project>>(`${BASE}/${slug}`).then((r) => r.data.data),

  /** Le code du projet : sa source (GitHub ou dépôt de démonstration), sa branche et l'arbre de ses fichiers. */
  getCode: (slug: string) => api.get<ApiResponse<ProjectCode>>(`${BASE}/${slug}/code`).then((r) => r.data.data),

  /** Un fichier du code du projet, pris dans son arbre. */
  getCodeFile: (slug: string, path: string) =>
    api.get<ApiResponse<ProjectCodeFile>>(`${BASE}/${slug}/code/file`, { params: { path } }).then((r) => r.data.data),

  /** Publie un projet, avec sa galerie et ses rôles recherchés : la page du projet en retour */
  create: (body: NewProjectRequest) => api.post<ApiResponse<Project>>(BASE, body).then((r) => r.data.data),

  /** Modifie le projet et, si elle est envoyée, sa galerie (ensemble ou rien) : la page du projet en retour */
  update: (id: number, body: ProjectUpdateRequest) =>
    api.put<ApiResponse<Project>>(`${BASE}/${id}`, body).then((r) => r.data.data),

  delete: (id: number) => api.delete<ApiResponse<void>>(`${BASE}/${id}`).then((r) => r.data),

  /** Les réglages de l'espace d'équipe : le dépôt (vide : aucun) et le recrutement, sans toucher au reste du projet. */
  updateSettings: (id: number, body: ProjectSettingsRequest) =>
    api.patch<ApiResponse<Project>>(`${BASE}/${id}/settings`, body).then((r) => r.data.data),

  /** Membres acceptés ; le propriétaire et les mainteneurs reçoivent aussi les demandes en attente. */
  getMembers: (id: number) => api.get<ApiResponse<ProjectMember[]>>(`${BASE}/${id}/members`).then((r) => r.data.data),

  /** Demande à contribuer, à un rôle ou non : crée une participation PENDING. */
  join: (id: number, body?: JoinProjectRequest) =>
    api.post<ApiResponse<ProjectMember>>(`${BASE}/${id}/join`, body).then((r) => r.data.data),

  /** Quitte le projet, ou annule sa demande en attente. */
  leave: (id: number) => api.delete<ApiResponse<void>>(`${BASE}/${id}/join`).then((r) => r.data),

  decide: (id: number, memberId: number, body: MemberDecisionRequest) =>
    api.put<ApiResponse<ProjectMember>>(`${BASE}/${id}/members/${memberId}`, body).then((r) => r.data.data),

  /** Retire un membre de l'équipe (porteur, mainteneurs) ; ses tâches attendent un nouveau preneur. */
  removeMember: (id: number, memberId: number) =>
    api.delete<ApiResponse<void>>(`${BASE}/${id}/members/${memberId}`).then((r) => r.data),

  /** Le rôle qu'on tient dans l'équipe (« mobile »). */
  updateMySpecialty: (id: number, specialty: TeamRole) =>
    api.put<ApiResponse<ProjectMember>>(`${BASE}/${id}/members/me`, { specialty }).then((r) => r.data.data),

  /** Devlog, les entrées les plus récentes d'abord. */
  getDevlog: (id: number, params?: PaginationParams) =>
    api.get<ApiResponse<PageResponse<DevlogEntry>>>(`${BASE}/${id}/devlog`, { params }).then((r) => r.data.data),

  /** Écrit dans le devlog (équipe du projet) : ce qui vient de changer, avec sa version si c'est une release. */
  addDevlogEntry: (id: number, body: { version?: string; body: string }) =>
    api.post<ApiResponse<DevlogEntry>>(`${BASE}/${id}/devlog`, body).then((r) => r.data.data),

  /** Demandes de retours ouvertes, avec les retours reçus. */
  getFeedbackCalls: (id: number) =>
    api.get<ApiResponse<FeedbackCall[]>>(`${BASE}/${id}/feedback-calls`).then((r) => r.data.data),

  /** Donne son avis (une fois par demande) ; renvoie la demande avec ce retour compté. */
  giveFeedback: (id: number, callId: number, body: FeedbackRequest) =>
    api.post<ApiResponse<FeedbackCall>>(`${BASE}/${id}/feedback-calls/${callId}/feedback`, body).then((r) => r.data.data),
};
