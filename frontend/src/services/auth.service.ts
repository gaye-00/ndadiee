import { api } from './api';
import type { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from '@/types/auth.types';
import type { ApiResponse } from '@/types/common.types';

const BASE = '/v1/auth';

export const authService = {
  register: (body: RegisterRequest) =>
    api.post<ApiResponse<AuthResponse>>(`${BASE}/register`, body).then((r) => r.data.data),

  login: (body: LoginRequest) =>
    api.post<ApiResponse<AuthResponse>>(`${BASE}/login`, body).then((r) => r.data.data),

  // Le renouvellement du jeton est géré par l'intercepteur de api.ts

  me: () => api.get<ApiResponse<UserResponse>>(`${BASE}/me`).then((r) => r.data.data),
};
