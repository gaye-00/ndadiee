import type { ComponentType } from 'react';
import type frCommon from '@/i18n/locales/fr/common.json';

/** Nom d'une page : c'est aussi la clé de son titre d'onglet (section `pages` des traductions). */
export type PageName = keyof typeof frCommon.pages;

export type PageImport = () => Promise<{ default: ComponentType }>;

/**
 * Code de chaque page, dans son propre fichier du build, téléchargé seulement à la première visite.
 * Le router s'en sert à la navigation ; config/navigation.ts pour précharger une page au survol
 * de son lien (lib/prefetch.ts).
 */
export const pages = {
  landing: () => import('@/pages/landing/LandingPage'),

  showcase: () => import('@/pages/showcase/ShowcasePage'),
  project: () => import('@/pages/projects/ProjectPage'),
  openings: () => import('@/pages/openings/OpeningsPage'),
  newOpening: () => import('@/pages/openings/NewOpeningPage'),
  hackathons: () => import('@/pages/hackathons/HackathonsPage'),
  hackathon: () => import('@/pages/hackathons/HackathonPage'),
  forum: () => import('@/pages/forum/ForumPage'),
  topic: () => import('@/pages/forum/TopicPage'),
  newTopic: () => import('@/pages/forum/NewTopicPage'),
  profile: () => import('@/pages/profile/ProfilePage'),
  search: () => import('@/pages/search/SearchPage'),

  dashboard: () => import('@/pages/dashboard/DashboardPage'),
  myProjects: () => import('@/pages/projects/MyProjectsPage'),
  newProject: () => import('@/pages/projects/NewProjectPage'),
  workspaceBoard: () => import('@/pages/workspace/WorkspaceBoardPage'),
  workspaceReviews: () => import('@/pages/workspace/WorkspaceReviewsPage'),
  workspaceDevlog: () => import('@/pages/workspace/WorkspaceDevlogPage'),
  workspaceRoles: () => import('@/pages/workspace/WorkspaceRolesPage'),
  workspaceSettings: () => import('@/pages/workspace/WorkspaceSettingsPage'),
  review: () => import('@/pages/reviews/ReviewPage'),
  reviews: () => import('@/pages/reviews/ReviewsPage'),
  messages: () => import('@/pages/messages/MessagesPage'),
  notifications: () => import('@/pages/notifications/NotificationsPage'),
  settings: () => import('@/pages/settings/SettingsPage'),

  login: () => import('@/pages/auth/LoginPage'),
  register: () => import('@/pages/auth/RegisterPage'),
  notFound: () => import('@/pages/NotFoundPage'),
} satisfies Record<PageName, PageImport>;
