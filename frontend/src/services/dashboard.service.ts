import { api } from './api';
import type { ApiResponse } from '@/types/common.types';
import type { Dashboard } from '@/types/dashboard.types';

/** L'atelier du membre connecté (DashboardController.java). */
export const dashboardService = {
  /** Ses projets, les candidatures à étudier, les demandes de retours, l'activité de ses équipes, sa réputation. */
  get: () => api.get<ApiResponse<Dashboard>>('/v1/dashboard').then((r) => r.data.data),
};
