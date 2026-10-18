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
  // Liste des annonces et page du projet : candidatures en attente, et pour un membre connecté qui n'est
  // pas de l'équipe, sa compatibilité avec le rôle et sa candidature
  applicants: number | null;
  match: OpeningMatch | null;
  appliedByMe: boolean | null;
}

/** Compatibilité du membre connecté avec un rôle (OpeningMatcher.java) : de 1 à 99, et pourquoi */
export interface OpeningMatch {
  score: number;
  /** Compétences de son profil qui comptent, celles de la stack du projet d'abord */
  skills: string[];
}

/** Projet résumé, accompagnant une annonce (ProjectBriefResponse.java) */
export interface ProjectBrief {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  coverThumbnailUrl: string | null;
  /** L'issue « premier pas » d'une annonce est une issue de ce dépôt */
  repositoryUrl: string | null;
  owner: UserSummary;
  // Liste des annonces seulement : les technologies du projet, et pour un membre connecté, sa participation
  tags: Tag[] | null;
  myMembershipStatus: MemberStatus | null;
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
  /** Licence du code, identifiant SPDX : « MIT » */
  license: string | null;
  /** Hackathon auquel le projet est inscrit : renseigné par le domaine Hackathon, absent sinon */
  hackathon?: HackathonBrief | null;
  owner: UserSummary;
  tags: Tag[];
  lookingForContributors: boolean;
  starsCount: number;
  memberCount: number;
  /** Rôles ouverts */
  openings: ProjectOpening[];
  /** Membres acceptés, le porteur d'abord (6 au plus) */
  team: UserSummary[];
  // Page du projet seulement (GET /v1/projects/{slug}) : la galerie, qui suit la couverture, et
  // l'activité du dépôt (null tant qu'il n'a pas été synchronisé)
  gallery: ProjectMedia[] | null;
  github: GithubActivity | null;
  // Renseignés uniquement pour un membre connecté
  starredByMe: boolean | null;
  myMembershipStatus: MemberStatus | null;
  /** Masqué par l'équipe : seuls son auteur et les admins le reçoivent encore, avec le motif */
  hidden: boolean;
  hiddenReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: number;
  user: UserSummary;
  role: ProjectRole;
  status: MemberStatus;
  /** Rôle tenu dans l'équipe (« mobile ») */
  specialty: TeamRole | null;
  /** Annonce à laquelle il a répondu */
  openingId: number | null;
  /** Le mot de sa candidature : seulement pour le porteur et les mainteneurs */
  motivation: string | null;
  createdAt: string;
}

export type MediaKind = 'SCREENSHOT' | 'PHOTO';

/** Image de la galerie d'un projet (adresses complètes) */
export interface ProjectMedia {
  id: number;
  kind: MediaKind;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  /** Image empruntée : auteur et licence, et lien vers sa source */
  credit: string | null;
  sourceUrl: string | null;
  width: number | null;
  height: number | null;
}

/** Activité du dépôt GitHub, à la dernière synchronisation */
export interface GithubActivity {
  stars: number;
  forks: number;
  openIssues: number;
  /** Issues « good first issue » ouvertes */
  goodFirstIssues: number;
  contributors: number;
  commitsThisWeek: number;
  /** Commits des 12 dernières semaines, de la plus ancienne à la semaine en cours */
  commitWeeks: number[];
  lastRelease: string | null;
  lastReleaseAt: string | null;
  lastCommitAt: string | null;
  syncedAt: string;
}

/** Hackathon auquel un projet est inscrit (HackathonBriefResponse.java, domaine Hackathon) */
export interface HackathonBrief {
  id: number;
  slug: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  registrationClosesAt: string | null;
}

/** Entrée du devlog d'un projet */
export interface DevlogEntry {
  id: number;
  /** « v0.7 », quand c'est une release */
  version: string | null;
  /** Texte court : `code` et mentions @nom_utilisateur */
  body: string;
  author: UserSummary;
  createdAt: string;
}

/** Demande de retours d'un projet (« Votre avis sur l'écran trajets ») */
export interface FeedbackCall {
  id: number;
  title: string;
  prompt: string | null;
  open: boolean;
  author: UserSummary;
  createdAt: string;
  feedbackCount: number;
  /** Note moyenne sur 5, null sans note */
  averageRating: number | null;
  /** Renseigné uniquement pour un membre connecté */
  givenByMe: boolean | null;
}

