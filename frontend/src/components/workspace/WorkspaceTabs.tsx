import { FolderGit2, LayoutGrid, NotebookPen, Settings2, Sparkles, type LucideIcon } from 'lucide-react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { useWorkspaceContext } from './workspaceContext';
import { focusRing } from './workspaceStyles';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages, type PageImport } from '@/router/pages';
import { paths } from '@/router/paths';

interface Tab {
  id: 'board' | 'reviews' | 'devlog' | 'roles' | 'settings';
  to: string;
  icon: LucideIcon;
  preload: PageImport;
  /** Ce qui attend dans l'onglet, et comment le dire (« 4 pull requests ouvertes ») */
  count?: { value: number; label: string };
}

/**
 * Onglets de l'espace : Tableau, Revues, Devlog, Rôles ouverts, Réglages. Design 3E.
 *
 * Un onglet par adresse : chacun se partage, et Précédent y revient. Ce qui attend s'y compte (PR ouvertes, rôles
 * recherchés). La pastille glisse vers l'onglet choisi ; sur téléphone, la rangée défile de côté.
 */
export default function WorkspaceTabs() {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const { pathname } = useLocation();

  const tabs: Tab[] = [
    { id: 'board', to: paths.workspace(slug), icon: LayoutGrid, preload: pages.workspaceBoard },
    {
      id: 'reviews',
      to: paths.workspaceReviews(slug),
      icon: FolderGit2,
      preload: pages.workspaceReviews,
      count: { value: workspace.openPullRequests, label: t('tabs.reviewsCount', { count: workspace.openPullRequests }) },
    },
    { id: 'devlog', to: paths.workspaceDevlog(slug), icon: NotebookPen, preload: pages.workspaceDevlog },
    {
      id: 'roles',
      to: paths.workspaceRoles(slug),
      icon: Sparkles,
      preload: pages.workspaceRoles,
      count: { value: workspace.openRoles, label: t('tabs.rolesCount', { count: workspace.openRoles }) },
    },
    { id: 'settings', to: paths.workspaceSettings(slug), icon: Settings2, preload: pages.workspaceSettings },
  ];
  // L'onglet de l'adresse : le plus long chemin qui la commence (le tableau est la racine de l'espace)
  const active = [...tabs].sort((a, b) => b.to.length - a.to.length).find((tab) => pathname === tab.to || pathname.startsWith(`${tab.to}/`));

  return (
    <nav aria-label={t('tabs.label')} className="relative mt-5 border-b border-border-subtle">
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {tabs.map((tab) => {
          const selected = tab.id === active?.id;
          const Icon = tab.icon;
          return (
            <li key={tab.id} className="shrink-0 snap-start">
              <NavLink
                to={tab.to}
                end={tab.id === 'board'}
                viewTransition
                preventScrollReset
                onPointerEnter={() => prefetch(tab.preload)}
                onFocus={() => prefetch(tab.preload)}
                className={cn(
                  'group/tab relative flex h-11 items-center gap-2 rounded-t-xl px-3 text-sm font-semibold transition-colors duration-200',
                  selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  focusRing,
                )}
              >
                <Icon aria-hidden className={cn('size-4 transition-colors', selected ? 'text-gold' : 'text-faint-foreground group-hover/tab:text-muted-foreground')} />
                {t(`tabs.${tab.id}`)}
                {tab.count && tab.count.value > 0 && (
                  <span
                    className={cn(
                      'grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[0.625rem] leading-none tabular-nums transition-colors',
                      selected ? 'bg-gold/15 text-gold' : 'bg-foreground/7 text-soft-foreground',
                    )}
                  >
                    <span aria-hidden>{tab.count.value}</span>
                    <span className="sr-only">{tab.count.label}</span>
                  </span>
                )}
                {selected && (
                  <m.span
                    layoutId="workspace-tab"
                    aria-hidden
                    transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-kente"
                  />
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
