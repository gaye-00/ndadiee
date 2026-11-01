import { ArrowRight, ArrowUpRight, GitMerge, Sparkles } from 'lucide-react';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { pullRequestAuthor } from '@/components/reviews/pullRequestAuthor';
import ReviewSubmitDialog from '@/components/reviews/ReviewSubmitDialog';
import { mergeStatusOf, PHASES, phaseOf, STATE_BADGES, type MergeStatus } from '@/components/reviews/reviewVisuals';
import GithubMark from '@/components/shared/GithubMark';
import UserAvatar from '@/components/shared/UserAvatar';
import { useNow } from '@/hooks/useNow';
import { reviewPageTabSearch } from '@/hooks/useReviewPageTab';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { PullRequestDetail } from '@/types/review.types';
import { formatRelativeTime, plainText } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * L'en-tête d'une revue. Design 3C (« #84 Cache Redis pour les horaires BRT · Ama Owusu veut fusionner 6 commits de
 * feat/redis-cache vers main »).
 *
 * En haut, l'état de la PR, son projet et son numéro, ce qui la distingue (revue communautaire et sa réputation,
 * première contribution) et son lien vers GitHub. Puis le titre, qui veut fusionner quoi et depuis quand, le début de
 * la description. À droite, le geste du membre : rendre sa revue (ou revoir son verdict), fusionner sur GitHub pour
 * l'auteur d'une PR prête ; sinon, où en est la PR. Dessous, le diff en chiffres et les étiquettes.
 */
