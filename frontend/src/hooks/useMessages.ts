import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { chatKeys, flattenPages, updateConversation, upsertMessage, withLastMessage, sortConversations, type MessagePages } from '@/lib/chatCache';
import { messageService } from '@/services/message.service';
import { useChatStore } from '@/store/useChatStore';
import { useOutboxStore } from '@/store/useOutboxStore';
import type { PageResponse } from '@/types/common.types';
import type { Conversation, Message, ThreadMessage } from '@/types/message.types';
import { getApiErrorMessage } from '@/utils/apiError';

/** Messages par tranche du fil */
const SLICE = 30;
/** Conversations chargées dans la liste */
const INBOX = 50;

/** Sans WebSocket (coupé, en reconnexion), les données se relisent d'elles-mêmes à cet intervalle. */
function useFallbackInterval(interval: number): number | false {
  return useChatStore((state) => (state.connection === 'connected' ? false : interval));
}

/** Un identifiant unique, même hors https (crypto.randomUUID demande une page sécurisée). */
export function newClientId(): string {
  if (typeof crypto.randomUUID === 'function' && window.isSecureContext) {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Mes conversations, la plus récemment active d'abord ; tenues à jour par le WebSocket. */
export function useConversations() {
  const { isDeveloper } = useAuth();
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: () => messageService.getConversations({ size: INBOX }),
    enabled: isDeveloper,
    staleTime: 30_000,
    refetchInterval: useFallbackInterval(20_000),
  });
}

/** Une conversation : tout de suite celle de la liste si elle y est, puis celle du serveur. */
export function useConversation(id: number) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: chatKeys.conversation(id),
    queryFn: () => messageService.getConversation(id),
    initialData: () => qc.getQueryData<PageResponse<Conversation>>(chatKeys.conversations)?.content.find((item) => item.id === id),
    initialDataUpdatedAt: () => qc.getQueryState(chatKeys.conversations)?.dataUpdatedAt,
    staleTime: 30_000,
    refetchInterval: useFallbackInterval(20_000),
  });
}

/** Pastille de la messagerie : les conversations avec des messages non lus. */
export function useUnreadMessageCount() {
  const { isDeveloper } = useAuth();
  return useQuery({
    queryKey: chatKeys.unread,
    queryFn: messageService.countUnread,
    enabled: isDeveloper,
    staleTime: 30_000,
    refetchInterval: useFallbackInterval(60_000),
  });
}

/** Le fil d'une conversation, par tranches ; fetchNextPage remonte vers les plus anciens. */
export function useMessages(conversationId: number) {
  const query = useInfiniteQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: ({ pageParam }) => messageService.getMessages(conversationId, pageParam, SLICE),
    initialPageParam: undefined as number | undefined,
    // La tranche suivante : avant le plus ancien message de la dernière lue
    getNextPageParam: (last) => (last.hasMore ? last.messages[0]?.id : undefined),
    staleTime: 60_000,
    refetchInterval: useFallbackInterval(10_000),
  });
  return { ...query, messages: flattenPages(query.data as MessagePages | undefined) };
}

