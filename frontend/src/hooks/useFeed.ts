import { useInfiniteQuery } from '@tanstack/react-query';
import { feedService } from '@/services/feed.service';
import type { FeedFilters } from '@/types/feed.types';
import { PAGE_SIZE } from '@/utils/constants';

/** Fil d'actualité en défilement infini (à associer à useInfiniteScroll). */
export function useFeed(filters?: FeedFilters) {
  return useInfiniteQuery({
    queryKey: ['feed', filters],
    queryFn: ({ pageParam }) => feedService.get({ ...filters, page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
  });
}
