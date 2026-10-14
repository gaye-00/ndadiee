import { api } from './api';
import type { ApiResponse, PageResponse } from '@/types/common.types';
import type { Opportunity, OpportunityFilters, OpportunityRequest } from '@/types/opportunity.types';

const BASE = '/v1/opportunities';

export const opportunityService = {
  /** Par défaut, seulement les opportunités ouvertes. */
  getAll: (params?: OpportunityFilters) =>
    api.get<ApiResponse<PageResponse<Opportunity>>>(BASE, { params }).then((r) => r.data.data),

  getById: (id: number) => api.get<ApiResponse<Opportunity>>(`${BASE}/${id}`).then((r) => r.data.data),

  create: (body: OpportunityRequest) => api.post<ApiResponse<Opportunity>>(BASE, body).then((r) => r.data.data),

  update: (id: number, body: OpportunityRequest) =>
    api.put<ApiResponse<Opportunity>>(`${BASE}/${id}`, body).then((r) => r.data.data),

  /** Clôture (false) ou rouvre (true) sans supprimer. */
  setActive: (id: number, active: boolean) =>
    api.patch<ApiResponse<Opportunity>>(`${BASE}/${id}/active`, null, { params: { active } }).then((r) => r.data.data),

  delete: (id: number) => api.delete<ApiResponse<void>>(`${BASE}/${id}`).then((r) => r.data),
};
