import { useCallback, useMemo } from 'react';
import { useUrlFilters } from './useUrlFilters';
import type { ReviewTab } from '@/types/review.types';

/** Les onglets dans l'URL (/reviews?tab=community), dans l'ordre de la page ; « À relire » est celui par défaut */
export const REVIEW_TABS = [
  { tab: 'TO_REVIEW', slug: 'to-review' },
  { tab: 'COMMUNITY', slug: 'community' },
  { tab: 'MINE', slug: 'mine' },
  { tab: 'TEAM', slug: 'team' },
  { tab: 'DONE', slug: 'done' },
] as const satisfies ReadonlyArray<{ tab: ReviewTab; slug: string }>;

export const DEFAULT_REVIEW_TAB: ReviewTab = 'TO_REVIEW';

export const reviewTabSlug = (tab: ReviewTab) => REVIEW_TABS.find((entry) => entry.tab === tab)!.slug;

/** Les filtres de la page des revues, tels que l'URL les donne (/reviews?tab=team&project=lagos-transit&q=redis) */
export interface ReviewPageFilters {
  tab: ReviewTab;
  /** Titre, numéro (« #84 »), projet ou branche */
  q: string;
  /** Un projet de ses équipes, par son slug ; sans objet dans l'onglet Communauté (hors de ses équipes) */
  project: string | null;
}

function parse(params: URLSearchParams): ReviewPageFilters {
  const slug = params.get('tab') ?? '';
  const tab = REVIEW_TABS.find((entry) => entry.slug === slug)?.tab ?? DEFAULT_REVIEW_TAB;
  return {
    tab,
    q: params.get('q')?.trim() ?? '',
    project: tab === 'COMMUNITY' ? null : params.get('project')?.trim() || null,
  };
}

/** L'adresse d'un onglet, en gardant la recherche ; le projet ne suit pas dans l'onglet Communauté. */
export function reviewTabSearch(tab: ReviewTab, params: URLSearchParams): string {
  const next = new URLSearchParams(params);
  if (tab === DEFAULT_REVIEW_TAB) {
    next.delete('tab');
  } else {
    next.set('tab', reviewTabSlug(tab));
  }
  if (tab === 'COMMUNITY') {
    next.delete('project');
  }
  const search = next.toString();
  return search ? `?${search}` : '';
}

/**
 * Filtres de la page des revues, gardés dans l'URL (hooks/useUrlFilters) : la page se partage, et Précédent revient
 * à l'onglet d'avant. La frappe dans la recherche remplace l'entrée de l'historique.
 */
export function useReviewFilters() {
  const { params, update } = useUrlFilters();
  const filters = useMemo(() => parse(params), [params]);

  const set = useCallback(
    (changes: Partial<ReviewPageFilters>, options?: { replace?: boolean }) => {
      const next: Record<string, string | null> = {};
      if (changes.tab !== undefined) {
        next.tab = changes.tab === DEFAULT_REVIEW_TAB ? null : reviewTabSlug(changes.tab);
      }
      if (changes.q !== undefined) {
        next.q = changes.q.trim() || null;
      }
      if (changes.project !== undefined) {
        next.project = changes.project;
      }
      update(next, options);
    },
    [update],
  );

  /** Retire la recherche et le projet ; l'onglet reste. */
  const clear = useCallback(() => update({ q: null, project: null }), [update]);

  const activeCount = Number(filters.q !== '') + Number(filters.project !== null);

  return { filters, params, set, clear, activeCount };
}
