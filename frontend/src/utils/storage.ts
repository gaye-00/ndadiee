import type { UserResponse } from '@/types/auth.types';

const ACCESS_TOKEN_KEY = 'ndadiee_access_token';
const REFRESH_TOKEN_KEY = 'ndadiee_refresh_token';
const USER_KEY = 'ndadiee_user';
// Même clé que le script anti-flash de index.html
const THEME_KEY = 'ndadiee_theme';

export type Theme = 'light' | 'dark';

export const storage = {
  // ── Tokens ──────────────────────────────────────────────
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),

  setTokens: (access: string, refresh: string): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },

  // ── Utilisateur ─────────────────────────────────────────
  getUser: (): UserResponse | null => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as UserResponse) : null;
    } catch {
      return null;
    }
  },
  setUser: (user: UserResponse): void => localStorage.setItem(USER_KEY, JSON.stringify(user)),

  // ── Nettoyage global (logout) ────────────────────────────
  clearAll: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  // ── Thème ────────────────────────────────────────────────
  getTheme: (): Theme | null => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  },
  setTheme: (theme: Theme): void => localStorage.setItem(THEME_KEY, theme),
};
