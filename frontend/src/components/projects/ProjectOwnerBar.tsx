import { LayoutDashboard, PenLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { prefetch } from '@/lib/prefetch';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { Project } from '@/types/project.types';

const button =
  'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-soft-foreground outline-none transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * Au-dessus d'un projet, pour son porteur (ou un modérateur) : le modifier, et rejoindre l'espace d'équipe. Rien pour
 * les autres visiteurs.
 */
export default function ProjectOwnerBar({ project }: { project: Project }) {
  const { t } = useTranslation();
  const { user, canModerate } = useAuth();
  const own = user?.id === project.owner.id;

  if (!own && !canModerate) {
    return null;
  }
  const preload = () => prefetch(pages.editProject);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-border-subtle bg-card/60 py-1.5 ps-4 pe-1.5 shadow-sm">
      <p className="me-auto py-1.5 text-sm text-muted-foreground">{t(own ? 'project.owner.yours' : 'project.owner.moderation')}</p>
      {own && (
        <Link to={paths.workspace(project.slug)} viewTransition className={button}>
          <LayoutDashboard aria-hidden className="size-4" />
          {t('project.openWorkspace')}
        </Link>
      )}
      <Link
        to={paths.editProject(project.slug)}
        viewTransition
        onPointerEnter={preload}
        onFocus={preload}
        className={`${button} bg-foreground/5 text-foreground`}
      >
        <PenLine aria-hidden className="size-4" />
        {t('project.owner.edit')}
      </Link>
    </div>
  );
}
