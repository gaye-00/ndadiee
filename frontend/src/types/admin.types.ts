import type { PaginationParams } from './common.types';
import type { Role, UserSummary } from './user.types';

// Back-office : réservé aux comptes d'administration (AdminController.java)

/** Contenus que l'administration masque ou supprime (ModeratedContent.java) */
export type ModeratedContent = 'QUESTION' | 'ANSWER' | 'PROJECT';

/** Cible d'une décision au journal (AdminTargetType.java) */
export type AdminTargetType = 'USER' | ModeratedContent;

/** Ce que l'administration a fait (AdminActionType.java) */
export type AdminActionType = 'BLOCK_USER' | 'UNBLOCK_USER' | 'CHANGE_ROLE' | 'HIDE_CONTENT' | 'UNHIDE_CONTENT' | 'DELETE_CONTENT';

export type AccountStatus = 'ACTIVE' | 'BLOCKED';
export type Visibility = 'VISIBLE' | 'HIDDEN';

/** Inscriptions d'un jour (UTC) : `date` au format AAAA-MM-JJ */
export interface DailyCount {
  date: string;
  count: number;
}

/** Une décision de l'administration (AdminActionResponse.java). */
export interface AdminAction {
  id: number;
  /** null si le compte d'administration a été supprimé depuis */
  admin: UserSummary | null;
  action: AdminActionType;
  targetType: AdminTargetType;
  targetId: number;
  /** Nom d'utilisateur, titre du sujet (d'une réponse aussi) ou nom du projet, tel qu'il était */
  targetLabel: string;
  reason: string | null;
  /** « USER → MODERATOR » pour un changement de rôle */
  detail: string | null;
  createdAt: string;
}

/** La plateforme en chiffres (AdminOverviewResponse.java). « Récents » : les 7 derniers jours. */
export interface AdminOverview {
  members: number;
  moderators: number;
  blockedMembers: number;
  newMembers: number;
  activeMembers: number;
  topics: number;
  answers: number;
  projects: number;
  newTopics: number;
  newAnswers: number;
  newProjects: number;
  hiddenContent: number;
  /** Les 30 derniers jours, du plus ancien à aujourd'hui */
  signups: DailyCount[];
  recentActions: AdminAction[];
}

/** Un compte vu du back-office (AdminUserResponse.java). */
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: Role;
  userType: 'developer' | 'admin';
  country: string | null;
  reputation: number | null;
  createdAt: string;
  lastLoginAt: string | null;
  blocked: boolean;
  blockedAt: string | null;
  blockedReason: string | null;
  questionCount: number;
  answerCount: number;
  projectCount: number;
}

/** Un contenu vu du back-office (AdminContentResponse.java). */
export interface AdminContent {
  type: ModeratedContent;
  id: number;
  /** Titre du sujet, nom du projet ; pour une réponse, le titre de son sujet */
  title: string;
  excerpt: string;
  /** Le sujet (d'une réponse aussi), ou le projet */
  slug: string;
  author: UserSummary;
  /** Score des votes ; étoiles pour un projet */
  score: number;
  /** Réponses d'un sujet */
  replies: number | null;
  hidden: boolean;
  hiddenAt: string | null;
  hiddenReason: string | null;
  createdAt: string;
}

export interface AdminUserFilters extends PaginationParams {
  q?: string;
  role?: Role;
  status?: AccountStatus;
}

export interface AdminContentFilters extends PaginationParams {
  type: ModeratedContent;
  q?: string;
  visibility?: Visibility;
}

export interface AdminActionFilters extends PaginationParams {
  targetType?: AdminTargetType;
}
