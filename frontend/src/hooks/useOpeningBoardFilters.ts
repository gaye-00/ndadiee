import { useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useUrlFilters } from './useUrlFilters';
import { teamRoles, type TeamRoleId } from '@/config/roles';
import type { OpeningFacetFilters, TeamRole } from '@/types/project.types';

/**
 * Ordres des annonces : les plus proches du profil (membre connecté seulement, son ordre par défaut), les plus
 * récentes (par défaut pour un visiteur), les moins demandées (le moins de candidatures en attente).
 */
export const OPENING_SORTS = ['match', 'recent', 'applicants'] as const;
export type OpeningSort = (typeof OPENING_SORTS)[number];

/** Le tri demandé à l'API (format Spring) ; elle départage ensuite les égalités, de la plus récente à la plus ancienne */
export const OPENING_SORT_PARAMS: Record<OpeningSort, string> = {
  match: 'match',
  recent: 'createdAt,desc',
  applicants: 'applicants,asc',
};

/** Les filtres de la page des annonces, tels que l'URL les donne (/openings?role=mobile&tag=flutter&country=SN) */
export interface OpeningBoardFilters {
  /** Mot-clé : l'annonce (intitulé, description, issue « premier pas ») ou son projet (nom, accroche, technologie) */
  q: string;
  /** Rôle du catalogue (config/roles.ts) */
  role: TeamRoleId | null;
  /** Technologie du projet, par le slug de son tag */
  tag: string | null;
  /** Pays du porteur du projet, code ISO à 2 lettres */
  country: string | null;
  sort: OpeningSort;
}

const ROLE_IDS = new Set<string>(teamRoles.map((role) => role.id));

/** L'ordre quand l'URL n'en donne pas : celui du profil pour un membre connecté */
const defaultSort = (authenticated: boolean): OpeningSort => (authenticated ? 'match' : 'recent');

/**
 * Une URL écrite à la main ou un lien ancien : les valeurs inconnues sont ignorées, pas envoyées à l'API. Un
 * visiteur n'a pas de profil : l'ordre du profil devient le sien.
 */
function parse(params: URLSearchParams, authenticated: boolean): OpeningBoardFilters {
  const role = params.get('role')?.toLowerCase() ?? '';
  const country = params.get('country') ?? '';
  const sort = params.get('sort') ?? '';
  const known = (OPENING_SORTS as readonly string[]).includes(sort) && (sort !== 'match' || authenticated);
  return {
    q: params.get('q')?.trim() ?? '',
    role: ROLE_IDS.has(role) ? (role as TeamRoleId) : null,
    tag: params.get('tag')?.trim() || null,
    country: /^[a-z]{2}$/i.test(country) ? country.toUpperCase() : null,
    sort: known ? (sort as OpeningSort) : defaultSort(authenticated),
  };
}

/** Les filtres dans le format de l'API, sans l'ordre ni la pagination. */
export function toApiFilters(filters: OpeningBoardFilters): OpeningFacetFilters {
  return {
    q: filters.q || undefined,
    role: filters.role ? (filters.role.toUpperCase() as TeamRole) : undefined,
    tag: filters.tag ?? undefined,
    country: filters.country ?? undefined,
  };
}

/**
 * Filtres de la page des annonces, gardés dans l'URL (hooks/useUrlFilters) : les filtres et la liste les lisent
 * au même endroit. Chaque choix ajoute une entrée à l'historique (Précédent revient au filtre d'avant), sauf la
 * frappe dans la recherche.
 */
export function useOpeningBoardFilters() {
  const { isAuthenticated } = useAuth();
  const { params, update } = useUrlFilters();
  const filters = useMemo(() => parse(params, isAuthenticated), [params, isAuthenticated]);

  const set = useCallback(
    (changes: Partial<OpeningBoardFilters>, options?: { replace?: boolean }) => {
      const next: Record<string, string | null> = {};
      if (changes.q !== undefined) {
        next.q = changes.q.trim() || null;
      }
      if (changes.role !== undefined) {
        next.role = changes.role;
      }
      if (changes.tag !== undefined) {
        next.tag = changes.tag;
      }
      if (changes.country !== undefined) {
        next.country = changes.country;
      }
      if (changes.sort !== undefined) {
        next.sort = changes.sort === defaultSort(isAuthenticated) ? null : changes.sort;
      }
      update(next, options);
    },
    [update, isAuthenticated],
  );

  /** Retire tous les filtres ; l'ordre choisi reste. */
  const clear = useCallback(() => update({ q: null, role: null, tag: null, country: null }), [update]);

  const activeCount =
    Number(filters.q !== '') + Number(filters.role !== null) + Number(filters.tag !== null) + Number(filters.country !== null);

  return { filters, set, clear, activeCount };
}
