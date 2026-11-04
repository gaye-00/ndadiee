import { useSyncExternalStore } from 'react';

// Une liste par requête, partagée par tous les composants qui la suivent
const lists = new Map<string, MediaQueryList>();

function listOf(query: string): MediaQueryList {
  let list = lists.get(query);
  if (!list) {
    list = window.matchMedia(query);
    lists.set(query, list);
  }
  return list;
}

/** true tant que la requête média est vraie (« (min-width: 1280px) ») ; suit les changements de taille d'écran. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = listOf(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => listOf(query).matches,
  );
}
