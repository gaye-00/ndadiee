import type { PaginationParams } from './common.types';
import type { WorkMode } from './opportunity.types';
import type { ProjectBrief, ProjectOpening, TeamRole } from './project.types';
import type { Tag } from './tag.types';
import type { UserSummary } from './user.types';

/** Où en est un hackathon, d'après ses dates, à l'heure de la réponse (HackathonStatus.java) */
export type HackathonStatus = 'UPCOMING' | 'ONGOING' | 'ENDED';

/** Temps fort du programme : « Coup d'envoi », « Démos devant le jury »… */
export interface HackathonMilestone {
  scheduledAt: string;
  label: string;
}

/** Prix : son intitulé (« 1er prix », « Prix du public ») et ce qu'il rapporte */
export interface HackathonPrize {
  title: string;
  reward: string;
}

/** Équipe d'un hackathon : un projet inscrit (HackathonTeamResponse.java) */
export interface HackathonTeam {
  /** Identifiant de l'inscription */
  id: number;
  project: ProjectBrief;
  /** Ce que l'équipe veut construire pendant le hackathon */
  pitch: string | null;
  /** Place au palmarès (1 : premier prix), une fois les résultats publiés */
  rank: number | null;
  /** Distinction sans place : « Prix du public » */
  award: string | null;
  memberCount: number;
  /** Liste complète des équipes seulement : le porteur d'abord, 6 au plus */
  members: UserSummary[] | null;
  /** Avant le coup d'envoi : les rôles que l'équipe cherche encore (liste complète, et équipe du membre connecté) */
  openings: ProjectOpening[] | null;
  registeredAt: string;
}

export interface Hackathon {
  id: number;
  slug: string;
  title: string;
  /** Accroche d'une ligne, pour les cartes */
  tagline: string | null;
  /** Markdown */
  description: string;
  organizerName: string;
  /** En ligne, sur place, ou les deux */
  format: WorkMode;
  country: string | null;
  city: string | null;
  /** Fuseau IANA de l'événement (« Africa/Abidjan ») : sur place, les horaires s'y lisent */
  timezone: string;
  startsAt: string;
  endsAt: string;
  registrationClosesAt: string;
  /** Texte libre : « 5 000 000 FCFA » */
  prizePool: string | null;
  minTeamSize: number;
  maxTeamSize: number;
  /** Absent : pas de limite */
  maxTeams: number | null;
  tags: Tag[];
  /** Dans l'ordre chronologique */
  schedule: HackathonMilestone[];
  prizes: HackathonPrize[];
  status: HackathonStatus;
  /** Inscriptions pas encore closes, et de la place pour une équipe de plus */
  registrationOpen: boolean;
  teamCount: number;
  /** Avant le coup d'envoi : places que les équipes cherchent encore, et ces rôles, dans l'ordre du catalogue */
  openSeats: number;
  rolesSought: TeamRole[];
  /** Les premières équipes : le palmarès d'abord, puis par ordre d'inscription (4 au plus) */
  teams: HackathonTeam[];
  /** Renseigné uniquement pour un membre connecté : son équipe, avec ses rôles ouverts */
  myTeam: HackathonTeam | null;
  createdAt: string;
}

export interface HackathonFilters extends PaginationParams {
  status?: HackathonStatus;
  q?: string;
  /** Slug d'un thème */
  tag?: string;
}

/** Inscription d'un projet comme équipe : par son porteur ou un mainteneur */
export interface HackathonTeamRequest {
  projectId: number;
  pitch?: string;
}
