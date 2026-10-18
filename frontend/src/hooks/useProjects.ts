import {
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { projectService } from '@/services/project.service';
import type {
  FeedbackCall,
  FeedbackRequest,
  JoinProjectRequest,
  MemberDecisionRequest,
  NewProjectRequest,
  ProjectFacetFilters,
  ProjectFilters,
} from '@/types/project.types';

/** Requête d'une liste de projets : partagée par les hooks et le préchargement (LandingPage). */
export const projectsQuery = (filters?: ProjectFilters) =>
  queryOptions({
    queryKey: ['projects', filters],
    queryFn: () => projectService.getAll(filters),
  });

/**
 * La vitrine de l'accueil : les six projets les plus étoilés. Deux rangées de trois sur grand écran ;
 * tablette et téléphone en montrent quatre (landing/ShowcasePreview.tsx).
 */
export const SHOWCASE_FILTERS = { size: 6, sort: 'starsCount,desc' } as const satisfies ProjectFilters;

export function useProjects(filters?: ProjectFilters) {
  return useQuery({ ...projectsQuery(filters), placeholderData: keepPreviousData });
}

/** La vitrine complète se déroule douze projets à la fois : quatre rangées de trois, six rangées de deux. */
export const SHOWCASE_PAGE_SIZE = 12;

/**
 * La vitrine complète, page après page, avec ses filtres (pages/showcase). Pendant qu'un nouveau filtre
 * charge, les projets d'avant restent affichés.
 */
export function useShowcaseProjects(filters: ProjectFilters) {
  return useInfiniteQuery({
    queryKey: ['projects', 'showcase', filters],
    queryFn: ({ pageParam }) => projectService.getAll({ ...filters, page: pageParam, size: SHOWCASE_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    placeholderData: keepPreviousData,
  });
}

/** Requête des facettes de la vitrine : partagée par les filtres et l'accroche de la page. */
export const projectFacetsQuery = (filters: ProjectFacetFilters = {}) =>
  queryOptions({
    queryKey: ['projects', 'facets', filters],
    queryFn: () => projectService.getFacets(filters),
  });

/** Facettes de la vitrine : combien de projets pour chaque rôle, technologie et pays. Sans filtre : toute la vitrine. */
export function useProjectFacets(filters?: ProjectFacetFilters) {
  return useQuery({ ...projectFacetsQuery(filters), placeholderData: keepPreviousData });
}

/** Les derniers projets qui recrutent, pour l'accroche de l'accueil : leurs porteurs et leur nombre. */
export function useRecruitingProjects() {
  return useProjects({ lookingForContributors: true, size: 4 });
}

export function useProject(slug: string | undefined) {
  return useQuery({
    queryKey: ['project', slug],
    queryFn: () => projectService.getBySlug(slug!),
    enabled: !!slug,
  });
}

export function useProjectMembers(projectId: number | undefined) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectService.getMembers(projectId!),
    enabled: projectId !== undefined,
  });
}

function useInvalidateProjects() {
  const qc = useQueryClient();
  return (projectId?: number) => {
    void qc.invalidateQueries({ queryKey: ['projects'] });
    void qc.invalidateQueries({ queryKey: ['project'] });
    // Les annonces disent les candidatures reçues, et celle du membre connecté
    void qc.invalidateQueries({ queryKey: ['openings'] });
    // L'atelier montre ses équipes, ses candidatures et celles qu'il doit étudier
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
    if (projectId !== undefined) {
      void qc.invalidateQueries({ queryKey: ['project-members', projectId] });
    }
  };
}

/** Publie un projet : sa page, reçue en retour, est déjà en cache quand on y arrive. */
export function useCreateProject() {
  const qc = useQueryClient();
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: (body: NewProjectRequest) => projectService.create(body),
    onSuccess: (project) => {
      invalidate();
      qc.setQueryData(['project', project.slug], project);
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
    meta: { handlesError: true },
  });
}

/**
 * Demande à contribuer (join = true), en visant un rôle et avec un mot pour l'équipe ; ou quitte le
 * projet / annule sa demande (join = false).
 */
export function useProjectMembership() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: async ({ projectId, join, request }: { projectId: number; join: boolean; request?: JoinProjectRequest }) => {
      if (join) {
        await projectService.join(projectId, request);
      } else {
        await projectService.leave(projectId);
      }
    },
    onSuccess: (_result, { projectId }) => invalidate(projectId),
    meta: { handlesError: true },
  });
}

/** Devlog d'un projet, page après page : les entrées les plus récentes d'abord. */
export const DEVLOG_PAGE_SIZE = 4;

export function useProjectDevlog(projectId: number | undefined) {
  return useInfiniteQuery({
    queryKey: ['project-devlog', projectId],
    queryFn: ({ pageParam }) => projectService.getDevlog(projectId!, { page: pageParam, size: DEVLOG_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    enabled: projectId !== undefined,
  });
}

/** Demandes de retours ouvertes d'un projet. */
export function useFeedbackCalls(projectId: number | undefined) {
  return useQuery({
    queryKey: ['feedback-calls', projectId],
    queryFn: () => projectService.getFeedbackCalls(projectId!),
    enabled: projectId !== undefined,
  });
}

/** Donne son avis : la demande renvoyée (retour compté, « déjà donné ») remplace celle du cache. */
export function useGiveFeedback(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, body }: { callId: number; body: FeedbackRequest }) =>
      projectService.giveFeedback(projectId, callId, body),
    onSuccess: (call) => {
      qc.setQueryData<FeedbackCall[]>(['feedback-calls', projectId], (calls) =>
        calls?.map((candidate) => (candidate.id === call.id ? call : candidate)),
      );
    },
    meta: { handlesError: true },
  });
}

/** Accepte ou refuse une demande de contribution. Réservé au propriétaire et aux mainteneurs. */
export function useDecideMember(projectId: number) {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: ({ memberId, decision }: { memberId: number; decision: MemberDecisionRequest }) =>
      projectService.decide(projectId, memberId, decision),
    onSuccess: () => invalidate(projectId),
  });
}
