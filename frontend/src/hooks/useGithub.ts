import { useMutation, useQuery } from '@tanstack/react-query';
import { githubService } from '@/services/github.service';

/** Lire un dépôt public pour préremplir un projet (l'erreur est montrée par le formulaire) */
export function useGithubRepositoryImport() {
  return useMutation({
    mutationFn: ({ owner, name }: { owner: string; name: string }) => githubService.getRepository(owner, name),
    meta: { handlesError: true },
  });
}

/** Les dépôts récents du membre connecté, d'après le GitHub de son profil */
export function useMyGithubRepositories(enabled: boolean) {
  return useQuery({
    queryKey: ['github', 'me', 'repositories'],
    queryFn: githubService.getMyRepositories,
    enabled,
    // GitHub compte chaque requête : la liste reste valable le temps d'écrire un projet
    staleTime: 1000 * 60 * 10,
    retry: false,
  });
}
