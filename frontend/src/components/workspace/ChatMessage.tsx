import { Trash2 } from 'lucide-react';
import { m } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { columnOf } from './board';
import ChatEventCard from './ChatEventCard';
import { useWorkspaceContext } from './workspaceContext';
import { ease, focusRing, threadStyle } from './workspaceStyles';
import InlineMarkdown from '@/components/projects/InlineMarkdown';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import UserAvatar from '@/components/shared/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { currentLanguage } from '@/i18n';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTaskDialog } from '@/hooks/useTaskDialog';
import { useDeleteMessage, useWorkspaceTasks } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { UserSummary } from '@/types/user.types';
import type { TeamMessage } from '@/types/workspace.types';
import { formatDateTime } from '@/utils/formatters';

// Une adresse (sans la ponctuation qui la suit), ou une tâche « #38 » (pas une ancre d'adresse, pas « C#4 »)
const TOKENS = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"»]|(?<![\w&/#])#\d{1,6}\b)/g;

interface ChatMessageProps {
  message: TeamMessage;
  /** Suit un message de la même personne : ni avatar ni nom */
  grouped: boolean;
  /** L'équipe : les mentions la nomment */
  people: readonly UserSummary[];
}

/**
 * Message de la discussion d'équipe. Design 3E.
 *
 * Le texte de l'équipe tel qu'elle l'écrit : le gras, le `code`, les mentions (@ama_owusu, vers son profil), les adresses
 * (dans un nouvel onglet) et les tâches (« #38 », qui ouvrent leur fiche, teintées de leur colonne). Jamais de HTML.
 * Un message en route est pâle ; son auteur, ou qui gère l'équipe, peut le supprimer. Un rendez-vous s'y lit comme une
 * carte.
 */
export default function ChatMessage({ message, grouped, people }: ChatMessageProps) {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const deleteMessage = useDeleteMessage(slug);
  const [confirming, setConfirming] = useState(false);
  const pending = message.id < 0;
  const mine = message.author.id === user?.id;
  const canDelete = !pending && (mine || workspace.canManage);
  const time = new Intl.DateTimeFormat([...currentLanguage().intl], { hour: '2-digit', minute: '2-digit' }).format(new Date(message.createdAt));

  return (
    <m.li
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
      className={cn('group/message relative flex gap-2.5 rounded-xl px-2 transition-colors hover:bg-foreground/[0.03]', grouped ? 'py-0.5' : 'mt-1.5 py-1.5')}
    >
      {grouped ? (
        <time
          dateTime={message.createdAt}
          title={formatDateTime(message.createdAt)}
          className="w-8 shrink-0 pt-0.5 text-end font-mono text-[0.625rem] leading-5 text-faint-foreground opacity-0 transition-opacity group-hover/message:opacity-100 group-focus-within/message:opacity-100"
        >
          {time}
        </time>
      ) : (
        <Link to={paths.profile(message.author.username)} viewTransition tabIndex={-1} aria-hidden className="shrink-0 pt-0.5">
          <UserAvatar user={message.author} size="sm" className="size-8 text-[0.625rem]" />
        </Link>
      )}

      <div className="min-w-0 flex-1">
        {!grouped && (
          <p className="flex items-baseline gap-2">
            <Link
              to={paths.profile(message.author.username)}
              viewTransition
              className={cn('truncate rounded-sm text-[0.8125rem] font-bold text-foreground hover:underline hover:underline-offset-4', focusRing)}
            >
              {message.author.fullName}
            </Link>
            <time dateTime={message.createdAt} title={formatDateTime(message.createdAt)} className="shrink-0 font-mono text-[0.625rem] text-faint-foreground">
              {pending ? t('chat.sending') : time}
            </time>
          </p>
        )}
        {message.kind === 'EVENT' ? (
          <div className="mt-1.5">
            <ChatEventCard message={message} variant="inline" />
          </div>
        ) : (
          <p dir="auto" className={cn('text-start text-[0.875rem] leading-relaxed break-words whitespace-pre-wrap text-soft-foreground', pending && 'opacity-55')}>
            <ChatText text={message.body} people={people} />
          </p>
        )}
      </div>

      {canDelete && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={t('chat.delete')}
          className={cn(
            'absolute end-1.5 top-1 grid size-7 place-items-center rounded-lg bg-popover text-muted-foreground opacity-0 shadow-sm ring-1 ring-border transition-opacity hover:text-coral',
            'group-hover/message:opacity-100 focus-visible:opacity-100 pointer-coarse:hidden',
            focusRing,
          )}
        >
          <Trash2 aria-hidden className="size-3.5" />
        </button>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={message.kind === 'EVENT' ? t('chat.deleteEventTitle') : t('chat.deleteTitle')}
        description={t('chat.deleteText')}
        confirmLabel={t('chat.delete')}
        destructive
        onConfirm={() => {
          setConfirming(false);
          deleteMessage.mutate(message.id);
        }}
      />
    </m.li>
  );
}

/** Le texte d'un message : adresses et tâches reconnues, le reste en Markdown court (gras, code, mentions) */
function ChatText({ text, people }: { text: string; people: readonly UserSummary[] }) {
  return (
    <>
      {text.split(TOKENS).map((part, index): ReactNode => {
        if (index % 2 === 0) {
          return <InlineMarkdown key={index} text={part} people={people} />;
        }
        if (part.startsWith('#')) {
          return <TaskRef key={index} number={Number(part.slice(1))} />;
        }
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            dir="ltr"
            className="rounded-sm font-medium break-all text-gold underline decoration-gold/35 underline-offset-4 hover:decoration-gold"
          >
            {part}
          </a>
        );
      })}
    </>
  );
}

/** « #38 » dans un message : la tâche, teintée de sa colonne, qui ouvre sa fiche ; son titre en infobulle */
export function TaskRef({ number }: { number: number }) {
  const { t } = useTranslation('workspace');
  const { slug } = useWorkspaceContext();
  const { open } = useTaskDialog();
  const tasks = useWorkspaceTasks(slug);
  const task = tasks.data?.find((candidate) => candidate.number === number);
  const column = task ? columnOf(task.status) : null;

  return (
    <button
      type="button"
      onClick={() => open(number)}
      title={task ? `${task.title} · ${t(`columns.${task.status}`)}` : undefined}
      aria-label={task ? t('chat.taskRef', { number, title: task.title, column: t(`columns.${task.status}`) }) : t('chat.taskRefUnknown', { number })}
      style={threadStyle(column?.thread ?? null)}
      className={cn(
        'inline-flex items-baseline gap-1 rounded-md bg-(--thread-text)/10 px-1 font-mono text-[0.8125rem] font-semibold text-(--thread-text) transition-colors hover:bg-(--thread-text)/18',
        focusRing,
      )}
    >
      <span aria-hidden className="size-1.5 self-center rounded-full bg-(--thread)" />#{number}
    </button>
  );
}
