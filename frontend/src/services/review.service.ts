import { api } from './api';
import type { ApiResponse, PageResponse } from '@/types/common.types';
import type {
  LinkedIssue,
  PullRequest,
  PullRequestChecks,
  PullRequestDetail,
  PullRequestFiles,
  RepositorySync,
  ReviewComment,
  ReviewCommentInput,
  ReviewCommentUpdate,
  ReviewFilters,
  ReviewOverview,
  ReviewSubmission,
} from '@/types/review.types';

const BASE = '/v1/reviews';

/** Une PR prise par son projet et son numéro, comme son adresse sur le site (PullRequestController.java) */
const pullRequestUrl = (slug: string, number: number) => `/v1/projects/${slug}/pull-requests/${number}`;

/** Revues de code : les pull requests des projets et leurs relecteurs (ReviewController.java). */
export const reviewService = {
  /** Les PR d'un onglet pour le membre connecté, filtrables par mot-clé et par projet. */
  getAll: (params: ReviewFilters) =>
    api.get<ApiResponse<PageResponse<PullRequest>>>(BASE, { params }).then((r) => r.data.data),

  /** Totaux des onglets, équipes qui ont des PR ouvertes, bilan de relecteur. */
  getOverview: () => api.get<ApiResponse<ReviewOverview>>(`${BASE}/overview`).then((r) => r.data.data),

  /** Se propose comme relecteur (PR de son équipe, ou ouverte à la revue communautaire). */
  claim: (id: number) => api.post<ApiResponse<PullRequest>>(`${BASE}/${id}/claim`).then((r) => r.data.data),

  /** Se retire d'une revue qu'on avait prise, tant qu'on n'a rien rendu. */
  release: (id: number) => api.delete<ApiResponse<PullRequest>>(`${BASE}/${id}/claim`).then((r) => r.data.data),

  /** Les PR d'un projet et son dépôt GitHub : dernière lecture, erreur, PR ouvertes (RepositorySyncController.java). */
  getRepositorySync: (slug: string) =>
    api.get<ApiResponse<RepositorySync>>(`/v1/projects/${slug}/repository-sync`).then((r) => r.data.data),

  /** Relit tout de suite les PR du dépôt GitHub (porteur ou mainteneur). */
  syncRepository: (slug: string) =>
    api.post<ApiResponse<RepositorySync>>(`/v1/projects/${slug}/repository-sync`).then((r) => r.data.data),

  // ── La page d'une revue ──

  /** La PR, sa description, sa conversation et ses commentaires de ligne, et ce que le membre peut y faire. */
  getPullRequest: (slug: string, number: number) =>
    api.get<ApiResponse<PullRequestDetail>>(pullRequestUrl(slug, number)).then((r) => r.data.data),

  /** Ses fichiers modifiés et leur diff, lus sur GitHub au dernier commit de sa branche. */
  getFiles: (slug: string, number: number) =>
    api.get<ApiResponse<PullRequestFiles>>(`${pullRequestUrl(slug, number)}/files`).then((r) => r.data.data),

  /** Les vérifications de son dernier commit, en échec d'abord. */
  getChecks: (slug: string, number: number) =>
    api.get<ApiResponse<PullRequestChecks>>(`${pullRequestUrl(slug, number)}/checks`).then((r) => r.data.data),

  /** Les issues qu'elle fermera en fusionnant. */
  getIssues: (slug: string, number: number) =>
    api.get<ApiResponse<LinkedIssue[]>>(`${pullRequestUrl(slug, number)}/issues`).then((r) => r.data.data),

  comment: (slug: string, number: number, input: ReviewCommentInput) =>
    api.post<ApiResponse<ReviewComment>>(`${pullRequestUrl(slug, number)}/comments`, input).then((r) => r.data.data),

  updateComment: (slug: string, number: number, id: number, update: ReviewCommentUpdate) =>
    api.patch<ApiResponse<ReviewComment>>(`${pullRequestUrl(slug, number)}/comments/${id}`, update).then((r) => r.data.data),

  deleteComment: (slug: string, number: number, id: number) =>
    api.delete<ApiResponse<void>>(`${pullRequestUrl(slug, number)}/comments/${id}`).then(() => undefined),

  /** Rend sa revue : le verdict et son message rejoignent la conversation. */
  submitReview: (slug: string, number: number, submission: ReviewSubmission) =>
    api.post<ApiResponse<PullRequestDetail>>(`${pullRequestUrl(slug, number)}/reviews`, submission).then((r) => r.data.data),

  /** Juge utile (ou plus) la revue d'un relecteur de la communauté (équipe du projet). */
  judgeHelpful: (slug: string, number: number, reviewerId: number, helpful: boolean) =>
    (helpful
      ? api.put<ApiResponse<PullRequestDetail>>(`${pullRequestUrl(slug, number)}/reviewers/${reviewerId}/helpful`)
      : api.delete<ApiResponse<PullRequestDetail>>(`${pullRequestUrl(slug, number)}/reviewers/${reviewerId}/helpful`)
    ).then((r) => r.data.data),
};
