import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { patchSignature } from '@/lib/diff';
import type { PullRequestFile } from '@/types/review.types';
import { storage } from '@/utils/storage';

// Les fichiers vus de chaque PR, en mémoire, et qui les écoute : l'arbre et le diff restent d'accord
const cache = new Map<string, Record<string, string>>();
const listeners = new Map<string, Set<() => void>>();

function read(key: string): Record<string, string> {
  let viewed = cache.get(key);
  if (!viewed) {
    viewed = storage.getViewedFiles(key);
    cache.set(key, viewed);
  }
  return viewed;
}

function write(key: string, viewed: Record<string, string>) {
  cache.set(key, viewed);
  storage.setViewedFiles(key, viewed);
  listeners.get(key)?.forEach((listener) => listener());
}

/**
 * Les fichiers qu'on a marqués « vus » dans une revue, gardés sur l'appareil. Un fichier vu dont le diff a changé
 * depuis (nouveau commit) redevient à voir, comme sur GitHub.
 */
export function useViewedFiles(slug: string, number: number) {
  const key = `${slug}#${number}`;
  const subscribe = useCallback(
    (listener: () => void) => {
      const set = listeners.get(key) ?? new Set();
      set.add(listener);
      listeners.set(key, set);
      return () => {
        set.delete(listener);
      };
    },
    [key],
  );
  const viewed = useSyncExternalStore(subscribe, () => read(key));

  const isViewed = useCallback((file: PullRequestFile) => viewed[file.path] === patchSignature(file), [viewed]);

  const setViewed = useCallback(
    (file: PullRequestFile, value: boolean) => {
      const next = { ...read(key) };
      if (value) {
        next[file.path] = patchSignature(file);
      } else {
        delete next[file.path];
      }
      write(key, next);
    },
    [key],
  );

  const countViewed = useCallback((files: PullRequestFile[]) => files.filter(isViewed).length, [isViewed]);

  return useMemo(() => ({ isViewed, setViewed, countViewed }), [isViewed, setViewed, countViewed]);
}