/** Envoyer, relancer ou abandonner un message. L'envoi s'affiche tout de suite ; les envois partent dans l'ordre. */
export function useSendMessage(conversationId: number) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { put, update, remove } = useOutboxStore.getState();

  const mutation = useMutation({
    mutationFn: (draft: ThreadMessage) => messageService.send(conversationId, draft.body ?? '', draft.clientId ?? ''),
    // Un message après l'autre : le fil garde l'ordre de la frappe
    scope: { id: `chat-send-${conversationId}` },
    onSuccess: (message, draft) => {
      upsertMessage(qc, message);
      if (!updateConversation(qc, conversationId, (conversation) => withLastMessage(conversation, message, message.senderId))) {
        void qc.invalidateQueries({ queryKey: chatKeys.conversations });
      }
      remove(conversationId, draft.clientId ?? '');
    },
    onError: (error, draft) => {
      update(conversationId, draft.clientId ?? '', { status: 'failed' });
      // Refusé par le serveur (membre suspendu…) : il dit pourquoi ; sans réponse, « Non envoyé » suffit
      if (axios.isAxiosError(error) && error.response) {
        toast.error(getApiErrorMessage(error));
      }
    },
    meta: { handlesError: true },
  });

  function send(body: string) {
    if (!user) {
      return;
    }
    const draft: ThreadMessage = {
      id: -Date.now(),
      conversationId,
      senderId: user.id,
      body,
      clientId: newClientId(),
      deleted: false,
      editedAt: null,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    put(draft);
    mutation.mutate(draft);
  }

  function retry(draft: ThreadMessage) {
    update(conversationId, draft.clientId ?? '', { status: 'sending' });
    mutation.mutate({ ...draft, status: 'sending' });
  }

  function discard(draft: ThreadMessage) {
    remove(conversationId, draft.clientId ?? '');
  }

  return { send, retry, discard };
}

/** Corriger son message : affiché tout de suite, annulé si le serveur refuse. */
export function useEditMessage(conversationId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ message, body }: { message: Message; body: string }) => messageService.edit(conversationId, message.id, body),
    onMutate: ({ message, body }) => {
      upsertMessage(qc, { ...message, body, editedAt: new Date().toISOString() });
      return { previous: message };
    },
    onSuccess: (message) => upsertMessage(qc, message),
    onError: (_error, _variables, context) => context && upsertMessage(qc, context.previous),
  });
}

/** Supprimer son message : sa place reste, son texte disparaît pour les deux membres. */
export function useDeleteMessage(conversationId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: Message) => messageService.remove(conversationId, message.id),
    onSuccess: (_result, message) => {
      const deleted = { ...message, body: null, deleted: true };
      upsertMessage(qc, deleted);
      updateConversation(qc, conversationId, (conversation) =>
        conversation.lastMessage?.id === message.id ? { ...conversation, lastMessage: deleted } : conversation,
      );
    },
  });
}

/** Tout est lu : la pastille s'éteint tout de suite, l'autre membre voit « Vu ». */
export function useMarkConversationRead(conversationId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => messageService.markRead(conversationId),
    onMutate: () => updateConversation(qc, conversationId, (conversation) => ({ ...conversation, unreadCount: 0 })),
    onSuccess: (lastRead) => {
      // Une relecture de la liste partie avant la lecture (ouverture de la page) a pu remettre l'ancien compteur : il est
      // remis à zéro, et une relecture encore en route est relancée pour rapporter l'état d'après la lecture
      updateConversation(qc, conversationId, (conversation) => ({
        ...conversation,
        unreadCount: 0,
        lastReadMessageId: lastRead === null ? conversation.lastReadMessageId : Math.max(conversation.lastReadMessageId ?? 0, lastRead),
      }));
      if (qc.isFetching({ queryKey: chatKeys.conversations, exact: true }) > 0) {
        void qc.invalidateQueries({ queryKey: chatKeys.conversations, exact: true });
      }
      void qc.invalidateQueries({ queryKey: chatKeys.unread });
    },
    // Sans gravité : la lecture sera notée à la prochaine visite
    meta: { handlesError: true },
  });
}

/** Ouvrir la conversation avec un membre ; elle rejoint la liste tout de suite. */
export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => messageService.start(username),
    onSuccess: (conversation) => {
      qc.setQueryData(chatKeys.conversation(conversation.id), conversation);
      qc.setQueryData<PageResponse<Conversation>>(chatKeys.conversations, (page) => {
        if (!page || page.content.some((item) => item.id === conversation.id)) {
          return page;
        }
        return { ...page, content: sortConversations([conversation, ...page.content]), totalElements: page.totalElements + 1 };
      });
    },
  });
}
