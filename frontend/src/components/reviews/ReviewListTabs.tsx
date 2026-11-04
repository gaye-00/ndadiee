import { Archive, GitPullRequestArrow, HeartHandshake, Inbox, UsersRound, type LucideIcon } from 'lucide-react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { REVIEW_TABS, reviewTabSearch, useReviewFilters } from '@/hooks/useReviewFilters';
import { useReviewOverview } from '@/hooks/useReviews';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { ReviewOverview, ReviewTab } from '@/types/review.types';
import { formatCount } from '@/utils/formatters';

// La pastille de l'onglet ouvert glisse d'un onglet à l'autre
const slide = { type: 'spring', stiffness: 420, damping: 36 } as const;

const TABS: Record<ReviewTab, { icon: LucideIcon; count: (overview: ReviewOverview) => number }> = {
  TO_REVIEW: { icon: Inbox, count: (overview) => overview.toReview },
  COMMUNITY: { icon: HeartHandshake, count: (overview) => overview.community },
  MINE: { icon: GitPullRequestArrow, count: (overview) => overview.mine },
  TEAM: { icon: UsersRound, count: (overview) => overview.team },
  DONE: { icon: Archive, count: (overview) => overview.done },
};

/**
 * Les onglets des revues : à relire, communauté, mes PR, mes équipes, terminées, chacun avec son total (celui des
 * revues à rendre en rouge). L'onglet ouvert est dans l'URL ; sur téléphone, la rangée défile de côté.
 */
export default function ReviewListTabs() {
  const { t } = useTranslation('reviews');
  const { filters, params } = useReviewFilters();
  const { data: overview } = useReviewOverview();

  return (
    <nav aria-label={t('tabs.label')} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="glass flex w-max min-w-full gap-1 rounded-2xl p-1.5">
        {REVIEW_TABS.map(({ tab }) => {
          const { icon: Icon, count } = TABS[tab];
          const current = filters.tab === tab;
          const value = overview ? count(overview) : undefined;
          const urgent = tab === 'TO_REVIEW' && (value ?? 0) > 0;
          return (
            <li key={tab} className="flex-1">
              <Link
                to={`${paths.reviews}${reviewTabSearch(tab, params)}`}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'group/tab relative flex h-10 items-center justify-center gap-2 rounded-xl px-3.5 text-sm whitespace-nowrap transition-colors duration-200',
                  current ? 'font-semibold text-foreground' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
                )}
              >
                {current && (
                  <>
                    <m.span layoutId="review-tab" transition={slide} className="absolute inset-0 rounded-xl bg-foreground/8 ring-1 ring-foreground/6 ring-inset" />
                    <m.span
                      layoutId="review-tab-thread"
                      transition={slide}
                      aria-hidden
                      className="absolute inset-x-4 -bottom-1.5 h-[3px] rounded-full bg-linear-to-r from-kente-gold via-kente-coral to-kente-jade"
                    />
                  </>
                )}
                <Icon aria-hidden className="relative size-4 shrink-0 transition-transform duration-300 ease-out-expo group-hover/tab:scale-110" />
                <span className="relative">{t(`tabs.${tab}`)}</span>
                {value !== undefined && value > 0 && (
                  <span
                    className={cn(
                      'relative grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[0.625rem] tabular-nums',
                      urgent ? 'bg-kente-coral text-white' : 'bg-foreground/8 text-muted-foreground',
                    )}
                  >
                    {formatCount(value)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
