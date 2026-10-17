import { ArrowRight, Clock, Plus, RotateCcw, Search, Star } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import ProjectCard, { ProjectCardSkeleton } from './ProjectCard';
import EmptyState from '@/components/feedback/EmptyState';
import ErrorState from '@/components/feedback/ErrorState';
import LoadMore from '@/components/feedback/LoadMore';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import ActiveFilters, { type ActiveFilter } from '@/components/shared/ActiveFilters';
import SortMenu, { type SortOption } from '@/components/shared/SortMenu';
import StackLogo from '@/components/shared/StackLogo';
import WovenMotif from '@/components/shared/WovenMotif';
import { teamRoles, type KenteThread } from '@/config/roles';
import { tagLogoOf } from '@/config/stacks';
import { useAuth } from '@/hooks/useAuth';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { SHOWCASE_PAGE_SIZE, useProjectFacets, useShowcaseProjects } from '@/hooks/useProjects';
import { SORT_PARAMS, toApiFilters, useShowcaseFilters, type ShowcaseFilters, type ShowcaseSort } from '@/hooks/useShowcaseFilters';
import { useStackLogos } from '@/hooks/useStackLogos';
import { useTagName } from '@/hooks/useTags';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import { useDataSaverStore } from '@/store/useDataSaverStore';
import type { Project } from '@/types/project.types';
import { countryFlag, countryName } from '@/utils/formatters';

// Une couleur par carte au survol, comme sur l'accueil : vert, or, rouge, décalées d'une rangée à l'autre
// pour que les couleurs courent en diagonale, comme sur un tissage
const ACCENTS: readonly KenteThread[] = ['jade', 'gold', 'coral'];
const accentOf = (index: number) => ACCENTS[(index + Math.floor(index / 3)) % ACCENTS.length];

// Trois colonnes sur grand écran (contenu de 90rem au plus), deux sur tablette, une sur téléphone
const IMAGE_SIZES = '(min-width: 1440px) 424px, (min-width: 1024px) 31vw, (min-width: 768px) 46vw, 92vw';

