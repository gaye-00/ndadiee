import { keepPreviousData, queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { openingService } from '@/services/opening.service';
import type { OpeningFacetFilters, OpeningFilters } from '@/types/project.types';

/** Requête d'une liste d'annonces : partagée par le hook et le préchargement (accueil, « Se rencontrer »). */
export const openingsQuery = (filters?: OpeningFilters) =>
  queryOptions({
    queryKey: ['openings', filters],
    queryFn: () => openingService.getAll(filters),
  });

export function useOpenings(filters?: OpeningFilters) {
  return useQuery({ ...openingsQuery(filters), placeholderData: keepPreviousData });
}

/** La page des annonces se déroule douze annonces à la fois : six rangées de deux. */
export const OPENINGS_PAGE_SIZE = 12;

/**
 * Toutes les annonces, page après page, avec leurs filtres (pages/openings). Pendant qu'un nouveau filtre
 * charge, les annonces d'avant restent affichées.
 */
export function useOpeningBoard(filters: OpeningFilters) {
  return useInfiniteQuery({
    queryKey: ['openings', 'board', filters],
    queryFn: ({ pageParam }) => openingService.getAll({ ...filters, page: pageParam, size: OPENINGS_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    placeholderData: keepPreviousData,
  });
}

/** Requête des facettes des annonces : partagée par les filtres et l'accroche de la page. */
export const openingFacetsQuery = (filters: OpeningFacetFilters = {}) =>
  queryOptions({
    queryKey: ['openings', 'facets', filters],
    queryFn: () => openingService.getFacets(filters),
  });

/** Facettes des annonces : combien pour chaque rôle, technologie et pays. Sans filtre : toutes les annonces. */
export function useOpeningFacets(filters?: OpeningFacetFilters) {
  return useQuery({ ...openingFacetsQuery(filters), placeholderData: keepPreviousData });
}

/** Une annonce par son identifiant (candidature reprise après la connexion). */
export function useOpening(id: number | null) {
  return useQuery({
    queryKey: ['openings', 'one', id],
    queryFn: () => openingService.getById(id!),
    enabled: id !== null,
  });
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
