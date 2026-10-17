import { api } from './api';
import type { ApiResponse } from '@/types/common.types';
import type { CommunityStats } from '@/types/stats.types';

export const statsService = {
  /** Développeurs, pays, projets, rôles ouverts et places : comptés en base à chaque demande. */
  getCommunity: () => api.get<ApiResponse<CommunityStats>>('/v1/stats').then((r) => r.data.data),
};
