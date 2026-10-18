import { ArrowUpRight, Eye, EyeOff, FolderKanban, MessageSquareText, MessagesSquare, Trash2, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import UserAvatar from '@/components/shared/UserAvatar';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { AdminContent, ModeratedContent } from '@/types/admin.types';
import { formatDateTime, formatNumber, formatRelativeTime } from '@/utils/formatters';

const TYPE_ICONS: Record<ModeratedContent, LucideIcon> = {
  QUESTION: MessagesSquare,
  ANSWER: MessageSquareText,
  PROJECT: FolderKanban,
};

const action =
  'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:opacity-50';

/** La page publique d'un contenu : le sujet, la réponse dans son sujet, le projet. Un admin y voit aussi les contenus masqués. */
function contentHref(content: AdminContent): string {
  switch (content.type) {
    case 'QUESTION':
      return paths.topic(content.slug);
    case 'ANSWER':
      return paths.topicAnswer(content.slug, content.id);
    case 'PROJECT':
      return paths.project(content.slug);
  }
}

export type ContentDecision = 'hide' | 'unhide' | 'delete';

interface ContentRowProps {
  content: AdminContent;
  /** Une décision est en route sur ce contenu : ses boutons attendent */
  busy?: boolean;
  onDecide: (decision: ContentDecision, content: AdminContent) => void;
}

/**
 * Un contenu du back-office : son type et sa date, son titre (une réponse : le sujet auquel elle répond), un
 * extrait, son auteur et ses chiffres. Masqué, son motif s'affiche. Dessous, les décisions : voir la page,
 * masquer ou rétablir, supprimer.
 */
export default function ContentRow({ content, busy = false, onDecide }: ContentRowProps) {
  const { t } = useTranslation('admin');
  const Icon = TYPE_ICONS[content.type];
  const href = contentHref(content);

  return (
    <li className={cn('glass flex flex-col gap-4 rounded-2xl p-4 sm:p-5', content.hidden && 'border-coral/30')}>
      <div className="flex gap-3.5">
        <span
          aria-hidden
          className={cn('grid size-10 shrink-0 place-items-center rounded-xl', content.hidden ? 'bg-coral/12 text-coral' : 'bg-foreground/6 text-muted-foreground')}
        >
          {content.hidden ? <EyeOff className="size-[1.125rem]" /> : <Icon className="size-[1.125rem]" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-semibold text-soft-foreground">{t(`content.type.${content.type}`)}</span>
            <span aria-hidden className="text-faint-foreground">
              ·
            </span>
            <time dateTime={content.createdAt} title={formatDateTime(content.createdAt)}>
              {formatRelativeTime(content.createdAt)}
            </time>
            {content.hidden && (
              <span className="inline-flex items-center gap-1 rounded-full bg-coral/12 px-2 py-px font-bold text-coral">{t('content.hiddenBadge')}</span>
            )}
          </p>

          <h3 className="mt-1 font-bold leading-snug">
            <Link to={href} viewTransition className="rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70">
              {content.type === 'ANSWER' ? t('content.answerTo', { title: content.title }) : content.title}
            </Link>
          </h3>
          {content.excerpt && <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">{content.excerpt}</p>}

          <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <UserAvatar user={content.author} size="sm" className="size-5 text-[0.5rem]" />
              <span className="truncate font-semibold text-soft-foreground">
                <bdi>{content.author.fullName}</bdi>
              </span>
              <span dir="ltr" className="truncate font-mono">
                @{content.author.username}
              </span>
            </span>
            <span className="font-mono">
              {content.type === 'PROJECT'
                ? t('content.stars', { count: content.score, formatted: formatNumber(content.score) })
                : t('content.score', { count: content.score, formatted: formatNumber(content.score) })}
            </span>
            {content.replies !== null && (
              <span className="font-mono">{t('content.replies', { count: content.replies, formatted: formatNumber(content.replies) })}</span>
            )}
          </p>

          {content.hidden && (
            <p className="mt-3 rounded-xl border border-coral/20 bg-coral/6 px-3.5 py-2.5 text-[0.8125rem] text-soft-foreground">
              <strong className="font-semibold text-coral">
                {content.hiddenAt ? t('content.hiddenSince', { when: formatRelativeTime(content.hiddenAt) }) : t('content.hiddenBadge')}
              </strong>
              {content.hiddenReason && (
                <>
                  {' · '}
                  {t('content.reason', { reason: content.hiddenReason })}
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-border-subtle pt-3 sm:ps-[3.375rem]">
        <Link to={href} viewTransition className={cn(action, 'text-soft-foreground hover:bg-foreground/6 hover:text-foreground')}>
          <ArrowUpRight aria-hidden className="size-4 rtl:-scale-x-100" />
          {t('content.actions.view')}
        </Link>
        {content.hidden ? (
          <button type="button" disabled={busy} onClick={() => onDecide('unhide', content)} className={cn(action, 'text-jade hover:bg-jade/10')}>
            <Eye aria-hidden className="size-4" />
            {t('content.actions.unhide')}
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => onDecide('hide', content)} className={cn(action, 'text-gold hover:bg-gold/10')}>
            <EyeOff aria-hidden className="size-4" />
            {t('content.actions.hide')}
          </button>
        )}
        <button type="button" disabled={busy} onClick={() => onDecide('delete', content)} className={cn(action, 'ms-auto text-coral hover:bg-coral/10')}>
          <Trash2 aria-hidden className="size-4" />
          {t('content.actions.delete')}
        </button>
      </div>
    </li>
  );
}
