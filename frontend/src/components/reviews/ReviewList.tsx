import { SearchX } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReviewRequestItem, { ReviewRequestItemSkeleton } from './ReviewRequestItem';
import EmptyState from '@/components/feedback/EmptyState';
import ErrorState from '@/components/feedback/ErrorState';
import LoadMore from '@/components/feedback/LoadMore';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { reviewTabSearch, useReviewFilters } from '@/hooks/useReviewFilters';
import { REVIEWS_PAGE_SIZE, useReviewList, useReviewOverview } from '@/hooks/useReviews';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import { useDataSaverStore } from '@/store/useDataSaverStore';
import type { PullRequest, ReviewTab } from '@/types/review.types';

// Les PR arrivent l'une après l'autre, page après page ; elles glissent à leur nouvelle place quand l'onglet change
const ease = [0.16, 1, 0.3, 1] as const;
const itemTransition = (index: number) =>
  ({
    layout: { type: 'spring', stiffness: 260, damping: 32 },
    default: { duration: 0.45, ease, delay: (index % REVIEWS_PAGE_SIZE) * 0.03 },
  }) as const;

// Une PR publiée entre deux pages décale la suite d'un cran : la même revient, elle n'est montrée qu'une fois
function uniqueById(pullRequests: PullRequest[]): PullRequest[] {
  const seen = new Set<number>();
  return pullRequests.filter((pullRequest) => !seen.has(pullRequest.id) && seen.add(pullRequest.id));
}

/**
 * Liste des revues de code : à relire, ouvertes, terminées. Les PR de l'onglet et des filtres de l'URL
 * (hooks/useReviewFilters), vingt à la fois, la suite chargée à l'approche du bas de la page (à la demande en économie
 * de données). Pendant qu'un filtre charge, la liste d'avant reste, atténuée. Chaque onglet vide dit pourquoi, et où
 * aller.
 */
export default function ReviewList() {
  const { t } = useTranslation('reviews');
  const { filters, clear, activeCount } = useReviewFilters();
  const query = useReviewList({ tab: filters.tab, q: filters.q || undefined, project: filters.project ?? undefined });
  const dataSaver = useDataSaverStore((s) => s.enabled);
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, isPlaceholderData, fetchNextPage } = query;

  const pullRequests = useMemo(() => uniqueById(data?.pages.flatMap((page) => page.content) ?? []), [data]);
  const total = data?.pages[0]?.totalElements;

  const sentinel = useInfiniteScroll<HTMLDivElement>(
    () => void fetchNextPage(),
    hasNextPage && !isFetchingNextPage && !isFetchNextPageError && !isPlaceholderData && !dataSaver,
  );

  return (
    <section aria-labelledby="reviews-results" className="mt-6">
      <div className="flex min-h-7 items-center gap-3">
        <h2 id="reviews-results" aria-live="polite" aria-atomic="true" className="font-display text-h5 tabular-nums">
          {total === undefined ? (
            <>
              <span aria-hidden className="inline-block h-5 w-28 rounded-full align-middle skeleton-shimmer" />
              <span className="sr-only">{t('results.loading')}</span>
            </>
          ) : (
            t(`results.${filters.tab}`, { count: total })
          )}
        </h2>
        {query.isFetching && !isFetchingNextPage && total !== undefined && <PulsatingDots size="sm" />}
      </div>

      <div className="mt-4">
        {query.isPending ? (
          <ul aria-hidden className="flex flex-col gap-3">
            {[0, 1, 2].map((index) => (
              <li key={index}>
                <ReviewRequestItemSkeleton />
              </li>
            ))}
          </ul>
        ) : query.isError && pullRequests.length === 0 ? (
          <ErrorState title={t('results.errorTitle')} description={t('results.errorText')} onRetry={() => void query.refetch()} />
        ) : pullRequests.length === 0 ? (
          activeCount > 0 ? (
            <NoMatch query={filters.q} onClear={clear} />
          ) : (
            <EmptyTab tab={filters.tab} />
          )
        ) : (
          <ul
            aria-busy={query.isFetching}
            className={cn(
              'relative flex flex-col gap-3 transition-[opacity,filter] duration-300',
              // Les PR de l'onglet d'avant, le temps que les nouvelles arrivent
              isPlaceholderData && 'opacity-55 saturate-50',
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {pullRequests.map((pullRequest, index) => (
                <m.li
                  key={`${filters.tab}-${pullRequest.id}`}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.25 } }}
                  transition={itemTransition(index)}
                >
                  <ReviewRequestItem pullRequest={pullRequest} tab={filters.tab} />
                </m.li>
              ))}
              {isFetchingNextPage &&
                [0, 1].map((index) => (
                  <m.li key={`next-${index}`} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden>
                    <ReviewRequestItemSkeleton />
                  </m.li>
                ))}
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

/**
 * Un onglet vide dit pourquoi, et où aller : rien à relire mène à la revue communautaire (s'il y a des PR qui
 * attendent), pas encore de PR mène aux issues « premier pas » des annonces.
 */
function EmptyTab({ tab }: { tab: ReviewTab }) {
  const { t } = useTranslation('reviews');
  const { data: overview } = useReviewOverview();

  const action = (() => {
    switch (tab) {
      case 'TO_REVIEW':
        return overview && overview.community > 0
          ? { to: `${paths.reviews}${reviewTabSearch('COMMUNITY', new URLSearchParams())}`, label: t('empty.TO_REVIEW_action', { count: overview.community }) }
          : undefined;
      case 'MINE':
        return { to: paths.openings, label: t('empty.MINE_action') };
      case 'TEAM':
        return { to: paths.openings, label: t('empty.TEAM_action') };
      default:
        return undefined;
    }
  })();

  return <EmptyState title={t(`empty.${tab}_title`)} description={t(`empty.${tab}_text`)} action={action} />;
}

/** Aucune PR pour cette recherche ou ce projet : le dire, et proposer de tout effacer. */
function NoMatch({ query, onClear }: { query: string; onClear: () => void }) {
  const { t } = useTranslation('reviews');
  return (
    <div className="glass flex flex-col items-start gap-2 rounded-2xl p-5">
      <span aria-hidden className="mb-1 grid size-10 place-items-center rounded-xl bg-foreground/6 text-muted-foreground">
        <SearchX className="size-5" />
      </span>
      <p className="font-bold text-foreground">{query ? t('noMatch.titleQuery', { query }) : t('noMatch.title')}</p>
      <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">{t('noMatch.text')}</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-1 rounded-md text-[0.8125rem] font-bold text-gold outline-none hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring/70"
      >
        {t('noMatch.clear')}
      </button>
    </div>
  );
}
