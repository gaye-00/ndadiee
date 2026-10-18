import { api } from './api';
import type {
  AdminAction,
  AdminActionFilters,
  AdminContent,
  AdminContentFilters,
  AdminOverview,
  AdminUser,
  AdminUserFilters,
  ModeratedContent,
} from '@/types/admin.types';
import type { ApiResponse, PageResponse } from '@/types/common.types';
import type { Role } from '@/types/user.types';

const BASE = '/v1/admin';

/** Le back-office : réservé aux comptes d'administration, refusé (403) à tous les autres. */
export const adminService = {
  getOverview: () => api.get<ApiResponse<AdminOverview>>(`${BASE}/overview`).then((r) => r.data.data),

  // ── Comptes ──
  getUsers: (params: AdminUserFilters) =>
    api.get<ApiResponse<PageResponse<AdminUser>>>(`${BASE}/users`, { params }).then((r) => r.data.data),

  /** Plus de connexion ni de session ; le motif est montré au titulaire quand il essaie de se connecter. */
  blockUser: (id: number, reason: string) =>
    api.post<ApiResponse<AdminUser>>(`${BASE}/users/${id}/block`, { reason }).then((r) => r.data.data),

  unblockUser: (id: number) => api.post<ApiResponse<AdminUser>>(`${BASE}/users/${id}/unblock`).then((r) => r.data.data),

  /** USER ou MODERATOR : le rôle ADMIN ne s'attribue pas */
  changeRole: (id: number, role: Role) =>
    api.patch<ApiResponse<AdminUser>>(`${BASE}/users/${id}/role`, { role }).then((r) => r.data.data),

  // ── Contenus ──
  getContent: (params: AdminContentFilters) =>
    api.get<ApiResponse<PageResponse<AdminContent>>>(`${BASE}/content`, { params }).then((r) => r.data.data),

  /** Retiré des pages publiques ; son auteur le voit encore, avec le motif. */
  hideContent: (type: ModeratedContent, id: number, reason: string) =>
    api.post<ApiResponse<AdminContent>>(`${BASE}/content/${type}/${id}/hide`, { reason }).then((r) => r.data.data),

  unhideContent: (type: ModeratedContent, id: number) =>
    api.post<ApiResponse<AdminContent>>(`${BASE}/content/${type}/${id}/unhide`).then((r) => r.data.data),

  /** Définitif ; le motif, facultatif, va au journal. */
  deleteContent: (type: ModeratedContent, id: number, reason?: string) =>
    api.delete<ApiResponse<void>>(`${BASE}/content/${type}/${id}`, { params: { reason } }).then((r) => r.data),

  // ── Journal ──
  getActions: (params: AdminActionFilters) =>
    api.get<ApiResponse<PageResponse<AdminAction>>>(`${BASE}/actions`, { params }).then((r) => r.data.data),
};
