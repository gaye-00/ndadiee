import { ArrowUpRight, CircleCheck, CircleDot, Sprout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePullRequestIssues } from '@/hooks/usePullRequest';
import { cn } from '@/lib/utils';
import type { LinkedIssue, PullRequestDetail } from '@/types/review.types';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';
// Étiquettes montrées par issue ; les autres sont comptées
const LABELS_SHOWN = 3;

/**
 * La tâche à laquelle la PR répond : les issues qu'elle fermera en fusionnant (« Closes #77 »). Design 3C (« Résout
 * #77, mon issue “premier pas” »).
 *
 * Chaque issue avec son numéro, son titre, son état et ses étiquettes ; une issue « premier pas » est marquée comme
 * telle, et se lit avant la PR (« Lis d'abord le pourquoi »). Sur GitHub, un lien mène à l'issue.
 */
export default function LinkedTaskCard({ detail }: { detail: PullRequestDetail }) {
  const { t } = useTranslation('reviews');
  const { pullRequest } = detail;
  const { data: issues, isPending, isError } = usePullRequestIssues(pullRequest.project.slug, pullRequest.number);

  return (
    <section aria-labelledby="linked-task-title" className="glass rounded-[1.375rem] p-5">
      <h2 id="linked-task-title" className="eyebrow">
        {t('task.title')}
      </h2>

      {isPending ? (
        <div aria-hidden className="mt-3 flex flex-col gap-2">
          <span className="h-3 w-12 rounded-full skeleton-shimmer" />
          <span className="h-4 w-4/5 rounded-full skeleton-shimmer" />
          <span className="h-3 w-1/2 rounded-full skeleton-shimmer" />
        </div>
      ) : isError || !issues || issues.length === 0 ? (
        <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
          {isError ? t('task.error') : t('task.none')}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {issues.map((issue) => (
            <IssueItem key={issue.number} issue={issue} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Une issue liée : son état, son numéro et son titre, ses étiquettes ; « premier pas » si elle l'est */
function IssueItem({ issue }: { issue: LinkedIssue }) {
  const { t } = useTranslation('reviews');
  const closed = issue.state === 'CLOSED';
  const StateIcon = closed ? CircleCheck : CircleDot;
  const labels = issue.labels.slice(0, LABELS_SHOWN);

  const title = (
    <>
      <span className="font-mono text-xs text-faint-foreground">#{issue.number}</span>{' '}
      <span dir="auto" className="font-semibold text-foreground">
        {issue.title ?? t('task.untitled', { number: issue.number })}
      </span>
    </>
  );

  return (
    <li
      className={cn(
        'relative rounded-2xl border p-3.5 transition-colors',
        issue.starter ? 'border-gold/30 bg-[linear-gradient(160deg,color-mix(in_srgb,var(--kente-gold)_10%,transparent),transparent_75%)]' : 'border-border-subtle',
      )}
    >
      <div className="flex items-start gap-2.5">
        <StateIcon aria-hidden className={cn('mt-0.5 size-4 shrink-0', closed ? 'text-gold' : 'text-jade')} />
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] leading-snug">
            {issue.url ? (
              <a
                href={issue.url}
                target="_blank"
                rel="noreferrer"
                className={cn('group/issue rounded-sm hover:underline hover:decoration-faint-foreground/60', focusRing)}
              >
                {title}
                <ArrowUpRight aria-hidden className="ms-1 inline size-3 -translate-y-px text-faint-foreground rtl:-scale-x-100" />
              </a>
            ) : (
              title
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {issue.state ? t(closed ? 'task.closed' : 'task.open') : t('task.willClose')}
          </p>
          {(issue.starter || labels.length > 0) && (
            <p className="mt-2 flex flex-wrap gap-1">
              {issue.starter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold/14 px-2 py-px text-[0.6875rem] font-semibold text-gold">
                  <Sprout aria-hidden className="size-3" />
                  {t('task.starter')}
                </span>
              )}
              {labels.map((label) => (
                <span key={label} className="rounded-md bg-foreground/6 px-1.5 py-px font-mono text-[0.6875rem] text-soft-foreground">
                  {label}
                </span>
              ))}
              {issue.labels.length > LABELS_SHOWN && (
                <span className="rounded-md bg-foreground/6 px-1.5 py-px font-mono text-[0.6875rem] text-muted-foreground">
                  +{issue.labels.length - LABELS_SHOWN}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
