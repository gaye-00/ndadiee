import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { searchService } from '@/services/search.service';
import type { SearchType } from '@/types/feed.types';

export const MIN_SEARCH_LENGTH = 2;

/** Recherche globale. Ne part qu'à partir de 2 caractères (règle du backend). */
export function useSearch(q: string, type: SearchType = 'ALL') {
  const query = q.trim();
  return useQuery({
    queryKey: ['search', query, type],
    queryFn: () => searchService.search({ q: query, type }),
    enabled: query.length >= MIN_SEARCH_LENGTH,
    placeholderData: keepPreviousData,
  });
}
