import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tagService } from '@/services/tag.service';
import type { PaginationParams } from '@/types/common.types';

/** Tags, les plus utilisés d'abord ; `q` filtre par nom (autocomplétion). */
export function useTags(params?: PaginationParams & { q?: string }) {
  return useQuery({
    queryKey: ['tags', params],
    queryFn: () => tagService.search(params),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTag(slug: string | undefined) {
  return useQuery({
    queryKey: ['tag', slug],
    queryFn: () => tagService.getBySlug(slug!),
    enabled: !!slug,
  });
}

/** Suit un tag (son contenu remonte dans le fil personnalisé) ou cesse de le suivre. */
export function useFollowTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, follow }: { slug: string; follow: boolean }) =>
      follow ? tagService.follow(slug) : tagService.unfollow(slug),
    onSuccess: (_result, { slug }) => {
      void qc.invalidateQueries({ queryKey: ['tag', slug] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
