import { useCallback, useMemo } from 'react';
import { useUrlFilters } from './useUrlFilters';
import { teamRoles, type TeamRoleId } from '@/config/roles';
import type { ProjectFacetFilters, TeamRole } from '@/types/project.types';

/** Ordres de la vitrine : les plus étoilés (par défaut, comme sur l'accueil), les plus récents */
export const SHOWCASE_SORTS = ['stars', 'recent'] as const;
export type ShowcaseSort = (typeof SHOWCASE_SORTS)[number];

/** Le tri demandé à l'API (format Spring) ; elle départage ensuite les égalités, du plus récent au plus ancien */
export const SORT_PARAMS: Record<ShowcaseSort, string> = {
  stars: 'starsCount,desc',
  recent: 'createdAt,desc',
};

/** Les filtres de la vitrine, tels que l'URL les donne (/showcase?role=mobile&tag=flutter&country=SN) */
export interface ShowcaseFilters {
  /** Mot-clé : nom, accroche, description ou technologie */
  q: string;
  /** Rôle recherché, du catalogue (config/roles.ts) : un projet qui le cherche recrute forcément */
  role: TeamRoleId | null;
  /** Seulement les projets qui recrutent, tous rôles confondus */
  recruiting: boolean;
  /** Technologie, par le slug de son tag */
  tag: string | null;
  /** Pays du porteur, code ISO à 2 lettres */
  country: string | null;
  sort: ShowcaseSort;
}

const ROLE_IDS = new Set<string>(teamRoles.map((role) => role.id));

/** Une URL écrite à la main ou un lien ancien : les valeurs inconnues sont ignorées, pas envoyées à l'API. */
function parse(params: URLSearchParams): ShowcaseFilters {
  const role = params.get('role')?.toLowerCase() ?? '';
  const country = params.get('country') ?? '';
  const sort = params.get('sort') ?? '';
  return {
    q: params.get('q')?.trim() ?? '',
    role: ROLE_IDS.has(role) ? (role as TeamRoleId) : null,
    recruiting: params.get('recruiting') === '1',
    tag: params.get('tag')?.trim() || null,
    country: /^[a-z]{2}$/i.test(country) ? country.toUpperCase() : null,
    sort: (SHOWCASE_SORTS as readonly string[]).includes(sort) ? (sort as ShowcaseSort) : 'stars',
  };
}

/** Les filtres dans le format de l'API. Un rôle choisi l'emporte sur « qui recrutent », qu'il implique. */
export function toApiFilters(filters: ShowcaseFilters): ProjectFacetFilters {
  return {
    q: filters.q || undefined,
    tag: filters.tag ?? undefined,
    role: filters.role ? (filters.role.toUpperCase() as TeamRole) : undefined,
    lookingForContributors: !filters.role && filters.recruiting ? true : undefined,
    country: filters.country ?? undefined,
  };
}

/**
 * Filtres de la vitrine, gardés dans l'URL (hooks/useUrlFilters) : les filtres et la grille les lisent au
 * même endroit. Chaque choix ajoute une entrée à l'historique (Précédent revient au filtre d'avant), sauf la
 * frappe dans la recherche.
 */
export function useShowcaseFilters() {
  const { params, update } = useUrlFilters();
  const filters = useMemo(() => parse(params), [params]);

  const set = useCallback(
    (changes: Partial<ShowcaseFilters>, options?: { replace?: boolean }) => {
      const next: Record<string, string | null> = {};
      if (changes.q !== undefined) {
        next.q = changes.q.trim() || null;
      }
      if (changes.role !== undefined) {
        next.role = changes.role;
      }
      if (changes.recruiting !== undefined) {
        next.recruiting = changes.recruiting ? '1' : null;
      }
      if (changes.tag !== undefined) {
        next.tag = changes.tag;
      }
      if (changes.country !== undefined) {
        next.country = changes.country;
      }
      if (changes.sort !== undefined) {
        next.sort = changes.sort === 'stars' ? null : changes.sort;
      }
      update(next, options);
    },
    [update],
  );

  /** Retire tous les filtres ; l'ordre choisi reste. */
  const clear = useCallback(() => update({ q: null, role: null, recruiting: null, tag: null, country: null }), [update]);

  const activeCount =
    Number(filters.q !== '') + Number(filters.role !== null || filters.recruiting) + Number(filters.tag !== null) + Number(filters.country !== null);

  return { filters, set, clear, activeCount };
}
