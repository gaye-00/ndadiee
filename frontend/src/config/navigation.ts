import {
  FolderKanban,
  FolderPlus,
  GitPullRequestArrow,
  House,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Mail,
  MessageSquarePlus,
  MessagesSquare,
  Plus,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type frCommon from '@/i18n/locales/fr/common.json';
import { pages, type PageImport } from '@/router/pages';
import { paths } from '@/router/paths';

export interface NavItem {
  /** Libellé : clé de la section `nav` des traductions */
  labelKey: keyof typeof frCommon.nav;
  to: string;
  icon: LucideIcon;
  /** Code de la page, à précharger au survol ou au focus du lien : prefetch(item.preload) */
  preload: PageImport;
}

const showcase: NavItem = { labelKey: 'showcase', to: paths.showcase, icon: LayoutGrid, preload: pages.showcase };
const openings: NavItem = { labelKey: 'openings', to: paths.openings, icon: Sparkles, preload: pages.openings };
const hackathons: NavItem = { labelKey: 'hackathons', to: paths.hackathons, icon: Trophy, preload: pages.hackathons };
const forum: NavItem = { labelKey: 'forum', to: paths.forum, icon: MessagesSquare, preload: pages.forum };
const dashboard: NavItem = { labelKey: 'dashboard', to: paths.dashboard, icon: House, preload: pages.dashboard };
const projects: NavItem = { labelKey: 'projects', to: paths.myProjects, icon: FolderKanban, preload: pages.myProjects };
const reviews: NavItem = { labelKey: 'reviews', to: paths.reviews, icon: GitPullRequestArrow, preload: pages.reviews };
const messages: NavItem = { labelKey: 'messages', to: paths.messages, icon: Mail, preload: pages.messages };
const backOffice: NavItem = { labelKey: 'admin', to: paths.admin, icon: ShieldCheck, preload: pages.admin };

/** La page affichée est-elle celle du lien, ou une de ses pages (« /projects/lagos-transit » pour « /projects ») ? */
export function isCurrentPath(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Barre flottante du visiteur (design 3A) */
export const PUBLIC_NAV: readonly NavItem[] = [showcase, openings, hackathons, forum];

/** Rail de l'application connectée (design 3B, 3E) */
export const APP_NAV: readonly NavItem[] = [dashboard, projects, reviews, openings, hackathons, forum, messages];

/** Barre d'onglets mobile (design 3G) : deux onglets, le bouton de création au centre, deux onglets */
export const MOBILE_TABS: readonly NavItem[] = [dashboard, projects, reviews, messages];
/**
 * Un admin qui parcourt le site : le back-office d'abord, puis les sections publiques. Il ne participe pas à la
 * communauté (pas d'atelier, de projets ni de messages, pas de bouton de création).
 */
export const ADMIN_APP_NAV: readonly NavItem[] = [backOffice, showcase, openings, hackathons, forum];
export const ADMIN_MOBILE_TABS: readonly NavItem[] = [backOffice, showcase, forum, hackathons];

/** Ce qu'un membre peut créer : bouton central de la barre mobile, palette de recherche */
export interface CreateAction {
  label: 'actions.newProject' | 'actions.publishRole' | 'actions.newTopic';
  to: string;
  icon: LucideIcon;
  load: PageImport;
  tone: string;
}

export const CREATE_ACTIONS: readonly CreateAction[] = [
  { label: 'actions.newProject', to: paths.newProject, icon: FolderPlus, load: pages.newProject, tone: 'bg-kente-gold' },
  { label: 'actions.publishRole', to: paths.newOpening, icon: Sparkles, load: pages.newOpening, tone: 'bg-kente-coral' },
  { label: 'actions.newTopic', to: paths.newTopic, icon: MessageSquarePlus, load: pages.newTopic, tone: 'bg-kente-jade' },
];

/** Une section du back-office. Libellé : `shell.sections` de l'espace de noms `admin`. */
export interface AdminSection {
  key: 'overview' | 'users' | 'content' | 'journal';
  to: string;
  icon: LucideIcon;
  preload: PageImport;
}

/** Les sections du back-office (sa console, à gauche ; ses pastilles, sur téléphone) */
export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { key: 'overview', to: paths.admin, icon: LayoutDashboard, preload: pages.admin },
  { key: 'users', to: paths.adminUsers, icon: Users, preload: pages.adminUsers },
  { key: 'content', to: paths.adminContent, icon: Layers, preload: pages.adminContent },
  { key: 'journal', to: paths.adminJournal, icon: ScrollText, preload: pages.adminJournal },
];

/** La section du back-office ouverte : la vue d'ensemble seulement à son adresse exacte */
export function isCurrentSection(pathname: string, section: AdminSection): boolean {
  return section.to === paths.admin ? pathname === paths.admin || pathname === `${paths.admin}/` : isCurrentPath(pathname, section.to);
}

export const MOBILE_CREATE: NavItem = {
  labelKey: 'create',
  to: paths.newProject,
  icon: Plus,
  preload: pages.newProject,
};
