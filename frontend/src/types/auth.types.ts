import type { Language } from './common.types';
import type { Tag } from './tag.types';
import type { ExperienceLevel, Role } from './user.types';

export interface LoginRequest {
  /** Email ou nom d'utilisateur */
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  country?: string;
  preferredLanguage?: Language;
}

/** Un nom d'utilisateur est-il libre ? (UsernameAvailabilityResponse.java) */
export interface UsernameAvailability {
  /** Tel qu'il serait enregistré : en minuscules */
  username: string;
  available: boolean;
  /** Pourquoi il n'est pas libre */
  reason: 'INVALID' | 'RESERVED' | 'TAKEN' | null;
  /** Variantes libres, quand il est réservé ou pris */
  suggestions: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

/** Compte de l'utilisateur connecté (UserResponse.java). */
export interface UserResponse {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: Role;
  userType: 'developer' | 'admin';
  preferredLanguage: Language;
  createdAt: string;

  // Profil développeur : null pour un compte Admin
  bio: string | null;
  country: string | null;
  city: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  reputation: number | null;
  level: ExperienceLevel | null;
  openToWork: boolean | null;
  skills: Tag[] | null;
  followedTags: Tag[] | null;
}
