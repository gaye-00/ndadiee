import type { PaginationParams } from './common.types';
import type { ProjectBrief } from './project.types';
import type { UserSummary } from './user.types';

export type PullRequestStatus = 'OPEN' | 'MERGED' | 'CLOSED';

/** Revue d'un relecteur : demandée, commentée sans verdict, approuvée, changements demandés (ReviewState.java) */
export type ReviewState = 'REQUESTED' | 'COMMENTED' | 'APPROVED' | 'CHANGES_REQUESTED';

/** Onglets de la page des revues (ReviewTab.java) */
export type ReviewTab = 'TO_REVIEW' | 'COMMUNITY' | 'MINE' | 'TEAM' | 'DONE';

/** Un relecteur d'une pull request (ReviewerResponse.java) */
export interface Reviewer {
  user: UserSummary;
  state: ReviewState;
  /** L'équipe attend sa revue pour fusionner */
  required: boolean;
  /** Il n'est pas de l'équipe du projet */
  community: boolean;
  requestedAt: string;
  submittedAt: string | null;
}

/** Une pull request de la liste des revues (PullRequestResponse.java). Design 3B, 3C. */
export interface PullRequest {
  id: number;
  number: number;
  title: string;
  status: PullRequestStatus;
  draft: boolean;
  /** Ouverte aux relecteurs hors de l'équipe */
  community: boolean;
  labels: string[];
  project: ProjectBrief;
  author: UserSummary;
  /** Première contribution de l'auteur au projet */
  firstContribution: boolean;
  starterIssueNumber: number | null;
  sourceBranch: string;
  targetBranch: string;
  commits: number;
  filesChanged: number;
  additions: number;
  deletions: number;
  /** Vérifications réussies, en échec ; les autres tournent encore */
  checksTotal: number;
  checksPassed: number;
  checksFailed: number;
  /** Les requis d'abord, puis dans l'ordre des demandes */
  reviewers: Reviewer[];
  commentCount: number;
  createdAt: string;
  lastActivityAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  // Pour le membre connecté
  /** Sa revue, s'il est relecteur */
  myReview: Reviewer | null;
  inMyTeam: boolean;
  /** Étiquettes et technologies du projet qu'il a dans son profil */
  sharedSkills: string[];
  /** Réputation qu'une revue communautaire utile lui rapporterait */
  reward: number | null;
}

/** Les revues en chiffres (ReviewOverviewResponse.java) */
export interface ReviewOverview {
  toReview: number;
  community: number;
  mine: number;
  team: number;
  done: number;
  /** La plus ancienne demande qui l'attend encore */
  oldestRequestAt: string | null;
  /** Ses équipes qui ont des PR ouvertes */
  projects: Array<{ project: ProjectBrief; open: number }>;
  reviewsGiven: number;
  approved: number;
  changesRequested: number;
  communityReviews: number;
  mergedPullRequests: number;
  /** Réputation d'une revue jugée utile */
  reward: number;
}

export interface ReviewFilters extends PaginationParams {
  tab: ReviewTab;
  /** Titre, numéro (« #84 »), projet ou branche */
  q?: string;
  /** Slug d'un projet */
  project?: string;
}
