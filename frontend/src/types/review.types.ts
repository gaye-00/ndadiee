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

/** Une PR lue sur le dépôt GitHub du projet (PullRequestResponse.Github) */
export interface PullRequestGithub {
  url: string;
  /** Le dernier commit de sa branche : le diff se lit à ce commit */
  headSha: string | null;
  /** Son auteur sur GitHub ; null si le compte a été supprimé */
  authorLogin: string | null;
  authorAvatarUrl: string | null;
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
  /** Le membre qui l'a ouverte ; null pour une PR de GitHub dont l'auteur n'est pas inscrit (voir github) */
  author: UserSummary | null;
  /** Première contribution de l'auteur au projet (selon GitHub pour une PR de GitHub) */
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
  /** La PR sur GitHub ; null pour les données de démonstration */
  github: PullRequestGithub | null;
}

/** Les PR d'un projet et son dépôt GitHub (RepositorySyncResponse.java) */
export interface RepositorySync {
  /** « owner/name » ; null si le projet n'a pas de dépôt GitHub */
  repository: string | null;
  repositoryUrl: string | null;
  /** Le serveur sait lire les PR (jeton GitHub configuré) */
  available: boolean;
  syncedAt: string | null;
  attemptedAt: string | null;
  /** Code d'erreur de la dernière tentative, null si elle a réussi */
  error: 'GITHUB_REPOSITORY_NOT_FOUND' | 'GITHUB_RATE_LIMITED' | 'GITHUB_UNAVAILABLE' | 'GITHUB_NOT_CONFIGURED' | null;
  /** PR ouvertes venues du dépôt */
  openPullRequests: number;
  /** Le membre connecté peut relancer la lecture (porteur ou mainteneur) */
  canSync: boolean;
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
