import { api } from './api';
import type { ApiResponse, PageResponse, PaginationParams } from '@/types/common.types';
import type { Conversation, Message, MessageSlice } from '@/types/message.types';

const BASE = '/v1/conversations';

/**
 * Messages privés. Tout ce qui change passe par ici ; le WebSocket (lib/chatSocket.ts) annonce ensuite chaque
 * changement aux deux membres.
 */
export const messageService = {
  /** Mes conversations, la plus récemment active d'abord */
  getConversations: (params?: PaginationParams) =>
    api.get<ApiResponse<PageResponse<Conversation>>>(BASE, { params }).then((r) => r.data.data),

  /** Conversations avec des messages non lus : la pastille de la messagerie */
  countUnread: () => api.get<ApiResponse<number>>(`${BASE}/unread-count`).then((r) => r.data.data),

  /** La conversation avec ce membre : celle qui existe déjà, ou une nouvelle */
  start: (username: string) => api.post<ApiResponse<Conversation>>(BASE, { username }).then((r) => r.data.data),

  getConversation: (id: number) => api.get<ApiResponse<Conversation>>(`${BASE}/${id}`).then((r) => r.data.data),

  /** Les derniers messages ; avec before, ceux d'avant ce message */
  getMessages: (id: number, before?: number, size = 30) =>
    api.get<ApiResponse<MessageSlice>>(`${BASE}/${id}/messages`, { params: { before, size } }).then((r) => r.data.data),

  /** Un clientId déjà envoyé rend le message enregistré, sans doublon : un nouvel essai est sans risque */
  send: (id: number, body: string, clientId: string) =>
    api.post<ApiResponse<Message>>(`${BASE}/${id}/messages`, { body, clientId }).then((r) => r.data.data),

  edit: (id: number, messageId: number, body: string) =>
    api.patch<ApiResponse<Message>>(`${BASE}/${id}/messages/${messageId}`, { body }).then((r) => r.data.data),

  remove: (id: number, messageId: number) => api.delete(`${BASE}/${id}/messages/${messageId}`).then(() => undefined),

  /** @returns le dernier message lu ; null si la conversation est vide */
  markRead: (id: number) => api.put<ApiResponse<number | null>>(`${BASE}/${id}/read`).then((r) => r.data.data),
};
