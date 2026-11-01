import { create } from 'zustand';
import type { ThreadMessage } from '@/types/message.types';

/**
 * Les messages partis mais pas encore confirmés par le serveur, ou dont l'envoi a échoué, conversation par
 * conversation. Gardés hors du cache des requêtes : un rechargement du fil ne les efface pas, et un envoi en échec
 * attend qu'on le relance (avec le même clientId : le serveur ne le doublera pas).
 */
interface OutboxState {
  pending: Record<number, ThreadMessage[]>;
  put: (message: ThreadMessage) => void;
  update: (conversationId: number, clientId: string, patch: Partial<ThreadMessage>) => void;
  remove: (conversationId: number, clientId: string) => void;
}

const EMPTY: ThreadMessage[] = [];

export const useOutboxStore = create<OutboxState>()((set) => ({
  pending: {},

  put: (message) =>
    set((state) => ({
      pending: {
        ...state.pending,
        [message.conversationId]: [
          ...(state.pending[message.conversationId] ?? EMPTY).filter((item) => item.clientId !== message.clientId),
          message,
        ],
      },
    })),

  update: (conversationId, clientId, patch) =>
    set((state) => ({
      pending: {
        ...state.pending,
        [conversationId]: (state.pending[conversationId] ?? EMPTY).map((item) => (item.clientId === clientId ? { ...item, ...patch } : item)),
      },
    })),

  remove: (conversationId, clientId) =>
    set((state) => ({
      pending: {
        ...state.pending,
        [conversationId]: (state.pending[conversationId] ?? EMPTY).filter((item) => item.clientId !== clientId),
      },
    })),
}));

/** Les envois en cours ou en échec d'une conversation. */
export function useOutbox(conversationId: number): ThreadMessage[] {
  return useOutboxStore((state) => state.pending[conversationId] ?? EMPTY);
}
