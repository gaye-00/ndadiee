import { create } from 'zustand';
import { palette } from '@/config/palette';
import { storage, type ThemePreference } from '@/utils/storage';

export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  /** Choix de l'utilisateur */
  preference: ThemePreference;
  /** Thème réellement affiché */
  resolved: ResolvedTheme;
  setTheme: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    return systemDark.matches ? 'dark' : 'light';
  }
  return preference;
}

// Les couleurs sont des variables CSS redéfinies sous `.dark` (voir styles/tokens.css)
function applyTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  // Transitions coupées le temps du changement : chaque élément animerait sinon ses couleurs à son rythme
  root.classList.add('theme-switching');
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.themeColor[theme]);
  // Force le calcul des nouveaux styles avant de rendre les transitions
  void window.getComputedStyle(root).color;
  window.setTimeout(() => root.classList.remove('theme-switching'), 0);
}

// Sans choix enregistré, on suit le système (même règle que le script de index.html)
const initialPreference = storage.getTheme() ?? 'system';

export const useThemeStore = create<ThemeState>()((set, get) => ({
  preference: initialPreference,
  resolved: resolve(initialPreference),

  setTheme: (preference) => {
    storage.setTheme(preference);
    const resolved = resolve(preference);
    applyTheme(resolved);
    set({ preference, resolved });
  },

  toggleTheme: () => get().setTheme(get().resolved === 'dark' ? 'light' : 'dark'),
}));

// Réglage de l'appareil modifié pendant la visite : on suit, sauf choix explicite de l'utilisateur
systemDark.addEventListener('change', () => {
  if (useThemeStore.getState().preference === 'system') {
    const resolved = resolve('system');
    applyTheme(resolved);
    useThemeStore.setState({ resolved });
  }
});
