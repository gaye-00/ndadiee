import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CountryPicker from '@/components/shared/CountryPicker';
import FilterBar from '@/components/shared/FilterBar';
import FilterSearch from '@/components/shared/FilterSearch';
import RoleStrip, { type RoleStripChip } from '@/components/shared/RoleStrip';
import StackPicker from '@/components/shared/StackPicker';
import WovenMotif from '@/components/shared/WovenMotif';
import { teamRoles, type TeamRoleId } from '@/config/roles';
import { useProjectFacets } from '@/hooks/useProjects';
import { toApiFilters, useShowcaseFilters } from '@/hooks/useShowcaseFilters';

/** Le choix de la rangée des rôles : tous les projets, ceux qui recrutent, ou un rôle du catalogue */
type RoleChoice = 'all' | 'recruiting' | TeamRoleId;

/**
 * Filtres de la vitrine. D'abord le rôle recherché, en pastilles tissées (shared/RoleStrip) : « Tous », « Qui
 * recrutent », puis le motif de chaque métier et le nombre de projets qui le cherchent. Puis une barre : la
 * recherche, la technologie, le pays du porteur.
 *
 * Chaque valeur dit combien de projets elle donnerait avec les autres filtres (facettes de l'API) : un rôle
 * sans projet ne se choisit pas, et les listes ne proposent que des valeurs qui mènent quelque part. Les
 * filtres vivent dans l'URL (hooks/useShowcaseFilters) : la grille les lit au même endroit, la page se partage.
 */
export default function ProjectFilters() {
  const { t } = useTranslation('showcase');
  const { t: tc } = useTranslation();
  const { filters, set } = useShowcaseFilters();
  const facets = useProjectFacets(toApiFilters(filters));
  const { data } = facets;
  const choice: RoleChoice = filters.role ?? (filters.recruiting ? 'recruiting' : 'all');

  const counts = useMemo(() => new Map(data?.roles.map((facet) => [facet.role.toLowerCase(), facet.projects])), [data]);
  const stacks = useMemo(() => data?.stacks.map((stack) => ({ slug: stack.slug, name: stack.name, count: stack.projects })), [data]);
  const countries = useMemo(() => data?.countries.map((facet) => ({ country: facet.country, count: facet.projects })), [data]);

  function chooseRole(next: RoleChoice) {
    if (next === 'all') {
      set({ role: null, recruiting: false });
    } else if (next === 'recruiting') {
      set({ role: null, recruiting: true });
    } else {
      set({ role: next, recruiting: false });
    }
  }

  const chips: RoleStripChip[] = [
    {
      value: 'all',
      label: t('filters.all'),
      count: data?.all,
      accent: 'gold',
      icon: <span className="size-3.5 rounded-[0.3rem] bg-kente-conic" />,
    },
    {
      value: 'recruiting',
      label: t('filters.recruiting'),
      count: data?.recruiting,
      accent: 'jade',
      disabled: data?.recruiting === 0,
      icon: <span className="live-dot size-2" />,
    },
    ...teamRoles.map((role) => {
      const count = data ? (counts.get(role.id) ?? 0) : undefined;
      return {
        value: role.id,
        label: tc(`teamRoles.${role.id}`),
        count,
        accent: role.colors[0],
        // Aucun projet ne le cherche avec les autres filtres : il resterait une vitrine vide
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
        value={choice}
        onChange={(next) => chooseRole(next as RoleChoice)}
        stale={facets.isPlaceholderData}
        countLabel={(count) => t('filters.projects', { count })}
        unavailableLabel={t('filters.unavailable')}
        layoutId="showcase-role"
      />

      <FilterBar
        search={
          <FilterSearch
            query={filters.q}
            onSearch={(q, replace) => set({ q }, { replace })}
            fetchingKey={['projects', 'showcase']}
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
