import { Briefcase, FileText, FolderGit2, MessagesSquare, Newspaper, type LucideIcon } from 'lucide-react';
import { paths } from '@/router/paths';

export interface NavItem {
  label: string;
  /** Libellé de la barre du bas sur mobile, quand `label` est trop long pour une colonne */
  shortLabel?: string;
  to: string;
  icon: LucideIcon;
}

/** Sections principales : même liste pour la barre latérale, la navigation mobile et le menu de commandes. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Fil', to: paths.feed, icon: Newspaper },
  { label: 'Questions', to: paths.questions, icon: MessagesSquare },
  { label: 'Articles', to: paths.articles, icon: FileText },
  { label: 'Projets', to: paths.projects, icon: FolderGit2 },
  { label: 'Opportunités', shortLabel: 'Offres', to: paths.opportunities, icon: Briefcase },
];
