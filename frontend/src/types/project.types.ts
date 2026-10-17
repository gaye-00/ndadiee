import type { PaginationParams } from './common.types';
import type { Tag } from './tag.types';
import type { UserSummary } from './user.types';

export type ProjectRole = 'OWNER' | 'MAINTAINER' | 'CONTRIBUTOR';
export type MemberStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

/** Catalogue des rôles qu'une équipe recherche (TeamRole.java) ; libellés et motifs : config/roles.ts */
export type TeamRole =
  | 'FRONTEND'
  | 'BACKEND'
  | 'MOBILE'
  | 'DESIGN'
  | 'DATA'
  | 'DEVOPS'
  | 'SECURITY'
  | 'PAYMENTS'
  | 'L10N'
  | 'DOCS'
  | 'PRODUCT'
  | 'EMBEDDED'
  | 'QA';

/** Rôle recherché par un projet (« annonce »). Pour postuler : son issue « premier pas ». */
export interface ProjectOpening {
  id: number;
  role: TeamRole;
  /** Intitulé libre : « Dev mobile React Native » */
  title: string;
  description: string | null;
  seats: number;
  starterIssueNumber: number | null;
  starterIssueTitle: string | null;
  open: boolean;
  createdAt: string;
  /** Renseigné dans la liste des annonces ; absent dans un projet */
  project: ProjectBrief | null;
}

/** Projet résumé, accompagnant une annonce */
export interface ProjectBrief {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  coverThumbnailUrl: string | null;
  owner: UserSummary;
}

/** Un rôle où l'on recrute : annonces, places et projets (les plus récents d'abord, 4 au plus) */
export interface OpeningRoleSummary {
  role: TeamRole;
  openings: number;
  seats: number;
  projects: ProjectBrief[];
}

/** Une technologie des projets qui recrutent : annonces ouvertes, places et projets (accueil, « Se rencontrer ») */
export interface OpeningStackSummary {
  /** Slug du tag : il filtre les annonces (OpeningFilters.tag) */
  slug: string;
  name: string;
  openings: number;
  seats: number;
  projects: number;
  /** Ces projets : deux technologies qui mènent aux mêmes équipes se reconnaissent */
  projectIds: number[];
}

export interface Project {
  id: number;
  name: string;
  slug: string;
  /** Accroche d'une ligne, pour les cartes */
  tagline: string | null;
  /** Markdown */
  description: string | null;
  repositoryUrl: string | null;
  demoUrl: string | null;
  logoUrl: string | null;
  /** Couverture (1280 px) et miniature (640 px), adresses complètes */
  coverUrl: string | null;
  coverThumbnailUrl: string | null;
  /** Crédit d'une photo empruntée (« Auteur · licence ») et lien vers sa source */
  coverCredit: string | null;
  coverSourceUrl: string | null;
  owner: UserSummary;
  tags: Tag[];
  lookingForContributors: boolean;
  starsCount: number;
  memberCount: number;
  /** Rôles ouverts */
  openings: ProjectOpening[];
  /** Membres acceptés, le porteur d'abord (6 au plus) */
  team: UserSummary[];
  // Renseignés uniquement pour un membre connecté
  starredByMe: boolean | null;
  myMembershipStatus: MemberStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: number;
  user: UserSummary;
  role: ProjectRole;
  status: MemberStatus;
  createdAt: string;
}

export interface ProjectRequest {
  name: string;
  tagline?: string;
  description: string;
  repositoryUrl?: string;
  demoUrl?: string;
  logoUrl?: string;
  coverUrl?: string;
  coverThumbnailUrl?: string;
  coverCredit?: string;
  coverSourceUrl?: string;
  tags?: string[];
  lookingForContributors?: boolean;
}

export interface ProjectOpeningRequest {
  role: TeamRole;
  title: string;
  description?: string;
  /** Absent = 1 */
  seats?: number;
  starterIssueNumber?: number;
  starterIssueTitle?: string;
}

export interface OpeningFilters extends PaginationParams {
  role?: TeamRole;
  q?: string;
  tag?: string;
}

export interface MemberDecisionRequest {
  status: 'ACCEPTED' | 'REJECTED';
  role?: 'MAINTAINER' | 'CONTRIBUTOR';
}

export interface ProjectFilters extends PaginationParams {
  q?: string;
  tag?: string;
  lookingForContributors?: boolean;
  owner?: string;
}
