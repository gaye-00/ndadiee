import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import { openingService } from '@/services/opening.service';
import type { OpeningFilters } from '@/types/project.types';

/** Requête d'une liste d'annonces : partagée par le hook et le préchargement (accueil, « Se rencontrer »). */
export const openingsQuery = (filters?: OpeningFilters) =>
  queryOptions({
    queryKey: ['openings', filters],
    queryFn: () => openingService.getAll(filters),
  });

export function useOpenings(filters?: OpeningFilters) {
  return useQuery({ ...openingsQuery(filters), placeholderData: keepPreviousData });
}

/** Rôles où l'on recrute en ce moment, dans l'ordre du catalogue (bande des rôles de l'accueil). */
export const openingRoleSummaryQuery = queryOptions({
  queryKey: ['openings', 'roles'],
  queryFn: openingService.getRoleSummary,
});

export function useOpeningRoleSummary() {
  return useQuery(openingRoleSummaryQuery);
}

/** Technologies des projets qui recrutent, les plus demandées d'abord (accueil, « Se rencontrer »). */
export const openingStackSummaryQuery = queryOptions({
  queryKey: ['openings', 'stacks'],
  queryFn: () => openingService.getStackSummary(30),
});

export function useOpeningStackSummary() {
  return useQuery(openingStackSummaryQuery);
}
