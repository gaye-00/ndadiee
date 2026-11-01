import type { UserSummary } from './user.types';

/** Un message privé (MessageResponse.java). */
export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  /** null pour un message supprimé */
  body: string | null;
  /** Identifiant choisi par l'application qui l'a envoyé : elle y reconnaît son message */
  clientId: string | null;
  deleted: boolean;
  editedAt: string | null;
  createdAt: string;
}

/** Un message du fil : celui du serveur, ou un envoi pas encore confirmé (identifiant négatif). */
export interface ThreadMessage extends Message {
  status?: 'sending' | 'failed';
}

/** Une conversation, vue par le membre connecté (ConversationResponse.java). */
export interface Conversation {
  id: number;
  /** L'autre membre */
  participant: UserSummary | null;
  /** Connecté quand la conversation a été lue ; ensuite, les événements PRESENCE font foi */
  online: boolean;
  lastMessage: Message | null;
  unreadCount: number;
  /** Le dernier message que j'ai lu */
  lastReadMessageId: number | null;
  /** Le dernier message que l'autre a lu : mes messages jusque-là sont « Vu » */
  participantLastReadMessageId: number | null;
  lastMessageAt: string | null;
  createdAt: string;
}

/** Une tranche du fil, du plus ancien au plus récent (MessageSliceResponse.java). */
export interface MessageSlice {
  messages: Message[];
  /** Des messages plus anciens restent à lire */
  hasMore: boolean;
}

/** Ce que le WebSocket pousse sur /user/queue/chat (ChatEventResponse.java). */
export type ChatEvent =
  | { type: 'MESSAGE_CREATED' | 'MESSAGE_UPDATED'; conversationId: number; message: Message }
  | { type: 'CONVERSATION_READ'; conversationId: number; userId: number; lastReadMessageId: number }
  | { type: 'TYPING'; conversationId: number; userId: number; typing: boolean }
  | { type: 'PRESENCE'; userId: number; online: boolean };
