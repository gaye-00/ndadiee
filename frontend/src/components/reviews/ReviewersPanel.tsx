import { HeartHandshake, UserRoundMinus, UserRoundPlus, UsersRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { MergeStatusChip } from '@/components/reviews/ReviewHeader';
import { mergeStatusOf, STATE_BADGES } from '@/components/reviews/reviewVisuals';
import UserAvatar from '@/components/shared/UserAvatar';
import { useNow } from '@/hooks/useNow';
import { useJudgeReview } from '@/hooks/usePullRequest';
import { useReviewClaim } from '@/hooks/useReviews';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { PullRequestDetail, Reviewer } from '@/types/review.types';
import { formatCount, formatRelativeTime, isolate } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * Les relecteurs d'une PR et ce qui manque pour fusionner. Design 3C (« Chinedu · changements demandés, Tunde ·
 * approuvé, Wanjiru · communauté · a commenté »).
 *
 * Chaque relecteur porte son verdict et depuis quand ; les requis, puis les autres. Les revues requises approuvées se
 * comptent en un fil. L'équipe juge utile la revue d'un relecteur de la communauté (+10 de réputation pour lui) ; le
 * membre se propose comme relecteur, ou se retire d'une revue qu'il n'a pas commencée.
 */
export default function ReviewersPanel({ detail }: { detail: PullRequestDetail }) {
  const { t } = useTranslation('reviews');
  const { pullRequest, viewer } = detail;
  const claim = useReviewClaim();
  useNow(60_000);
  const required = pullRequest.reviewers.filter((reviewer) => reviewer.required);
  const approved = required.filter((reviewer) => reviewer.state === 'APPROVED').length;

  const toggleClaim = (value: boolean) =>
    claim.mutate(
      { id: pullRequest.id, claim: value },
      {
        onSuccess: () =>
          value
            ? toast.success(t('action.claimed', { number: pullRequest.number, project: isolate(pullRequest.project.name) }))
            : toast(t('action.released', { number: pullRequest.number })),
      },
    );

  return (
    <section aria-labelledby="reviewers-title" className="glass rounded-[1.375rem] p-5">
      <div className="flex items-center gap-2">
        <h2 id="reviewers-title" className="font-sans text-[0.9375rem] font-bold">
          {t('reviewers.title')}
        </h2>
        {pullRequest.reviewers.length > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-foreground/8 px-1.5 font-mono text-[0.625rem] text-muted-foreground tabular-nums">
            {formatCount(pullRequest.reviewers.length)}
          </span>
        )}
      </div>

      <MergeStatusChip status={mergeStatusOf(pullRequest)} className="mt-2" />

      {required.length > 0 && (
        <div className="mt-3">
          <div className="flex gap-1" aria-hidden>
            {required.map((reviewer) => (
              <span
                key={reviewer.user.id}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-500',
                  reviewer.state === 'APPROVED' ? 'bg-kente-jade' : reviewer.state === 'CHANGES_REQUESTED' ? 'bg-kente-coral' : 'bg-foreground/10',
                )}
              />
            ))}
          </div>
          <p className="mt-1.5 font-mono text-[0.6875rem] text-muted-foreground">{t('reviewers.required', { approved, count: required.length })}</p>
        </div>
      )}

      {pullRequest.reviewers.length === 0 ? (
        <p className="mt-4 text-[0.8125rem] leading-relaxed text-muted-foreground">{t('reviewers.empty')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3.5">
          {pullRequest.reviewers.map((reviewer) => (
            <ReviewerRow key={reviewer.user.id} detail={detail} reviewer={reviewer} />
          ))}
        </ul>
      )}

      {(viewer.canClaim || viewer.canRelease) && (
        <div className="mt-4 border-t border-border-subtle pt-4">
          {viewer.canClaim ? (
            <button
              type="button"
              disabled={claim.isPending}
              aria-busy={claim.isPending || undefined}
              onClick={() => toggleClaim(true)}
              className={cn(
                'inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-3.5 text-[0.8125rem] font-bold transition-[translate,background-color,border-color] duration-300 ease-out-expo enabled:hover:-translate-y-px disabled:opacity-60',
                pullRequest.community && !pullRequest.inMyTeam
                  ? 'border-jade/40 bg-jade/10 text-jade enabled:hover:border-jade/60 enabled:hover:bg-jade/15'
                  : 'border-border-strong text-foreground enabled:hover:bg-foreground/5',
                focusRing,
              )}
            >
              {claim.isPending ? <PulsatingDots size="sm" tone="current" /> : <UserRoundPlus aria-hidden className="size-4" />}
              {t('reviewers.claim')}
            </button>
          ) : (
            <button
              type="button"
              disabled={claim.isPending}
              onClick={() => toggleClaim(false)}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-lg px-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-coral disabled:opacity-50',
                focusRing,
              )}
            >
              {claim.isPending ? <PulsatingDots size="sm" tone="current" /> : <UserRoundMinus aria-hidden className="size-3.5" />}
              {t('action.release')}
            </button>
          )}
          {viewer.canClaim && pullRequest.reward !== null && (
            <p className="mt-2 text-center text-[0.6875rem] text-muted-foreground">{t('reviewers.claimHint', { reward: pullRequest.reward })}</p>
          )}
        </div>
      )}
    </section>
  );
}

