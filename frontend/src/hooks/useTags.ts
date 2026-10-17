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

/**
 * Le nom d'une technologie (« react » → « React ») : pris dans une liste déjà chargée, sinon demandé à
 * l'API ; son slug en attendant, ou s'il n'existe pas.
 *
 * @param known liste où le chercher d'abord (facettes de la vitrine) ; undefined tant qu'elle charge
 */
export function useTagName(slug: string | null, known: ReadonlyArray<{ slug: string; name: string }> | undefined) {
  const found = slug ? known?.find((tag) => tag.slug === slug)?.name : undefined;
  const { data } = useTag(slug && known && !found ? slug : undefined);
  return slug ? (found ?? data?.name ?? slug) : null;
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
