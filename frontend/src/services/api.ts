import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import i18n from '@/i18n';
import { useAuthStore } from '@/store/useAuthStore';
import type { AuthResponse } from '@/types/auth.types';
import type { ApiResponse } from '@/types/common.types';
import { getApiError } from '@/utils/apiError';
import { API_BASE_URL } from '@/utils/constants';
import { storage } from '@/utils/storage';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = storage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Langue de l'interface : le backend pourra s'en servir pour traduire ses messages
  config.headers['Accept-Language'] = i18n.resolvedLanguage ?? i18n.language;
  return config;
});

// Sur ces endpoints, un 401 veut dire « identifiants refusés », pas « session expirée »
const AUTH_ENDPOINTS = ['/v1/auth/login', '/v1/auth/register', '/v1/auth/refresh'];

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

// Un seul rafraîchissement à la fois : les requêtes qui échouent pendant ce temps attendent la même promesse
let refreshInProgress: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = storage.getRefreshToken();
  if (!refreshToken) {
    throw new Error('Aucun refresh token');
  }
  // axios « nu », sans nos intercepteurs : un 401 ici ne doit pas relancer un rafraîchissement
  const { data } = await axios.post<ApiResponse<AuthResponse>>(`${API_BASE_URL}/v1/auth/refresh`, { refreshToken });
  const session = data.data;
  // Le backend renvoie une nouvelle paire : l'ancien refresh token est remplacé
  useAuthStore.getState().setAuth(session.user, session.accessToken, session.refreshToken);
  return session.accessToken;
}

// Secondes avant son expiration où un access token est déjà « trop vieux » pour ouvrir une connexion durable
const TOKEN_MARGIN_SECONDS = 60;

/** Date d'expiration (en secondes) écrite dans un JWT, sans en vérifier la signature : seul le serveur le fait. */
function expiresAt(token: string): number | null {
  try {
    const payload = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!payload) {
      return null;
    }
    const claims = JSON.parse(atob(payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '='))) as { exp?: number };
    return typeof claims.exp === 'number' ? claims.exp : null;
  } catch {
    return null;
  }
}

/**
 * Un access token valable encore au moins une minute, pour une connexion qui ne passe pas par axios (le WebSocket de la
 * messagerie). Renouvelle la session s'il le faut, avec le même rafraîchissement unique que les requêtes.
 *
 * @param force renouveler même si le jeton semble valable (le serveur vient de le refuser)
 * @returns null sans session, ou si elle n'a pas pu être renouvelée. Refusée par le serveur, la session est fermée ;
 *   injoignable (réseau coupé), elle reste ouverte : la prochaine tentative la renouvellera.
 */
export async function getFreshAccessToken({ force = false }: { force?: boolean } = {}): Promise<string | null> {
  const token = storage.getAccessToken();
  const expiry = token ? expiresAt(token) : null;
  if (token && !force && expiry !== null && expiry - Date.now() / 1000 > TOKEN_MARGIN_SECONDS) {
    return token;
  }
  if (!storage.getRefreshToken()) {
    return null;
  }
  try {
    refreshInProgress ??= refreshAccessToken().finally(() => {
      refreshInProgress = null;
    });
    return await refreshInProgress;
  } catch (refreshError) {
    const status = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
    if (status === 401 || status === 403) {
      if (getApiError(refreshError)?.errorCode === 'ACCOUNT_BLOCKED') {
        toast.error(i18n.t('auth.sessionBlocked'));
      }
      useAuthStore.getState().logout();
    }
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableRequest | undefined;
    const expiredSession =
      error.response?.status === 401 &&
      original !== undefined &&
      !original._retry &&
      // Un visiteur n'a pas de session à renouveler : son 401 remonte tel quel, sans « déconnexion » qui
      // viderait le cache des requêtes de la page (et laisserait ses sections en chargement)
      storage.getRefreshToken() !== null &&
      !AUTH_ENDPOINTS.some((endpoint) => original.url?.includes(endpoint));

    if (!expiredSession) {
      return Promise.reject(error);
    }

    original._retry = true;

    let accessToken: string;
    try {
      refreshInProgress ??= refreshAccessToken().finally(() => {
        refreshInProgress = null;
      });
      accessToken = await refreshInProgress;
    } catch (refreshError) {
      // Session impossible à renouveler. Pas de redirection forcée : la plupart des pages sont
      // publiques, et ProtectedRoute renvoie vers /login si la page courante exige d'être connecté.
      // Un compte suspendu entre-temps par l'équipe l'apprend ici (le motif l'attend à la connexion).
      if (getApiError(refreshError)?.errorCode === 'ACCOUNT_BLOCKED') {
        toast.error(i18n.t('auth.sessionBlocked'));
      }
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    // On rejoue la requête d'origine. Si elle échoue encore, c'est son erreur à elle qui remonte.
    original.headers.Authorization = `Bearer ${accessToken}`;
    return api(original);
  },
);
