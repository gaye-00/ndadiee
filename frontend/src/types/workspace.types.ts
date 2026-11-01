import type { ProjectBrief, ProjectRole, TeamRole } from './project.types';
import type { PullRequestStatus, ReviewState } from './review.types';
import type { UserSummary } from './user.types';

/** Les colonnes du tableau, dans leur ordre (TaskStatus.java) */
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

export const TASK_STATUSES: readonly TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

/** Une pull request du projet, vue d'une tâche (TaskPullRequestResponse.java) */
export interface TaskPullRequest {
  number: number;
  title: string;
  status: PullRequestStatus;
  draft: boolean;
  /**
   * Le verdict des relecteurs d'une PR ouverte : CHANGES_REQUESTED, APPROVED, ou REQUESTED tant qu'une revue est
   * attendue ; null sans relecteur, ou pour une PR fusionnée ou fermée
   */
  review: Extract<ReviewState, 'REQUESTED' | 'APPROVED' | 'CHANGES_REQUESTED'> | null;
  /** Sur GitHub ; null pour les données de démonstration */
  githubUrl: string | null;
}

/** Une tâche du tableau (TaskResponse.java). Design 3E : « #38 Mode hors-ligne · mobile · Tunde ». */
export interface Task {
  id: number;
  /** « #38 » : ne change jamais */
  number: number;
  title: string;
  /** Markdown léger */
  description: string | null;
  status: TaskStatus;
  /** Sa place dans la colonne, de 0 en haut */
  position: number;
  role: TeamRole | null;
  assignee: UserSummary | null;
  author: UserSummary;
  pullRequest: TaskPullRequest | null;
  /** Arrivée dans sa colonne, et qui l'y a mise (null : depuis sa création) */
  statusChangedAt: string;
  movedBy: UserSummary | null;
  /** Livrée pendant ce sprint, clos depuis : elle a quitté le tableau */
  deliveredInSprint: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Une tâche telle que l'équipe l'écrit (TaskRequest.java) : ce qui est absent est vide */
export interface TaskRequest {
  title: string;
  description?: string;
  role?: TeamRole;
  assigneeId?: number;
  pullRequestNumber?: number;
  /** À la création : sa colonne ; à la modification, une autre colonne l'y envoie en bas */
  status?: TaskStatus;
}

/** Une tâche glissée ailleurs : sa colonne, et sa place (0 en haut) */
export interface TaskMoveRequest {
  status: TaskStatus;
  position: number;
}

/** Un sprint (SprintResponse.java) : en cours, les tâches du tableau et celles terminées ; clos, les livrées */
export interface Sprint {
  id: number;
  number: number;
  goal: string | null;
  startsAt: string;
  endsAt: string;
  closedAt: string | null;
  taskCount: number;
  doneCount: number;
}

export interface SprintRequest {
  goal?: string;
  /** De 1 à 4 */
  weeks: number;
}

/** Un membre de l'équipe, dans son espace (WorkspaceMemberResponse.java) */
export interface WorkspaceMember {
  /** La participation (ProjectMember) : pour la modifier ou la retirer */
  memberId: number;
  user: UserSummary;
  role: ProjectRole;
  specialty: TeamRole | null;
  joinedAt: string;
  online: boolean;
}

/** L'espace d'équipe d'un projet (WorkspaceResponse.java). Réservé aux membres de l'équipe. */
export interface Workspace {
  project: ProjectBrief;
  myRole: ProjectRole;
  mySpecialty: TeamRole | null;
  /** Porteur ou mainteneur : sprints, et ce que d'autres ont écrit */
  canManage: boolean;
  /** Le porteur, puis les mainteneurs, puis dans l'ordre d'arrivée */
  members: WorkspaceMember[];
  /** Le sprint en cours ; null entre deux sprints. Le prochain : lastSprintNumber + 1 */
  sprint: Sprint | null;
  lastSprintNumber: number;
  openPullRequests: number;
  openRoles: number;
  /** Pour qui gère l'équipe ; 0 sinon */
  pendingApplications: number;
}

/** Le pouls de l'espace (WorkspacePulseResponse.java) : des révisions à comparer telles quelles */
export interface WorkspacePulse {
  online: number[];
  board: string;
  team: string;
  chat: string;
}

/** Un rendez-vous de l'équipe (TeamEventResponse.java) */
export interface TeamEvent {
  startsAt: string;
  endsAt: string;
  link: string | null;
  /** Dans l'ordre des réponses */
  attendees: UserSummary[];
  attending: boolean;
}

/** Un message de la discussion, ou un rendez-vous (TeamMessageResponse.java) */
export interface TeamMessage {
  id: number;
  kind: 'MESSAGE' | 'EVENT';
  /** Le message, ou le titre du rendez-vous */
  body: string;
  author: UserSummary;
  createdAt: string;
  event: TeamEvent | null;
}

/** Une page de la discussion (TeamChatResponse.java) */
export interface TeamChatPage {
  /** Du plus ancien au plus récent */
  messages: TeamMessage[];
  /** Des messages plus anciens attendent : la suite se demande avec before = l'id du premier */
  hasMore: boolean;
  /** Le prochain rendez-vous, ou celui en cours */
  nextEvent: TeamMessage | null;
}

export interface TeamEventRequest {
  title: string;
  /** ISO 8601 */
  startsAt: string;
  durationMinutes: number;
  link?: string;
}
