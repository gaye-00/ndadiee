import { Check, CheckCheck } from 'lucide-react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatListTime, messagePreview } from './chatFormat';
import PresenceAvatar from './PresenceAvatar';
import { TypingText } from './TypingIndicator';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import { useIsOnline, useIsTyping } from '@/store/useChatStore';
import type { Conversation } from '@/types/message.types';
import { formatDateTime } from '@/utils/formatters';

// La conversation ouverte : sa pastille glisse d'une ligne à l'autre
const slide = { type: 'spring', stiffness: 420, damping: 36 } as const;

/**
 * Une conversation de la liste : l'autre membre (en ligne ?), le dernier message ou « écrit… », l'heure, les non-lus.
 * Le dernier message est en gras tant qu'il n'est pas lu ; le sien porte son état (envoyé, vu).
 */
export default function ConversationItem({ conversation, active }: { conversation: Conversation; active: boolean }) {
  const { t } = useTranslation('messages');
  const { user } = useAuth();
  const participant = conversation.participant;
  const online = useIsOnline(participant?.id, conversation.online);
  const typing = useIsTyping(conversation.id);
  const last = conversation.lastMessage;
  const mine = last !== null && last.senderId === user?.id;
  const unread = conversation.unreadCount;
  const seen = mine && last !== null && (conversation.participantLastReadMessageId ?? 0) >= last.id;
  const when = conversation.lastMessageAt ?? conversation.createdAt;

  if (!participant) {
    return null;
  }

  const preview = !last
    ? t('list.noMessage')
    : last.deleted
      ? t('list.deleted')
      : mine
        ? t('list.you', { text: messagePreview(last.body) })
        : messagePreview(last.body);

  return (
    <Link
      to={paths.conversation(conversation.id)}
      viewTransition
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group/item relative flex items-center gap-3 rounded-2xl px-3 py-3 outline-none transition-colors duration-200',
        'focus-visible:ring-2 focus-visible:ring-ring/70',
        active ? 'text-foreground' : 'hover:bg-foreground/5',
      )}
    >
      {active && (
        <>
          <m.span layoutId="conversation-current" transition={slide} className="absolute inset-0 rounded-2xl bg-foreground/8 ring-1 ring-foreground/6 ring-inset" />
          <m.span
            layoutId="conversation-thread"
            transition={slide}
            aria-hidden
            className="absolute start-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full bg-linear-to-b from-kente-gold via-kente-coral to-kente-jade"
          />
        </>
      )}
      <PresenceAvatar user={participant} online={online} size="lg" className="relative" />
      <span className="relative min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('truncate text-[0.9375rem]', unread > 0 ? 'font-extrabold' : 'font-bold')}>
            <bdi>{participant.fullName}</bdi>
          </span>
          <time
            dateTime={when}
            title={formatDateTime(when)}
            className={cn('shrink-0 font-mono text-[0.6875rem]', unread > 0 ? 'font-bold text-coral' : 'text-faint-foreground')}
          >
            {formatListTime(when)}
          </time>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          {typing ? (
            <TypingText className="text-[0.8125rem]" />
          ) : (
            <>
              {mine && !last?.deleted && (
                <span className="shrink-0 text-faint-foreground">
                  {seen ? <CheckCheck aria-label={t('message.seen')} className="size-3.5 text-jade" /> : <Check aria-label={t('message.sent')} className="size-3.5" />}
                </span>
              )}
              <span
                dir="auto"
                className={cn(
                  'min-w-0 flex-1 truncate text-start text-[0.8125rem]',
                  unread > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  (!last || last.deleted) && 'italic',
                )}
              >
                {preview}
              </span>
            </>
          )}
          {unread > 0 && (
            <span className="ms-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-kente-coral px-1.5 font-mono text-[0.6875rem] leading-none font-bold text-white">
              <span aria-hidden>{unread > 99 ? '99+' : unread}</span>
              <span className="sr-only">{t('list.unreadCount', { count: unread })}</span>
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}
