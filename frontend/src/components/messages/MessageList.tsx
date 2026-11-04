import { ArrowDown, Lock } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatDayLabel, isSameDay } from './chatFormat';
import MessageBubble from './MessageBubble';
import PresenceAvatar from './PresenceAvatar';
import { TypingBubble } from './TypingIndicator';
import ErrorState from '@/components/feedback/ErrorState';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { useDeleteMessage, useMessages, useSendMessage } from '@/hooks/useMessages';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import { useIsOnline, useIsTyping } from '@/store/useChatStore';
import { useOutbox, useOutboxStore } from '@/store/useOutboxStore';
import type { Conversation, Message, ThreadMessage } from '@/types/message.types';

// Deux messages du même auteur à moins de 5 minutes d'écart forment une suite
const GROUP_GAP = 5 * 60_000;
// À moins de cette distance du bas, le fil suit les nouveaux messages
const STICK_DISTANCE = 96;

type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'unread'; key: string }
  | { kind: 'message'; key: string; message: ThreadMessage; groupStart: boolean; groupEnd: boolean };

const keyOf = (message: ThreadMessage) => message.clientId ?? `m${message.id}`;

/** Les lignes du fil : un séparateur à chaque nouveau jour, « Nouveaux messages » avant le premier non lu, des suites. */
function rowsOf(items: ThreadMessage[], firstUnreadKey: string | null): Row[] {
  const rows: Row[] = [];
  const joins = (a: ThreadMessage | undefined, b: ThreadMessage | undefined) =>
    a !== undefined &&
    b !== undefined &&
    a.senderId === b.senderId &&
    isSameDay(a.createdAt, b.createdAt) &&
    Date.parse(b.createdAt) - Date.parse(a.createdAt) < GROUP_GAP &&
    keyOf(b) !== firstUnreadKey;

  items.forEach((message, index) => {
    const previous = items[index - 1];
    const next = items[index + 1];
    if (!previous || !isSameDay(previous.createdAt, message.createdAt)) {
      rows.push({ kind: 'day', key: `day-${keyOf(message)}`, label: formatDayLabel(message.createdAt) });
    }
    if (keyOf(message) === firstUnreadKey) {
      rows.push({ kind: 'unread', key: 'unread' });
    }
    rows.push({ kind: 'message', key: keyOf(message), message, groupStart: !joins(previous, message), groupEnd: !joins(message, next) });
  });
  return rows;
}

interface MessageListProps {
  conversation: Conversation;
  editingId: number | null;
  onEdit: (message: Message) => void;
}

/**
 * Le fil d'une conversation.
 *
 * - À l'ouverture, il se place sur « Nouveaux messages » s'il y en a, sinon tout en bas.
 * - En haut, les messages plus anciens se chargent quand on y arrive, sans faire sauter ce qu'on lit ; au tout début,
 *   l'en-tête de la conversation.
 * - Un message arrive : le fil le suit si on est en bas (ou si c'est le sien) ; sinon, un bouton « ↓ » compte les
 *   nouveaux messages et ramène en bas.
 * - Les envois en cours ou en échec s'affichent à la suite, jusqu'à leur confirmation.
 */
