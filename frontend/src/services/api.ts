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
