import { m } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import MessageComposer from './MessageComposer';
import MessageList from './MessageList';
import ThreadHeader from './ThreadHeader';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useAuth } from '@/hooks/useAuth';
import { useConversation, useMarkConversationRead, useMessages } from '@/hooks/useMessages';
import { setActiveConversation } from '@/lib/chatCache';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Message } from '@/types/message.types';

/**
 * La conversation ouverte : son en-tête, le fil, le champ d'écriture. Sur téléphone, elle couvre l'écran comme une
 * application de messagerie ; la flèche ramène à la liste.
 *
 * Tant qu'elle est à l'écran (onglet visible), ce qui arrive est lu : l'autre membre voit « Vu », la pastille s'éteint.
 */
export default function MessageThread({ conversationId }: { conversationId: number }) {
  const { t } = useTranslation('messages');
  const { user } = useAuth();
  const me = user?.id;
  const { data: conversation, isPending, isError } = useConversation(conversationId);
  const { messages } = useMessages(conversationId);
  const markRead = useMarkConversationRead(conversationId);
  const [editing, setEditing] = useState<Message | null>(null);

  // Ses messages reçus ne comptent pas comme non lus tant qu'elle est à l'écran
  useEffect(() => {
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId]);

  // Lire ce qui est arrivé : à l'ouverture, à chaque message reçu, au retour sur l'onglet
  const lastIncoming = messages.findLast((message) => message.senderId !== me)?.id ?? 0;
  const unread = conversation ? conversation.unreadCount > 0 || lastIncoming > (conversation.lastReadMessageId ?? 0) : false;
  const markedUpTo = useRef(-1);
  const { mutate: markAsRead } = markRead;
  useEffect(() => {
    if (!unread) {
      return undefined;
    }
    const mark = () => {
      if (document.visibilityState === 'visible' && markedUpTo.current < lastIncoming) {
        markedUpTo.current = lastIncoming;
        markAsRead();
      }
    };
    mark();
    document.addEventListener('visibilitychange', mark);
    return () => document.removeEventListener('visibilitychange', mark);
  }, [unread, lastIncoming, markAsRead]);

  // ↑ dans le champ vide : son dernier message
  function editLast() {
    const last = messages.findLast((message) => message.senderId === me && !message.deleted);
    if (last) {
      setEditing(last);
    }
  }

  return (
    <m.section
      aria-label={conversation?.participant ? t('thread.label', { name: conversation.participant.fullName }) : undefined}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn('flex min-h-0 min-w-0 flex-col bg-background', 'max-md:fixed max-md:inset-0 max-md:z-[60]', 'md:bg-transparent')}
    >
      {isPending ? (
        <div className="grid flex-1 place-items-center">
          <PulsatingDots label={t('thread.loading')} />
        </div>
      ) : isError || !conversation ? (
        <div className="grid flex-1 place-items-center p-6">
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <span aria-hidden className="size-12 rounded-2xl bg-kente-conic opacity-80" />
            <p className="font-display text-h5">{t('thread.notFound')}</p>
            <p className="text-sm text-muted-foreground">{t('thread.notFoundHint')}</p>
            <Link
              to={paths.messages}
              viewTransition
              className="mt-2 inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-bold text-background outline-none hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t('thread.backToList')}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ThreadHeader conversation={conversation} />
          <MessageList conversation={conversation} editingId={editing?.id ?? null} onEdit={setEditing} />
          <MessageComposer conversation={conversation} editing={editing} onCancelEdit={() => setEditing(null)} onEditLast={editLast} />
        </>
      )}
    </m.section>
  );
}