export default function ReviewHeader({ detail }: { detail: PullRequestDetail }) {
  const { t } = useTranslation('reviews');
  const [params] = useSearchParams();
  useNow(60_000);
  const { pullRequest, viewer } = detail;
  const phase = phaseOf(pullRequest);
  const { icon: PhaseIcon, tone, accent } = PHASES[phase];
  const author = pullRequestAuthor(pullRequest);
  // Le premier paragraphe de la description : le pourquoi, en deux lignes ; la suite est dans la conversation
  const excerpt = plainText(detail.body?.split(/\n\s*\n/)[0]);

  const sentenceKey = pullRequest.status === 'MERGED' ? 'header.merged' : pullRequest.status === 'CLOSED' ? 'header.closed' : 'header.wants';
  const time = pullRequest.mergedAt ?? pullRequest.closedAt ?? pullRequest.createdAt;
  const timeKey = pullRequest.mergedAt ? 'item.merged' : pullRequest.closedAt ? 'item.closed' : 'item.opened';

  return (
    <header style={{ '--pr-accent': accent } as CSSProperties} className="pt-6 pb-6 sm:pt-8 lg:pb-7">
      {/* L'état, le projet, le numéro, et ce qui distingue la PR */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 font-mono text-xs text-muted-foreground">
        <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 font-sans text-xs font-bold ring-1 ring-inset', tone)}>
          <PhaseIcon aria-hidden className="size-3.5" />
          {t(`phase.${phase}`)}
        </span>
        <Link
          to={paths.project(pullRequest.project.slug)}
          viewTransition
          className={cn('rounded-sm text-soft-foreground transition-colors hover:text-foreground', focusRing)}
        >
          <bdi>{pullRequest.project.name}</bdi>
        </Link>
        <span className="text-faint-foreground">#{pullRequest.number}</span>
        {pullRequest.community && (
          <Tag tone="jade">
            {t('item.community')}
            {pullRequest.reward !== null && <span className="font-bold">+{pullRequest.reward}</span>}
          </Tag>
        )}
        {pullRequest.firstContribution && (
          <Tag tone="gold">
            <Sparkles aria-hidden className="size-3" />
            {t('item.firstContribution')}
          </Tag>
        )}
        {pullRequest.github && (
          <a
            href={pullRequest.github.url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              'group/gh ms-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 font-sans text-xs font-semibold text-soft-foreground transition-colors hover:border-border-strong hover:text-foreground',
              focusRing,
            )}
          >
            <GithubMark className="size-3.5" />
            {t('header.onGithub')}
            <ArrowUpRight aria-hidden className="size-3 transition-transform group-hover/gh:-translate-y-px group-hover/gh:translate-x-px rtl:-scale-x-100" />
          </a>
        )}
      </div>

      <div className="mt-4 grid gap-x-10 gap-y-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <h1 id="review-title" dir="auto" className="font-display text-h3 text-balance text-foreground">
            {pullRequest.title}
          </h1>

          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-2">
              <UserAvatar user={author.user} size="sm" className="size-6 text-[0.5625rem]" />
              {author.github ? (
                <bdi className="font-bold text-foreground">{author.user.fullName}</bdi>
              ) : (
                <Link
                  to={paths.profile(author.user.username)}
                  viewTransition
                  className={cn('rounded-sm font-bold text-foreground hover:underline', focusRing)}
                >
                  <bdi>{author.user.fullName}</bdi>
                </Link>
              )}
              {author.github && (
                <span title={t('item.githubAuthor')} className="inline-flex text-faint-foreground">
                  <GithubMark className="size-3.5" />
                  <span className="sr-only">{t('item.githubAuthor')}</span>
                </span>
              )}
            </span>
            <span className="min-w-0">
              <Trans
                t={t}
                i18nKey={sentenceKey}
                count={pullRequest.commits}
                values={{ source: pullRequest.sourceBranch, target: pullRequest.targetBranch }}
                components={{
                  b: <span className="font-semibold text-soft-foreground" />,
                  branch: <code dir="ltr" className="rounded-md bg-foreground/6 px-1.5 py-0.5 font-mono text-[0.75rem] text-soft-foreground" />,
                }}
              />
            </span>
            {/* Le point part à la ligne avec la date, jamais seul */}
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="text-faint-foreground">
                ·
              </span>
              <time dateTime={time}>{t(timeKey, { time: formatRelativeTime(time) })}</time>
            </span>
          </p>

          {excerpt && (
            <p dir="auto" className="mt-3 max-w-3xl text-sm leading-relaxed text-soft-foreground">
              <span className="line-clamp-2">{excerpt}</span>
              <Link
                to={reviewPageTabSearch('conversation', params)}
                className={cn('group/desc mt-1 inline-flex items-center gap-1 rounded-sm text-[0.8125rem] font-bold text-gold', focusRing)}
              >
                {t('header.readDescription')}
                <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/desc:translate-x-0.5 rtl:-scale-x-100" />
              </Link>
            </p>
          )}
        </div>

        <HeaderAction detail={detail} />
      </div>

      {(pullRequest.labels.length > 0 || viewer.author) && (
        <ul className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-xs text-muted-foreground">
          {pullRequest.labels.map((label) => (
            <li key={label} className="rounded-md bg-foreground/6 px-1.5 py-px text-[0.6875rem] text-soft-foreground">
              {label}
            </li>
          ))}
          {viewer.author && <li className="ms-1 text-faint-foreground">{t('header.yours')}</li>}
        </ul>
      )}
    </header>
  );
}

/**
 * Le geste du membre : rendre sa revue (ou revoir son verdict, avec celui qu'il a rendu), fusionner sur GitHub pour
 * l'auteur d'une PR prête. Toujours, où en est la PR pour fusionner.
 */
