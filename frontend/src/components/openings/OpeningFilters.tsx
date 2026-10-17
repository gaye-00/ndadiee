import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CountryPicker from '@/components/shared/CountryPicker';
import FilterBar from '@/components/shared/FilterBar';
import FilterSearch from '@/components/shared/FilterSearch';
import RoleStrip, { type RoleStripChip } from '@/components/shared/RoleStrip';
import StackPicker from '@/components/shared/StackPicker';
import WovenMotif from '@/components/shared/WovenMotif';
import { teamRoles, type TeamRoleId } from '@/config/roles';
import { toApiFilters, useOpeningBoardFilters } from '@/hooks/useOpeningBoardFilters';
import { useOpeningFacets } from '@/hooks/useOpenings';

/**
 * Filtres des annonces, ceux de la vitrine : d'abord le rôle, en pastilles tissées (shared/RoleStrip) avec le
 * nombre d'annonces de chaque métier ; puis une barre : la recherche (l'annonce, son issue « premier pas », son
 * projet), la technologie du projet, le pays de son porteur.
 *
 * Chaque valeur dit combien d'annonces elle donnerait avec les autres filtres (facettes de l'API) : un rôle sans
 * annonce ne se choisit pas. Les filtres vivent dans l'URL (hooks/useOpeningBoardFilters) : la liste les lit au
 * même endroit, la page se partage, et les liens de l'accueil y mènent (?role=mobile, ?tag=flutter).
 */
export default function OpeningFilters() {
  const { t } = useTranslation('openings');
  const { t: tc } = useTranslation();
  const { filters, set } = useOpeningBoardFilters();
  const facets = useOpeningFacets(toApiFilters(filters));
  const { data } = facets;

  const counts = useMemo(() => new Map(data?.roles.map((facet) => [facet.role.toLowerCase(), facet.openings])), [data]);
  const stacks = useMemo(() => data?.stacks.map((stack) => ({ slug: stack.slug, name: stack.name, count: stack.openings })), [data]);
  const countries = useMemo(() => data?.countries.map((facet) => ({ country: facet.country, count: facet.openings })), [data]);

  const chips: RoleStripChip[] = [
    {
      value: 'all',
      label: t('filters.all'),
      count: data?.all,
      accent: 'gold',
      icon: <span className="size-3.5 rounded-[0.3rem] bg-kente-conic" />,
    },
    ...teamRoles.map((role) => {
      const count = data ? (counts.get(role.id) ?? 0) : undefined;
      return {
        value: role.id,
        label: tc(`teamRoles.${role.id}`),
        count,
        accent: role.colors[0],
        // Aucune annonce pour ce métier avec les autres filtres : il resterait une liste vide
        disabled: count === 0,
        icon: <WovenMotif motif={role.motif} colors={role.colors} className="h-5 w-auto" />,
      };
    }),
  ];

  return (
    <section aria-label={t('filters.label')} className="flex flex-col gap-5">
      <RoleStrip
        label={t('filters.role')}
        chips={chips}
        value={filters.role ?? 'all'}
        onChange={(next) => set({ role: next === 'all' ? null : (next as TeamRoleId) })}
        stale={facets.isPlaceholderData}
        countLabel={(count) => t('filters.openings', { count })}
        unavailableLabel={t('filters.unavailable')}
        layoutId="openings-role"
      />

      <FilterBar
        search={
          <FilterSearch
            query={filters.q}
            onSearch={(q, replace) => set({ q }, { replace })}
            fetchingKey={['openings', 'board']}
            label={t('filters.search')}
            placeholder={t('filters.searchPlaceholder')}
          />
        }
      >
        <StackPicker value={filters.tag} stacks={stacks} onChange={(tag) => set({ tag })} className="flex-1 justify-center md:flex-none" />
        <CountryPicker
          value={filters.country}
          countries={countries}
          onChange={(country) => set({ country })}
          className="flex-1 justify-center md:flex-none"
        />
      </FilterBar>
    </section>
  );
}
