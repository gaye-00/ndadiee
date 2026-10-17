import { useIsFetching } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Earth, Hash, Layers, Search, X } from 'lucide-react';
import { m } from 'motion/react';
import { ToggleGroup } from 'radix-ui';
import {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import FacetPicker, { type FacetOption } from '@/components/shared/FacetPicker';
import StackLogo from '@/components/shared/StackLogo';
import WovenMotif from '@/components/shared/WovenMotif';
import { teamRoles, type KenteThread, type TeamRoleId } from '@/config/roles';
import { isTechnology, tagLogoOf } from '@/config/stacks';
import { useDebounce } from '@/hooks/useDebounce';
import { useProjectFacets } from '@/hooks/useProjects';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { toApiFilters, useShowcaseFilters } from '@/hooks/useShowcaseFilters';
import { useStackLogos } from '@/hooks/useStackLogos';
import { useTagName } from '@/hooks/useTags';
import { cn } from '@/lib/utils';
import type { ProjectFacets } from '@/types/project.types';
import { countryFlag, countryName } from '@/utils/formatters';

/** Le choix de la rangée des rôles : tous les projets, ceux qui recrutent, ou un rôle du catalogue */
type RoleChoice = 'all' | 'recruiting' | TeamRoleId;

// La pastille du rôle choisi prend sa couleur : celle du premier fil de son motif
const CHIP_ACCENTS: Record<KenteThread, string> = {
  gold: 'var(--kente-gold)',
  coral: 'var(--kente-coral)',
  jade: 'var(--kente-jade)',
};

// La pastille glisse d'un rôle à l'autre, comme celle de la page en cours dans la navigation
const slide = { type: 'spring', stiffness: 420, damping: 36 } as const;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * Filtres de la vitrine. D'abord le rôle recherché, en pastilles tissées : le motif de chaque métier et le
 * nombre de projets qui le cherchent. Puis une barre : la recherche, la technologie, le pays du porteur.
 *
 * Chaque valeur dit combien de projets elle donnerait avec les autres filtres (facettes de l'API) : un rôle
 * sans projet ne se choisit pas, et les listes ne proposent que des valeurs qui mènent quelque part. Les
 * filtres vivent dans l'URL (hooks/useShowcaseFilters) : la grille les lit au même endroit, la page se partage.
 */
export default function ProjectFilters() {
  const { t } = useTranslation('showcase');
  const { filters, set } = useShowcaseFilters();
  const facets = useProjectFacets(toApiFilters(filters));
  const choice: RoleChoice = filters.role ?? (filters.recruiting ? 'recruiting' : 'all');

  function chooseRole(next: RoleChoice) {
    if (next === 'all') {
      set({ role: null, recruiting: false });
    } else if (next === 'recruiting') {
      set({ role: null, recruiting: true });
    } else {
      set({ role: next, recruiting: false });
    }
  }

  return (
    <section aria-label={t('filters.label')} className="flex flex-col gap-5">
      <RoleFilter value={choice} facets={facets.data} stale={facets.isPlaceholderData} onChange={chooseRole} />

      <div className="glass flex flex-col gap-1 rounded-[1.375rem] p-1.5 backdrop-blur-xl saver:bg-background md:flex-row md:items-center">
        <SearchField query={filters.q} onSearch={(q, replace) => set({ q }, { replace })} />
        <span aria-hidden className="mx-1 hidden h-6 w-px shrink-0 bg-border md:block" />
        <div className="flex gap-1 border-t border-border-subtle pt-1 md:border-0 md:pt-0">
          <StackFilter value={filters.tag} facets={facets.data} onChange={(tag) => set({ tag })} />
          <CountryFilter value={filters.country} facets={facets.data} onChange={(country) => set({ country })} />
        </div>
      </div>
    </section>
  );
}

// ── Rôle recherché ──

interface RoleFilterProps {
  value: RoleChoice;
  facets: ProjectFacets | undefined;
  /** Les nombres sont ceux des filtres d'avant, le temps que les nouveaux arrivent */
  stale: boolean;
  onChange: (value: RoleChoice) => void;
}

/**
 * La rangée des rôles, une bande comme celle de l'accueil : « Tous », « Qui recrutent », puis les métiers du
 * catalogue, dans le même ordre. Un seul choix ; les flèches du clavier passent d'un rôle à l'autre. La bande
 * défile au doigt, à la molette ou avec ses deux boutons ; ses bords s'effacent là où d'autres rôles attendent,
 * et le rôle choisi (par un lien, par Précédent) y est amené.
 */
function RoleFilter({ value, facets, stale, onChange }: RoleFilterProps) {
  const { t } = useTranslation('showcase');
  const { t: tc } = useTranslation();
  const labelId = useId();
  const strip = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // D'autres rôles attendent-ils avant, après ? (début et fin suivent le sens de lecture)
  const [more, setMore] = useState({ start: false, end: false });
  const counts = useMemo(() => new Map(facets?.roles.map((facet) => [facet.role.toLowerCase(), facet.projects])), [facets]);

  useEffect(() => {
    const row = strip.current;
    if (!row) {
      return;
    }
    const measure = () => {
      // En arabe, scrollLeft va de 0 à un nombre négatif
      const travelled = Math.abs(row.scrollLeft);
      const room = row.scrollWidth - row.clientWidth;
      const next = { start: travelled > 1, end: travelled < room - 1 };
      setMore((current) => (current.start === next.start && current.end === next.end ? current : next));
    };
    measure();
    row.addEventListener('scroll', measure, { passive: true });
    // Les pastilles changent de largeur quand leurs nombres arrivent, ou avec la langue
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    Array.from(row.children).forEach((chip) => observer.observe(chip));
    return () => {
      row.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, []);

  // Le rôle choisi est amené dans la bande, sans bouger la page
  useEffect(() => {
    const row = strip.current;
    const chip = row?.querySelector<HTMLElement>('[data-state="on"]');
    if (!row || !chip || row.scrollWidth <= row.clientWidth + 1) {
      return;
    }
    const box = row.getBoundingClientRect();
    const rect = chip.getBoundingClientRect();
    const margin = 56;
    const delta =
      rect.left < box.left + margin ? rect.left - box.left - margin : rect.right > box.right - margin ? rect.right - box.right + margin : 0;
    if (delta !== 0) {
      row.scrollBy({ left: delta, behavior: reduced ? 'auto' : 'smooth' });
    }
  }, [value, reduced]);

  // Une page de rôles vers le début ou vers la fin, dans le sens de lecture
  function page(toward: 'start' | 'end') {
    const row = strip.current;
    if (!row) {
      return;
    }
    const rtl = getComputedStyle(row).direction === 'rtl';
    const step = row.clientWidth * 0.75 * (toward === 'end' ? 1 : -1) * (rtl ? -1 : 1);
    row.scrollBy({ left: step, behavior: reduced ? 'auto' : 'smooth' });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <p id={labelId} className="eyebrow">
          {t('filters.role')}
        </p>
        {/* À la souris ; au doigt, la bande se fait glisser */}
        {(more.start || more.end) && (
          <div className="hidden shrink-0 items-center gap-2 pointer-fine:flex">
            <StripButton label={t('filters.previousRoles')} disabled={!more.start} onClick={() => page('start')}>
              <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
            </StripButton>
            <StripButton label={t('filters.nextRoles')} disabled={!more.end} onClick={() => page('end')}>
              <ChevronRight aria-hidden className="size-4 rtl:-scale-x-100" />
            </StripButton>
          </div>
        )}
      </div>
      <ToggleGroup.Root
        type="single"
        value={value}
        // Un second clic sur le rôle choisi ne laisse pas la rangée sans choix
        onValueChange={(next) => next && onChange(next as RoleChoice)}
        aria-labelledby={labelId}
        asChild
      >
        <m.div
          ref={strip}
          layoutScroll
          data-stale={stale || undefined}
          data-more-start={more.start || undefined}
          data-more-end={more.end || undefined}
          // Pleine largeur sur téléphone et tablette ; ailleurs, un peu d'air sur les bords pour l'anneau du focus
          className="role-strip group/strip -mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pt-1 pb-2.5 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-1.5 lg:px-1.5"
        >
          <RoleChip
            value="all"
            selected={value === 'all'}
            label={t('filters.all')}
            count={facets?.all}
            accent="gold"
            icon={<span className="size-3.5 rounded-[0.3rem] bg-kente-conic" />}
          />
          <RoleChip
            value="recruiting"
            selected={value === 'recruiting'}
            label={t('filters.recruiting')}
            count={facets?.recruiting}
            accent="jade"
            disabled={facets?.recruiting === 0 && value !== 'recruiting'}
            icon={<span className="live-dot size-2" />}
          />
          {teamRoles.map((role) => {
            const count = facets ? (counts.get(role.id) ?? 0) : undefined;
            return (
              <RoleChip
                key={role.id}
                value={role.id}
                selected={value === role.id}
                label={tc(`teamRoles.${role.id}`)}
                count={count}
                accent={role.colors[0]}
                // Aucun projet ne le cherche avec les autres filtres : il resterait une vitrine vide
                disabled={count === 0 && value !== role.id}
                icon={<WovenMotif motif={role.motif} colors={role.colors} className="h-5 w-auto" />}
              />
            );
          })}
        </m.div>
      </ToggleGroup.Root>
    </div>
  );
}

/** Bouton rond qui fait défiler la bande des rôles, comme celui qui met en pause la bande de l'accueil */
function StripButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      // La bande se parcourt aussi au clavier : ces boutons n'ajoutent pas d'étape à la tabulation
      tabIndex={-1}
      className={cn(
        'grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-[color,border-color,opacity] duration-300',
        'hover:border-border-strong hover:text-foreground disabled:pointer-events-none disabled:opacity-35',
        focusRing,
      )}
    >
      {children}
    </button>
  );
}

interface RoleChipProps {
  value: RoleChoice;
  selected: boolean;
  label: string;
  /** Projets que donnerait ce choix ; absent tant que les facettes chargent */
  count: number | undefined;
  accent: KenteThread;
  icon: ReactNode;
  disabled?: boolean;
}

function RoleChip({ value, selected, label, count, accent, icon, disabled = false }: RoleChipProps) {
  const { t } = useTranslation('showcase');

  return (
    <ToggleGroup.Item
      value={value}
      disabled={disabled}
      aria-label={count === undefined ? label : `${label} (${t('filters.projects', { count })})`}
      title={disabled ? t('filters.unavailable') : undefined}
      style={{ '--chip-accent': CHIP_ACCENTS[accent] } as CSSProperties}
      className={cn(
        'group/role relative isolate inline-flex h-11 shrink-0 items-center gap-2.5 rounded-full border ps-3 pe-3.5 text-sm font-semibold whitespace-nowrap',
        'border-glass-border bg-glass text-soft-foreground transition-[border-color,color,opacity] duration-300',
        'hover:border-border-strong hover:text-foreground',
        'data-[state=on]:border-transparent data-[state=on]:text-foreground',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-glass-border disabled:hover:text-soft-foreground',
        focusRing,
      )}
    >
      {/* La pastille du choix : une seule dans la rangée, elle glisse vers le rôle choisi */}
      {selected && <m.span aria-hidden layoutId="showcase-role" transition={slide} className="role-chip-on absolute inset-0 -z-10 rounded-full" />}
      <span
        aria-hidden
        className="grid min-w-4 place-items-center transition-transform duration-300 ease-out-expo group-hover/role:-translate-y-0.5 group-disabled/role:translate-y-0"
      >
        {icon}
      </span>
      {label}
      {count !== undefined && (
        <span
          aria-hidden
          className="font-mono text-xs text-muted-foreground tabular-nums transition-opacity duration-300 group-data-[state=on]/role:text-foreground/70 group-data-stale/strip:opacity-40"
        >
          {count}
        </span>
      )}
    </ToggleGroup.Item>
  );
}

// ── Recherche ──

/**
 * La recherche : nom, accroche, description ou technologie. Elle part à la pause dans la frappe, ou tout de
 * suite avec Entrée ; « / » y amène depuis n'importe où dans la page, Échap l'efface.
 */
function SearchField({ query, onSearch }: { query: string; onSearch: (query: string, replace: boolean) => void }) {
  const { t } = useTranslation('showcase');
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(query);
  const [shown, setShown] = useState(query);
  const typed = useDebounce(text, 350);
  // Des projets arrivent pour cette recherche
  const searching = useIsFetching({ queryKey: ['projects', 'showcase'] }) > 0 && query !== '';

  // La recherche change ailleurs (Précédent, « Tout effacer ») : le champ suit
  if (query !== shown) {
    setShown(query);
    setText(query);
  }

  // Une nouvelle recherche, ou son abandon, ajoute une entrée à l'historique ; l'affiner la remplace
  function commit(next: string) {
    const trimmed = next.trim();
    if (trimmed !== query) {
      onSearch(trimmed, trimmed !== '' && query !== '');
    }
  }

  // À la pause dans la frappe, et seulement là : une recherche changée ailleurs (Précédent) n'est pas remplacée
  // par ce qui était tapé avant
  const commitTyped = useEffectEvent(commit);
  useEffect(() => {
    commitTyped(typed);
  }, [typed]);

  // « / » amène à la recherche, comme sur GitHub, sauf pendant une saisie
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) {
        return;
      }
      event.preventDefault();
      input.current?.focus();
      input.current?.select();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    commit(text);
  }

  function clear() {
    setText('');
    commit('');
    input.current?.focus();
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className="showcase-search relative flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-3.5 transition-colors duration-300 focus-within:bg-surface/80"
    >
      <label htmlFor={inputId} className="sr-only">
        {t('filters.search')}
      </label>
      <span aria-hidden className="grid size-4 shrink-0 place-items-center text-muted-foreground">
        {searching ? <PulsatingDots size="sm" /> : <Search className="size-4" />}
      </span>
      <input
        id={inputId}
        ref={input}
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && text !== '') {
            event.preventDefault();
            clear();
          }
        }}
        placeholder={t('filters.searchPlaceholder')}
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        dir="auto"
        className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint-foreground sm:text-[0.9375rem] [&::-webkit-search-cancel-button]:appearance-none"
      />
      {text !== '' ? (
        <button
          type="button"
          onClick={clear}
          aria-label={t('filters.clearSearch')}
          className={cn('grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/7 hover:text-foreground', focusRing)}
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : (
        <kbd
          title={t('filters.searchShortcut')}
          // Pour qui a un clavier : pas sur un écran tactile
          className="hidden h-6 min-w-6 shrink-0 place-items-center rounded-md border border-border bg-foreground/4 px-1.5 font-mono text-xs text-muted-foreground pointer-fine:md:grid"
        >
          /
        </kbd>
      )}
      {/* Au focus, un fil kente se tisse sous le champ */}
      <span aria-hidden className="showcase-search-thread pointer-events-none absolute inset-x-4 bottom-0 h-px rounded-full" />
    </form>
  );
}

