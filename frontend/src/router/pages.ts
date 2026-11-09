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
function withTexts(
  load: PageImport,
  ...namespaces: Array<'admin' | 'dashboard' | 'forum' | 'hackathons' | 'messages' | 'openings' | 'profile' | 'projectForm' | 'reviews' | 'showcase' | 'workspace'>
): PageImport {
  return () => Promise.all([load(), i18n.loadNamespaces(namespaces)]).then(([module]) => module);
}

/**
 * Coquilles chargées à la demande, comme les pages. L'espace d'équipe (en-tête, onglets, discussion) n'est téléchargé
 * qu'à la première visite, avec ses textes et ceux des revues (son onglet Revues, la synchronisation du dépôt).
 */
export const layouts = {
  workspace: withTexts(() => import('@/components/layout/WorkspaceLayout'), 'workspace', 'reviews'),
} satisfies Record<string, PageImport>;

/** Une page de l'espace d'équipe : précharger la page précharge aussi sa coquille. */
function inWorkspace(load: PageImport): PageImport {
  return () => Promise.all([load(), layouts.workspace()]).then(([module]) => module);
}

/**
 * Code de chaque page, dans son propre fichier du build, téléchargé seulement à la première visite.
 * Le router s'en sert à la navigation ; config/navigation.ts pour précharger une page au survol
 * de son lien (lib/prefetch.ts).
 */
export const pages = {
  landing: () => import('@/pages/landing/LandingPage'),

  showcase: withTexts(() => import('@/pages/showcase/ShowcasePage'), 'showcase'),
  // Les textes des revues : la carte des pull requests du dépôt (RepositorySyncCard)
  project: withTexts(() => import('@/pages/projects/ProjectPage'), 'reviews'),
  openings: withTexts(() => import('@/pages/openings/OpeningsPage'), 'openings'),
  // Les champs d'un rôle sont ceux du formulaire de projet ; l'aperçu est une carte de la page des annonces
  newOpening: withTexts(() => import('@/pages/openings/NewOpeningPage'), 'openings', 'projectForm'),
  hackathons: withTexts(() => import('@/pages/hackathons/HackathonsPage'), 'hackathons'),
  hackathon: withTexts(() => import('@/pages/hackathons/HackathonPage'), 'hackathons'),
  forum: withTexts(() => import('@/pages/forum/ForumPage'), 'forum'),
  topic: withTexts(() => import('@/pages/forum/TopicPage'), 'forum'),
  newTopic: withTexts(() => import('@/pages/forum/NewTopicPage'), 'forum'),
  editTopic: withTexts(() => import('@/pages/forum/EditTopicPage'), 'forum'),
  profile: withTexts(() => import('@/pages/profile/ProfilePage'), 'profile'),
  search: () => import('@/pages/search/SearchPage'),

  // L'atelier montre aussi le prochain hackathon de l'équipe (HackathonSpotlight) et des annonces (OpeningCard)
  dashboard: withTexts(() => import('@/pages/dashboard/DashboardPage'), 'dashboard', 'hackathons', 'openings', 'reviews'),
  myProjects: () => import('@/pages/projects/MyProjectsPage'),
  newProject: withTexts(() => import('@/pages/projects/NewProjectPage'), 'projectForm'),
  workspaceBoard: inWorkspace(() => import('@/pages/workspace/WorkspaceBoardPage')),
  workspaceReviews: inWorkspace(() => import('@/pages/workspace/WorkspaceReviewsPage')),
  workspaceDevlog: inWorkspace(() => import('@/pages/workspace/WorkspaceDevlogPage')),
  workspaceRoles: inWorkspace(() => import('@/pages/workspace/WorkspaceRolesPage')),
  workspaceSettings: inWorkspace(() => import('@/pages/workspace/WorkspaceSettingsPage')),
  review: withTexts(() => import('@/pages/reviews/ReviewPage'), 'reviews'),
  reviews: withTexts(() => import('@/pages/reviews/ReviewsPage'), 'reviews'),
  messages: withTexts(() => import('@/pages/messages/MessagesPage'), 'messages'),
  notifications: () => import('@/pages/notifications/NotificationsPage'),
  settings: () => import('@/pages/settings/SettingsPage'),

  // Back-office
  admin: withTexts(() => import('@/pages/admin/AdminOverviewPage'), 'admin'),
  adminUsers: withTexts(() => import('@/pages/admin/AdminUsersPage'), 'admin'),
  adminContent: withTexts(() => import('@/pages/admin/AdminContentPage'), 'admin'),
  adminJournal: withTexts(() => import('@/pages/admin/AdminJournalPage'), 'admin'),

  login: () => import('@/pages/auth/LoginPage'),
  register: () => import('@/pages/auth/RegisterPage'),
  oauthCallback: () => import('@/pages/auth/OAuthCallbackPage'),
  privacy: () => import('@/pages/legal/PrivacyPage'),
  terms: () => import('@/pages/legal/TermsPage'),
  notFound: () => import('@/pages/NotFoundPage'),
} satisfies Record<PageName, PageImport>;
