import { useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useUrlFilters } from './useUrlFilters';
import { paths } from '@/router/paths';
import type { QuestionFilters, QuestionPeriod } from '@/types/question.types';

/**
 * Ce que montre le fil du forum : tous les sujets, le fil du membre (auteurs et tags qu'il suit), ceux qui attendent
 * une réponse, ceux qui sont résolus, les siens, sa liste de lecture. Les trois derniers ou presque demandent d'être
 * connecté (FORUM_MEMBER_VIEWS).
 */
export const FORUM_VIEWS = ['all', 'following', 'unanswered', 'solved', 'mine', 'saved'] as const;
export type ForumView = (typeof FORUM_VIEWS)[number];

/** Les vues d'un membre connecté : un visiteur qui les ouvre est invité à se connecter */
export const FORUM_MEMBER_VIEWS: ReadonlySet<ForumView> = new Set(['following', 'mine', 'saved']);

/**
 * Ordres du fil, comme sur dev.to : les plus pertinents (votes et réponses, pondérés par la fraîcheur), les plus
 * récents, les mieux notés sur une période.
 */
export const FORUM_SORTS = ['relevant', 'recent', 'top'] as const;
export type ForumSort = (typeof FORUM_SORTS)[number];

/** Périodes du classement « Top » ; « all » : depuis toujours */
export const FORUM_PERIODS = ['week', 'month', 'year', 'all'] as const;
export type ForumPeriod = (typeof FORUM_PERIODS)[number];

/** Le tri demandé à l'API (format Spring) ; elle départage ensuite par l'identifiant, le plus récent d'abord */
const SORT_PARAMS: Record<ForumSort, string> = {
  relevant: 'hotness,desc',
  recent: 'createdAt,desc',
  top: 'score,desc',
};

const PERIOD_PARAMS: Record<ForumPeriod, QuestionPeriod | undefined> = {
  week: 'WEEK',
  month: 'MONTH',
  year: 'YEAR',
  all: undefined,
};

const DEFAULT_VIEW: ForumView = 'all';
const DEFAULT_SORT: ForumSort = 'relevant';
const DEFAULT_PERIOD: ForumPeriod = 'week';

/** Les filtres du forum, tels que l'URL les donne (/forum?view=unanswered&tag=react&sort=top&period=month&q=…) */
export interface ForumFilters {
  view: ForumView;
  sort: ForumSort;
  /** Seulement pour le classement « Top » */
  period: ForumPeriod;
  /** Slug d'un tag */
  tag: string | null;
  /** Mot-clé : chaque mot dans le titre, le contenu ou un tag du sujet */
  q: string;
}

const oneOf = <T extends string>(values: readonly T[], value: string | null, fallback: T): T =>
  (values as readonly string[]).includes(value ?? '') ? (value as T) : fallback;

/** Une URL écrite à la main ou un lien ancien : les valeurs inconnues sont ignorées, pas envoyées à l'API. */
function parse(params: URLSearchParams): ForumFilters {
  return {
    view: oneOf(FORUM_VIEWS, params.get('view'), DEFAULT_VIEW),
    sort: oneOf(FORUM_SORTS, params.get('sort'), DEFAULT_SORT),
    period: oneOf(FORUM_PERIODS, params.get('period'), DEFAULT_PERIOD),
    tag: params.get('tag')?.trim().toLowerCase() || null,
    q: params.get('q')?.trim() ?? '',
  };
}

/**
 * Les filtres dans le format de l'API, avec l'ordre ; sans la pagination. La liste de lecture (« saved ») a sa
 * propre requête, sans filtres : les derniers enregistrés d'abord.
 *
 * @param username le membre connecté, pour « Mes sujets »
 */
export function toApiFilters(filters: ForumFilters, username: string | undefined): QuestionFilters {
  return {
    q: filters.q || undefined,
    tag: filters.tag ?? undefined,
    unanswered: filters.view === 'unanswered' || undefined,
    solved: filters.view === 'solved' || undefined,
    following: filters.view === 'following' || undefined,
    author: filters.view === 'mine' ? username : undefined,
    sort: SORT_PARAMS[filters.sort],
    period: filters.sort === 'top' ? PERIOD_PARAMS[filters.period] : undefined,
  };
}

// La dernière adresse du fil (ses filtres) : « Forum », depuis un sujet, y ramène
let lastForumSearch = '';

/** Retient les filtres du fil affiché (pages/forum/ForumPage). */
export function rememberForumSearch(search: string): void {
  lastForumSearch = search;
}

/** Le fil tel qu'on l'a laissé : ses filtres, sa vue. */
export function forumHome(): string {
  return `${paths.forum}${lastForumSearch}`;
}

/** L'adresse du forum avec ces filtres : pour un lien (navigation du forum, tag d'une carte, page d'un sujet). */
export function forumSearch(changes: Partial<ForumFilters>, base?: URLSearchParams): string {
  const next = new URLSearchParams(base);
  write(next, changes);
  const search = next.toString();
  return search ? `?${search}` : '';
}

function write(params: URLSearchParams, changes: Partial<ForumFilters>) {
  const put = (key: string, value: string | null, fallback?: string) => {
    if (value === null || value === '' || value === fallback) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  };
  if (changes.view !== undefined) {
    put('view', changes.view, DEFAULT_VIEW);
  }
  if (changes.sort !== undefined) {
    put('sort', changes.sort, DEFAULT_SORT);
  }
  if (changes.period !== undefined) {
    put('period', changes.period, DEFAULT_PERIOD);
  }
  if (changes.tag !== undefined) {
    put('tag', changes.tag);
  }
  if (changes.q !== undefined) {
    put('q', changes.q.trim());
  }
}

/**
 * Filtres du forum, gardés dans l'URL (hooks/useUrlFilters) : la navigation, les onglets et la liste les lisent au
 * même endroit, et la page se partage. Chaque choix ajoute une entrée à l'historique (Précédent revient au filtre
 * d'avant), sauf la frappe dans la recherche.
 */
export function useForumFilters() {
  const { user } = useAuth();
  const { params, update } = useUrlFilters();
  const filters = useMemo(() => parse(params), [params]);

  const set = useCallback(
    (changes: Partial<ForumFilters>, options?: { replace?: boolean }) => {
      const next = new URLSearchParams();
      write(next, changes);
      const values: Record<string, string | null> = {};
      (['view', 'sort', 'period', 'tag', 'q'] as const).forEach((key) => {
        if (changes[key] !== undefined) {
          values[key] = next.get(key);
        }
      });
      // La liste de lecture n'a ni recherche ni tag : en chercher un ramène à tous les sujets
      if (filters.view === 'saved' && changes.view === undefined && (changes.q || changes.tag)) {
        values.view = null;
      }
      update(values, options);
    },
    [update, filters.view],
  );

  /** Retire la recherche et le tag ; la vue et l'ordre restent. */
  const clear = useCallback(() => update({ q: null, tag: null }), [update]);

  const api = useMemo(() => toApiFilters(filters, user?.username), [filters, user?.username]);
  const activeCount = Number(filters.q !== '') + Number(filters.tag !== null);

  return { filters, api, params, set, clear, activeCount };
}