// ── Technologie et pays ──

interface FacetFilterProps {
  value: string | null;
  facets: ProjectFacets | undefined;
  onChange: (value: string | null) => void;
}

/** Le logo d'une technologie quand il y en a un ; un dièse pour un thème. */
function stackGlyph(slug: string, technology: boolean, logos: ReturnType<typeof useStackLogos>): ReactNode {
  const logo = tagLogoOf(slug);
  if (logo && logos !== false) {
    return <StackLogo path={logos?.[logo]} className="size-3.5 text-soft-foreground" />;
  }
  return technology ? undefined : <Hash className="size-3.5 text-faint-foreground" />;
}

/** La technologie : les technologies d'abord, avec leur logo, puis les thèmes (« Open Data », « IoT »). */
function StackFilter({ value, facets, onChange }: FacetFilterProps) {
  const { t } = useTranslation('showcase');
  const logos = useStackLogos();
  const name = useTagName(value, facets?.stacks);
  const technologies = t('filters.technologies');
  const topics = t('filters.topics');

  const stacks = facets?.stacks ?? [];
  // La technologie choisie reste dans la liste, même sans projet avec les autres filtres : on peut la retirer
  const listed = value && !stacks.some((stack) => stack.slug === value) ? [{ slug: value, name: name ?? value, projects: 0 }, ...stacks] : stacks;
  const options: FacetOption[] = listed.map((stack) => {
    const technology = tagLogoOf(stack.slug) !== undefined || isTechnology(stack.name);
    return {
      value: stack.slug,
      label: stack.name,
      count: stack.projects,
      group: technology ? technologies : topics,
      icon: stackGlyph(stack.slug, technology, logos),
    };
  });

  return (
    <FacetPicker
      label={t('filters.stack')}
      icon={Layers}
      value={value}
      selected={value && name ? { label: name, icon: stackGlyph(value, true, logos) } : undefined}
      options={options}
      groups={[technologies, topics]}
      anyLabel={t('filters.anyStack')}
      searchPlaceholder={t('filters.stackSearch')}
      emptyLabel={t('filters.noStack')}
      loading={facets === undefined}
      onChange={onChange}
      className="flex-1 justify-center md:flex-none"
    />
  );
}

