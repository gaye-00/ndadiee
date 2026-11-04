import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import type { PageResponse } from '@/types/common.types';
import type { ChatEvent, Conversation, Message, MessageSlice } from '@/types/message.types';

/**
 * Le cache de la messagerie (React Query), tenu à jour par les événements du WebSocket : un message arrive, il se
 * range dans son fil et remonte sa conversation en tête de liste, sans requête de plus.
 */

/** Clés des requêtes de la messagerie, toutes sous « chat » : une reconnexion les recharge d'un coup. */
export const chatKeys = {
  all: ['chat'] as const,
  conversations: ['chat', 'conversations'] as const,
  conversation: (id: number) => ['chat', 'conversation', id] as const,
  unread: ['chat', 'unread'] as const,
  messages: (id: number) => ['chat', 'messages', id] as const,
};

export type MessagePages = InfiniteData<MessageSlice, number | undefined>;

// La conversation ouverte à l'écran : ses messages reçus ne comptent pas comme non lus
let activeConversationId: number | null = null;

export function setActiveConversation(id: number | null): void {
  activeConversationId = id;
}

export function isConversationOnScreen(id: number): boolean {
  return activeConversationId === id && document.visibilityState === 'visible';
}

function activity(conversation: Conversation): number {
  return Date.parse(conversation.lastMessageAt ?? conversation.createdAt);
}

/** La plus récemment active d'abord, comme le serveur. */
export function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => activity(b) - activity(a) || b.id - a.id);
}

/**
 * Applique un changement à une conversation, dans la liste comme dans sa fiche.
 *
 * @returns false si la liste chargée ne la contient pas (nouvelle conversation) : il faut la relire
 */
export function updateConversation(qc: QueryClient, id: number, update: (conversation: Conversation) => Conversation): boolean {
  let present = false;
  qc.setQueryData<PageResponse<Conversation>>(chatKeys.conversations, (page) => {
    if (!page) {
      return page;
    }
    const content = page.content.map((conversation) => {
      if (conversation.id !== id) {
        return conversation;
      }
      present = true;
      return update(conversation);
    });
    return present ? { ...page, content: sortConversations(content) } : page;
  });
  qc.setQueryData<Conversation>(chatKeys.conversation(id), (conversation) => (conversation ? update(conversation) : conversation));
  return present || qc.getQueryData(chatKeys.conversations) === undefined;
}

/** Le dernier message de la conversation, et ce qu'il change aux non-lus. */
export function withLastMessage(conversation: Conversation, message: Message, meId: number): Conversation {
  const last = conversation.lastMessage;
  if (last && last.id > message.id) {
    return conversation;
  }
  const isNew = !last || last.id < message.id;
  const mine = message.senderId === meId;
  return {
    ...conversation,
    lastMessage: message,
    lastMessageAt: isNew ? message.createdAt : conversation.lastMessageAt,
    unreadCount: mine ? 0 : isNew && !isConversationOnScreen(conversation.id) ? conversation.unreadCount + 1 : conversation.unreadCount,
    lastReadMessageId: mine ? message.id : conversation.lastReadMessageId,
    // Écrire, c'est avoir lu ce qui précède (le serveur le note ainsi) : ma réponse reçue, mes messages sont « Vu »
    participantLastReadMessageId: mine
      ? conversation.participantLastReadMessageId
      : Math.max(conversation.participantLastReadMessageId ?? 0, message.id),
  };
}

/** Range un message du serveur dans son fil (s'il est chargé) : à sa place s'il y est déjà, sinon dans l'ordre. */
export function upsertMessage(qc: QueryClient, message: Message): void {
  qc.setQueryData<MessagePages>(chatKeys.messages(message.conversationId), (data) => {
    if (!data) {
      return data;
    }
    let found = false;
    const pages = data.pages.map((page) => {
      const index = page.messages.findIndex((candidate) => candidate.id === message.id);
      if (index < 0) {
        return page;
      }
      found = true;
      const messages = [...page.messages];
      messages[index] = message;
      return { ...page, messages };
    });
    if (found) {
      return { ...data, pages };
    }
    const [newest, ...older] = data.pages;
    if (!newest) {
      return data;
    }
    // Plus ancien que toute la tranche la plus récente : il sera lu en remontant le fil
    const oldestLoaded = newest.messages[0];
    if (oldestLoaded && message.id < oldestLoaded.id && older.length > 0) {
      return data;
    }
    const messages = [...newest.messages, message].sort((a, b) => a.id - b.id);
    return { ...data, pages: [{ ...newest, messages }, ...older] };
  });
}

/** Tous les messages chargés d'un fil, du plus ancien au plus récent. */
export function flattenPages(data: MessagePages | undefined): Message[] {
  if (!data) {
    return [];
  }
  return data.pages.toReversed().flatMap((page) => page.messages);
}

/**
 * Applique un événement du WebSocket au cache.
 *
 * @returns le message reçu s'il mérite d'être signalé (d'un autre membre, hors de la conversation à l'écran)
 */
export function applyChatEvent(qc: QueryClient, event: ChatEvent, meId: number): Message | null {
  switch (event.type) {
    case 'MESSAGE_CREATED': {
      const { message } = event;
      const mine = message.senderId === meId;
      const onScreen = isConversationOnScreen(message.conversationId);
      upsertMessage(qc, message);
      const present = updateConversation(qc, message.conversationId, (conversation) => withLastMessage(conversation, message, meId));
      // Absente de la liste (nouvelle conversation), ou une relecture de la liste partie avant ce message est en route :
      // la liste est relue, pour ne pas revenir à l'état d'avant
      if (!present || qc.isFetching({ queryKey: chatKeys.conversations, exact: true }) > 0) {
        void qc.invalidateQueries({ queryKey: chatKeys.conversations, exact: true });
      }
      if (mine) {
        return null;
      }
      useChatStore.getState().setTyping(message.conversationId, false);
      if (!onScreen) {
        void qc.invalidateQueries({ queryKey: chatKeys.unread });
      }
      return onScreen ? null : message;
    }

    case 'MESSAGE_UPDATED': {
      const { message } = event;
      upsertMessage(qc, message);
      updateConversation(qc, message.conversationId, (conversation) =>
        conversation.lastMessage?.id === message.id ? { ...conversation, lastMessage: message } : conversation,
      );
      // Un message non lu supprimé ne compte plus
      if (message.deleted && message.senderId !== meId) {
        void qc.invalidateQueries({ queryKey: chatKeys.unread });
        void qc.invalidateQueries({ queryKey: chatKeys.conversations });
      }
      return null;
    }

    case 'CONVERSATION_READ': {
      const { conversationId, userId, lastReadMessageId } = event;
      if (userId === meId) {
        // Lu dans un autre onglet : la pastille s'éteint ici aussi
        updateConversation(qc, conversationId, (conversation) => ({
          ...conversation,
          unreadCount: 0,
          lastReadMessageId: Math.max(conversation.lastReadMessageId ?? 0, lastReadMessageId),
        }));
        void qc.invalidateQueries({ queryKey: chatKeys.unread });
      } else {
        updateConversation(qc, conversationId, (conversation) => ({
          ...conversation,
          participantLastReadMessageId: Math.max(conversation.participantLastReadMessageId ?? 0, lastReadMessageId),
        }));
      }
      return null;
    }

    case 'TYPING':
      if (event.userId !== meId) {
        useChatStore.getState().setTyping(event.conversationId, event.typing);
      }
      return null;

    case 'PRESENCE':
      useChatStore.getState().setPresence(event.userId, event.online);
      return null;
  }
}
