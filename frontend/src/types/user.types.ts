import type { Language, PaginationParams } from './common.types';
import type { Project, ProjectBrief, ProjectRole, TeamRole } from './project.types';
import type { Tag } from './tag.types';

export type Role = 'USER' | 'MODERATOR' | 'ADMIN';
export type ExperienceLevel = 'STUDENT' | 'JUNIOR' | 'MID' | 'SENIOR';

/** Auteur affiché à côté d'un contenu (UserSummaryResponse.java). */
export interface UserSummary {
  id: number;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  // null pour un compte Admin, qui n'a pas de profil public
  country: string | null;
  reputation: number | null;
  level: ExperienceLevel | null;
}

/** Les badges du catalogue, attribués automatiquement (BadgeType.java) */
export type BadgeType =
  | 'FIRST_QUESTION'
  | 'FIRST_ANSWER'
  | 'FIRST_ACCEPTED_ANSWER'
  | 'FIRST_ARTICLE'
  | 'FIRST_PROJECT'
  | 'REPUTATION_100'
  | 'REPUTATION_500';

export interface Badge {
  id: number;
  /** Le badge du catalogue, dont le nom se traduit ; null pour un badge ajouté à la main */
  type: BadgeType | null;
  /** En français, tel qu'en base */
  name: string;
  description: string | null;
  iconUrl: string | null;
  criteria: string | null;
}

export interface UserBadge {
  badge: Badge;
  awardedAt: string;
}

/** Profil public d'un développeur (UserProfileResponse.java). */
export interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  preferredLanguage: Language;
  githubUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  role: Role;
  reputation: number;
  level: ExperienceLevel | null;
  openToWork: boolean;
  skills: Tag[];
  badges: UserBadge[];
  followersCount: number;
  followingCount: number;
  questionCount: number;
  answerCount: number;
  articleCount: number;
  /** Projets lancés (dont il est le porteur) */
  projectCount: number;
  // Preuves de travail : équipes rejointes hors de ses projets, réponses acceptées, hackathons commencés où il avait
  // une équipe, et places sur un podium
  teamCount: number;
  acceptedAnswerCount: number;
  hackathonCount: number;
  podiumCount: number;
  /** Renseigné uniquement pour un membre connecté qui regarde le profil d'un autre */
  followedByMe: boolean | null;
  createdAt: string;
}

/** Le profil public. La photo a ses propres routes (userService.updateAvatar, deleteAvatar). */
export interface UpdateProfileRequest {
  fullName: string;
  bio?: string;
  /** Code ISO à 2 lettres (SN, CI, NG...) */
  country?: string;
  city?: string;
  preferredLanguage?: Language;
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  level?: ExperienceLevel;
  openToWork?: boolean;
  /** Noms de tags, 15 maximum */
  skills?: string[];
}

export interface UserFilters extends PaginationParams {
  q?: string;
  country?: string;
  /** Slug de tag */
  skill?: string;
  level?: ExperienceLevel;
  openToWork?: boolean;
}

/** Un projet dont le membre fait partie, avec sa place dans l'équipe (MemberProjectResponse.java). */
export interface MemberProject {
  project: Project;
  role: ProjectRole;
  /** Rôle tenu dans l'équipe (« mobile »), s'il l'a choisi */
  specialty: TeamRole | null;
  /** Arrivée dans l'équipe : la création du projet, pour son porteur */
  joinedAt: string;
}

/** Un membre avec qui le développeur a fait équipe (CollaboratorResponse.java). */
export interface Collaborator {
  user: UserSummary;
  sharedProjectCount: number;
  /** Les projets en commun les plus étoilés, deux au plus */
  projects: Array<Pick<ProjectBrief, 'id' | 'name' | 'slug'>>;
}
