import { api } from './api';
import type { ApiResponse, PageResponse } from '@/types/common.types';
import type { Hackathon, HackathonFilters, HackathonTeam, HackathonTeamRequest } from '@/types/hackathon.types';

const BASE = '/v1/hackathons';

/** Hackathons et équipes inscrites (HackathonController.java). */
export const hackathonService = {
  /** Sans tri demandé : à venir du plus proche au plus lointain, en cours, puis terminés du plus récent au plus ancien. */
  getAll: (params?: HackathonFilters) =>
    api.get<ApiResponse<PageResponse<Hackathon>>>(BASE, { params }).then((r) => r.data.data),

  getBySlug: (slug: string) => api.get<ApiResponse<Hackathon>>(`${BASE}/${slug}`).then((r) => r.data.data),

  /** Toutes les équipes, le palmarès d'abord : leurs membres et, avant le coup d'envoi, leurs rôles ouverts. */
  getTeams: (id: number) => api.get<ApiResponse<HackathonTeam[]>>(`${BASE}/${id}/teams`).then((r) => r.data.data),

  /** Les hackathons à venir ou en cours où le membre connecté a une équipe, le plus proche d'abord. */
  getMine: () => api.get<ApiResponse<Hackathon[]>>(`${BASE}/me`).then((r) => r.data.data),

  /** Inscrit un projet comme équipe (son porteur ou un mainteneur), avant la clôture des inscriptions. */
  register: (id: number, body: HackathonTeamRequest) =>
    api.post<ApiResponse<HackathonTeam>>(`${BASE}/${id}/teams`, body).then((r) => r.data.data),

  /** Retire l'équipe d'un projet, avant le coup d'envoi. */
  withdraw: (id: number, projectId: number) =>
    api.delete<ApiResponse<void>>(`${BASE}/${id}/teams/${projectId}`).then((r) => r.data),
};
