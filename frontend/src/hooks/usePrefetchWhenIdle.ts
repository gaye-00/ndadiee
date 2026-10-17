import { useEffect } from 'react';
import { prefetchWhenIdle } from '@/lib/prefetch';
import type { PageImport } from '@/router/pages';

/** Une fois l'écran affiché et le navigateur au repos, télécharge le code des pages de la navigation. */
export function usePrefetchWhenIdle(items: ReadonlyArray<{ preload: PageImport }>): void {
  useEffect(() => prefetchWhenIdle(items.map((item) => item.preload)), [items]);
}
