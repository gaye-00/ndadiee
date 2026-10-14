import { ExternalLink, Star, Users } from 'lucide-react';
import { toast } from 'sonner';
import TagList from '@/components/shared/TagList';
import UserCard from '@/components/shared/UserCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProjectMembership } from '@/hooks/useProjects';
import { useVote } from '@/hooks/useVotes';
import type { Project } from '@/types/project.types';
import { countLabel, plainText } from '@/utils/formatters';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const { isAuthenticated, user } = useAuth();
  const vote = useVote();
  const membership = useProjectMembership();
  const isOwner = user?.id === project.owner.id;

  const toggleStar = () => {
    if (!isAuthenticated) {
      toast.info('Connectez-vous pour ajouter une étoile');
      return;
    }
    // Une étoile est un vote +1 sur le projet ; la retirer, c'est retirer ce vote
    vote.mutate({ targetType: 'PROJECT', targetId: project.id, value: project.starredByMe ? 0 : 1 });
  };

  const requestToJoin = () => {
    if (!isAuthenticated) {
      toast.info('Connectez-vous pour contribuer à ce projet');
      return;
    }
    membership.mutate(
      { projectId: project.id, join: true },
      { onSuccess: () => toast.success('Demande envoyée au propriétaire du projet') },
    );
  };

  return (
    <article className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">{project.name}</h3>
        <Button
          variant={project.starredByMe ? 'default' : 'outline'}
          size="sm"
          onClick={toggleStar}
          disabled={vote.isPending || isOwner}
          aria-pressed={project.starredByMe === true}
          title={isOwner ? "Vous ne pouvez pas étoiler votre propre projet" : undefined}
        >
          <Star /> {project.starsCount}
        </Button>
      </div>

      <p className="line-clamp-3 text-sm text-muted-foreground">{plainText(project.description)}</p>
      <TagList tags={project.tags} />

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
        <UserCard user={project.owner} size="sm" />
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="size-3.5" /> {countLabel(project.memberCount, 'membre')}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        {project.myMembershipStatus === 'ACCEPTED' && <Badge variant="secondary">Vous êtes membre</Badge>}
        {project.myMembershipStatus === 'PENDING' && <Badge variant="outline">Demande en attente</Badge>}
        {project.lookingForContributors && !project.myMembershipStatus && (
          <Button size="sm" onClick={requestToJoin} disabled={membership.isPending}>
            Contribuer
          </Button>
        )}
        {project.repositoryUrl && (
          <Button variant="ghost" size="sm" asChild className="ml-auto">
            <a href={project.repositoryUrl} target="_blank" rel="noopener noreferrer">
              Dépôt <ExternalLink />
            </a>
          </Button>
        )}
      </div>
    </article>
  );
}
