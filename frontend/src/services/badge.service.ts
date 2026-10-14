import { api } from './api';
import type { ApiResponse } from '@/types/common.types';
import type { Badge } from '@/types/user.types';

export const badgeService = {
  /** Catalogue des badges et de leurs conditions d'obtention. */
  getAll: () => api.get<ApiResponse<Badge[]>>('/v1/badges').then((r) => r.data.data),
};
