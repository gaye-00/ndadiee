import { api } from './api';
import type { ContributionDay } from '@/lib/contributions';
import type { UserResponse } from '@/types/auth.types';
import type { ApiResponse, PageResponse, PaginationParams } from '@/types/common.types';
import type { Collaborator, MemberProject, UpdateProfileRequest, UserFilters, UserProfile, UserSummary } from '@/types/user.types';

const BASE = '/v1/users';

// Une photo sur une connexion lente : bien plus que les 15 s d'une requête ordinaire
const UPLOAD_TIMEOUT = 120_000;

export const userService = {
  search: (params?: UserFilters) =>
    api.get<ApiResponse<PageResponse<UserSummary>>>(BASE, { params }).then((r) => r.data.data),

  getProfile: (username: string) =>
    api.get<ApiResponse<UserProfile>>(`${BASE}/${username}`).then((r) => r.data.data),

  getFollowers: (username: string, params?: PaginationParams) =>
    api
      .get<ApiResponse<PageResponse<UserSummary>>>(`${BASE}/${username}/followers`, { params })
      .then((r) => r.data.data),

  getFollowing: (username: string, params?: PaginationParams) =>
    api
      .get<ApiResponse<PageResponse<UserSummary>>>(`${BASE}/${username}/following`, { params })
      .then((r) => r.data.data),

  /** Les projets dont le développeur fait partie : ceux qu'il porte d'abord, puis les plus étoilés */
  getProjects: (username: string, params?: PaginationParams) =>
    api
      .get<ApiResponse<PageResponse<MemberProject>>>(`${BASE}/${username}/projects`, { params })
      .then((r) => r.data.data),

  /** Les membres avec qui il a fait équipe, ceux des projets en commun les plus nombreux d'abord */
  getCollaborators: (username: string) =>
    api.get<ApiResponse<Collaborator[]>>(`${BASE}/${username}/collaborators`).then((r) => r.data.data),

  /** Ses contributions jour par jour (UTC) sur la dernière année ; les jours sans rien n'y sont pas */
  getActivity: (username: string) =>
    api.get<ApiResponse<ContributionDay[]>>(`${BASE}/${username}/activity`).then((r) => r.data.data),

  updateProfile: (body: UpdateProfileRequest) =>
    api.put<ApiResponse<UserResponse>>(`${BASE}/me`, body).then((r) => r.data.data),

  /**
   * Change sa photo de profil : l'image déjà recadrée et réduite (lib/avatarImage.ts). Rend le compte à jour.
   *
   * @param onProgress avancement, de 0 à 1
   */
  updateAvatar: (image: Blob, name: string, onProgress?: (fraction: number) => void) => {
    const form = new FormData();
    form.append('file', image, name);
    return api
      .put<ApiResponse<UserResponse>>(`${BASE}/me/avatar`, form, {
        // Sans cela, l'en-tête JSON de l'instance ferait envoyer le formulaire en JSON ; le navigateur ajoute la frontière
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: UPLOAD_TIMEOUT,
        onUploadProgress: (event) => event.total && onProgress?.(event.loaded / event.total),
      })
      .then((r) => r.data.data);
  },

  /** Retire sa photo de profil : ses initiales la remplacent. Rend le compte à jour. */
  deleteAvatar: () => api.delete<ApiResponse<UserResponse>>(`${BASE}/me/avatar`).then((r) => r.data.data),

  follow: (username: string) => api.post<ApiResponse<void>>(`${BASE}/${username}/follow`).then((r) => r.data),

  unfollow: (username: string) => api.delete<ApiResponse<void>>(`${BASE}/${username}/follow`).then((r) => r.data),
};