// Les noms anglais se cherchent aussi : « south africa » trouve l'Afrique du Sud, « ethiopia » l'Éthiopie
const englishNames = new Intl.DisplayNames(['en'], { type: 'region' });

function englishName(code: string): string {
  try {
    return englishNames.of(code) ?? code;
  } catch {
    return code;
  }
}

const flag = (code: string) => <span className="text-base leading-none">{countryFlag(code)}</span>;

/** Le pays du porteur du projet : son drapeau, son nom dans la langue de l'interface. */
function CountryFilter({ value, facets, onChange }: FacetFilterProps) {
  const { t } = useTranslation('showcase');

  const countries = facets?.countries ?? [];
  const listed =
    value && !countries.some((facet) => facet.country === value) ? [{ country: value, projects: 0 }, ...countries] : countries;
  const options: FacetOption[] = listed.map(({ country, projects }) => ({
    value: country,
    label: countryName(country),
    count: projects,
    icon: flag(country),
    keywords: [countryName(country), englishName(country), country],
  }));

  return (
    <FacetPicker
      label={t('filters.country')}
      icon={Earth}
      value={value}
      selected={value ? { label: countryName(value), icon: flag(value) } : undefined}
      options={options}
      anyLabel={t('filters.anyCountry')}
      searchPlaceholder={t('filters.countrySearch')}
      emptyLabel={t('filters.noCountry')}
      hint={t('filters.countryHint')}
      loading={facets === undefined}
      onChange={onChange}
      className="flex-1 justify-center md:flex-none"
    />
  );
}
