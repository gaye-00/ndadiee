import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEffect, useEffectEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { messagePreview } from './chatFormat';
import UserAvatar from '@/components/shared/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { applyChatEvent, chatKeys } from '@/lib/chatCache';
import { connectChat, disconnectChat, onChatEvent, onChatReconnect } from '@/lib/chatSocket';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import { messageService } from '@/services/message.service';
import type { PageResponse } from '@/types/common.types';
import type { Conversation, Message } from '@/types/message.types';
import type { UserSummary } from '@/types/user.types';

/**
 * Le temps réel de la messagerie, pour toute l'application connectée (monté par AppLayout) : il ouvre le WebSocket,
 * range chaque événement dans le cache (fil, liste, pastille, « écrit… », présence), et signale par une bulle un
 * message reçu ailleurs que dans la messagerie. Après une coupure, il recharge ce qui a pu être manqué.
 */
export default function ChatRealtime() {
  const { isDeveloper, user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const meId = user?.id;

  // Un message reçu hors de la messagerie : une bulle, qui ouvre la conversation (une par conversation, la dernière)
  const announce = useEffectEvent(async (message: Message) => {
    if (window.location.pathname.startsWith(paths.messages)) {
      return;
    }
    const cached =
      qc.getQueryData<Conversation>(chatKeys.conversation(message.conversationId)) ??
      qc.getQueryData<PageResponse<Conversation>>(chatKeys.conversations)?.content.find((item) => item.id === message.conversationId);
    const conversation =
      cached ??
      (await qc
        .fetchQuery({ queryKey: chatKeys.conversation(message.conversationId), queryFn: () => messageService.getConversation(message.conversationId) })
        .catch(() => undefined));
    const sender = conversation?.participant;
    if (!sender) {
      return;
    }
    const open = () => void navigate(paths.conversation(message.conversationId), { viewTransition: true });
    toast.custom(
      (id) => (
        <IncomingMessage
          sender={sender}
          preview={messagePreview(message.body)}
          label={t('shell.messages.newMessage')}
          closeLabel={t('actions.close')}
          onOpen={() => {
            toast.dismiss(id);
            open();
          }}
          onClose={() => toast.dismiss(id)}
        />
      ),
      { id: `chat-${message.conversationId}`, duration: 6000 },
    );
  });

  useEffect(() => {
    if (!isDeveloper || meId === undefined) {
      return undefined;
    }
    connectChat();
    const stopEvents = onChatEvent((event) => {
      const incoming = applyChatEvent(qc, event, meId);
      if (incoming) {
        void announce(incoming);
      }
    });
    const stopReconnect = onChatReconnect(() => void qc.invalidateQueries({ queryKey: chatKeys.all }));
    return () => {
      stopEvents();
      stopReconnect();
      disconnectChat();
    };
  }, [isDeveloper, meId, qc]);

  return null;
}

interface IncomingMessageProps {
  sender: UserSummary;
  preview: string;
  label: string;
  closeLabel: string;
  onOpen: () => void;
  onClose: () => void;
}

function IncomingMessage({ sender, preview, label, closeLabel, onOpen, onClose }: IncomingMessageProps) {
  return (
    <div className="flex w-[22rem] max-w-[calc(100vw-2rem)] items-start gap-1 rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-float">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-xl p-1.5 text-start outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/70"
      >
        <UserAvatar user={sender} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[0.625rem] tracking-wide text-gold uppercase">{label}</span>
          <span className="block truncate text-sm font-bold">
            <bdi>{sender.fullName}</bdi>
          </span>
          {preview && (
            <span dir="auto" className="mt-0.5 line-clamp-2 block text-start text-[0.8125rem] leading-snug text-soft-foreground">
              {preview}
            </span>
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className={cn('grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:bg-foreground/7 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70')}
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </div>
  );
}
