import { useParams } from 'react-router-dom';
import DevlogTimeline from '@/components/projects/DevlogTimeline';
import { useProject } from '@/hooks/useProjects';

/** Espace d'équipe, onglet Devlog : le journal de progression. */
export default function WorkspaceDevlogPage() {
  const { slug } = useParams();
  const { data: project } = useProject(slug);
  return project ? <DevlogTimeline project={project} /> : null;
}
