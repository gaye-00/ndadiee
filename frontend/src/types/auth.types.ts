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

/** L'inscription attend le code envoyé par e-mail (PendingVerificationResponse.java) : pas encore de session */
export interface PendingVerification {
  email: string;
  /** Dans combien de secondes un nouveau code peut être demandé */
  resendAvailableInSeconds: number;
}

/** Le code reçu par e-mail (VerifyEmailRequest.java) */
export interface VerifyEmailRequest {
  email: string;
  code: string;
}

/** Les fournisseurs de connexion gérés par le backend (OAuthProvider.java) */
export type OAuthProviderId = 'github' | 'google';

/** Partir chez le fournisseur (OAuthAuthorizationRequest.java) : l'état et l'empreinte PKCE tirés par le navigateur */
export interface OAuthAuthorizationRequest {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}

/** De retour du fournisseur (OAuthLoginRequest.java) */
export interface OAuthLoginRequest {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  /** Pour un compte créé à cette occasion */
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
  /** Le compte devait être supprimé : cette connexion a annulé la suppression */
  deletionCancelled?: boolean;
}

/** Le code reçu par e-mail et le nouveau mot de passe qu'il permet de choisir (ResetPasswordRequest.java) */
export interface ResetPasswordRequest {
  email: string;
  code: string;
  password: string;
}

/** Changer de mot de passe depuis ses réglages (ChangePasswordRequest.java) */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Ce que la suppression du compte ferait (AccountDeletionPreview.java) */
export interface AccountDeletionPreview {
  /** Jours avant l'effacement, pendant lesquels une connexion annule tout */
  gracePeriodDays: number;
  /** Vrai : se confirme par le mot de passe ; faux : par un code envoyé par e-mail (compte GitHub ou Google) */
  passwordRequired: boolean;
  email: string;
  projects: Array<{
    id: number;
    name: string;
    slug: string;
    /** Qui reprendrait le projet ; null : il part avec le compte */
    successor: { id: number; username: string; fullName: string; avatarUrl: string | null } | null;
  }>;
}

/** La suppression, confirmée par le mot de passe ou par le code reçu (AccountDeletionRequest.java) */
export interface AccountDeletionRequest {
  password?: string;
  code?: string;
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
  /** Reçoit les e-mails des revues de code : un commentaire sur sa PR, un verdict, sa revue jugée utile */
  reviewEmails: boolean;
  /** Connaît son mot de passe : faux pour un compte ouvert avec GitHub ou Google qui n'en a pas encore choisi */
  passwordSet: boolean;
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
