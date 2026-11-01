import { Client, ReconnectionTimeMode, type IMessage } from '@stomp/stompjs';
import { getFreshAccessToken } from '@/services/api';
import { useChatStore } from '@/store/useChatStore';
import type { ChatEvent } from '@/types/message.types';
import { API_BASE_URL } from '@/utils/constants';

/**
 * Le WebSocket de la messagerie : STOMP sur /api/ws, une seule connexion pour toute l'application.
 *
 * - Le JWT voyage dans la trame CONNECT ; il est renouvelé avant chaque (re)connexion s'il expire bientôt, ou si le
 *   serveur vient de le refuser.
 * - Coupée (réseau mobile, veille, serveur redémarré), la connexion revient seule, à intervalles croissants. À son
 *   retour, les écouteurs de reconnexion rechargent ce qui a pu être manqué.
 * - Les messages s'envoient par l'API REST (validés, enregistrés, sans doublon) ; ici ne passent que les événements
 *   reçus et le signal « en train d'écrire ».
 */

const QUEUE = '/user/queue/chat';

type Listener = (event: ChatEvent) => void;

const listeners = new Set<Listener>();
const reconnectListeners = new Set<() => void>();

let client: Client | null = null;
let connectedOnce = false;
// Le serveur a refusé le jeton : la prochaine tentative en demande un neuf
let tokenRejected = false;

/** ws://hôte/api/ws, d'après l'adresse de l'API (https donne wss) */
function socketUrl(): string {
  const url = new URL(API_BASE_URL, window.location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/$/, '')}/ws`;
  return url.toString();
}

function dispatch(frame: IMessage) {
  let event: ChatEvent;
  try {
    event = JSON.parse(frame.body) as ChatEvent;
  } catch {
    return;
  }
  listeners.forEach((listener) => listener(event));
}

/** Ouvre la connexion (une seule, même appelée plusieurs fois). */
export function connectChat(): void {
  if (client) {
    return;
  }
  const { setConnection } = useChatStore.getState();
  setConnection('connecting');

  const stomp = new Client({
    brokerURL: socketUrl(),
    // Les battements de cœur détectent une connexion morte sans fermeture propre (réseau mobile)
    heartbeatIncoming: 10_000,
    heartbeatOutgoing: 10_000,
    connectionTimeout: 10_000,
    reconnectDelay: 1_000,
    reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
    maxReconnectDelay: 30_000,
    beforeConnect: async (self) => {
      const token = await getFreshAccessToken({ force: tokenRejected });
      tokenRejected = false;
      if (!token) {
        // Pas de session (déconnecté entre-temps) : on n'insiste pas
        await self.deactivate();
        return;
      }
      self.connectHeaders = { Authorization: `Bearer ${token}` };
    },
    onConnect: () => {
      stomp.subscribe(QUEUE, dispatch);
      setConnection('connected');
      if (connectedOnce) {
        reconnectListeners.forEach((listener) => listener());
      }
      connectedOnce = true;
    },
    onStompError: (frame) => {
      if (frame.headers.message?.includes('UNAUTHORIZED')) {
        tokenRejected = true;
      }
    },
    onWebSocketClose: () => {
      if (client === stomp && stomp.active) {
        setConnection('reconnecting');
      }
    },
  });

  client = stomp;
  stomp.activate();
}

/** Ferme la connexion (déconnexion du compte, fermeture de la coquille). */
export function disconnectChat(): void {
  const current = client;
  client = null;
  connectedOnce = false;
  tokenRejected = false;
  void current?.deactivate();
  useChatStore.getState().reset();
}

/** « En train d'écrire » : perdu sans gravité si la connexion n'est pas là. */
export function sendTyping(conversationId: number, typing: boolean): void {
  if (client?.connected) {
    client.publish({ destination: `/app/conversations/${conversationId}/typing`, body: JSON.stringify({ typing }) });
  }
}

/** Écoute les événements reçus. @returns de quoi arrêter d'écouter */
export function onChatEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Écoute les retours de la connexion après une coupure. @returns de quoi arrêter d'écouter */
export function onChatReconnect(listener: () => void): () => void {
  reconnectListeners.add(listener);
  return () => reconnectListeners.delete(listener);
}
