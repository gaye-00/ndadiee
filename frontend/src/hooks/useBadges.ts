import { useQuery } from '@tanstack/react-query';
import { badgeService } from '@/services/badge.service';

/** Catalogue des badges : ne change presque jamais, gardé longtemps en cache. */
export function useBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: badgeService.getAll,
    staleTime: 1000 * 60 * 60,
  });
}
