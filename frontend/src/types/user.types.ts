import type { Language, PaginationParams } from './common.types';
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

export interface Badge {
  id: number;
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
  projectCount: number;
  /** Renseigné uniquement pour un membre connecté qui regarde le profil d'un autre */
  followedByMe: boolean | null;
  createdAt: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  bio?: string;
  avatarUrl?: string;
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
