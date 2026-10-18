import type { UserResponse } from '@/types/auth.types';

const ACCESS_TOKEN_KEY = 'ndadiee_access_token';
const REFRESH_TOKEN_KEY = 'ndadiee_refresh_token';
const USER_KEY = 'ndadiee_user';
// Préférences : mêmes clés que le script de index.html, qui les applique avant le premier rendu
const THEME_KEY = 'ndadiee_theme';
const LANGUAGE_KEY = 'ndadiee_lang';
const DATA_SAVER_KEY = 'ndadiee_data_saver';
const CORD_PULLED_KEY = 'ndadiee_cord_pulled';
const GITHUB_LOGIN_KEY = 'ndadiee_github_login';
const ROLES_PAUSED_KEY = 'ndadiee_roles_paused';
// Brouillons du forum : ndadiee_draft_topic, ndadiee_draft_answer-12…
const DRAFT_PREFIX = 'ndadiee_draft_';

/** Choix de thème ; « system » suit le réglage clair/sombre de l'appareil. */
export type ThemePreference = 'light' | 'dark' | 'system';

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

  // ── Nettoyage global (logout) : les préférences restent ──
  clearAll: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Les brouillons appartiennent au compte : le suivant sur cet appareil ne les voit pas
    Object.keys(localStorage)
      .filter((key) => key.startsWith(DRAFT_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  },

  // ── Brouillons du forum (hooks/useDraft.ts) ──────────────
  getDraft: <T>(key: string): T | null => {
    try {
      const raw = localStorage.getItem(DRAFT_PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  setDraft: (key: string, value: unknown): void => {
    try {
      localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(value));
    } catch {
      // Stockage plein ou refusé (navigation privée) : le brouillon n'est simplement pas gardé
    }
  },
  clearDraft: (key: string): void => localStorage.removeItem(DRAFT_PREFIX + key),

  // ── Thème ────────────────────────────────────────────────
  getTheme: (): ThemePreference | null => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : null;
  },
  setTheme: (theme: ThemePreference): void => localStorage.setItem(THEME_KEY, theme),

  // ── Langue ───────────────────────────────────────────────
  getLanguage: (): string | null => localStorage.getItem(LANGUAGE_KEY),
  setLanguage: (code: string): void => localStorage.setItem(LANGUAGE_KEY, code),

  // ── Mode économie de données ─────────────────────────────
  /** null : pas de choix enregistré, on suit le réglage du navigateur */
  getDataSaver: (): boolean | null => {
    const saved = localStorage.getItem(DATA_SAVER_KEY);
    return saved === 'on' ? true : saved === 'off' ? false : null;
  },
  setDataSaver: (enabled: boolean): void => localStorage.setItem(DATA_SAVER_KEY, enabled ? 'on' : 'off'),

  // ── Corde du thème ───────────────────────────────────────
  /** La corde a déjà été tirée une fois : l'indication « Tire la corde » ne s'affiche plus */
  getCordPulled: (): boolean => localStorage.getItem(CORD_PULLED_KEY) === 'yes',
  setCordPulled: (): void => localStorage.setItem(CORD_PULLED_KEY, 'yes'),

  // ── Pseudo GitHub tissé sur l'accueil ─────────────────────
  /** Le visiteur retrouve son année à sa prochaine visite */
  getGithubLogin: (): string | null => localStorage.getItem(GITHUB_LOGIN_KEY),
  setGithubLogin: (login: string): void => localStorage.setItem(GITHUB_LOGIN_KEY, login),
  clearGithubLogin: (): void => localStorage.removeItem(GITHUB_LOGIN_KEY),

  // ── Bande des rôles de l'accueil ──────────────────────────
  /** Le visiteur l'a mise en pause : elle reste immobile à sa prochaine visite */
  getRolesPaused: (): boolean => localStorage.getItem(ROLES_PAUSED_KEY) === 'yes',
  setRolesPaused: (paused: boolean): void => {
    if (paused) {
      localStorage.setItem(ROLES_PAUSED_KEY, 'yes');
    } else {
      localStorage.removeItem(ROLES_PAUSED_KEY);
    }
  },
};
