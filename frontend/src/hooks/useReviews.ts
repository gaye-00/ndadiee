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

/** Les PR d'un projet et son dépôt GitHub (page projet) ; pour les membres connectés. */
export function useRepositorySync(slug: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['reviews', 'repository-sync', slug],
    queryFn: () => reviewService.getRepositorySync(slug!),
    enabled: isAuthenticated && !!slug,
    // En attendant la première lecture du dépôt (dans la minute après qu'il est indiqué), on revient voir
    refetchInterval: (query) => {
      const sync = query.state.data;
      return sync?.repository && sync.available && !sync.syncedAt && !sync.error ? 10_000 : false;
    },
  });
}

/** Relit le dépôt GitHub d'un projet ; les listes de revues et l'atelier se rechargent avec ses PR. */
export function useSyncRepository(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => reviewService.syncRepository(slug),
    onSuccess: (sync) => {
      qc.setQueryData(['reviews', 'repository-sync', slug], sync);
      void qc.invalidateQueries({ queryKey: ['reviews', 'list'] });
      void qc.invalidateQueries({ queryKey: ['reviews', 'overview'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    // Une erreur de GitHub est notée : l'état affiché la montre
    onError: () => void qc.invalidateQueries({ queryKey: ['reviews', 'repository-sync', slug] }),
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