// Les cartes arrivent l'une après l'autre, page après page ; elles glissent à leur nouvelle place quand les
// filtres ou l'ordre changent
const ease = [0.16, 1, 0.3, 1] as const;
const cardTransition = (index: number) => ({
  layout: { type: 'spring', stiffness: 260, damping: 32 },
  default: { duration: 0.5, ease, delay: (index % SHOWCASE_PAGE_SIZE) * 0.035 },
} as const);

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * La grille de la vitrine : les projets des filtres de l'URL (hooks/useShowcaseFilters), douze à la fois,
 * la suite chargée à l'approche du bas de la page (à la demande en économie de données).
 *
 * En tête, le nombre de projets, les filtres actifs (chacun se retire d'un clic) et l'ordre. Pendant qu'un
 * filtre charge, la grille d'avant reste, atténuée ; puis les cartes qui restent glissent à leur place et les
 * nouvelles arrivent. Au bout de la liste, une place attend le projet du visiteur.
 */
export default function ProjectGrid() {
  const { t } = useTranslation('showcase');
  const { t: tc } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { filters, set, clear, activeCount } = useShowcaseFilters();
  const query = useShowcaseProjects({ ...toApiFilters(filters), sort: SORT_PARAMS[filters.sort] });
  // Toute la vitrine, pour « 3 projets sur 13 » : la requête de l'accroche
  const overall = useProjectFacets();
  const dataSaver = useDataSaverStore((s) => s.enabled);
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, isPlaceholderData, fetchNextPage } = query;

  const projects = useMemo(() => uniqueById(data?.pages.flatMap((page) => page.content) ?? []), [data]);
  const sorts: SortOption<ShowcaseSort>[] = [
    { value: 'stars', label: t('results.sortStars'), icon: Star },
    { value: 'recent', label: t('results.sortRecent'), icon: Clock },
  ];
  const total = data?.pages[0]?.totalElements;
  const publish = isAuthenticated
    ? { to: paths.newProject, page: pages.newProject }
    : { to: paths.register, page: pages.register };

  // La suite arrive d'elle-même à l'approche du bas ; en économie de données, chaque page d'images attend qu'on la demande
  const sentinel = useInfiniteScroll<HTMLDivElement>(
    () => void fetchNextPage(),
    hasNextPage && !isFetchingNextPage && !isFetchNextPageError && !isPlaceholderData && !dataSaver,
  );

  return (
    <section aria-labelledby="showcase-results" className="mt-8 lg:mt-10">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-baseline gap-2.5">
          <h2
            id="showcase-results"
            tabIndex={-1}
            aria-live="polite"
            aria-atomic="true"
            className="font-display text-h5 tabular-nums outline-none"
          >
            {total === undefined ? (
              <>
                <span aria-hidden className="inline-block h-5 w-28 rounded-full align-middle skeleton-shimmer" />
                <span className="sr-only">{t('results.loading')}</span>
              </>
            ) : (
              t('results.count', { count: total })
            )}
          </h2>
          {total !== undefined && activeCount > 0 && overall.data && overall.data.total !== total && (
            <span className="font-mono text-xs text-muted-foreground">{t('results.outOf', { total: overall.data.total })}</span>
          )}
        </div>
        {query.isFetching && !isFetchingNextPage && total !== undefined && <PulsatingDots size="sm" />}
        <ShowcaseActiveFilters filters={filters} set={set} clear={clear} className="order-last w-full sm:order-none sm:w-auto sm:flex-1" />
        <SortMenu value={filters.sort} options={sorts} onChange={(sort) => set({ sort })} className="ms-auto" />
      </div>

      <div className="mt-5">
        {query.isPending ? (
          <ul aria-hidden className="grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index} className={cn(index >= 2 && 'hidden md:block', index >= 4 && 'md:hidden lg:block')}>
                <ProjectCardSkeleton />
              </li>
            ))}
          </ul>
        ) : query.isError && projects.length === 0 ? (
          <ErrorState title={tc('showcase.errorTitle')} description={tc('showcase.errorText')} onRetry={() => void query.refetch()} />
        ) : projects.length === 0 ? (
          activeCount > 0 ? (
            <NoMatch query={filters.q} onClear={clear} publish={publish} />
          ) : (
            <EmptyState
              title={tc('showcase.emptyTitle')}
              description={tc('showcase.emptyText')}
              action={{ to: publish.to, label: tc('showcase.emptyAction') }}
            />
          )
        ) : (
          <ul
            aria-busy={query.isFetching}
            className={cn(
              'relative grid gap-4 transition-[opacity,filter] duration-300 md:grid-cols-2 md:gap-5 lg:grid-cols-3',
              // Les projets des filtres d'avant, le temps que les nouveaux arrivent
              isPlaceholderData && 'opacity-55 saturate-50',
            )}
          >
            <AnimatePresence mode="popLayout">
              {projects.map((project, index) => (
                <m.li
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={cardTransition(index)}
                >
                  <ProjectCard project={project} accent={accentOf(index)} imageSizes={IMAGE_SIZES} />
                </m.li>
              ))}
              {isFetchingNextPage &&
                Array.from({ length: 3 }, (_, index) => (
                  <m.li key={`next-${index}`} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden>
                    <ProjectCardSkeleton />
                  </m.li>
                ))}
              {!hasNextPage && !isPlaceholderData && (
                <m.li key="publish" layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={cardTransition(projects.length)}>
                  <PublishCard {...publish} />
                </m.li>
              )}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {hasNextPage && !query.isPending && (
        <LoadMore
          sentinel={sentinel}
          loading={isFetchingNextPage}
          failed={isFetchNextPageError}
          manual={dataSaver}
          onMore={() => void fetchNextPage()}
          moreLabel={t('results.more')}
          loadingLabel={t('results.loadingMore')}
          errorLabel={t('results.moreError')}
        />
      )}
    </section>
  );
}

// Un projet publié entre deux pages décale la suite d'un cran : le même revient, il n'est montré qu'une fois
function uniqueById(projects: Project[]): Project[] {
  const seen = new Set<number>();
  return projects.filter((project) => !seen.has(project.id) && seen.add(project.id));
}

// ── Filtres actifs ──

interface ShowcaseActiveFiltersProps {
  filters: ShowcaseFilters;
  set: ReturnType<typeof useShowcaseFilters>['set'];
  clear: () => void;
  className?: string;
}

/** Les filtres choisis, en pastilles (shared/ActiveFilters) : la recherche, le rôle, la technologie, le pays. */
function ShowcaseActiveFilters({ filters, set, clear, className }: ShowcaseActiveFiltersProps) {
  const { t } = useTranslation('showcase');
  const { t: tc } = useTranslation();
  const facets = useProjectFacets(toApiFilters(filters));
  const tagName = useTagName(filters.tag, facets.data?.stacks);
  const logos = useStackLogos();
  const role = filters.role ? teamRoles.find((candidate) => candidate.id === filters.role) : undefined;
  const logo = filters.tag ? tagLogoOf(filters.tag) : undefined;

  const chips: ActiveFilter[] = [];
  if (filters.q) {
    chips.push({
      key: 'q',
      label: tc('filters.query', { query: filters.q }),
      icon: <Search className="size-3.5 text-muted-foreground" />,
      remove: () => set({ q: '' }),
    });
  }
  if (role) {
    chips.push({
      key: 'role',
      label: tc(`teamRoles.${role.id}`),
      icon: <WovenMotif motif={role.motif} colors={role.colors} className="h-4 w-auto" />,
      remove: () => set({ role: null }),
    });
  } else if (filters.recruiting) {
    chips.push({
      key: 'recruiting',
      label: t('filters.recruiting'),
      icon: <span className="live-dot size-1.5" />,
      remove: () => set({ recruiting: false }),
    });
  }
  if (filters.tag && tagName) {
    chips.push({
      key: 'tag',
      label: tagName,
      icon: logo && logos !== false ? <StackLogo path={logos?.[logo]} className="size-3.5 text-soft-foreground" /> : undefined,
      remove: () => set({ tag: null }),
    });
  }
  if (filters.country) {
    chips.push({
      key: 'country',
      label: countryName(filters.country),
      icon: <span className="text-sm leading-none">{countryFlag(filters.country)}</span>,
      remove: () => set({ country: null }),
    });
  }

  return <ActiveFilters filters={chips} onClear={clear} resultsId="showcase-results" className={className} />;
}

