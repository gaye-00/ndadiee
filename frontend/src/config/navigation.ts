import {
  FolderKanban,
  GitPullRequestArrow,
  House,
  LayoutGrid,
  Mail,
  MessagesSquare,
  Plus,
  Sparkles,
  Trophy,
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

/** Barre flottante du visiteur (design 3A) */
export const PUBLIC_NAV: readonly NavItem[] = [showcase, openings, hackathons, forum];

/** Rail de l'application connectée (design 3B, 3E) */
export const APP_NAV: readonly NavItem[] = [dashboard, projects, reviews, openings, hackathons, forum, messages];

/** Barre d'onglets mobile (design 3G) : deux onglets, le bouton de création au centre, deux onglets */
export const MOBILE_TABS: readonly NavItem[] = [dashboard, projects, reviews, messages];
export const MOBILE_CREATE: NavItem = {
  labelKey: 'create',
  to: paths.newProject,
  icon: Plus,
  preload: pages.newProject,
};
