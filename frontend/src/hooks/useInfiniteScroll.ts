import { useEffect, useRef } from 'react';

/**
 * Défilement infini : renvoie une ref à poser sur un élément « sentinelle » en bas de liste.
 * `onReachEnd` est appelé quand il approche de l'écran.
 *
 * @param enabled false tant qu'il n'y a rien à charger (dernière page atteinte, chargement en cours)
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>(onReachEnd: () => void, enabled: boolean) {
  const sentinelRef = useRef<T | null>(null);
  const onReachEndRef = useRef(onReachEnd);

  useEffect(() => {
    onReachEndRef.current = onReachEnd;
  }, [onReachEnd]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onReachEndRef.current();
        }
      },
      // Déclenche un peu avant le bas de page : la suite est là quand on y arrive
      { rootMargin: '400px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled]);

  return sentinelRef;
}
