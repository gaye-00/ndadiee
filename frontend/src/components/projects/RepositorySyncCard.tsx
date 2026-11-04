import { ArrowRight, GitPullRequestArrow, RefreshCw, TriangleAlert } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import GithubMark from '@/components/shared/GithubMark';
import { useNow } from '@/hooks/useNow';
import { useRepositorySync, useSyncRepository } from '@/hooks/useReviews';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Project } from '@/types/project.types';
import type { RepositorySync } from '@/types/review.types';
import { getApiErrorMessage } from '@/utils/apiError';
import { formatCount, formatRelativeTime } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * Les pull requests du projet, lues sur son dépôt GitHub : combien sont ouvertes, quand le dépôt a été lu, ce qui a
 * échoué, et le lien vers leurs revues. Le porteur et les mainteneurs relancent la lecture d'un clic.
 *
 * Rien pour un projet sans dépôt GitHub, ni pour un visiteur non connecté ; rien non plus si le serveur ne sait pas
 * lire les PR (pas de jeton GitHub), sauf pour qui pourrait les synchroniser : il voit pourquoi.
 */
export default function RepositorySyncCard({ project }: { project: Pick<Project, 'slug' | 'name' | 'myMembershipStatus'> }) {
  const { t } = useTranslation('reviews');
  const { data: sync } = useRepositorySync(project.slug);
  const syncNow = useSyncRepository(project.slug);
  useNow(60_000);

  const shown = sync?.repository && (sync.available || sync.canSync);
  // L'équipe retrouve ses PR dans l'onglet Équipe ; les autres, dans l'onglet Communauté
  const team = sync?.canSync || project.myMembershipStatus === 'ACCEPTED';
  const reviewsHref = team
    ? `${paths.reviews}?tab=team&project=${encodeURIComponent(project.slug)}`
    : `${paths.reviews}?tab=community&q=${encodeURIComponent(project.name)}`;

  const run = () =>
    syncNow.mutate(undefined, {
      onSuccess: () => toast.success(t('sync.done')),
      onError: (error) => toast.error(getApiErrorMessage(error)),
    });

  return (
    <AnimatePresence initial={false}>
      {shown && sync && (
        <m.section
          aria-labelledby="repository-sync-title"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="glass rounded-[1.375rem] p-5"
        >
          <h2 id="repository-sync-title" className="eyebrow flex flex-wrap items-center gap-x-2 gap-y-1">
            <GitPullRequestArrow aria-hidden className="size-3.5 text-soft-foreground" />
            {t('sync.title')}
            {sync.syncedAt && (
              <>
                <span aria-hidden className="text-faint-foreground">
                  ·
                </span>
                <span className="flex items-center gap-1.5 normal-case">
                  <span aria-hidden className={cn('size-1.5', sync.error ? 'rounded-full bg-coral' : 'live-dot')} />
                  <time dateTime={sync.syncedAt}>{t('sync.synced', { time: formatRelativeTime(sync.syncedAt) })}</time>
                </span>
              </>
            )}
          </h2>

          <Summary sync={sync} />

          {sync.error && sync.available && (
            <p role="status" className="mt-3 flex items-start gap-2 rounded-xl bg-coral/8 px-3 py-2 text-xs leading-relaxed text-coral">
              <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
              {t(`sync.error.${sync.error}`)}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {sync.openPullRequests > 0 && (
              <Link
                to={reviewsHref}
                viewTransition
                className={cn(
                  'group/reviews inline-flex h-9 items-center gap-1.5 rounded-xl px-1 text-[0.8125rem] font-bold text-foreground transition-colors hover:text-gold',
                  focusRing,
                )}
              >
                {t('sync.reviews')}
                <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/reviews:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/reviews:-translate-x-0.5" />
              </Link>
            )}
            {sync.canSync && sync.available && (
              <button
                type="button"
                onClick={run}
                disabled={syncNow.isPending}
                aria-busy={syncNow.isPending}
                className={cn(
                  'ms-auto inline-flex h-9 items-center gap-2 rounded-xl border border-border-strong px-3.5 text-[0.8125rem] font-bold text-foreground transition-[background-color,opacity] duration-300 hover:bg-foreground/5 disabled:opacity-60',
                  focusRing,
                )}
              >
                {syncNow.isPending ? <PulsatingDots size="sm" tone="current" /> : <RefreshCw aria-hidden className="size-3.5" />}
                {syncNow.isPending ? t('sync.running') : t('sync.action')}
              </button>
            )}
          </div>
        </m.section>
      )}
    </AnimatePresence>
  );
}

/** Ce que le dépôt a donné : les PR ouvertes, la première lecture qui arrive, ou le serveur qui ne sait pas lire. */
function Summary({ sync }: { sync: RepositorySync }) {
  const { t } = useTranslation('reviews');

  if (!sync.available) {
    return <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t('sync.error.GITHUB_NOT_CONFIGURED')}</p>;
  }
  if (!sync.syncedAt && !sync.error) {
    return (
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <PulsatingDots size="sm" />
        {t('sync.first')}
      </p>
    );
  }
  return (
    <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5 text-sm text-soft-foreground">
      <span className="font-display text-2xl leading-none font-bold text-foreground tabular-nums">{formatCount(sync.openPullRequests)}</span>
      <span>{t('sync.open', { count: sync.openPullRequests })}</span>
      <a
        href={sync.repositoryUrl ?? undefined}
        target="_blank"
        rel="noreferrer"
        dir="ltr"
        className={cn('inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground', focusRing)}
      >
        <GithubMark className="size-3" />
        {sync.repository}
      </a>
    </p>
  );
}
