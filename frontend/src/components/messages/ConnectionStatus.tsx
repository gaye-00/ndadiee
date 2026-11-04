import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/useChatStore';

// La première connexion prend quelques dizaines de millisecondes : « Connexion… » n'apparaît que si elle traîne
const GRACE = 1500;

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

type State = 'live' | 'connecting' | 'reconnecting' | 'offline';

const TONES: Record<State, { text: string; dot: string }> = {
  live: { text: 'text-jade', dot: 'live-dot size-1.5' },
  connecting: { text: 'text-gold', dot: 'size-1.5 rounded-full bg-kente-gold animate-pulse-dot' },
  reconnecting: { text: 'text-gold', dot: 'size-1.5 rounded-full bg-kente-gold animate-pulse-dot' },
  offline: { text: 'text-coral', dot: 'size-1.5 rounded-full bg-kente-coral' },
};

/**
 * L'état du temps réel : « En direct », « Reconnexion… », « Hors ligne ». Pendant une coupure, les messages
 * s'envoient toujours (par l'API) et le fil se relit de lui-même.
 *
 * @param quiet n'affiche rien tant que tout va bien (l'en-tête du fil)
 */
export default function ConnectionStatus({ quiet = false, className }: { quiet?: boolean; className?: string }) {
  const { t } = useTranslation('messages');
  const connection = useChatStore((state) => state.connection);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine);
  const [graceOver, setGraceOver] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setGraceOver(true), GRACE);
    return () => clearTimeout(timer);
  }, []);

  const state: State = !online ? 'offline' : connection === 'connected' ? 'live' : connection === 'reconnecting' ? 'reconnecting' : 'connecting';
  // Le temps de la première connexion, la place reste réservée (rien ne bouge quand « En direct » arrive)
  const waiting = !graceOver && state === 'connecting';
  if (quiet && (state === 'live' || waiting)) {
    return null;
  }

  return (
    <p aria-live="polite" className={cn('inline-flex items-center gap-1.5 font-mono text-[0.6875rem]', waiting && 'invisible', TONES[state].text, className)}>
      <span aria-hidden className={TONES[state].dot} />
      {t(`status.${state}`)}
    </p>
  );
}
