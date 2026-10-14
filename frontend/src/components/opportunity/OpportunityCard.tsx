import { Banknote, Building2, Calendar, ExternalLink, MapPin } from 'lucide-react';
import TagList from '@/components/shared/TagList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Opportunity } from '@/types/opportunity.types';
import { OPPORTUNITY_TYPE_LABELS, WORK_MODE_LABELS } from '@/utils/constants';
import { countryFlag, countryName, formatDate, formatRelativeTime, plainText } from '@/utils/formatters';

interface OpportunityCardProps {
  opportunity: Opportunity;
}

export default function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const location = [opportunity.city, countryName(opportunity.country)].filter(Boolean).join(', ');

  return (
    <article className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{OPPORTUNITY_TYPE_LABELS[opportunity.type]}</Badge>
        <Badge variant="outline">{WORK_MODE_LABELS[opportunity.workMode]}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">{formatRelativeTime(opportunity.createdAt)}</span>
      </div>

      <div>
        <h3 className="text-lg font-semibold">{opportunity.title}</h3>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Building2 className="size-4" /> {opportunity.companyName}
        </p>
      </div>

      <p className="line-clamp-3 text-sm text-muted-foreground">{plainText(opportunity.description)}</p>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {location && (
          <li className="flex items-center gap-1.5">
            <MapPin className="size-4 text-muted-foreground" /> {countryFlag(opportunity.country)} {location}
          </li>
        )}
        {opportunity.salaryRange && (
          <li className="flex items-center gap-1.5">
            <Banknote className="size-4 text-muted-foreground" /> {opportunity.salaryRange}
          </li>
        )}
        {opportunity.deadline && (
          <li className="flex items-center gap-1.5">
            <Calendar className="size-4 text-muted-foreground" /> Jusqu'au {formatDate(opportunity.deadline)}
          </li>
        )}
      </ul>

      <TagList tags={opportunity.tags} />

      {opportunity.applyUrl && (
        <Button size="sm" asChild>
          <a href={opportunity.applyUrl} target="_blank" rel="noopener noreferrer">
            Postuler <ExternalLink />
          </a>
        </Button>
      )}
    </article>
  );
}
