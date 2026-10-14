import { api } from './api';
import type { ApiResponse, PageResponse, PaginationParams } from '@/types/common.types';
import type { FeedFilters, FeedItem } from '@/types/feed.types';

export const feedService = {
  /** Personnalisé (auteurs et tags suivis) pour un membre connecté, général sinon. */
  get: (params?: FeedFilters & PaginationParams) =>
    api.get<ApiResponse<PageResponse<FeedItem>>>('/v1/feed', { params }).then((r) => r.data.data),
};
