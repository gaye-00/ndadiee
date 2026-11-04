import { FileDiff, MessagesSquare, type LucideIcon } from 'lucide-react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { DiffStat } from '@/components/reviews/ReviewRequestItem';
import { reviewPageTabSearch, useReviewPageTab, type ReviewPageTab } from '@/hooks/useReviewPageTab';
import { cn } from '@/lib/utils';
import type { PullRequestDetail } from '@/types/review.types';
import { formatCount } from '@/utils/formatters';

// La pastille de l'onglet ouvert glisse d'un onglet à l'autre
const slide = { type: 'spring', stiffness: 420, damping: 36 } as const;

const TABS: ReadonlyArray<{ tab: ReviewPageTab; icon: LucideIcon }> = [
  { tab: 'files', icon: FileDiff },
  { tab: 'conversation', icon: MessagesSquare },
];

/**
 * Les onglets d'une revue : les fichiers modifiés (et combien), la conversation (et combien de commentaires). L'onglet
 * ouvert est dans l'URL ; à droite, le diff en chiffres. Sur téléphone, la rangée défile de côté.
 */
export default function ReviewTabs({ detail }: { detail: PullRequestDetail }) {
  const { t } = useTranslation('reviews');
  const [params] = useSearchParams();
  const current = useReviewPageTab();
  const { pullRequest } = detail;
  const counts: Record<ReviewPageTab, number> = {
    files: pullRequest.filesChanged,
    conversation: detail.comments.filter((comment) => comment.body !== null || comment.verdict !== null).length,
  };

  return (
    <nav aria-label={t('pageTabs.label')} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <div className="glass flex w-max min-w-full items-center gap-1 rounded-2xl p-1.5">
        <ul className="flex gap-1">
          {TABS.map(({ tab, icon: Icon }) => {
            const active = current === tab;
            return (
              <li key={tab}>
                <Link
                  to={reviewPageTabSearch(tab, params)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group/tab relative flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm whitespace-nowrap transition-colors duration-200',
                    active ? 'font-semibold text-foreground' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
                    'outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
                  )}
                >
                  {active && (
                    <>
                      <m.span layoutId="pr-tab" transition={slide} className="absolute inset-0 rounded-xl bg-foreground/8 ring-1 ring-foreground/6 ring-inset" />
                      <m.span
                        layoutId="pr-tab-thread"
                        transition={slide}
                        aria-hidden
                        className="absolute inset-x-4 -bottom-1.5 h-[3px] rounded-full bg-linear-to-r from-kente-gold via-kente-coral to-kente-jade"
                      />
                    </>
                  )}
                  <Icon aria-hidden className="relative size-4 shrink-0 transition-transform duration-300 ease-out-expo group-hover/tab:scale-110" />
                  <span className="relative">{t(`pageTabs.${tab}`)}</span>
                  <span className="relative grid h-5 min-w-5 place-items-center rounded-full bg-foreground/8 px-1.5 font-mono text-[0.625rem] text-muted-foreground tabular-nums">
                    {formatCount(counts[tab])}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <DiffStat
          additions={pullRequest.additions}
          deletions={pullRequest.deletions}
          className="ms-auto hidden ps-6 pe-3 font-mono text-xs text-muted-foreground sm:inline-flex"
        />
      </div>
    </nav>
  );
}
