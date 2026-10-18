import { api } from './api';
import type { ApiResponse, PageResponse, PaginationParams } from '@/types/common.types';
import type {
  Answer,
  AnswerRequest,
  BookmarkResponse,
  ForumOverview,
  Question,
  QuestionFilters,
  QuestionRequest,
  QuestionStatus,
  QuestionSummary,
} from '@/types/question.types';

const BASE = '/v1/questions';

export const questionService = {
  getAll: (params?: QuestionFilters) =>
    api.get<ApiResponse<PageResponse<QuestionSummary>>>(BASE, { params }).then((r) => r.data.data),

  /** Le forum en chiffres et ses tags les plus utilisés. */
  getOverview: () => api.get<ApiResponse<ForumOverview>>(`${BASE}/overview`).then((r) => r.data.data),

  /** Liste de lecture du membre connecté : les derniers enregistrés d'abord. */
  getSaved: (params?: PaginationParams) =>
    api.get<ApiResponse<PageResponse<QuestionSummary>>>(`${BASE}/saved`, { params }).then((r) => r.data.data),

  /** Enregistrer (sans effet s'il l'est déjà) ou retirer un sujet de la liste de lecture. */
  bookmark: (id: number) => api.post<ApiResponse<BookmarkResponse>>(`${BASE}/${id}/bookmark`).then((r) => r.data.data),

  unbookmark: (id: number) => api.delete<ApiResponse<BookmarkResponse>>(`${BASE}/${id}/bookmark`).then((r) => r.data.data),

  /** Compte une vue à chaque appel. */
  getBySlug: (slug: string) => api.get<ApiResponse<Question>>(`${BASE}/${slug}`).then((r) => r.data.data),

  create: (body: QuestionRequest) => api.post<ApiResponse<Question>>(BASE, body).then((r) => r.data.data),

  update: (id: number, body: QuestionRequest) =>
    api.put<ApiResponse<Question>>(`${BASE}/${id}`, body).then((r) => r.data.data),

  changeStatus: (id: number, status: QuestionStatus) =>
    api.patch<ApiResponse<Question>>(`${BASE}/${id}/status`, null, { params: { status } }).then((r) => r.data.data),

  delete: (id: number) => api.delete<ApiResponse<void>>(`${BASE}/${id}`).then((r) => r.data),

  /** La réponse acceptée d'abord, puis les mieux notées. */
  getAnswers: (questionId: number, params?: PaginationParams) =>
    api.get<ApiResponse<PageResponse<Answer>>>(`${BASE}/${questionId}/answers`, { params }).then((r) => r.data.data),

  answer: (questionId: number, body: AnswerRequest) =>
    api.post<ApiResponse<Answer>>(`${BASE}/${questionId}/answers`, body).then((r) => r.data.data),
};