export default function MessageList({ conversation, editingId, onEdit }: MessageListProps) {
  const { t } = useTranslation('messages');
  const { user } = useAuth();
  const me = user?.id ?? 0;
  const reducedMotion = useReducedMotion();
  const participant = conversation.participant;
  const name = participant?.fullName ?? '';
  const online = useIsOnline(participant?.id, conversation.online);
  const typing = useIsTyping(conversation.id);

  const { messages, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(conversation.id);
  const outbox = useOutbox(conversation.id);
  const { retry, discard } = useSendMessage(conversation.id);
  const deleteMessage = useDeleteMessage(conversation.id);
  const [toDelete, setToDelete] = useState<Message | null>(null);

  // Les envois confirmés par le WebSocket avant la réponse de l'API ne s'affichent qu'une fois
  const confirmed = useMemo(() => new Set(messages.map((message) => message.clientId).filter(Boolean)), [messages]);
  const items = useMemo<ThreadMessage[]>(
    () => [...messages, ...outbox.filter((draft) => !confirmed.has(draft.clientId))],
    [messages, outbox, confirmed],
  );

  // Un envoi déjà enregistré (réponse perdue, mais annoncé par le WebSocket) quitte la file d'attente
  useEffect(() => {
    const { remove } = useOutboxStore.getState();
    outbox.filter((draft) => confirmed.has(draft.clientId)).forEach((draft) => remove(conversation.id, draft.clientId ?? ''));
  }, [outbox, confirmed, conversation.id]);

  // « Nouveaux messages » : où en était la lecture à l'ouverture
  const [unreadAfter] = useState(() => (conversation.unreadCount > 0 ? (conversation.lastReadMessageId ?? 0) : null));
  const firstUnread = unreadAfter === null ? undefined : items.find((message) => !message.status && message.senderId !== me && message.id > unreadAfter);
  const rows = useMemo(() => rowsOf(items, firstUnread ? keyOf(firstUnread) : null), [items, firstUnread]);

  // ── Défilement ────────────────────────────────────────────────────────────────
  const scroller = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const snapshot = useRef<{ first?: string; last?: string; height: number; count: number } | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);
  // Le dernier message à l'ouverture : seuls ceux qui arrivent après glissent (pas ceux qu'on charge en remontant) ;
  // null tant que le fil n'est pas placé
  const [newestAtOpen, setNewestAtOpen] = useState<number | null>(null);
  const ready = newestAtOpen !== null;

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element || isPending) {
      return;
    }
    const first = items[0] ? keyOf(items[0]) : undefined;
    const lastItem = items.at(-1);
    const last = lastItem ? keyOf(lastItem) : undefined;
    const previous = snapshot.current;

    if (!previous) {
      // Ouverture : sur « Nouveaux messages » (au tiers de la hauteur), sinon tout en bas
      const divider = element.querySelector<HTMLElement>('[data-unread-divider]');
      element.scrollTop = divider ? divider.offsetTop - element.clientHeight / 3 : element.scrollHeight;
      setNewestAtOpen(messages.at(-1)?.id ?? 0);
    } else if (first !== previous.first && last === previous.last) {
      // Des messages plus anciens au-dessus : ce qu'on lisait reste sous les yeux
      element.scrollTop += element.scrollHeight - previous.height;
    } else if (last !== previous.last && items.length >= previous.count) {
      if (stick.current || lastItem?.senderId === me) {
        element.scrollTo({ top: element.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
      } else {
        setUnseen((count) => count + Math.max(1, items.length - previous.count));
      }
    }
    snapshot.current = { first, last, height: element.scrollHeight, count: items.length };
  }, [items, messages, isPending, me, reducedMotion]);

  // « En train d'écrire » au bas du fil : visible si on y est
  useEffect(() => {
    const element = scroller.current;
    if (typing && element && stick.current) {
      element.scrollTo({ top: element.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [typing, reducedMotion]);

  // En haut du fil, la tranche précédente se charge (une fois le fil placé, pas avant)
  useEffect(() => {
    const target = sentinel.current;
    const root = scroller.current;
    if (!ready || !target || !root || !hasNextPage) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root, rootMargin: '480px 0px 0px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [ready, hasNextPage, isFetchingNextPage, fetchNextPage]);

  function onScroll() {
    const element = scroller.current;
    if (!element) {
      return;
    }
    const bottom = element.scrollHeight - element.scrollTop - element.clientHeight < STICK_DISTANCE;
    stick.current = bottom;
    setAtBottom(bottom);
    if (bottom) {
      setUnseen(0);
    }
  }

  function scrollToBottom() {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
    setUnseen(0);
  }

  const seenUpTo = conversation.participantLastReadMessageId ?? 0;

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scroller} onScroll={onScroll} className="relative h-full overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
        {isPending ? (
          <ThreadSkeleton />
        ) : isError ? (
          <div className="mx-auto max-w-md p-6">
            <ErrorState title={t('thread.error')} onRetry={() => void refetch()} />
          </div>
        ) : (
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end px-3 pt-2 pb-4 sm:px-6">
            <div ref={sentinel} aria-hidden className="h-px" />
            {hasNextPage ? (
              <div className="grid h-14 place-items-center">{isFetchingNextPage && <PulsatingDots size="sm" label={t('thread.loadingOlder')} />}</div>
            ) : (
              participant && (
                <div className="flex flex-col items-center px-4 pt-10 pb-6 text-center">
                  <PresenceAvatar user={participant} online={online} size="lg" avatarClassName="size-18 text-lg" />
                  <p className="mt-3 font-display text-h5">
                    <bdi>{name}</bdi>
                  </p>
                  <p dir="ltr" className="font-mono text-xs text-muted-foreground">
                    @{participant.username}
                  </p>
                  <p className="mt-4 max-w-sm text-sm text-soft-foreground">{t('thread.start', { name })}</p>
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-faint-foreground">
                    <Lock aria-hidden className="size-3" />
                    {t('thread.private')}
                  </p>
                  <Link
                    to={paths.profile(participant.username)}
                    viewTransition
                    className="mt-4 inline-flex h-9 items-center rounded-full border border-border-strong px-4 text-xs font-bold transition-colors hover:bg-foreground/5 outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                  >
                    {t('thread.profile')}
                  </Link>
                </div>
              )
            )}

            <ol role="log" aria-live="polite" aria-relevant="additions" aria-label={t('thread.label', { name })} className="flex flex-col">
              {rows.map((row) => {
                if (row.kind === 'day') {
                  return (
                    <li key={row.key} className="pointer-events-none sticky top-2 z-[1] mt-5 mb-2 flex justify-center first:mt-1">
                      <span className="rounded-full border border-border-subtle bg-surface-raised/95 px-3 py-1 font-mono text-[0.6875rem] text-muted-foreground shadow-[0_6px_16px_-10px_var(--float-shadow)] backdrop-blur-xl saver:bg-surface-raised">
                        {row.label}
                      </span>
                    </li>
                  );
                }
                if (row.kind === 'unread') {
                  return (
                    <li key={row.key} data-unread-divider className="my-4 flex items-center gap-3 font-mono text-[0.6875rem] font-semibold tracking-wide text-coral uppercase">
                      <span aria-hidden className="h-px flex-1 bg-coral/30" />
                      {t('thread.newMessages')}
                      <span aria-hidden className="h-px flex-1 bg-coral/30" />
                    </li>
                  );
                }
                const { message } = row;
                const mine = message.senderId === me;
                return (
                  <MessageBubble
                    key={row.key}
                    message={message}
                    mine={mine}
                    author={mine ? t('message.you') : name}
                    groupStart={row.groupStart}
                    groupEnd={row.groupEnd}
                    seen={mine && !message.status && message.id <= seenUpTo}
                    fresh={newestAtOpen !== null && (message.status !== undefined || message.id > newestAtOpen)}
                    editing={editingId === message.id}
                    onEdit={() => onEdit(message)}
                    onDelete={() => setToDelete(message)}
                    onRetry={() => retry(message)}
                    onDiscard={() => discard(message)}
                  />
                );
              })}
              <AnimatePresence>{typing && <TypingBubble key="typing" name={name} />}</AnimatePresence>
            </ol>
          </div>
        )}
      </div>

      {/* Revenir aux derniers messages, avec le nombre de ceux arrivés entre-temps */}
      <AnimatePresence>
        {!atBottom && !isPending && (
          <m.button
            type="button"
            onClick={scrollToBottom}
            aria-label={unseen > 0 ? t('thread.unseen', { count: unseen }) : t('thread.jumpToLatest')}
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 460, damping: 30 }}
            className="absolute end-4 bottom-4 z-10 grid size-11 place-items-center rounded-full border border-border bg-popover text-foreground shadow-float outline-none hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring/70 sm:end-6"
          >
            <ArrowDown aria-hidden className="size-5" />
            {unseen > 0 && (
              <span className="absolute -top-1.5 -end-1 grid h-5 min-w-5 place-items-center rounded-full bg-kente-coral px-1 font-mono text-[0.625rem] font-bold text-white ring-2 ring-background">
                {unseen > 99 ? '99+' : unseen}
              </span>
            )}
          </m.button>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t('message.deleteTitle')}
        description={t('message.deleteDescription')}
        confirmLabel={t('message.deleteConfirm')}
        destructive
        pending={deleteMessage.isPending}
        onConfirm={() => toDelete && deleteMessage.mutate(toDelete, { onSettled: () => setToDelete(null) })}
      />
    </div>
  );
}

/** Le fil pendant son chargement : des bulles fantômes, de part et d'autre. */
function ThreadSkeleton() {
  const shapes = [
    { mine: false, width: 'w-52' },
    { mine: false, width: 'w-36' },
    { mine: true, width: 'w-60' },
    { mine: false, width: 'w-44' },
    { mine: true, width: 'w-32' },
    { mine: true, width: 'w-48' },
  ];
  return (
    <div aria-hidden className="mx-auto flex h-full w-full max-w-3xl flex-col justify-end gap-2 px-3 pb-4 sm:px-6">
      {shapes.map((shape, index) => (
        <div key={index} className={cn('flex', shape.mine ? 'justify-end' : 'justify-start')}>
          <div className={cn('skeleton-shimmer h-10 rounded-[1.25rem]', shape.width)} />
        </div>
      ))}
    </div>
  );
}
