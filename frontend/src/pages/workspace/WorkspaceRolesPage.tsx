import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import OpenRolesList from '@/components/projects/OpenRolesList';
import { useWorkspaceContext } from '@/components/workspace/workspaceContext';
import { outlineButton } from '@/components/workspace/workspaceStyles';
import { useProject } from '@/hooks/useProjects';
import { prefetch } from '@/lib/prefetch';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';

/** Espace d'équipe, onglet Rôles ouverts : ceux que l'équipe cherche, et pour qui la gère, en publier un. */
export default function WorkspaceRolesPage() {
  const { t } = useTranslation('workspace');
  const { slug } = useParams();
  const { workspace } = useWorkspaceContext();
  const { data: project } = useProject(slug);
  return (
    <div className="flex max-w-4xl flex-col gap-4">
      {workspace.canManage && (
        <div className="flex justify-end">
          <Link
            to={paths.newOpening}
            viewTransition
            onPointerEnter={() => prefetch(pages.newOpening)}
            onFocus={() => prefetch(pages.newOpening)}
            className={outlineButton}
          >
            <Plus aria-hidden className="size-4" />
            {t('openRoles.publish')}
          </Link>
        </div>
      )}
      {project && <OpenRolesList project={project} />}
    </div>
  );
}
