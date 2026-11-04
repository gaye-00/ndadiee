import { AlignLeft, Clock3, GitMerge, GitPullRequest, GitPullRequestClosed, GitPullRequestDraft, UserRound } from 'lucide-react';
import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { pullRequestState, useTeamLabels } from './labels';
import { threadStyle } from './workspaceStyles';
import UserAvatar from '@/components/shared/UserAvatar';
import WovenMotif from '@/components/shared/WovenMotif';
import { roleOf } from '@/config/roles';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/lib/utils';
import type { Task, TaskPullRequest } from '@/types/workspace.types';
import { formatDateTime } from '@/utils/formatters';

// Une tâche qui reste plus longtemps en cours ou en revue le dit en rouge
const STALE_DAYS = 5;

interface TaskCardProps extends HTMLAttributes<HTMLDivElement> {
  task: Task;
  /** La carte qu'on porte (DragOverlay) : soulevée, inclinée, dans la lumière */
  lifted?: boolean;
  /** Sa place pendant qu'on la porte : un creux en pointillés */
  placeholder?: boolean;
}

/**
 * Carte de tâche : numéro, titre, métier et personne assignée. Design 3E.
 *
 * Le métier tisse son motif et teinte le fil du haut de la carte. Une tâche liée à une pull request dit où en est sa
 * revue (changements demandés, approuvée, fusionnée) ; une tâche en cours ou en revue dit depuis quand, en rouge
 * au-delà de cinq jours. Sans personne, un cercle en pointillés attend un preneur.
 */
const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(function TaskCard({ task, lifted = false, placeholder = false, className, style, ...rest }, ref) {
  const { t } = useTranslation('workspace');
  const labels = useTeamLabels();
  const now = useNow(60_000);
  const role = task.role ? roleOf(task.role) : undefined;
  const waiting = task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW';
  const days = Math.floor((now - Date.parse(task.statusChangedAt)) / 86_400_000);

  return (
    <div
      ref={ref}
      style={{ ...threadStyle(role?.colors[0] ?? null), ...style } as CSSProperties}
      className={cn(
        'group/card relative flex w-full flex-col gap-2 overflow-hidden rounded-xl border bg-surface p-3 text-start select-none',
        'transition-[border-color,box-shadow,translate,opacity] duration-200 ease-out-expo',
        placeholder
          ? 'border-dashed border-border-strong bg-foreground/[0.02] shadow-none [&>*]:opacity-0'
          : lifted
            ? 'rotate-[1.5deg] scale-[1.03] cursor-grabbing border-(--thread)/50 shadow-lift'
            : 'cursor-grab border-glass-border shadow-[0_1px_2px_rgb(0_0_0/0.06)] hover:-translate-y-px hover:border-border-strong hover:shadow-[0_10px_24px_-18px_var(--thread)] active:cursor-grabbing',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 pointer-coarse:cursor-pointer',
        className,
      )}
      {...rest}
    >
      {/* Le fil du métier, en haut de la carte */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-linear-to-r from-(--thread) via-(--thread)/40 to-transparent opacity-70 rtl:bg-linear-to-l" />

      <span className="flex min-w-0 items-center gap-2 font-mono text-[0.6875rem] text-faint-foreground">
        <span className="shrink-0 tabular-nums">#{task.number}</span>
        {role && task.role && (
          <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-(--thread-text)/10 px-1.5 py-px font-sans font-semibold text-(--thread-text)">
            <WovenMotif motif={role.motif} colors={role.colors} className="h-2.5 w-auto" />
            <span className="truncate">{labels.specialty(task.role)}</span>
          </span>
        )}
        {waiting && days >= 1 && (
          <time
            dateTime={task.statusChangedAt}
            title={t('card.since', { date: formatDateTime(task.statusChangedAt) })}
            className={cn('ms-auto inline-flex shrink-0 items-center gap-1', days >= STALE_DAYS && 'font-semibold text-coral')}
          >
            <Clock3 aria-hidden className="size-3" />
            {t('card.days', { count: days })}
          </time>
        )}
      </span>

      <span dir="auto" className="line-clamp-3 text-start text-[0.8125rem] leading-snug font-semibold text-foreground">
        {task.title}
      </span>

      {task.pullRequest && <PullRequestChip pullRequest={task.pullRequest} />}

      <span className="mt-0.5 flex items-center gap-2">
        {task.description && (
          <AlignLeft aria-label={t('card.hasDescription')} className="size-3.5 text-faint-foreground" />
        )}
        <span className="flex-1" />
        {task.assignee ? (
          <UserAvatar user={task.assignee} size="sm" className="size-6 text-[0.5625rem] ring-2 ring-surface" />
        ) : (
          <span
            title={t('card.unassigned')}
            className="grid size-6 place-items-center rounded-full border border-dashed border-border-strong text-faint-foreground transition-colors group-hover/card:border-(--thread-text)/50 group-hover/card:text-(--thread-text)"
          >
            <UserRound aria-hidden className="size-3" />
            <span className="sr-only">{t('card.unassigned')}</span>
          </span>
        )}
      </span>
    </div>
  );
});

export default TaskCard;

const PR_TONES = {
  merged: 'bg-jade/10 text-jade',
  closed: 'bg-foreground/6 text-muted-foreground',
  CHANGES_REQUESTED: 'bg-coral/10 text-coral',
  APPROVED: 'bg-jade/10 text-jade',
  REQUESTED: 'bg-gold/12 text-gold',
  open: 'bg-foreground/6 text-soft-foreground',
} as const;

/** La pull request de la tâche, et où en est sa revue */
export function PullRequestChip({ pullRequest, className }: { pullRequest: TaskPullRequest; className?: string }) {
  const { t } = useTranslation('workspace');
  const tone =
    pullRequest.status === 'MERGED'
      ? PR_TONES.merged
      : pullRequest.status === 'CLOSED'
        ? PR_TONES.closed
        : pullRequest.draft
          ? PR_TONES.closed
          : pullRequest.review
            ? PR_TONES[pullRequest.review]
            : PR_TONES.open;
  const Icon =
    pullRequest.status === 'MERGED' ? GitMerge : pullRequest.status === 'CLOSED' ? GitPullRequestClosed : pullRequest.draft ? GitPullRequestDraft : GitPullRequest;

  return (
    <span title={pullRequest.title} className={cn('inline-flex max-w-full min-w-0 items-center gap-1.5 self-start rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold', tone, className)}>
      <Icon aria-hidden className="size-3 shrink-0" />
      <span className="font-mono tabular-nums">#{pullRequest.number}</span>
      <span className="truncate">{pullRequestState(pullRequest, t)}</span>
    </span>
  );
}
