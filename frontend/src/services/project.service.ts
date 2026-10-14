import { api } from './api';
import type { ApiResponse, PageResponse } from '@/types/common.types';
import type {
  MemberDecisionRequest,
  Project,
  ProjectFilters,
  ProjectMember,
  ProjectRequest,
} from '@/types/project.types';

const BASE = '/v1/projects';

export const projectService = {
  getAll: (params?: ProjectFilters) =>
    api.get<ApiResponse<PageResponse<Project>>>(BASE, { params }).then((r) => r.data.data),

  getBySlug: (slug: string) => api.get<ApiResponse<Project>>(`${BASE}/${slug}`).then((r) => r.data.data),

  create: (body: ProjectRequest) => api.post<ApiResponse<Project>>(BASE, body).then((r) => r.data.data),

  update: (id: number, body: ProjectRequest) =>
    api.put<ApiResponse<Project>>(`${BASE}/${id}`, body).then((r) => r.data.data),

  delete: (id: number) => api.delete<ApiResponse<void>>(`${BASE}/${id}`).then((r) => r.data),

  /** Membres acceptés ; le propriétaire et les mainteneurs reçoivent aussi les demandes en attente. */
  getMembers: (id: number) => api.get<ApiResponse<ProjectMember[]>>(`${BASE}/${id}/members`).then((r) => r.data.data),

  /** Demande à contribuer : crée une participation PENDING. */
  join: (id: number) => api.post<ApiResponse<ProjectMember>>(`${BASE}/${id}/join`).then((r) => r.data.data),

  /** Quitte le projet, ou annule sa demande en attente. */
  leave: (id: number) => api.delete<ApiResponse<void>>(`${BASE}/${id}/join`).then((r) => r.data),

  decide: (id: number, memberId: number, body: MemberDecisionRequest) =>
    api.put<ApiResponse<ProjectMember>>(`${BASE}/${id}/members/${memberId}`, body).then((r) => r.data.data),
};
