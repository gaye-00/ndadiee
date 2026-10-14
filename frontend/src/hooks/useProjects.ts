import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectService } from '@/services/project.service';
import type { MemberDecisionRequest, ProjectFilters, ProjectRequest } from '@/types/project.types';

export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: () => projectService.getAll(filters),
    placeholderData: keepPreviousData,
  });
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
    if (projectId !== undefined) {
      void qc.invalidateQueries({ queryKey: ['project-members', projectId] });
    }
  };
}

export function useCreateProject() {
  const qc = useQueryClient();
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: (body: ProjectRequest) => projectService.create(body),
    onSuccess: () => {
      invalidate();
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
    meta: { handlesError: true },
  });
}

/** Demande à contribuer (join = true) ou quitte le projet / annule sa demande (join = false). */
export function useProjectMembership() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: async ({ projectId, join }: { projectId: number; join: boolean }) => {
      if (join) {
        await projectService.join(projectId);
      } else {
        await projectService.leave(projectId);
      }
    },
    onSuccess: (_result, { projectId }) => invalidate(projectId),
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
