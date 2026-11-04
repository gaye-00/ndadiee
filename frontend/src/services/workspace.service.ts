import { api } from './api';
import type { ApiResponse } from '@/types/common.types';
import type {
  Sprint,
  SprintRequest,
  Task,
  TaskMoveRequest,
  TaskPullRequest,
  TaskRequest,
  TeamChatPage,
  TeamEventRequest,
  TeamMessage,
  Workspace,
  WorkspacePulse,
} from '@/types/workspace.types';

/** L'espace d'équipe d'un projet, par son slug (WorkspaceController.java). Réservé aux membres de l'équipe. */
const base = (slug: string) => `/v1/projects/${encodeURIComponent(slug)}/workspace`;

export const workspaceService = {
  /** Le projet, l'équipe et qui est en ligne, le sprint en cours, ce qui attend dans les onglets. */
  get: (slug: string) => api.get<ApiResponse<Workspace>>(base(slug)).then((r) => r.data.data),

  /** Le membre est là : qui d'autre l'est, et les révisions du tableau, de l'équipe et de la discussion. */
  pulse: (slug: string) => api.post<ApiResponse<WorkspacePulse>>(`${base(slug)}/pulse`).then((r) => r.data.data),

  // ── Tableau ──

  getTasks: (slug: string) => api.get<ApiResponse<Task[]>>(`${base(slug)}/tasks`).then((r) => r.data.data),

  /** Une tâche par son numéro, même livrée pendant un sprint clos. */
  getTask: (slug: string, number: number) => api.get<ApiResponse<Task>>(`${base(slug)}/tasks/${number}`).then((r) => r.data.data),

  createTask: (slug: string, body: TaskRequest) => api.post<ApiResponse<Task>>(`${base(slug)}/tasks`, body).then((r) => r.data.data),

  updateTask: (slug: string, number: number, body: TaskRequest) =>
    api.put<ApiResponse<Task>>(`${base(slug)}/tasks/${number}`, body).then((r) => r.data.data),

  /** Glisse une tâche à une place d'une colonne ; le tableau entier en retour. */
  moveTask: (slug: string, number: number, body: TaskMoveRequest) =>
    api.put<ApiResponse<Task[]>>(`${base(slug)}/tasks/${number}/position`, body).then((r) => r.data.data),

  deleteTask: (slug: string, number: number) => api.delete<ApiResponse<void>>(`${base(slug)}/tasks/${number}`).then((r) => r.data),

  /** Les PR qu'une tâche peut livrer : ouvertes, puis fusionnées ou fermées depuis un mois. */
  getPullRequests: (slug: string) =>
    api.get<ApiResponse<TaskPullRequest[]>>(`${base(slug)}/pull-requests`).then((r) => r.data.data),

  // ── Sprints (porteur, mainteneurs) ──

  startSprint: (slug: string, body: SprintRequest) =>
    api.post<ApiResponse<Sprint>>(`${base(slug)}/sprints`, body).then((r) => r.data.data),

  /** Clôt le sprint en cours : ses tâches terminées sont livrées et quittent le tableau. */
  closeSprint: (slug: string) => api.post<ApiResponse<Sprint>>(`${base(slug)}/sprints/current/close`).then((r) => r.data.data),

  // ── Discussion ──

  /** Les derniers messages, ou ceux d'avant `before`, dans l'ordre de lecture ; et le rendez-vous épinglé. */
  getMessages: (slug: string, params: { before?: number; size?: number }) =>
    api.get<ApiResponse<TeamChatPage>>(`${base(slug)}/messages`, { params }).then((r) => r.data.data),

  postMessage: (slug: string, body: string) =>
    api.post<ApiResponse<TeamMessage>>(`${base(slug)}/messages`, { body }).then((r) => r.data.data),

  scheduleEvent: (slug: string, body: TeamEventRequest) =>
    api.post<ApiResponse<TeamMessage>>(`${base(slug)}/events`, body).then((r) => r.data.data),

  /** « J'y serai » (attending = true), ou plus. */
  attend: (slug: string, id: number, attending: boolean) =>
    (attending
      ? api.put<ApiResponse<TeamMessage>>(`${base(slug)}/messages/${id}/attendance`)
      : api.delete<ApiResponse<TeamMessage>>(`${base(slug)}/messages/${id}/attendance`)
    ).then((r) => r.data.data),

  deleteMessage: (slug: string, id: number) => api.delete<ApiResponse<void>>(`${base(slug)}/messages/${id}`).then((r) => r.data),
};
