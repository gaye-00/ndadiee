import { CircleCheck, Eye, Lock, LockOpen, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { wasEdited } from './forumUtils';
import TopicTag from './TopicTag';
import Chip from '@/components/shared/Chip';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import UserAvatar from '@/components/shared/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { forumHome } from '@/hooks/useForumFilters';
import { useChangeQuestionStatus, useDeleteQuestion } from '@/hooks/useQuestions';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { Question } from '@/types/question.types';
import { countryFlag, formatCount, formatDate, formatRelativeTime } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

const menuItem =
  'flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-soft-foreground outline-none select-none focus:bg-accent focus:text-foreground data-disabled:cursor-not-allowed data-disabled:opacity-50';

/**
 * L'en-tête d'un sujet, comme celui d'un article de dev.to : l'auteur et la date de publication (et de
 * modification), le statut (résolu, avec un lien vers la solution ; fermé), le titre, les tags, puis les vues, le
 * temps de lecture. Pour l'auteur (ou un modérateur) : modifier, fermer ou rouvrir, supprimer.
 */
export default function TopicHeader({ topic }: { topic: Question }) {
  const { t } = useTranslation('forum');
  const { user, canModerate } = useAuth();
  const author = topic.author;
  const manage = author.id === user?.id || canModerate;
  const solved = topic.acceptedAnswerId !== null;

  return (
    <header className="px-5 pt-6 sm:px-8 sm:pt-8 lg:px-12 lg:pt-10">
      <div className="flex items-center gap-3">
        <Link to={paths.profile(author.username)} viewTransition tabIndex={-1} aria-hidden className="shrink-0 rounded-full">
          <UserAvatar user={author} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5">
            <Link
              to={paths.profile(author.username)}
              viewTransition
              dir="auto"
              className={cn('truncate rounded-sm font-bold text-foreground hover:underline', focusRing)}
            >
              {author.fullName}
            </Link>
            {author.country && <span className="shrink-0 text-sm leading-none">{countryFlag(author.country)}</span>}
            {author.reputation !== null && (
              <span title={t('topic.reputation', { count: author.reputation })} className="shrink-0 font-mono text-xs text-muted-foreground">
                · {formatCount(author.reputation)} {t('topic.reputationShort')}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
            {t('topic.posted')} <time dateTime={topic.createdAt}>{formatDate(topic.createdAt)}</time>
            {wasEdited(topic) && (
              <>
                {' · '}
                <time dateTime={topic.updatedAt} title={formatDate(topic.updatedAt)}>
                  {t('topic.edited', { when: formatRelativeTime(topic.updatedAt) })}
                </time>
              </>
            )}
          </p>
        </div>
        {manage && <OwnerActions topic={topic} />}
      </div>

      {(solved || topic.status === 'CLOSED') && (
        <div className="mt-5 flex flex-wrap gap-2">
          {solved && (
            <a href={`#answer-${topic.acceptedAnswerId}`} className={cn('rounded-full', focusRing)}>
              <Chip tone="jade" className="h-7 px-3 transition-colors hover:bg-jade/18">
                <CircleCheck aria-hidden className="size-3.5" />
                {t('topic.solved')}
              </Chip>
            </a>
          )}
          {topic.status === 'CLOSED' && (
            <Chip className="h-7 px-3">
              <Lock aria-hidden className="size-3.5" />
              {t('topic.closed')}
            </Chip>
          )}
        </div>
      )}

      <h1 id="topic-title" dir="auto" className="mt-5 font-display text-h2 text-foreground">
        {topic.title}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {topic.tags.length > 0 && (
          <ul className="-ms-2 flex flex-wrap gap-0.5">
            {topic.tags.map((tag) => (
              <li key={tag.slug}>
                <TopicTag tag={tag} />
              </li>
            ))}
          </ul>
        )}
        <p className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Eye aria-hidden className="size-3.5" />
            {t('card.views', { count: topic.viewCount })}
          </span>
          <span>{t('card.reading', { count: topic.readingMinutes })}</span>
        </p>
      </div>
    </header>
  );
}

/**
 * Pour l'auteur du sujet (ou un modérateur) : le modifier, le fermer (plus de nouvelles réponses) ou le rouvrir, le
 * supprimer. Un sujet qui a déjà reçu des réponses ne se supprime que par un modérateur : l'action le dit.
 */
function OwnerActions({ topic }: { topic: Question }) {
  const { t } = useTranslation('forum');
  const navigate = useNavigate();
  const { canModerate } = useAuth();
  const status = useChangeQuestionStatus(topic);
  const remove = useDeleteQuestion();
  const [confirming, setConfirming] = useState(false);
  const closed = topic.status === 'CLOSED';
  const deleteBlocked = topic.answerCount > 0 && !canModerate;

  function toggleStatus() {
    status.mutate(closed ? 'OPEN' : 'CLOSED', {
      onSuccess: (updated) => toast.success(t(updated.status === 'CLOSED' ? 'topic.closedToast' : 'topic.reopenedToast')),
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Link
        to={paths.editTopic(topic.slug)}
        viewTransition
        onPointerEnter={() => prefetch(pages.editTopic)}
        onFocus={() => prefetch(pages.editTopic)}
        className={cn(
          'hidden h-9 items-center gap-2 rounded-xl border border-border-strong px-3 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5 sm:inline-flex',
          focusRing,
        )}
      >
        <Pencil aria-hidden className="size-3.5" />
        {t('menu.edit')}
      </Link>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-label={t('topic.manage')}
          className={cn(
            'grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/7 hover:text-foreground data-[state=open]:bg-foreground/7',
            focusRing,
          )}
        >
          <MoreHorizontal aria-hidden className="size-4.5" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            collisionPadding={12}
            className="z-50 w-64 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-float outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <DropdownMenu.Item className={cn(menuItem, 'sm:hidden')} onSelect={() => void navigate(paths.editTopic(topic.slug), { viewTransition: true })}>
              <Pencil aria-hidden className="size-4 text-muted-foreground" />
              {t('menu.edit')}
            </DropdownMenu.Item>
            <DropdownMenu.Item className={menuItem} onSelect={toggleStatus} disabled={status.isPending}>
              {closed ? <LockOpen aria-hidden className="size-4 text-muted-foreground" /> : <Lock aria-hidden className="size-4 text-muted-foreground" />}
              <span className="min-w-0">
                <span className="block">{t(closed ? 'topic.reopen' : 'topic.close')}</span>
                <span className="block text-xs text-muted-foreground">{t(closed ? 'topic.reopenHint' : 'topic.closeHint')}</span>
              </span>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="mx-1 my-1 h-px bg-border-subtle" />
            <DropdownMenu.Item className={cn(menuItem, 'h-auto min-h-9 py-2 text-coral focus:text-coral')} disabled={deleteBlocked} onSelect={() => setConfirming(true)}>
              <Trash2 aria-hidden className="size-4 shrink-0" />
              <span className="min-w-0">
                <span className="block">{t('menu.delete')}</span>
                {deleteBlocked && <span className="block text-xs text-muted-foreground">{t('topic.deleteBlocked')}</span>}
              </span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('topic.deleteTitle')}
        description={t('topic.deleteText', { title: topic.title })}
        confirmLabel={t('menu.delete')}
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(topic, {
            onSuccess: () => {
              setConfirming(false);
              toast.success(t('topic.deleted'));
              void navigate(forumHome(), { replace: true, viewTransition: true });
            },
          })
        }
      />
    </div>
  );
}
