import { create } from 'zustand';
import { storage, type Theme } from '@/utils/storage';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Sans choix enregistré, on suit le réglage du système (même règle que le script de index.html)
function initialTheme(): Theme {
  return storage.getTheme() ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

// Les couleurs sont des variables CSS redéfinies sous `.dark` (voir index.css)
function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: initialTheme(),

  setTheme: (theme) => {
    storage.setTheme(theme);
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}));
