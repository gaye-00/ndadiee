import { useParams } from 'react-router-dom';
import OpenRolesList from '@/components/projects/OpenRolesList';
import { useProject } from '@/hooks/useProjects';

/** Espace d'équipe, onglet Rôles ouverts. */
export default function WorkspaceRolesPage() {
  const { slug } = useParams();
  const { data: project } = useProject(slug);
  return project ? <OpenRolesList project={project} /> : null;
}
