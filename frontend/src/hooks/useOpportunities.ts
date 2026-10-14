import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { opportunityService } from '@/services/opportunity.service';
import type { OpportunityFilters, OpportunityRequest } from '@/types/opportunity.types';

export function useOpportunities(filters?: OpportunityFilters) {
  return useQuery({
    queryKey: ['opportunities', filters],
    queryFn: () => opportunityService.getAll(filters),
    placeholderData: keepPreviousData,
  });
}

export function useOpportunity(id: number | undefined) {
  return useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => opportunityService.getById(id!),
    enabled: id !== undefined,
  });
}

export function useCreateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OpportunityRequest) => opportunityService.create(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['opportunities'] }),
    meta: { handlesError: true },
  });
}
