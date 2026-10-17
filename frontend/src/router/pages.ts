import type { ComponentType } from 'react';
import i18n from '@/i18n';
import type frCommon from '@/i18n/locales/fr/common.json';

/** Nom d'une page : c'est aussi la clé de son titre d'onglet (section `pages` des traductions). */
export type PageName = keyof typeof frCommon.pages;

export type PageImport = () => Promise<{ default: ComponentType }>;

/**
 * Le code d'une page et les textes de sa fonctionnalité (un espace de noms des traductions, dans la langue
 * de l'interface), téléchargés ensemble : la page s'affiche avec ses textes, sans attente de plus.
 */
function withTexts(load: PageImport, namespace: 'hackathons' | 'openings' | 'showcase'): PageImport {
  return () => Promise.all([load(), i18n.loadNamespaces(namespace)]).then(([module]) => module);
}

/**
 * Code de chaque page, dans son propre fichier du build, téléchargé seulement à la première visite.
 * Le router s'en sert à la navigation ; config/navigation.ts pour précharger une page au survol
 * de son lien (lib/prefetch.ts).
 */
export const pages = {
  landing: () => import('@/pages/landing/LandingPage'),

  showcase: withTexts(() => import('@/pages/showcase/ShowcasePage'), 'showcase'),
  project: () => import('@/pages/projects/ProjectPage'),
  openings: withTexts(() => import('@/pages/openings/OpeningsPage'), 'openings'),
  newOpening: () => import('@/pages/openings/NewOpeningPage'),
  hackathons: withTexts(() => import('@/pages/hackathons/HackathonsPage'), 'hackathons'),
  hackathon: withTexts(() => import('@/pages/hackathons/HackathonPage'), 'hackathons'),
  forum: () => import('@/pages/forum/ForumPage'),
  topic: () => import('@/pages/forum/TopicPage'),
  newTopic: () => import('@/pages/forum/NewTopicPage'),
  profile: () => import('@/pages/profile/ProfilePage'),
  search: () => import('@/pages/search/SearchPage'),

  // L'atelier montre le prochain hackathon de l'équipe (HackathonSpotlight)
  dashboard: withTexts(() => import('@/pages/dashboard/DashboardPage'), 'hackathons'),
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
