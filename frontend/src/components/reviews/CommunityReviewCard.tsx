import { ArrowRight, HeartHandshake } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { reviewTabSearch, useReviewFilters } from '@/hooks/useReviewFilters';
import { useReviewOverview } from '@/hooks/useReviews';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import { formatCount } from '@/utils/formatters';

/**
 * Encart « Revue communautaire » et réputation gagnée par revue utile. Design 3C (« Ouverte aux devs Go hors
 * équipe. Chaque revue jugée utile rapporte +10 de réputation »).
 *
 * Combien de PR cherchent un relecteur, et le chemin vers elles ; dans l'onglet Communauté, ce que le membre a déjà
 * rendu à la communauté.
 */
export default function CommunityReviewCard({ className }: { className?: string }) {
  const { t } = useTranslation('reviews');
  const { data: overview } = useReviewOverview();
  const { filters } = useReviewFilters();
  const here = filters.tab === 'COMMUNITY';

  return (
    <section
      aria-labelledby="community-review-title"
      className={cn(
        'relative overflow-hidden rounded-[1.375rem] border border-jade/25 p-5',
        'bg-[linear-gradient(160deg,color-mix(in_srgb,var(--kente-jade)_14%,transparent),color-mix(in_srgb,var(--foreground)_2%,transparent)_70%)]',
        className,
      )}
    >
      <span aria-hidden className="pointer-events-none absolute -end-6 -top-6 text-jade/10">
        <HeartHandshake className="size-28" strokeWidth={1.25} />
      </span>
      <p className="relative font-mono text-[0.6875rem] tracking-[0.08em] text-jade uppercase">{t('community.eyebrow')}</p>
      <h2 id="community-review-title" className="relative mt-2.5 font-sans text-[0.9375rem] leading-snug font-bold">
        {t('community.title')}
      </h2>
      <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {t('community.text', { reward: overview?.reward ?? 10 })}
      </p>

      {overview && (
        <p className="relative mt-3 flex items-baseline gap-2">
          <span className="font-display text-2xl leading-none font-bold text-foreground tabular-nums">
            {formatCount(here ? overview.communityReviews : overview.community)}
          </span>
          <span className="font-mono text-xs text-soft-foreground">
            {here ? t('community.given', { count: overview.communityReviews }) : t('community.waiting', { count: overview.community })}
          </span>
        </p>
      )}

      {!here && overview && overview.community > 0 && (
        <Link
          to={`${paths.reviews}${reviewTabSearch('COMMUNITY', new URLSearchParams())}`}
          className="group/community relative mt-4 inline-flex items-center gap-1.5 rounded-md text-[0.8125rem] font-bold text-jade outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          {t('community.cta')}
          <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/community:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/community:-translate-x-0.5" />
        </Link>
      )}
    </section>
  );
}
