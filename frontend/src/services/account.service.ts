import { api } from './api';
import type {
  AccountDeletionPreview,
  AccountDeletionRequest,
  AuthResponse,
  ChangePasswordRequest,
  PendingVerification,
} from '@/types/auth.types';
import type { ApiResponse } from '@/types/common.types';

const BASE = '/v1/users/me';

/** La sécurité du compte connecté : son mot de passe, sa suppression (AccountController.java). */
export const accountService = {
  /** Change le mot de passe : les autres sessions se ferment, celle-ci reçoit de nouveaux jetons */
  changePassword: (body: ChangePasswordRequest) =>
    api.put<ApiResponse<AuthResponse>>(`${BASE}/password`, body).then((r) => r.data.data),

  /** Ce que la suppression ferait : le délai, la preuve demandée, le sort de chaque projet porté */
  deletionPreview: () => api.get<ApiResponse<AccountDeletionPreview>>(`${BASE}/deletion`).then((r) => r.data.data),

  /** Un code pour confirmer la suppression d'un compte sans mot de passe */
  sendDeletionCode: () => api.post<ApiResponse<PendingVerification>>(`${BASE}/deletion/code`).then((r) => r.data.data),

  /** Programme la suppression du compte : la date où il sera effacé */
  requestDeletion: (body: AccountDeletionRequest) =>
    api.post<ApiResponse<{ scheduledAt: string }>>(`${BASE}/deletion`, body).then((r) => r.data.data),
};
