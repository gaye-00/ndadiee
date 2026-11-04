import { useParams } from 'react-router-dom';
import DevlogTimeline from '@/components/projects/DevlogTimeline';
import DevlogComposer from '@/components/workspace/DevlogComposer';
import { useProject } from '@/hooks/useProjects';

/** Espace d'équipe, onglet Devlog : le journal de progression, où l'équipe note ce qui change. */
export default function WorkspaceDevlogPage() {
  const { slug } = useParams();
  const { data: project } = useProject(slug);
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <DevlogComposer />
      {project && <DevlogTimeline project={project} />}
    </div>
  );
}
