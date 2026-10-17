import { queryOptions, useQuery } from '@tanstack/react-query';
import { statsService } from '@/services/stats.service';

/** La communauté en chiffres : gardés cinq minutes, ils bougent lentement. */
export const communityStatsQuery = queryOptions({
  queryKey: ['stats', 'community'],
  queryFn: statsService.getCommunity,
  staleTime: 5 * 60_000,
});

export function useCommunityStats() {
  return useQuery(communityStatsQuery);
}
