import {
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { hackathonService } from '@/services/hackathon.service';
import type { HackathonFilters, HackathonTeamRequest } from '@/types/hackathon.types';

/** Requête d'une liste de hackathons : partagée par les hooks et le préchargement. */
export const hackathonsQuery = (filters?: HackathonFilters) =>
  queryOptions({
    queryKey: ['hackathons', filters],
    queryFn: () => hackathonService.getAll(filters),
  });

/** La page des hackathons : ceux en cours, puis ceux à venir, du plus proche au plus lointain. */
export const LIVE_HACKATHONS = { status: 'ONGOING', size: 6 } as const satisfies HackathonFilters;
export const UPCOMING_HACKATHONS = { status: 'UPCOMING', size: 12 } as const satisfies HackathonFilters;

// Le palmarès se déroule quatre hackathons à la fois, du plus récent au plus ancien
const PAST_PAGE_SIZE = 4;

export function useHackathons(filters?: HackathonFilters) {
  return useQuery({ ...hackathonsQuery(filters), placeholderData: keepPreviousData });
}

/** Les hackathons terminés et leur palmarès, page après page (« Hackathons précédents »). */
export function usePastHackathons() {
  return useInfiniteQuery({
    queryKey: ['hackathons', 'past'],
    queryFn: ({ pageParam }) => hackathonService.getAll({ status: 'ENDED', page: pageParam, size: PAST_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
  });
}

export function useHackathon(slug: string | undefined) {
  return useQuery({
    queryKey: ['hackathon', slug],
    queryFn: () => hackathonService.getBySlug(slug!),
    enabled: !!slug,
  });
}

/** Toutes les équipes d'un hackathon, avec leurs membres et les rôles qu'elles cherchent encore. */
export function useHackathonTeams(hackathonId: number | undefined) {
  return useQuery({
    queryKey: ['hackathon-teams', hackathonId],
    queryFn: () => hackathonService.getTeams(hackathonId!),
    enabled: hackathonId !== undefined,
  });
}

/** Les hackathons à venir ou en cours où le membre connecté a une équipe (atelier, design 3B). */
export function useMyHackathons() {
  const { isAuthenticated, isDeveloper } = useAuth();
  return useQuery({
    queryKey: ['hackathons', 'mine'],
    queryFn: hackathonService.getMine,
    enabled: isAuthenticated && isDeveloper,
  });
}

// Une inscription change le hackathon, ses équipes, et le projet (sa pastille « inscrit au hackathon »)
function useInvalidateHackathons() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['hackathons'] });
    void qc.invalidateQueries({ queryKey: ['hackathon'] });
    void qc.invalidateQueries({ queryKey: ['hackathon-teams'] });
    void qc.invalidateQueries({ queryKey: ['projects'] });
    void qc.invalidateQueries({ queryKey: ['project'] });
  };
}

/** Inscrit un projet comme équipe. L'erreur s'affiche dans la fenêtre d'inscription. */
export function useRegisterTeam(hackathonId: number) {
  const invalidate = useInvalidateHackathons();
  return useMutation({
    mutationFn: (body: HackathonTeamRequest) => hackathonService.register(hackathonId, body),
    onSuccess: invalidate,
    meta: { handlesError: true },
  });
}

/** Retire l'équipe d'un projet, avant le coup d'envoi. */
export function useWithdrawTeam(hackathonId: number) {
  const invalidate = useInvalidateHackathons();
  return useMutation({
    mutationFn: (projectId: number) => hackathonService.withdraw(hackathonId, projectId),
    onSuccess: invalidate,
  });
}
