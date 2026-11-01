import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { openingsQuery } from './useOpenings';
import { openingService } from '@/services/opening.service';
import { searchService } from '@/services/search.service';
import type { PageResponse } from '@/types/common.types';
import type { SearchResponse, SearchType } from '@/types/feed.types';
import type { Project, ProjectBrief, ProjectOpening } from '@/types/project.types';
import type { QuestionSummary } from '@/types/question.types';
import type { UserSummary } from '@/types/user.types';

/** Règle du backend : une recherche fait au moins 2 caractères */
export const MIN_SEARCH_LENGTH = 2;

/** Ce qu'on peut chercher, dans l'ordre où les résultats s'affichent. Libellés : `search.groups` des traductions. */
export const SEARCH_GROUPS = ['roles', 'projects', 'people', 'topics'] as const;
export type SearchGroup = (typeof SEARCH_GROUPS)[number];

/** Un résultat de recherche, de n'importe quel groupe */
export type SearchHit =
  | { group: 'roles'; opening: ProjectOpening & { project: ProjectBrief } }
  | { group: 'projects'; project: Project }
  | { group: 'people'; user: UserSummary }
  | { group: 'topics'; topic: QuestionSummary };

export interface SearchHitPage {
  hits: SearchHit[];
  page: number;
  last: boolean;
  total: number;
}

// Les rôles viennent des annonces (GET /v1/openings?q=) : la recherche globale ne les connaît pas
const TYPES = { projects: 'PROJECTS', people: 'USERS', topics: 'QUESTIONS' } as const satisfies Record<Exclude<SearchGroup, 'roles'>, SearchType>;

const roleHits = (openings: ProjectOpening[]): SearchHit[] =>
  openings.flatMap((opening) => (opening.project ? [{ group: 'roles' as const, opening: { ...opening, project: opening.project } }] : []));

function pageOf<T>(page: PageResponse<T> | undefined, toHit: (item: T) => SearchHit): SearchHitPage {
  return { hits: (page?.content ?? []).map(toHit), page: page?.page ?? 0, last: page?.last ?? true, total: page?.totalElements ?? 0 };
}

/** Une page de résultats d'un groupe : seuls ceux demandés sont dans la réponse */
function hitPageOf(group: Exclude<SearchGroup, 'roles'>, response: SearchResponse): SearchHitPage {
  switch (group) {
    case 'projects':
      return pageOf(response.projects, (project) => ({ group, project }));
    case 'people':
      return pageOf(response.users, (user) => ({ group, user }));
    case 'topics':
      return pageOf(response.questions, (topic) => ({ group, topic }));
  }
}

async function fetchGroup(group: SearchGroup, q: string, page: number, size: number): Promise<SearchHitPage> {
  if (group === 'roles') {
    const openings = await openingService.getAll({ q, page, size });
    return { hits: roleHits(openings.content), page: openings.page, last: openings.last, total: openings.totalElements };
  }
  return hitPageOf(group, await searchService.search({ q, type: TYPES[group], page, size }));
}

/**
 * Les premiers résultats de chaque groupe, et combien il y en a en tout (palette Ctrl K, vue d'ensemble de la page).
 *
 * @param size    résultats par groupe
 * @param enabled false pour attendre (la palette fermée ne cherche rien)
 */
export function useSearchOverview(q: string, size: number, enabled = true) {
  const query = q.trim();
  const ready = enabled && query.length >= MIN_SEARCH_LENGTH;
  const everything = useQuery({
    queryKey: ['search', query, 'ALL', size],
    queryFn: () => searchService.search({ q: query, type: 'ALL', size }),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
  const roles = useQuery({ ...openingsQuery({ q: query, size }), enabled: ready, placeholderData: keepPreviousData });

  const groups = useMemo(() => {
    const empty: SearchHitPage = { hits: [], page: 0, last: true, total: 0 };
    return {
      roles: roles.data ? { ...empty, hits: roleHits(roles.data.content), total: roles.data.totalElements } : empty,
      projects: everything.data ? hitPageOf('projects', everything.data) : empty,
      people: everything.data ? hitPageOf('people', everything.data) : empty,
      topics: everything.data ? hitPageOf('topics', everything.data) : empty,
    } satisfies Record<SearchGroup, SearchHitPage>;
  }, [everything.data, roles.data]);

  return {
    groups,
    total: SEARCH_GROUPS.reduce((sum, group) => sum + groups[group].total, 0),
    isPending: ready && (everything.isPending || roles.isPending),
    isError: everything.isError || roles.isError,
    /** Ce sont les résultats de la recherche d'avant, le temps que les nouveaux arrivent */
    isStale: everything.isPlaceholderData || roles.isPlaceholderData,
    refetch: () => {
      void everything.refetch();
      void roles.refetch();
    },
  };
}

const GROUP_PAGE_SIZE = 20;

/** Tous les résultats d'un groupe, page après page. `group` null : pas de requête (vue d'ensemble). */
export function useSearchGroup(q: string, group: SearchGroup | null) {
  const query = q.trim();
  return useInfiniteQuery({
    queryKey: ['search', query, group, 'all-pages'],
    queryFn: ({ pageParam }) => fetchGroup(group!, query, pageParam, GROUP_PAGE_SIZE),
    enabled: group !== null && query.length >= MIN_SEARCH_LENGTH,
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    placeholderData: keepPreviousData,
  });
}
