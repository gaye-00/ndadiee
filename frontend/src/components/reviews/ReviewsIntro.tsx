import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useNow } from '@/hooks/useNow';
import { reviewTabSearch } from '@/hooks/useReviewFilters';
import { useReviewOverview } from '@/hooks/useReviews';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import { formatRelativeTime } from '@/utils/formatters';

const HOUR = 3_600_000;

/**
 * L'accroche des revues : le titre, et ce qui attend le membre en une phrase (« 2 revues t'attendent ; la plus
 * ancienne depuis hier »). Sans revue à rendre, elle l'invite vers la revue communautaire.
 */
export default function ReviewsIntro() {
  const { t } = useTranslation('reviews');
  const { data } = useReviewOverview();
  const now = useNow(60_000);
  const oldest = data?.oldestRequestAt ? now - Date.parse(data.oldestRequestAt) : 0;

  return (
    <header className="grid gap-x-16 gap-y-5 pt-8 pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-end lg:pt-12 lg:pb-10">
      <div>
        <p className="eyebrow">{t('intro.eyebrow')}</p>
        <h1 className="mt-4 font-display text-h1">
          <span className="block">{t('intro.titleCode')}</span>
          {/* Les lettres sont taillées dans le kente (styles/effects.css) */}
          <span className="block w-fit text-kente-woven">{t('intro.titleTogether')}</span>
        </h1>
      </div>

      <div className="flex flex-col gap-4 lg:pb-1.5">
        <p className="text-lead text-muted-foreground">{t('intro.lead')}</p>
        {/* Place gardée tant que les chiffres ne sont pas là : rien ne bouge à leur arrivée */}
        <p aria-live="polite" className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-xs text-soft-foreground">
          {data &&
            (data.toReview > 0 ? (
              <>
                <span className="inline-flex items-center gap-2 text-coral">
                  <span aria-hidden className="size-1.5 rounded-full bg-kente-coral animate-pulse-dot" />
                  {t('intro.waiting', { count: data.toReview })}
                </span>
                {data.oldestRequestAt && (
                  <span className={cn('inline-flex items-center gap-3', oldest >= 72 * HOUR ? 'text-coral' : oldest >= 24 * HOUR && 'text-gold')}>
                    <span aria-hidden className="text-faint-foreground">
                      ·
                    </span>
                    {t('intro.oldest', { time: formatRelativeTime(data.oldestRequestAt) })}
                  </span>
                )}
              </>
            ) : (
              <span className="inline-flex items-center gap-2 text-jade">
                <span aria-hidden className="size-1.5 rounded-full bg-kente-jade" />
                {t('intro.allClear')}
              </span>
            ))}
          {data && data.community > 0 && (
            <span className="inline-flex items-center gap-3">
              <span aria-hidden className="text-faint-foreground">
                ·
              </span>
              <Link
                to={`${paths.reviews}${reviewTabSearch('COMMUNITY', new URLSearchParams())}`}
                className="rounded-sm text-jade underline decoration-jade/35 underline-offset-4 outline-none transition-[text-decoration-color] hover:decoration-jade focus-visible:ring-2 focus-visible:ring-ring/70"
              >
                {t('intro.community', { count: data.community })}
              </Link>
            </span>
          )}
        </p>
      </div>
    </header>
  );
}
