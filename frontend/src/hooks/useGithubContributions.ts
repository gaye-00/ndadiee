import { useQuery } from '@tanstack/react-query';
import { githubService } from '@/services/github.service';

/** Contributions GitHub de la dernière année d'un pseudo ; rien n'est demandé tant qu'il est vide. */
export function useGithubContributions(login: string | null) {
  return useQuery({
    queryKey: ['github-contributions', login?.toLowerCase()],
    queryFn: ({ signal }) => githubService.getContributions(login!, signal),
    enabled: !!login,
    // Le calendrier ne bouge qu'une fois par jour au plus
    staleTime: 1000 * 60 * 60,
  });
}
