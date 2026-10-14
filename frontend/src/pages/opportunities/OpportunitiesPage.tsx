import { Briefcase } from 'lucide-react';
import OpportunityCard from '@/components/opportunity/OpportunityCard';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import PageHeader from '@/components/shared/PageHeader';
import Pagination from '@/components/shared/Pagination';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import type { OpportunityType } from '@/types/opportunity.types';
import { OPPORTUNITY_TYPE_LABELS } from '@/utils/constants';

const TYPES = Object.keys(OPPORTUNITY_TYPE_LABELS) as OpportunityType[];

export default function OpportunitiesPage() {
  const { get, page, update } = useUrlFilters();
  const type = get('type') as OpportunityType | undefined;

  const opportunities = useOpportunities({ type, page, size: 10 });

  return (
    <>
      <PageHeader
        title="Opportunités"
        description="Emplois, missions freelance, stages et hackathons ouverts en ce moment."
      />

      <Tabs
        value={type ?? 'ALL'}
        onValueChange={(value) => update({ type: value === 'ALL' ? null : value, page: null })}
        className="mb-4"
      >
        <TabsList aria-label="Type d'opportunité">
          <TabsTrigger value="ALL">Toutes</TabsTrigger>
          {TYPES.map((value) => (
            <TabsTrigger key={value} value={value}>
              {OPPORTUNITY_TYPE_LABELS[value]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {opportunities.isPending ? (
        <ListSkeleton />
      ) : opportunities.isError ? (
        <ErrorState error={opportunities.error} onRetry={() => void opportunities.refetch()} />
      ) : opportunities.data.content.length === 0 ? (
        <EmptyState icon={<Briefcase />} title="Aucune opportunité" description="Rien d'ouvert dans cette catégorie pour l'instant." />
      ) : (
        <div className="space-y-4">
          {opportunities.data.content.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
          <Pagination page={opportunities.data} onPageChange={(next) => update({ page: String(next) })} />
        </div>
      )}
    </>
  );
}
