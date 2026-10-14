import { api } from './api';
import type { ApiResponse } from '@/types/common.types';
import type { Answer, AnswerRequest } from '@/types/question.types';

const BASE = '/v1/answers';

// La liste et la création passent par la question : voir question.service.ts
export const answerService = {
  update: (id: number, body: AnswerRequest) =>
    api.put<ApiResponse<Answer>>(`${BASE}/${id}`, body).then((r) => r.data.data),

  delete: (id: number) => api.delete<ApiResponse<void>>(`${BASE}/${id}`).then((r) => r.data),

  /** Réservé à l'auteur de la question. */
  accept: (id: number) => api.post<ApiResponse<Answer>>(`${BASE}/${id}/accept`).then((r) => r.data.data),

  unaccept: (id: number) => api.delete<ApiResponse<Answer>>(`${BASE}/${id}/accept`).then((r) => r.data.data),
};
