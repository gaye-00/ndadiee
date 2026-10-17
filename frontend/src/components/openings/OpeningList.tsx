import { ArrowRight, Clock, Plus, RotateCcw, Search, Send, Sparkles } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OpeningCard, { OpeningCardSkeleton, type BoardOpening } from './OpeningCard';
import EmptyState from '@/components/feedback/EmptyState';
import ErrorState from '@/components/feedback/ErrorState';
import LoadMore from '@/components/feedback/LoadMore';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import ApplyDialog from '@/components/projects/ApplyDialog';
import ActiveFilters, { type ActiveFilter } from '@/components/shared/ActiveFilters';
import SortMenu, { type SortOption } from '@/components/shared/SortMenu';
import StackLogo from '@/components/shared/StackLogo';
import WovenMotif from '@/components/shared/WovenMotif';
import { teamRoles } from '@/config/roles';
import { tagLogoOf } from '@/config/stacks';
import { useAuth } from '@/hooks/useAuth';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import {
  OPENING_SORT_PARAMS,
  toApiFilters,
  useOpeningBoardFilters,
  type OpeningBoardFilters,
  type OpeningSort,
} from '@/hooks/useOpeningBoardFilters';
import { OPENINGS_PAGE_SIZE, useOpening, useOpeningBoard, useOpeningFacets } from '@/hooks/useOpenings';
import { useStackLogos } from '@/hooks/useStackLogos';
import { useTagName } from '@/hooks/useTags';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import { useDataSaverStore } from '@/store/useDataSaverStore';
import type { ProjectOpening } from '@/types/project.types';
import { countryFlag, countryName } from '@/utils/formatters';

// Une compatibilité d'au moins ce score fait d'une annonce « la plus proche du profil », comme sur la page projet
const BEST_MATCH = 60;

// Les cartes arrivent l'une après l'autre, page après page ; elles glissent à leur nouvelle place quand les
// filtres ou l'ordre changent
const ease = [0.16, 1, 0.3, 1] as const;
const cardTransition = (index: number) =>
  ({
    layout: { type: 'spring', stiffness: 260, damping: 32 },
    default: { duration: 0.5, ease, delay: (index % OPENINGS_PAGE_SIZE) * 0.035 },
  }) as const;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/** Une annonce de la liste a toujours son projet ; le type le dit */
const withProject = (opening: ProjectOpening): opening is BoardOpening => opening.project !== null;

/**
 * La plus proche du profil du membre connecté, parmi la première page : elle ne change pas quand la suite arrive.
 * Pas une annonce où il a déjà postulé, ni une d'un projet où sa candidature attend déjà.
 */
function bestOf(openings: ProjectOpening[]): ProjectOpening | undefined {
  return openings
    .filter((opening) => (opening.match?.score ?? 0) >= BEST_MATCH && !opening.appliedByMe && opening.project?.myMembershipStatus !== 'PENDING')
    .sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0))[0];
}

// Une annonce publiée entre deux pages décale la suite d'un cran : la même revient, elle n'est montrée qu'une fois
function uniqueById(openings: BoardOpening[]): BoardOpening[] {
  const seen = new Set<number>();
  return openings.filter((opening) => !seen.has(opening.id) && seen.add(opening.id));
}

/**
 * La liste des annonces : celles des filtres de l'URL (hooks/useOpeningBoardFilters), douze à la fois, la suite
 * chargée à l'approche du bas de la page (à la demande en économie de données).
 *
 * En tête, le nombre d'annonces, les filtres actifs (chacun se retire d'un clic) et l'ordre : pour un membre
 * connecté, les plus proches de son profil d'abord, la plus proche entourée d'un fil kente. Pendant qu'un filtre
 * charge, la liste d'avant reste, atténuée ; puis les cartes glissent à leur place. « Postuler » ouvre la
 * candidature ici même ; un visiteur passe d'abord par la connexion et la retrouve ensuite (?apply=). Au bout de
 * la liste, une place attend l'annonce de l'équipe du visiteur.
 */