/** Un relecteur : son avatar et son verdict, son nom et son rôle, depuis quand ; et pour l'équipe, « Revue utile ». */
function ReviewerRow({ detail, reviewer }: { detail: PullRequestDetail; reviewer: Reviewer }) {
  const { t } = useTranslation('reviews');
  const { pullRequest, viewer } = detail;
  const judge = useJudgeReview(pullRequest.project.slug, pullRequest.number);
  const { icon: Icon, tone, text } = STATE_BADGES[reviewer.state];
  const pending = reviewer.state === 'REQUESTED';
  const time = reviewer.submittedAt ?? reviewer.requestedAt;
  const judgeable = viewer.canJudge && reviewer.community && !pending;
  const reward = detail.helpfulReward;

  return (
    <li className="flex items-start gap-3">
      <Link to={paths.profile(reviewer.user.username)} viewTransition tabIndex={-1} aria-hidden className="relative shrink-0 rounded-full">
        <UserAvatar
          user={reviewer.user}
          size="md"
          className={cn(pending && 'opacity-60 outline-1 outline-offset-2 outline-dashed outline-border-strong')}
        />
        <span aria-hidden className={cn('absolute -end-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full ring-2 ring-surface', tone)}>
          <Icon className="size-2.5" strokeWidth={3} />
        </span>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          <Link
            to={paths.profile(reviewer.user.username)}
            viewTransition
            dir="auto"
            className={cn('truncate rounded-sm text-[0.8125rem] font-bold text-foreground hover:underline', focusRing)}
          >
            {reviewer.user.fullName}
          </Link>
          {reviewer.required && (
            <span className="rounded-md bg-foreground/7 px-1.5 py-px text-[0.625rem] font-bold tracking-wide text-soft-foreground uppercase">
              {t('reviewers.requiredTag')}
            </span>
          )}
          {reviewer.community && (
            <span className="inline-flex items-center gap-1 rounded-md bg-jade/12 px-1.5 py-px text-[0.625rem] font-bold tracking-wide text-jade uppercase">
              <UsersRound aria-hidden className="size-2.5" />
              {t('reviewers.communityTag')}
            </span>
          )}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
          <span className={cn('font-semibold', text)}>{t(`state.${reviewer.state}`)}</span>
          <span aria-hidden className="text-faint-foreground">
            ·
          </span>
          <time dateTime={time} className="text-muted-foreground">
            {formatRelativeTime(time)}
          </time>
        </p>

        {judgeable ? (
          <button
            type="button"
            aria-pressed={reviewer.helpful}
            disabled={judge.isPending}
            onClick={() =>
              judge.mutate(
                { reviewerId: reviewer.user.id, helpful: !reviewer.helpful },
                {
                  onSuccess: () =>
                    reviewer.helpful
                      ? toast(t('reviewers.unjudged', { name: isolate(reviewer.user.fullName) }))
                      : toast.success(t('reviewers.judged', { name: isolate(reviewer.user.fullName), reward })),
                },
              )
            }
            className={cn(
              'mt-2 inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[0.6875rem] font-bold transition-[background-color,color,translate] duration-300 ease-out-expo enabled:hover:-translate-y-px disabled:opacity-60',
              reviewer.helpful ? 'bg-jade/14 text-jade ring-1 ring-jade/30 ring-inset' : 'bg-foreground/6 text-soft-foreground hover:text-jade',
              focusRing,
            )}
          >
            {judge.isPending ? <PulsatingDots size="sm" tone="current" /> : <HeartHandshake aria-hidden className="size-3.5" />}
            {reviewer.helpful ? t('reviewers.helpful') : t('reviewers.judge', { reward })}
          </button>
        ) : (
          reviewer.helpful && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[0.6875rem] font-bold text-jade">
              <HeartHandshake aria-hidden className="size-3.5" />
              {t('reviewers.helpfulFor', { reward })}
            </p>
          )
        )}
      </div>
    </li>
  );
}
