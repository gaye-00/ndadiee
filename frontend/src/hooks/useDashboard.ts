import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { dashboardService } from '@/services/dashboard.service';
import { projectService } from '@/services/project.service';
import { useDataSaverStore } from '@/store/useDataSaverStore';
import type { ApplicationReview, Dashboard } from '@/types/dashboard.types';

// L'atelier se tient à jour tout seul, page ouverte : l'activité des équipes, les candidatures qui arrivent
const REFRESH_INTERVAL = 60_000;

/** Requête de l'atelier : partagée par ses blocs, chacun n'écoute que sa part (`select`). */
export const dashboardQuery = queryOptions({
  queryKey: ['dashboard'],
  queryFn: dashboardService.get,
});

/**
 * L'atelier du membre connecté (design 3B), ou la part qu'en choisit `select` : un bloc ne se redessine que si
 * sa part change. Rafraîchi chaque minute tant que la page est à l'écran, sauf en économie de données.
 */
export function useDashboard<T = Dashboard>(select?: (dashboard: Dashboard) => T) {
  const { isAuthenticated, isDeveloper } = useAuth();
  const dataSaver = useDataSaverStore((s) => s.enabled);
  return useQuery({
    ...dashboardQuery,
    select,
    enabled: isAuthenticated && isDeveloper,
    refetchInterval: dataSaver ? false : REFRESH_INTERVAL,
  });
}

/**
 * Accueille un candidat dans l'équipe, au rôle de l'annonce, ou décline sa candidature. Elle quitte aussitôt
 * l'atelier ; le projet, ses annonces et son équipe se rechargent.
 */
export function useDecideApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ application, accept }: { application: ApplicationReview; accept: boolean }) =>
      projectService.decide(application.project.id, application.memberId, {
        status: accept ? 'ACCEPTED' : 'REJECTED',
        ...(accept ? { role: 'CONTRIBUTOR' as const, specialty: application.role ?? undefined } : {}),
      }),
    onSuccess: (_member, { application }) => {
      qc.setQueryData<Dashboard>(dashboardQuery.queryKey, (dashboard) =>
        dashboard && {
          ...dashboard,
          applications: dashboard.applications.filter((candidate) => candidate.memberId !== application.memberId),
          projects: dashboard.projects.map((project) =>
            project.id === application.project.id
              ? { ...project, pendingApplications: Math.max(0, project.pendingApplications - 1) }
              : project,
          ),
        },
      );
      void qc.invalidateQueries({ queryKey: dashboardQuery.queryKey });
      void qc.invalidateQueries({ queryKey: ['projects'] });
      void qc.invalidateQueries({ queryKey: ['project'] });
      void qc.invalidateQueries({ queryKey: ['openings'] });
      void qc.invalidateQueries({ queryKey: ['project-members', application.project.id] });
    },
  });
}