export default function OpeningList() {
  const { t } = useTranslation('openings');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { filters, set, clear, activeCount } = useOpeningBoardFilters();
  const query = useOpeningBoard({ ...toApiFilters(filters), sort: OPENING_SORT_PARAMS[filters.sort] });
  // Toutes les annonces, pour « 3 annonces sur 28 » : la requête de l'accroche
  const overall = useOpeningFacets();
  const dataSaver = useDataSaverStore((s) => s.enabled);
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, isPlaceholderData, fetchNextPage } = query;

  const openings = useMemo(() => uniqueById(data?.pages.flatMap((page) => page.content).filter(withProject) ?? []), [data]);
  const best = useMemo(() => (isAuthenticated ? bestOf(data?.pages[0]?.content ?? []) : undefined), [data, isAuthenticated]);
  const total = data?.pages[0]?.totalElements;
  const publish = isAuthenticated ? { to: paths.newOpening, page: pages.newOpening } : { to: paths.register, page: pages.register };

  // La candidature : l'annonce reste après la fermeture, le temps que la fenêtre s'en aille
  const [applying, setApplying] = useState<BoardOpening | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function apply(opening: BoardOpening) {
    if (!isAuthenticated) {
      // Après la connexion, la page revient avec ses filtres, et la candidature reprend (useResumeApplication)
      const search = new URLSearchParams(location.search);
      search.set('apply', String(opening.id));
      void navigate(paths.login, { state: { from: { ...location, search: `?${search}` } } });
      return;
    }
    setApplying(opening);
    setDialogOpen(true);
  }

  useResumeApplication((opening) => {
    setApplying(opening);
    setDialogOpen(true);
  });

  const sorts: SortOption<OpeningSort>[] = [
    {
      value: 'match',
      label: t('results.sortMatch'),
      icon: Sparkles,
      // Un visiteur n'a pas de profil : le choisir mène à la connexion
      hint: isAuthenticated ? undefined : t('results.sortMatchSignIn'),
    },
    { value: 'recent', label: t('results.sortRecent'), icon: Clock },
    { value: 'applicants', label: t('results.sortApplicants'), icon: Send },
  ];

  function sortBy(sort: OpeningSort) {
    if (sort === 'match' && !isAuthenticated) {
      void navigate(paths.login, { state: { from: location } });
      return;
    }
    set({ sort });
  }

  // La suite arrive d'elle-même à l'approche du bas ; en économie de données, chaque page attend qu'on la demande
  const sentinel = useInfiniteScroll<HTMLDivElement>(
    () => void fetchNextPage(),
    hasNextPage && !isFetchingNextPage && !isFetchNextPageError && !isPlaceholderData && !dataSaver,
  );

  return (
    <section aria-labelledby="openings-results" className="mt-8 lg:mt-10">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-baseline gap-2.5">
          <h2
            id="openings-results"
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
        <BoardActiveFilters filters={filters} set={set} clear={clear} className="order-last w-full sm:order-none sm:w-auto sm:flex-1" />
        <SortMenu value={filters.sort} options={sorts} onChange={sortBy} className="ms-auto" />
      </div>

      <div className="mt-5">
        {query.isPending ? (
          <ul aria-hidden className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index} className={cn(index >= 2 && 'hidden lg:block')}>
                <OpeningCardSkeleton />
              </li>
            ))}
          </ul>
        ) : query.isError && openings.length === 0 ? (
          <ErrorState title={t('results.errorTitle')} description={t('results.errorText')} onRetry={() => void query.refetch()} />
        ) : openings.length === 0 ? (
          activeCount > 0 ? (
            <NoMatch query={filters.q} onClear={clear} publish={publish} />
          ) : (
            <EmptyState
              title={t('results.emptyTitle')}
              description={t('results.emptyText')}
              action={{ to: isAuthenticated ? paths.newProject : paths.register, label: t('results.emptyAction') }}
            />
          )
        ) : (
          <ul
            aria-busy={query.isFetching}
            className={cn(
              'relative grid gap-4 transition-[opacity,filter] duration-300 lg:grid-cols-2 lg:gap-5',
              // Les annonces des filtres d'avant, le temps que les nouvelles arrivent
              isPlaceholderData && 'opacity-55 saturate-50',
            )}
          >
            <AnimatePresence mode="popLayout">
              {openings.map((opening, index) => (
                <m.li
                  key={opening.id}
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={cardTransition(index)}
                >
                  <OpeningCard opening={opening} best={opening.id === best?.id} index={index} onApply={() => apply(opening)} />
                </m.li>
              ))}
              {isFetchingNextPage &&
                Array.from({ length: 2 }, (_, index) => (
                  <m.li key={`next-${index}`} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden>
                    <OpeningCardSkeleton />
                  </m.li>
                ))}
              {!hasNextPage && !isPlaceholderData && (
                <m.li key="publish" layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={cardTransition(openings.length)}>
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

      {applying && <ApplyDialog project={applying.project} opening={applying} open={dialogOpen} onOpenChange={setDialogOpen} />}
    </section>
  );
}

/**
 * Une candidature commencée avant la connexion : la page revient avec ?apply={id}. L'annonce est chargée (elle
 * n'est peut-être plus dans la première page, l'ordre du profil ayant pris le relais), puis la fenêtre s'ouvre, si
 * l'on peut encore y postuler. Le paramètre est retiré : un rechargement ne la rouvre pas.
 */
function useResumeApplication(open: (opening: BoardOpening) => void) {
  const { t } = useTranslation('openings');
  const { isAuthenticated, user } = useAuth();
  const { get, update } = useUrlFilters();
  const asked = get('apply');
  const id = isAuthenticated && asked && /^\d+$/.test(asked) ? Number(asked) : null;
  const resumed = useOpening(id);

  const resume = useEffectEvent((opening: ProjectOpening | undefined) => {
    update({ apply: null }, { replace: true });
    if (!opening || !withProject(opening)) {
      return;
    }
    if (!opening.open) {
      toast(t('results.filled'));
      return;
    }
    // Son projet, son équipe, une candidature déjà envoyée ou en attente : la carte dit déjà où il en est
    const team = opening.project.owner.id === user?.id || opening.project.myMembershipStatus === 'ACCEPTED';
    if (!team && !opening.appliedByMe && opening.project.myMembershipStatus !== 'PENDING') {
      open(opening);
    }
  });

  useEffect(() => {
    if (id !== null && !resumed.isPending) {
      resume(resumed.data);
    }
  }, [id, resumed.isPending, resumed.data]);
}

// ── Filtres actifs ──

interface BoardActiveFiltersProps {
  filters: OpeningBoardFilters;
  set: ReturnType<typeof useOpeningBoardFilters>['set'];
  clear: () => void;
  className?: string;
}

/** Les filtres choisis, en pastilles (shared/ActiveFilters) : la recherche, le rôle, la technologie, le pays. */
function BoardActiveFilters({ filters, set, clear, className }: BoardActiveFiltersProps) {
  const { t: tc } = useTranslation();
  const facets = useOpeningFacets(toApiFilters(filters));
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

  return <ActiveFilters filters={chips} onClear={clear} resultsId="openings-results" className={className} />;
}

// ── Sans résultat, et la place de la prochaine annonce ──

interface PublishLink {
  to: string;
  page: () => Promise<unknown>;
}

/**
 * Aucune annonce pour ces filtres : le métier attend, sans fil de trame. On peut tout effacer, ou publier le rôle
 * qui manque à son équipe.
 */
function NoMatch({ query, onClear, publish }: { query: string; onClear: () => void; publish: PublishLink }) {
  const { t } = useTranslation('openings');
  const { t: tc } = useTranslation();
  const { isAuthenticated } = useAuth();

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
          {t(isAuthenticated ? 'results.publishRole' : 'results.publishProject')}
          <ArrowRight aria-hidden className="size-4 transition-transform group-hover/publish:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/publish:-translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Au bout de la liste, l'annonce que l'équipe du visiteur n'a pas encore publiée. Même anatomie qu'une annonce (la
 * lisière et ses places, le texte, l'action), en pointillés, comme les places à prendre.
 */
function PublishCard({ to, page }: PublishLink) {
  const { t } = useTranslation('openings');
  const { isAuthenticated } = useAuth();
  const dashed = 'border-dashed border-border-strong transition-colors duration-300 group-hover/publish:border-gold/55';

  return (
    <Link
      to={to}
      viewTransition
      onPointerEnter={() => prefetch(page)}
      onFocus={() => prefetch(page)}
      className={cn('group/publish flex h-full min-h-56 overflow-hidden rounded-2xl border', dashed, focusRing)}
    >
      {/* La lisière, encore à tisser */}
      <span aria-hidden className={cn('hatch flex w-14 shrink-0 flex-col items-center justify-between border-e py-5 sm:w-16', dashed)}>
        <span className="grid size-11 place-items-center rounded-xl border border-dashed border-jade/70 bg-background/70 text-jade transition-transform duration-500 ease-out-expo group-hover/publish:rotate-90 group-hover/publish:scale-105 sm:size-12">
          <Plus className="size-5" />
        </span>
        <span className="flex flex-col items-center gap-1.5">
          {[0, 1].map((seat) => (
            <span key={seat} className="size-6 rounded-full border border-dashed border-faint-foreground/55 bg-background" />
          ))}
        </span>
      </span>

      <span className="flex flex-1 flex-col gap-2.5 p-5 sm:p-5.5">
        <span className="font-display text-h5">{t('results.publishTitle')}</span>
        <span className="text-sm leading-[1.55] text-muted-foreground">{t('results.publishText')}</span>
        <span className={cn('mt-auto flex items-center justify-end border-t pt-3.5', dashed)}>
          <span className="inline-flex items-center gap-1 text-[0.8125rem] font-bold text-gold">
            {t(isAuthenticated ? 'results.publishRole' : 'results.publishProject')}
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
