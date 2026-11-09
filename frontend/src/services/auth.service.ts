import { api } from './api';
import type {
  AuthResponse,
  LoginRequest,
  OAuthAuthorizationRequest,
  OAuthLoginRequest,
  OAuthProviderId,
  RegisterRequest,
  UserResponse,
  UsernameAvailability,
} from '@/types/auth.types';
import type { ApiResponse } from '@/types/common.types';

const BASE = '/v1/auth';

export const authService = {
  register: (body: RegisterRequest) =>
    api.post<ApiResponse<AuthResponse>>(`${BASE}/register`, body).then((r) => r.data.data),

  login: (body: LoginRequest) =>
    api.post<ApiResponse<AuthResponse>>(`${BASE}/login`, body).then((r) => r.data.data),

  // Le renouvellement du jeton est géré par l'intercepteur de api.ts

  /** Ce nom d'utilisateur est-il libre ? Sinon, quelques variantes libres. */
  checkUsername: (username: string) =>
    api
      .get<ApiResponse<UsernameAvailability>>(`${BASE}/username-availability`, { params: { username } })
      .then((r) => r.data.data),

  me: () => api.get<ApiResponse<UserResponse>>(`${BASE}/me`).then((r) => r.data.data),

  /** Les fournisseurs de connexion configurés sur le serveur (« github », « google ») */
  oauthProviders: () => api.get<ApiResponse<string[]>>(`${BASE}/oauth/providers`).then((r) => r.data.data),

  /** L'adresse du fournisseur où envoyer le membre */
  oauthAuthorization: (provider: OAuthProviderId, body: OAuthAuthorizationRequest) =>
    api
      .post<ApiResponse<{ authorizationUrl: string }>>(`${BASE}/oauth/${provider}/authorization`, body)
      .then((r) => r.data.data.authorizationUrl),

  /** De retour du fournisseur : son code contre une session (le compte est créé au besoin) */
  oauthLogin: ({ provider, body }: { provider: OAuthProviderId; body: OAuthLoginRequest }) =>
    api.post<ApiResponse<AuthResponse>>(`${BASE}/oauth/${provider}/login`, body).then((r) => r.data.data),
};
