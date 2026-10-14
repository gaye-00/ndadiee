import { api } from './api';
import type { UserResponse } from '@/types/auth.types';
import type { ApiResponse, PageResponse, PaginationParams } from '@/types/common.types';
import type { UpdateProfileRequest, UserFilters, UserProfile, UserSummary } from '@/types/user.types';

const BASE = '/v1/users';

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

  updateProfile: (body: UpdateProfileRequest) =>
    api.put<ApiResponse<UserResponse>>(`${BASE}/me`, body).then((r) => r.data.data),

  follow: (username: string) => api.post<ApiResponse<void>>(`${BASE}/${username}/follow`).then((r) => r.data),

  unfollow: (username: string) => api.delete<ApiResponse<void>>(`${BASE}/${username}/follow`).then((r) => r.data),
};
