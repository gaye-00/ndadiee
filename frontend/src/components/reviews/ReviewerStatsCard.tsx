import { useTranslation } from 'react-i18next';
import { useReviewOverview } from '@/hooks/useReviews';
import { cn } from '@/lib/utils';
import type { ReviewOverview } from '@/types/review.types';
import { formatCount } from '@/utils/formatters';

type StatKey = 'reviewsGiven' | 'approved' | 'changesRequested' | 'mergedPullRequests';

// Chaque chiffre sur un fil du kente : le vert pour l'approbation, le rouge pour les changements demandés
const STATS: ReadonlyArray<{ key: StatKey; thread: string }> = [
  { key: 'reviewsGiven', thread: 'bg-kente-gold' },
  { key: 'approved', thread: 'bg-kente-jade' },
  { key: 'changesRequested', thread: 'bg-kente-coral' },
  { key: 'mergedPullRequests', thread: 'bg-kente-gold' },
];

/** Le bilan de relecteur du membre : revues rendues, approbations, changements demandés, ses PR fusionnées. */
export default function ReviewerStatsCard({ className }: { className?: string }) {
  const { t } = useTranslation('reviews');
  const { data: overview, isPending } = useReviewOverview();

  return (
    <section aria-labelledby="reviewer-stats-title" className={cn('glass flex flex-col gap-4 rounded-[1.375rem] p-5', className)}>
      <h2 id="reviewer-stats-title" className="font-sans text-[0.9375rem] font-bold">
        {t('stats.title')}
      </h2>
      {isPending || !overview ? (
        <div aria-hidden className="grid grid-cols-2 gap-x-3 gap-y-4">
          {STATS.map(({ key }) => (
            <span key={key} className="flex flex-col gap-2">
              <span className="h-6 w-10 rounded-md skeleton-shimmer" />
              <span className="h-2.5 w-20 rounded-full skeleton-shimmer" />
            </span>
          ))}
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-4">
          {STATS.map(({ key, thread }) => (
            <Stat key={key} overview={overview} statKey={key} thread={thread} />
          ))}
        </dl>
      )}
    </section>
  );
}

function Stat({ overview, statKey, thread }: { overview: ReviewOverview; statKey: StatKey; thread: string }) {
  const { t } = useTranslation('reviews');
  const value = overview[statKey];
  return (
    <div className="flex min-w-0 flex-col">
      {/* Le libellé, puis le chiffre ; à l'écran, le chiffre passe au-dessus */}
      <dt className="order-2 mt-1 flex items-center gap-1.5 font-mono text-xs leading-snug text-muted-foreground">
        <span aria-hidden className={cn('h-0.5 w-2.5 shrink-0 rounded-full', thread)} />
        <span className="min-w-0">{t(`stats.${statKey}`, { count: value })}</span>
      </dt>
      <dd className="order-1 font-display text-2xl leading-none font-bold text-foreground tabular-nums">{formatCount(value)}</dd>
    </div>
  );
}
