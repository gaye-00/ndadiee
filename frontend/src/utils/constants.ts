import type { ExperienceLevel, Role } from '@/types/user.types';
import type { OpportunityType, WorkMode } from '@/types/opportunity.types';
import type { ProjectRole } from '@/types/project.types';

export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8080/api';

export const PAGE_SIZE = 20;

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  STUDENT: 'Étudiant·e',
  JUNIOR: 'Junior',
  MID: 'Confirmé·e',
  SENIOR: 'Senior',
};

export const ROLE_LABELS: Record<Role, string> = {
  USER: 'Membre',
  MODERATOR: 'Modérateur·rice',
  ADMIN: 'Admin',
};

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  JOB: 'Emploi',
  FREELANCE: 'Freelance',
  INTERNSHIP: 'Stage',
  HACKATHON: 'Hackathon',
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  REMOTE: 'À distance',
  ONSITE: 'Sur site',
  HYBRID: 'Hybride',
};

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  OWNER: 'Propriétaire',
  MAINTAINER: 'Mainteneur·se',
  CONTRIBUTOR: 'Contributeur·rice',
};
