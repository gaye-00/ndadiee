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
  /** Revue communautaire jugée utile par l'équipe : elle lui a rapporté de la réputation */
  helpful: boolean;
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

// ==================== LA PAGE D'UNE REVUE (design 3C) ====================

/** Un verdict rendu : jamais « demandée » */
export type SubmittedReviewState = Exclude<ReviewState, 'REQUESTED'>;

/**
 * Un commentaire de revue (ReviewCommentResponse.java) : dans la conversation, ou sur une ligne d'un fichier du diff,
 * avec peut-être le code proposé à sa place. Une revue rendue en est un aussi : elle porte son verdict.
 */
export interface ReviewComment {
  id: number;
  author: UserSummary;
  /** Markdown ; null pour un verdict rendu sans message */
  body: string | null;
  /** Sur une ligne du diff : le fichier et la ligne de sa nouvelle version ; null dans la conversation */
  path: string | null;
  line: number | null;
  /** Le code proposé à la place de la ligne */
  suggestion: string | null;
  verdict: SubmittedReviewState | null;
  createdAt: string;
  updatedAt: string;
}

/** Ce que le membre connecté peut faire de la PR (PullRequestDetailResponse.Viewer) */
export interface PullRequestViewer {
  author: boolean;
  canComment: boolean;
  canReview: boolean;
  canClaim: boolean;
  canRelease: boolean;
  /** Juger utile la revue d'un relecteur de la communauté : l'équipe du projet */
  canJudge: boolean;
}

/** La page d'une revue (PullRequestDetailResponse.java) */
export interface PullRequestDetail {
  pullRequest: PullRequest;
  /** Description en Markdown ; null si l'auteur n'en a pas écrit */
  body: string | null;
  /** Conversation, commentaires de ligne et revues rendues : les plus anciens d'abord */
  comments: ReviewComment[];
  viewer: PullRequestViewer;
  /** Réputation que rapporte une revue communautaire jugée utile */
  helpfulReward: number;
}

export type PullRequestFileStatus = 'ADDED' | 'MODIFIED' | 'REMOVED' | 'RENAMED' | 'COPIED';

/** Un fichier modifié et son diff (PullRequestFileResponse.java) */
export interface PullRequestFile {
  path: string;
  /** Son ancien chemin, s'il a été renommé ou copié */
  previousPath: string | null;
  status: PullRequestFileStatus;
  additions: number;
  deletions: number;
  /** Diff unifié à partir du premier « @@ » ; null pour un fichier binaire ou trop gros */
  patch: string | null;
}

/** Les fichiers modifiés d'une PR (PullRequestFilesResponse.java) */
export interface PullRequestFiles {
  /** Faux pour une PR de démonstration sans diff */
  available: boolean;
  files: PullRequestFile[];
  /** Fichiers que la PR modifie en tout ; au-delà de ceux lus, ils sont sur GitHub */
  total: number;
  truncated: boolean;
  url: string | null;
}

export type CheckState = 'SUCCESS' | 'FAILURE' | 'PENDING' | 'SKIPPED';

/** Une vérification du dernier commit (PullRequestCheckResponse.java) */
export interface PullRequestCheck {
  name: string;
  /** Le workflow ou l'application dont elle fait partie */
  context: string | null;
  state: CheckState;
  description: string | null;
  url: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

/** Les vérifications, en échec d'abord (PullRequestChecksResponse.java) */
export interface PullRequestChecks {
  /** Faux pour une PR de démonstration sans détail : seuls les totaux de la PR sont connus */
  available: boolean;
  checks: PullRequestCheck[];
  total: number;
  url: string | null;
}

/** Une issue que la PR fermera en fusionnant : la tâche à laquelle elle répond (LinkedIssueResponse.java) */
export interface LinkedIssue {
  number: number;
  /** null quand seul son numéro est connu */
  title: string | null;
  state: 'OPEN' | 'CLOSED' | null;
  labels: string[];
  /** Une issue « premier pas », pensée pour une première contribution */
  starter: boolean;
  url: string | null;
}

export interface ReviewCommentInput {
  body: string;
  path?: string;
  line?: number;
  suggestion?: string;
}

export interface ReviewCommentUpdate {
  body: string;
  suggestion?: string | null;
}

export interface ReviewSubmission {
  state: SubmittedReviewState;
  body?: string;
}
