import { useSyncExternalStore } from 'react';
import { useDataSaverStore } from '@/store/useDataSaverStore';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function subscribe(onChange: () => void): () => void {
  reducedMotion.addEventListener('change', onChange);
  return () => reducedMotion.removeEventListener('change', onChange);
}

/**
 * true quand les animations doivent être coupées : réglage du système ou mode économie de données,
 * comme en CSS (styles/effects.css). Pour les animations en JavaScript, par exemple celles de Motion
 * dans les composants 21st.dev : <MotionConfig reducedMotion={useReducedMotion() ? 'always' : 'never'}>.
 */
export function useReducedMotion(): boolean {
  const prefersReducedMotion = useSyncExternalStore(subscribe, () => reducedMotion.matches);
  const dataSaver = useDataSaverStore((s) => s.enabled);
  return prefersReducedMotion || dataSaver;
}
