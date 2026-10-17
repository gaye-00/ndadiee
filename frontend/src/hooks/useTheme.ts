import { useThemeStore } from '@/store/useThemeStore';
import type { ThemePreference } from '@/utils/storage';

const THEMES: ThemePreference[] = ['light', 'dark', 'system'];

/**
 * Thème de l'interface, avec la même forme que useTheme() de next-themes : un composant shadcn ou
 * 21st.dev qui importe `useTheme` depuis "next-themes" fonctionne en important celui-ci à la place.
 */
export function useTheme() {
  const theme = useThemeStore((s) => s.preference);
  const resolvedTheme = useThemeStore((s) => s.resolved);
  const setTheme = useThemeStore((s) => s.setTheme);

  return { theme, resolvedTheme, setTheme, themes: THEMES };
}
