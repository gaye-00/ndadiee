import { useDataSaverStore } from '@/store/useDataSaverStore';

type Load = () => Promise<unknown>;

/** Préchargement seulement sur une bonne connexion, et jamais en mode économie de données. */
function canPrefetch(): boolean {
  if (useDataSaverStore.getState().enabled) {
    return false;
  }
  const connection = navigator.connection;
  return !connection?.saveData && connection?.effectiveType !== 'slow-2g' && connection?.effectiveType !== '2g';
}

/**
 * Télécharge à l'avance le code d'une page, au survol ou au focus de son lien : la navigation
 * est ensuite instantanée. Sans effet si la page est déjà chargée.
 */
export function prefetch(load: Load): void {
  if (canPrefetch()) {
    // Un échec ici n'est pas grave : la vraie navigation réessaiera, et affichera l'erreur s'il le faut
    load().catch(() => undefined);
  }
}

/**
 * Précharge des pages quand le navigateur n'a plus rien à faire, après le premier affichage.
 *
 * @returns de quoi annuler, si le composant disparaît avant
 */
export function prefetchWhenIdle(loads: Load[]): () => void {
  const run = () => loads.forEach(prefetch);

  // Safari n'a pas encore requestIdleCallback
  if (typeof window.requestIdleCallback !== 'function') {
    const timer = setTimeout(run, 2000);
    return () => clearTimeout(timer);
  }
  const handle = window.requestIdleCallback(run, { timeout: 5000 });
  return () => window.cancelIdleCallback(handle);
}
