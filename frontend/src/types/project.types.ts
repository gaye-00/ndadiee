import type { PaginationParams } from './common.types';
import type { Tag } from './tag.types';
import type { UserSummary } from './user.types';

export type ProjectRole = 'OWNER' | 'MAINTAINER' | 'CONTRIBUTOR';
export type MemberStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface Project {
  id: number;
  name: string;
  slug: string;
  /** Markdown */
  description: string | null;
  repositoryUrl: string | null;
  demoUrl: string | null;
  logoUrl: string | null;
  owner: UserSummary;
  tags: Tag[];
  lookingForContributors: boolean;
  starsCount: number;
  memberCount: number;
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
  description: string;
  repositoryUrl?: string;
  demoUrl?: string;
  logoUrl?: string;
  tags?: string[];
  lookingForContributors?: boolean;
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