// ── Sans résultat, et la place du prochain projet ──

interface PublishLink {
  to: string;
  page: () => Promise<unknown>;
}

/**
 * Aucun projet pour ces filtres : le métier attend, sans fil de trame. On peut tout effacer, ou lancer le
 * projet qui manque.
 */
function NoMatch({ query, onClear, publish }: { query: string; onClear: () => void; publish: PublishLink }) {
  const { t } = useTranslation('showcase');
  const { t: tc } = useTranslation();

  return (
    <div className="glass flex flex-col items-center rounded-[1.75rem] px-6 py-14 text-center sm:py-16">
      <span aria-hidden className="empty-loom h-16 w-48" />
      <p className="mt-6 font-display text-h4">{t('results.noMatchTitle')}</p>
      {query && (
        <p dir="auto" className="mt-3 max-w-full truncate font-mono text-sm text-soft-foreground">
          {tc('filters.query', { query })}
        </p>
      )}
      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">{t('results.noMatchText')}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-2.5">
        <button
          type="button"
          onClick={onClear}
          className={cn(
            'inline-flex h-11 items-center gap-2 rounded-[0.875rem] bg-kente-warm px-5 text-sm font-bold text-kente-night transition-[translate,filter] duration-300 hover:-translate-y-px hover:brightness-105 active:translate-y-0',
            focusRing,
            'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          <RotateCcw aria-hidden className="size-4" />
          {t('results.clearFilters')}
        </button>
        <Link
          to={publish.to}
          viewTransition
          onPointerEnter={() => prefetch(publish.page)}
          onFocus={() => prefetch(publish.page)}
          className={cn(
            'group/publish inline-flex h-11 items-center gap-2 rounded-[0.875rem] border border-border-strong px-4 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5',
            focusRing,
          )}
        >
          {t('results.publishAction')}
          <ArrowRight aria-hidden className="size-4 transition-transform group-hover/publish:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/publish:-translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Au bout de la vitrine, la carte d'un projet qui n'existe pas encore : celui du visiteur. Même anatomie
 * qu'une carte (capture, texte, équipe), en pointillés, comme la place qui attend le visiteur dans l'équipe
 * des autres cartes.
 */
function PublishCard({ to, page }: PublishLink) {
  const { t } = useTranslation('showcase');
  const dashed = 'border-dashed border-border-strong transition-colors duration-300 group-hover/publish:border-gold/55';

  return (
    <Link
      to={to}
      viewTransition
      onPointerEnter={() => prefetch(page)}
      onFocus={() => prefetch(page)}
      className={cn('group/publish flex h-full flex-col overflow-hidden rounded-2xl border', dashed, focusRing)}
    >
      {/* La capture, encore à venir */}
      <span aria-hidden className={cn('hatch grid h-45 shrink-0 place-items-center border-b', dashed)}>
        <span className="grid size-14 place-items-center rounded-full border border-dashed border-jade/70 bg-background/70 text-jade transition-transform duration-500 ease-out-expo group-hover/publish:rotate-90 group-hover/publish:scale-105">
          <Plus className="size-6" />
        </span>
      </span>

      <span className="flex flex-1 flex-col gap-2.5 p-5.5">
        <span className="font-display text-h5">{t('results.publishTitle')}</span>
        <span className="text-sm leading-[1.55] text-muted-foreground">{t('results.publishText')}</span>
        <span className={cn('mt-auto flex items-center gap-2.5 border-t pt-2.5', dashed)}>
          {/* Les places de l'équipe, à prendre */}
          <span aria-hidden className="flex items-center">
            {[0, 1, 2].map((seat) => (
              <span
                key={seat}
                className={cn(
                  'size-7 rounded-full border border-dashed border-faint-foreground/55 bg-background transition-[margin] duration-300 ease-out-expo',
                  seat > 0 && '-ms-2 group-hover/publish:-ms-1',
                )}
              />
            ))}
          </span>
          <span className="flex-1" />
          <span className="inline-flex items-center gap-1 text-[0.8125rem] font-bold text-gold">
            {t('results.publishAction')}
            <ArrowRight
              aria-hidden
              className="size-3.5 transition-transform duration-300 group-hover/publish:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/publish:-translate-x-0.5"
            />
          </span>
        </span>
      </span>
    </Link>
  );
}
