import { api } from './api';
import type { ApiResponse } from '@/types/common.types';
import type { SearchParams, SearchResponse } from '@/types/feed.types';

export const searchService = {
  /** `q` doit faire au moins 2 caractères. */
  search: (params: SearchParams) =>
    api.get<ApiResponse<SearchResponse>>('/v1/search', { params }).then((r) => r.data.data),
};
