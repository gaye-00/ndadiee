import { FileCode2, GitPullRequestArrow, MessageSquareDashed } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ReviewCommentForm, ReviewCommentItem, VerdictBadge } from '@/components/reviews/CommentThread';
import { pullRequestAuthor } from '@/components/reviews/pullRequestAuthor';
import ReviewSubmitDialog from '@/components/reviews/ReviewSubmitDialog';
import { STATE_BADGES } from '@/components/reviews/reviewVisuals';
import MarkdownContent from '@/components/shared/MarkdownContent';
import UserAvatar from '@/components/shared/UserAvatar';
import { useAddReviewComment } from '@/hooks/usePullRequest';
import { reviewPageTabSearch } from '@/hooks/useReviewPageTab';
import { languageOf, lineAnchor } from '@/lib/diff';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { PullRequestDetail, ReviewComment } from '@/types/review.types';
import { formatDate, formatRelativeTime } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * La conversation d'une revue. Design 3C.
 *
 * D'abord la description de l'auteur (« Lis d'abord le pourquoi ») ; puis, dans l'ordre, les commentaires, les
 * commentaires de ligne (avec leur fichier et un lien vers la ligne dans le diff) et les revues rendues, chacune avec
 * son verdict. Au bout, un champ pour commenter, et le geste de rendre sa revue.
 */
export default function ReviewConversation({ detail }: { detail: PullRequestDetail }) {
  const { t } = useTranslation('reviews');
  const { pullRequest, viewer } = detail;
  const author = pullRequestAuthor(pullRequest);
  const [composerKey, setComposerKey] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const add = useAddReviewComment(pullRequest.project.slug, pullRequest.number);
  const events = detail.comments.filter((comment) => comment.body !== null || comment.verdict !== null);

  return (
    <div className="flex flex-col">
      <ol aria-label={t('conversation.label')} className="relative flex flex-col gap-5">
        {/* Le fil qui relie la description aux commentaires */}
        <span aria-hidden className="absolute inset-y-4 start-[1.125rem] w-px bg-border" />

        <li className="relative flex gap-3.5">
          <UserAvatar user={author.user} size="md" className="relative ring-4 ring-background" />
          <article className="glass min-w-0 flex-1 overflow-hidden rounded-2xl">
            <header className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-b border-border-subtle bg-foreground/[0.02] px-4 py-2.5 text-xs text-muted-foreground">
              <bdi className="font-bold text-foreground">{author.user.fullName}</bdi>
              <span className="rounded-md bg-gold/14 px-1.5 py-px text-[0.625rem] font-bold tracking-wide text-gold uppercase">{t('thread.roles.author')}</span>
              <span>{t('conversation.opened')}</span>
              <time dateTime={pullRequest.createdAt} title={formatDate(pullRequest.createdAt)}>
                {formatRelativeTime(pullRequest.createdAt)}
              </time>
            </header>
            <div className="px-4 py-3.5">
              {detail.body ? (
                <MarkdownContent size="sm" className="text-[0.9375rem]">
                  {detail.body}
                </MarkdownContent>
              ) : (
                <p className="text-sm text-muted-foreground italic">{t('conversation.noDescription')}</p>
              )}
            </div>
          </article>
        </li>

        {events.map((comment) => (
          <TimelineItem key={comment.id} detail={detail} comment={comment} />
        ))}

        {events.length === 0 && (
          <li className="relative flex items-center gap-3.5 ps-1.5">
            <span aria-hidden className="relative grid size-7 shrink-0 place-items-center rounded-full bg-surface text-faint-foreground ring-4 ring-background">
              <MessageSquareDashed className="size-3.5" />
            </span>
            <p className="text-[0.8125rem] text-muted-foreground">{t('conversation.empty')}</p>
          </li>
        )}
      </ol>

      <div className="mt-7 border-t border-border-subtle pt-6">
        {viewer.canComment ? (
          <div className="glass rounded-2xl p-4">
            <ReviewCommentForm
              key={composerKey}
              autoFocus={false}
              submitLabel={t('conversation.send')}
              placeholder={t('conversation.placeholder')}
              label={t('conversation.composerLabel')}
              onCancel={() => setComposerKey((key) => key + 1)}
              onSubmit={async ({ body }) => {
                await add.mutateAsync({ body });
                setComposerKey((key) => key + 1);
                toast.success(t('conversation.sent'));
              }}
            />
          </div>
        ) : (
          <p className="rounded-xl bg-foreground/4 px-4 py-3 text-[0.8125rem] leading-relaxed text-muted-foreground">{t('diff.readOnly')}</p>
        )}
        {viewer.canReview && (
          <>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-[0.8125rem] text-muted-foreground">
              <GitPullRequestArrow aria-hidden className="size-4 text-faint-foreground" />
              {t('conversation.reviewHint')}
              <button
                type="button"
                onClick={() => setReviewing(true)}
                className={cn('rounded-sm font-bold text-gold underline decoration-gold/35 underline-offset-4 hover:decoration-gold', focusRing)}
              >
                {t('header.review')}
              </button>
            </p>
            <ReviewSubmitDialog detail={detail} open={reviewing} onOpenChange={setReviewing} />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Un moment de la conversation : une revue rendue (son verdict, et son message s'il y en a un), un commentaire de
 * ligne (son fichier, et un lien vers la ligne dans le diff), ou un commentaire.
 */
function TimelineItem({ detail, comment }: { detail: PullRequestDetail; comment: ReviewComment }) {
  const { t } = useTranslation('reviews');
  const [params] = useSearchParams();

  if (comment.verdict !== null && comment.body === null) {
    return (
      <li className="relative flex items-center gap-3.5 ps-1.5">
        <VerdictBadge verdict={comment.verdict} />
        <p className="flex flex-wrap items-center gap-x-1.5 text-[0.8125rem] text-muted-foreground">
          <Link to={paths.profile(comment.author.username)} viewTransition className={cn('rounded-sm font-bold text-foreground hover:underline', focusRing)}>
            <bdi>{comment.author.fullName}</bdi>
          </Link>
          {t(`conversation.verdict.${comment.verdict}`)}
          <span aria-hidden className="text-faint-foreground">
            ·
          </span>
          <time dateTime={comment.createdAt} title={formatDate(comment.createdAt)}>
            {formatRelativeTime(comment.createdAt)}
          </time>
        </p>
      </li>
    );
  }

  const located = comment.path !== null && comment.line !== null;
  const filesSearch = reviewPageTabSearch('files', params);

  return (
    <li className="relative flex gap-3.5">
      {comment.verdict !== null ? (
        <span className="relative ps-1.5 pt-1">
          <VerdictBadge verdict={comment.verdict} />
        </span>
      ) : (
        <UserAvatar user={comment.author} size="md" className="relative ring-4 ring-background" />
      )}
      <div
        className={cn(
          'min-w-0 flex-1 rounded-2xl border bg-surface/80 px-4 py-3.5',
          comment.verdict === 'CHANGES_REQUESTED' ? 'border-coral/30' : comment.verdict === 'APPROVED' ? 'border-jade/30' : 'border-border',
        )}
      >
        <ReviewCommentItem
          detail={detail}
          comment={comment}
          hideAvatar
          language={located ? languageOf(comment.path ?? '') : null}
          context={
            comment.verdict !== null ? (
              <p className={cn('mt-0.5 text-xs font-semibold', STATE_BADGES[comment.verdict].text)}>{t(`conversation.verdict.${comment.verdict}`)}</p>
            ) : (
              located && (
              <Link
                to={`${filesSearch}#${lineAnchor(comment.path ?? '', comment.line ?? 0)}`}
                className={cn(
                  'mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-foreground/5 px-2 py-1 font-mono text-[0.6875rem] text-soft-foreground transition-colors hover:bg-foreground/8 hover:text-foreground',
                  focusRing,
                )}
              >
                <FileCode2 aria-hidden className="size-3.5 shrink-0 text-faint-foreground" />
                <span dir="ltr" className="truncate">
                  {comment.path}:{comment.line}
                </span>
              </Link>
              )
            )
          }
        />
      </div>
    </li>
  );
}
