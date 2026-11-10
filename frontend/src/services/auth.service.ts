import { api } from './api';
import type {
  AuthResponse,
  LoginRequest,
  OAuthAuthorizationRequest,
  OAuthLoginRequest,
  OAuthProviderId,
  PendingVerification,
  RegisterRequest,
  ResetPasswordRequest,
  UserResponse,
  UsernameAvailability,
  VerifyEmailRequest,
} from '@/types/auth.types';
import type { ApiResponse } from '@/types/common.types';

const BASE = '/v1/auth';

export const authService = {
  /** Crée le compte ; il ne s'ouvre qu'avec le code envoyé par e-mail (verifyEmail) */
  register: (body: RegisterRequest) =>
    api.post<ApiResponse<PendingVerification>>(`${BASE}/register`, body).then((r) => r.data.data),

  /** Le code reçu par e-mail : l'adresse est confirmée, la session s'ouvre */
  verifyEmail: (body: VerifyEmailRequest) =>
    api.post<ApiResponse<AuthResponse>>(`${BASE}/verify-email`, body).then((r) => r.data.data),

  /** Un nouveau code pour une inscription en attente */
  resendVerification: (email: string) =>
    api.post<ApiResponse<PendingVerification>>(`${BASE}/verify-email/resend`, { email }).then((r) => r.data.data),

  /** Mot de passe oublié : un code part à l'adresse, si un compte l'utilise (même réponse sinon) */
  forgotPassword: (email: string) =>
    api.post<ApiResponse<PendingVerification>>(`${BASE}/password/forgot`, { email }).then((r) => r.data.data),

  /** Le code reçu et le nouveau mot de passe : la session s'ouvre */
  resetPassword: (body: ResetPasswordRequest) =>
    api.post<ApiResponse<AuthResponse>>(`${BASE}/password/reset`, body).then((r) => r.data.data),

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