function HeaderAction({ detail }: { detail: PullRequestDetail }) {
  const { t } = useTranslation('reviews');
  const [open, setOpen] = useState(false);
  const { pullRequest, viewer } = detail;
  const mine = pullRequest.myReview;
  const status = mergeStatusOf(pullRequest);
  const submitted = mine !== null && mine.state !== 'REQUESTED';
  // Sa revue est attendue : le geste passe en avant, aux couleurs chaudes du kente
  const awaited = viewer.canReview && (mine === null || mine.state === 'REQUESTED' || (mine.state === 'COMMENTED' && mine.required));
  const mergeOnGithub = viewer.author && status.kind === 'ready' && pullRequest.github;

  return (
    <div className="flex flex-col items-start gap-2.5 lg:items-end">
      <MergeStatusChip status={status} />
      {viewer.canReview && (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              'group/review relative isolate inline-flex h-11 items-center gap-2 overflow-hidden rounded-[0.875rem] px-5 text-sm font-bold whitespace-nowrap transition-[translate,box-shadow,background-color] duration-300 ease-out-expo hover:-translate-y-px',
              awaited && !submitted
                ? 'bg-kente-warm text-kente-night shadow-[0_12px_28px_-14px_var(--kente-coral)] hover:shadow-[0_16px_34px_-12px_var(--kente-coral)]'
                : 'border border-border-strong bg-surface/60 text-foreground hover:bg-foreground/5',
              focusRing,
              'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            {submitted ? t('header.reviewAgain') : t('header.review')}
            <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover/review:translate-x-0.5 rtl:-scale-x-100" />
          </button>
          {mine && mine.state !== 'REQUESTED' && mine.submittedAt && <MyVerdict state={mine.state} at={mine.submittedAt} />}
          <ReviewSubmitDialog detail={detail} open={open} onOpenChange={setOpen} />
        </>
      )}
      {mergeOnGithub && (
        <a
          href={pullRequest.github?.url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'group/merge inline-flex h-11 items-center gap-2 rounded-[0.875rem] bg-kente-warm px-5 text-sm font-bold whitespace-nowrap text-kente-night shadow-[0_12px_28px_-14px_var(--kente-coral)] transition-[translate,box-shadow] duration-300 ease-out-expo hover:-translate-y-px',
            focusRing,
          )}
        >
          <GitMerge aria-hidden className="size-4" />
          {t('header.mergeOnGithub')}
          <ArrowUpRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
        </a>
      )}
    </div>
  );
}

/** Le verdict qu'il a rendu, et quand : « Tu as approuvé · il y a 2 h » */
function MyVerdict({ state, at }: { state: 'COMMENTED' | 'APPROVED' | 'CHANGES_REQUESTED'; at: string }) {
  const { t } = useTranslation('reviews');
  const { icon: Icon, tone } = STATE_BADGES[state];
  return (
    <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span aria-hidden className={cn('grid size-4 place-items-center rounded-full', tone)}>
        <Icon className="size-2.5" strokeWidth={3} />
      </span>
      {t(`header.myVerdict.${state}`)}
      <span aria-hidden className="text-faint-foreground">
        ·
      </span>
      <time dateTime={at}>{formatRelativeTime(at)}</time>
    </p>
  );
}

const STATUS_TONES: Record<MergeStatus['kind'], string> = {
  merged: 'text-gold',
  closed: 'text-muted-foreground',
  draft: 'text-muted-foreground',
  changes: 'text-coral',
  ready: 'text-jade',
  awaiting: 'text-soft-foreground',
  noReviewer: 'text-muted-foreground',
};

const STATUS_DOTS: Record<MergeStatus['kind'], string> = {
  merged: 'bg-kente-gold',
  closed: 'bg-faint-foreground',
  draft: 'bg-faint-foreground',
  changes: 'bg-kente-coral',
  ready: 'bg-kente-jade',
  awaiting: 'bg-kente-gold animate-pulse-dot',
  noReviewer: 'bg-faint-foreground',
};

/** Où en est la PR pour fusionner, en une pastille */
export function MergeStatusChip({ status, className }: { status: MergeStatus; className?: string }) {
  const { t } = useTranslation('reviews');
  const label =
    status.kind === 'awaiting'
      ? t('verdict.awaiting', { count: status.count })
      : t(`verdict.${status.kind === 'noReviewer' ? 'noReviewer' : status.kind}`);
  return (
    <p role="status" className={cn('inline-flex items-center gap-2 font-mono text-xs font-semibold', STATUS_TONES[status.kind], className)}>
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOTS[status.kind])} />
      {label}
    </p>
  );
}

const TAG_TONES = {
  gold: 'bg-gold/12 text-gold',
  jade: 'bg-jade/12 text-jade',
} as const;

function Tag({ tone, children }: { tone: keyof typeof TAG_TONES; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-px font-sans text-[0.6875rem] font-semibold', TAG_TONES[tone])}>
      {children}
    </span>
  );
}
