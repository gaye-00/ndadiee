import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { reviewService } from '@/services/review.service';
import type { PaginationParams } from '@/types/common.types';
import type { ReviewFilters } from '@/types/review.types';

/** La liste des revues se déroule vingt PR à la fois. */
export const REVIEWS_PAGE_SIZE = 20;

/**
 * Les PR d'un onglet, page après page (pages/reviews). Pendant qu'un nouveau filtre charge, la liste d'avant reste
 * affichée.
 */
export function useReviewList(filters: Omit<ReviewFilters, keyof PaginationParams>) {
  const { isAuthenticated, isDeveloper } = useAuth();
  return useInfiniteQuery({
    queryKey: ['reviews', 'list', filters],
    queryFn: ({ pageParam }) => reviewService.getAll({ ...filters, page: pageParam, size: REVIEWS_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    placeholderData: keepPreviousData,
    enabled: isAuthenticated && isDeveloper,
  });
}

/** Les revues en chiffres : totaux des onglets, projets, bilan de relecteur. */
export function useReviewOverview() {
  const { isAuthenticated, isDeveloper } = useAuth();
  return useQuery({
    queryKey: ['reviews', 'overview'],
    queryFn: reviewService.getOverview,
    enabled: isAuthenticated && isDeveloper,
  });
}

/**
 * Se propose comme relecteur d'une PR (claim = true), ou se retire (claim = false). Les onglets, leurs totaux et
 * l'atelier se rechargent : la PR change d'onglet.
 */
export function useReviewClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, claim }: { id: number; claim: boolean }) => (claim ? reviewService.claim(id) : reviewService.release(id)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reviews'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
