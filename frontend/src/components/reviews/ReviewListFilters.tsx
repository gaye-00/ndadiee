import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import FilterSearch from '@/components/shared/FilterSearch';
import { useReviewFilters } from '@/hooks/useReviewFilters';
import { useReviewOverview } from '@/hooks/useReviews';
import { cn } from '@/lib/utils';
import { formatCount } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * La recherche (titre, numéro, projet, branche) et, hors de l'onglet Communauté, les projets de ses équipes qui ont
 * des PR ouvertes : un clic filtre, un second retire le filtre.
 */
export default function ReviewListFilters() {
  const { t } = useTranslation('reviews');
  const { filters, set } = useReviewFilters();
  const { data: overview } = useReviewOverview();
  const projects = filters.tab === 'COMMUNITY' ? [] : (overview?.projects ?? []);

  return (
    <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="lg:w-[22rem] lg:shrink-0">
        <FilterSearch
          query={filters.q}
          onSearch={(q, replace) => set({ q }, { replace })}
          fetchingKey={['reviews', 'list']}
          label={t('filters.search')}
          placeholder={t('filters.searchPlaceholder')}
        />
      </div>
      {projects.length > 0 && (
        <ul aria-label={t('filters.projects')} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          <li>
            <ProjectChip active={filters.project === null} onClick={() => set({ project: null })}>
              {t('filters.allProjects')}
            </ProjectChip>
          </li>
          {projects.map(({ project, open }) => {
            const active = filters.project === project.slug;
            return (
              <li key={project.id}>
                <ProjectChip active={active} onClick={() => set({ project: active ? null : project.slug })}>
                  <bdi className="font-mono">{project.name}</bdi>
                  <span className={cn('font-mono text-[0.625rem] tabular-nums', active ? 'text-inverse-foreground/70' : 'text-faint-foreground')}>
                    {formatCount(open)}
                  </span>
                </ProjectChip>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ProjectChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap transition-[background-color,border-color,color] duration-200',
        active ? 'border-transparent bg-inverse text-inverse-foreground' : 'border-border text-soft-foreground hover:border-border-strong hover:text-foreground',
        focusRing,
      )}
    >
      {children}
    </button>
  );
}
