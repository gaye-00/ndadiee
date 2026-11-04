import { create } from 'zustand';

/** État de la connexion WebSocket de la messagerie. */
export type ChatConnection = 'idle' | 'connecting' | 'connected' | 'reconnecting';

// « En train d'écrire » s'efface seul s'il n'est pas renouvelé (l'autre a fermé l'onglet, perdu le réseau)
const TYPING_TTL = 6000;
const typingTimers = new Map<number, ReturnType<typeof setTimeout>>();

interface ChatState {
  connection: ChatConnection;
  /** Présence annoncée par le WebSocket depuis le chargement : elle remplace celle des réponses de l'API */
  presence: Record<number, boolean>;
  /** Conversations où l'autre membre écrit en ce moment */
  typing: Record<number, true>;

  setConnection: (connection: ChatConnection) => void;
  setPresence: (userId: number, online: boolean) => void;
  setTyping: (conversationId: number, typing: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  connection: 'idle',
  presence: {},
  typing: {},

  setConnection: (connection) => set({ connection }),

  setPresence: (userId, online) => set((state) => ({ presence: { ...state.presence, [userId]: online } })),

  setTyping: (conversationId, typing) => {
    clearTimeout(typingTimers.get(conversationId));
    typingTimers.delete(conversationId);
    if (typing) {
      typingTimers.set(
        conversationId,
        setTimeout(() => useChatStore.getState().setTyping(conversationId, false), TYPING_TTL),
      );
    }
    set((state) => {
      if (Boolean(state.typing[conversationId]) === typing) {
        return state;
      }
      const next = { ...state.typing };
      if (typing) {
        next[conversationId] = true;
      } else {
        delete next[conversationId];
      }
      return { typing: next };
    });
  },

  reset: () => {
    typingTimers.forEach((timer) => clearTimeout(timer));
    typingTimers.clear();
    set({ connection: 'idle', presence: {}, typing: {} });
  },
}));

/** Le membre est-il en ligne ? L'annonce du WebSocket, sinon ce que disait l'API. */
export function useIsOnline(userId: number | undefined, fallback: boolean): boolean {
  return useChatStore((state) => (userId === undefined ? false : (state.presence[userId] ?? fallback)));
}

/** L'autre membre écrit-il dans cette conversation ? */
export function useIsTyping(conversationId: number): boolean {
  return useChatStore((state) => Boolean(state.typing[conversationId]));
}