/** Un avis : note de 1 à 5 facultative, et ce qu'on en pense */
export interface FeedbackRequest {
  rating?: number;
  body: string;
}

/** Candidature : le rôle visé et un mot pour l'équipe, facultatifs */
export interface JoinProjectRequest {
  openingId?: number;
  motivation?: string;
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
  /** Licence du code, identifiant SPDX : « MIT » */
  license?: string;
}

/** Image ajoutée à la galerie d'un projet (ProjectMediaRequest.java) */
export interface ProjectMediaRequest {
  kind: MediaKind;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  credit?: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
}

/**
 * Un projet publié d'un seul coup, avec sa galerie et ses rôles recherchés (NewProjectRequest.java) : tout est créé
 * ensemble, ou rien.
 */
export interface NewProjectRequest extends ProjectRequest {
  /** Dans l'ordre de la galerie, 12 au plus */
  gallery?: ProjectMediaRequest[];
  /** 8 au plus */
  openings?: ProjectOpeningRequest[];
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
  /** Mot-clé : intitulé, description ou issue « premier pas » de l'annonce, nom, accroche ou technologie du projet */
  q?: string;
  /** Slug d'une technologie du projet */
  tag?: string;
  /** Pays du porteur du projet, code ISO à 2 lettres */
  country?: string;
}

/** Filtres des facettes des annonces : ceux de la liste, sans la pagination */
export type OpeningFacetFilters = Omit<OpeningFilters, keyof PaginationParams>;

/**
 * Facettes des annonces (OpeningFacetsResponse.java). Chacune compte les annonces avec tous les filtres sauf
 * le sien : une valeur proposée ne mène jamais à une liste vide.
 */
export interface OpeningFacets {
  /** Annonces qui répondent à tous les filtres, places qu'elles proposent, projets qui les publient */
  total: number;
  seats: number;
  projects: number;
  /** Parmi elles, celles qui n'ont aucune candidature en attente */
  unclaimed: number;
  /** Sans filtre de rôle (« Toutes ») */
  all: number;
  /** Rôles ; un rôle absent n'a aucune annonce */
  roles: Array<{ role: TeamRole; openings: number; seats: number }>;
  /** Technologies des projets, les plus demandées d'abord (100 au plus) */
  stacks: Array<{ slug: string; name: string; openings: number }>;
  /** Pays des porteurs (code ISO à 2 lettres), les plus représentés d'abord */
  countries: Array<{ country: string; openings: number }>;
}

export interface MemberDecisionRequest {
  status: 'ACCEPTED' | 'REJECTED';
  role?: 'MAINTAINER' | 'CONTRIBUTOR';
  /** Rôle tenu dans l'équipe : celui de l'annonce, pour une candidature acceptée */
  specialty?: TeamRole;
}

export interface ProjectFilters extends PaginationParams {
  /** Mot-clé : nom, accroche, description ou technologie du projet */
  q?: string;
  /** Slug d'une technologie */
  tag?: string;
  /** Le projet accepte des contributeurs (« recrute ») */
  lookingForContributors?: boolean;
  owner?: string;
  /** Rôle d'une annonce ouverte du projet */
  role?: TeamRole;
  /** Pays du porteur, code ISO à 2 lettres */
  country?: string;
}

/** Filtres des facettes : ceux de la liste, sans la pagination */
export type ProjectFacetFilters = Omit<ProjectFilters, keyof PaginationParams>;

/**
 * Facettes de la vitrine (ProjectFacetsResponse.java). Chacune compte les projets avec tous les filtres sauf
 * le sien : une valeur proposée ne mène jamais à une vitrine vide.
 */
export interface ProjectFacets {
  /** Projets qui répondent à tous les filtres, et places proposées par leurs annonces ouvertes */
  total: number;
  seats: number;
  /** Sans filtre de rôle ni de recrutement (« Tous »), et parmi eux ceux qui recrutent */
  all: number;
  recruiting: number;
  /** Rôles des annonces ouvertes ; un rôle absent n'a aucun projet */
  roles: RoleFacet[];
  /** Technologies, les plus présentes d'abord (100 au plus) */
  stacks: StackFacet[];
  /** Pays des porteurs, les plus représentés d'abord */
  countries: CountryFacet[];
}

export interface RoleFacet {
  role: TeamRole;
  projects: number;
  seats: number;
}

export interface StackFacet {
  slug: string;
  name: string;
  projects: number;
}

export interface CountryFacet {
  /** Code ISO à 2 lettres */
  country: string;
  projects: number;
}
