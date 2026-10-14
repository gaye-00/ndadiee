import type { PaginationParams } from './common.types';
import type { Tag } from './tag.types';
import type { UserSummary } from './user.types';

export type OpportunityType = 'JOB' | 'FREELANCE' | 'INTERNSHIP' | 'HACKATHON';
export type WorkMode = 'REMOTE' | 'ONSITE' | 'HYBRID';

export interface Opportunity {
  id: number;
  title: string;
  /** Markdown */
  description: string;
  companyName: string;
  companyLogoUrl: string | null;
  type: OpportunityType;
  workMode: WorkMode;
  country: string | null;
  city: string | null;
  salaryRange: string | null;
  applyUrl: string | null;
  /** Date ISO (AAAA-MM-JJ) */
  deadline: string | null;
  postedBy: UserSummary;
  tags: Tag[];
  active: boolean;
  createdAt: string;
}

export interface OpportunityRequest {
  title: string;
  description: string;
  companyName: string;
  companyLogoUrl?: string;
  type: OpportunityType;
  workMode: WorkMode;
  country?: string;
  city?: string;
  salaryRange?: string;
  applyUrl?: string;
  deadline?: string;
  tags?: string[];
}

export interface OpportunityFilters extends PaginationParams {
  q?: string;
  type?: OpportunityType;
  workMode?: WorkMode;
  country?: string;
  tag?: string;
  /** Inclure aussi les opportunités clôturées ou dont la date limite est passée */
  includeClosed?: boolean;
}
