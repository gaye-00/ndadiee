import type { FeedbackCall, HackathonBrief, MemberStatus, OpeningMatch, ProjectBrief, ProjectRole, TeamRole } from './project.types';
import type { PullRequest } from './review.types';
import type { UserSummary } from './user.types';

/** L'atelier du membre connecté, en une requête (DashboardResponse.java). Design 3B. */
export interface Dashboard {
  /** Ses équipes, les plus vivantes d'abord, puis ses candidatures en attente */
  projects: DashboardProject[];
  /** Pull requests qui attendent sa revue, les plus anciennes d'abord (5 au plus) */
  pullRequests: PullRequest[];
  /** Candidatures à étudier, dans les projets qu'il porte ou maintient, les plus anciennes d'abord */
  applications: ApplicationReview[];
  /** Demandes de retours d'autres projets, où son avis compte */
  feedbackRequests: FeedbackReview[];
  /** Ce qui s'est passé dans ses équipes ces quatre dernières semaines, le plus récent d'abord */
  activity: TeamActivity[];
  stats: BuilderStats;
}

/** Un projet de « Mes projets » (DashboardProjectResponse.java) */
export interface DashboardProject {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  coverThumbnailUrl: string | null;
  /** ACCEPTED : dans l'équipe ; PENDING : sa candidature attend */
  myStatus: Extract<MemberStatus, 'ACCEPTED' | 'PENDING'>;
  myRole: ProjectRole;
  mySpecialty: TeamRole | null;
  joinedAt: string;
  /** Candidature : l'intitulé du rôle visé */
  appliedTo: string | null;
  /** L'équipe, le porteur d'abord (5 au plus), et son effectif */
  team: UserSummary[];
  memberCount: number;
  openSeats: number;
  /** Candidatures en attente : 0 s'il ne gère pas le projet */
  pendingApplications: number;
  /** Avis reçus par les demandes de retours ouvertes */
  feedbackReceived: number;
  /** Pull requests du projet qui attendent sa revue */
  reviewRequests: number;
  /** Commits des 12 dernières semaines, la semaine en cours en dernier (null sans dépôt synchronisé) */
  commitWeeks: number[] | null;
  commitsThisWeek: number | null;
  lastRelease: string | null;
  lastReleaseAt: string | null;
  hackathon: HackathonBrief | null;
  lastActivityAt: string | null;
}

/** Une candidature à étudier (ApplicationReviewResponse.java) */
export interface ApplicationReview {
  /** La participation en attente : c'est elle qu'on accepte ou refuse */
  memberId: number;
  applicant: UserSummary;
  project: ProjectBrief;
  openingId: number | null;
  openingTitle: string | null;
  role: TeamRole | null;
  motivation: string | null;
  /** Compatibilité du candidat avec le rôle, d'après son profil */
  match: OpeningMatch | null;
  createdAt: string;
}

/** Une demande de retours où son avis compte (FeedbackReviewResponse.java) */
export interface FeedbackReview {
  project: ProjectBrief;
  call: FeedbackCall;
  /** Il a étoilé le projet ; technologies du projet qu'il a dans son profil */
  starred: boolean;
  sharedSkills: string[];
}

export type TeamActivityType =
  | 'DEVLOG'
  | 'RELEASE'
  | 'MEMBER_JOINED'
  | 'APPLICATION'
  | 'OPENING_PUBLISHED'
  | 'FEEDBACK_REQUESTED'
  | 'FEEDBACK_GIVEN'
  | 'HACKATHON_REGISTERED'
  | 'PR_OPENED'
  | 'PR_MERGED'
  | 'PR_APPROVED'
  | 'PR_CHANGES_REQUESTED';

/** Un événement dans une de ses équipes (TeamActivityResponse.java) */
export interface TeamActivity {
  /** Stable d'un rafraîchissement à l'autre : « DEVLOG-42 » */
  key: string;
  type: TeamActivityType;
  at: string;
  actor: UserSummary | null;
  project: ProjectBrief;
  /** Regroupement : combien d'événements, et d'autres auteurs que le plus récent (3 au plus) */
  count: number;
  others: UserSummary[];
  /** Version, intitulé du rôle ou de la demande, titre du hackathon */
  subject: string | null;
  /** Extrait du devlog ou de l'avis ; pour des rôles regroupés, les autres intitulés */
  body: string | null;
  rating: number | null;
  role: TeamRole | null;
  hackathonSlug: string | null;
  /** Numéro d'une pull request : « #84 » */
  number: number | null;
}

/** « Ta réputation de bâtisseur » (BuilderStatsResponse.java) */
export interface BuilderStats {
  reputation: number;
  projectsLed: number;
  teamsJoined: number;
  buildersWelcomed: number;
  feedbackGiven: number;
  acceptedAnswers: number;
  starsReceived: number;
  /** Ses PR fusionnées, et les revues de code qu'il a rendues */
  mergedPullRequests: number;
  reviewsGiven: number;
}
