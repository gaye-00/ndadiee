import DevlogTimeline from '@/components/projects/DevlogTimeline';
import FeedbackRequestCard from '@/components/projects/FeedbackRequestCard';
import GithubActivityCard from '@/components/projects/GithubActivityCard';
import OpenRolesList from '@/components/projects/OpenRolesList';
import ProjectGallery from '@/components/projects/ProjectGallery';
import ProjectHero from '@/components/projects/ProjectHero';
import TeamMembersCard from '@/components/projects/TeamMembersCard';

/** Page projet : présentation publique et recrutement de l'équipe. Design 3D. */
export default function ProjectPage() {
  return (
    <>
      <ProjectHero />
      <ProjectGallery />
      <OpenRolesList />
      <DevlogTimeline />
      <aside>
        <TeamMembersCard />
        <FeedbackRequestCard />
        <GithubActivityCard />
      </aside>
    </>
  );
}
