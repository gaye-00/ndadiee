import { Clock, Flame, Hash, Trophy, type LucideIcon } from 'lucide-react';
import { m } from 'motion/react';
import { useMemo, useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { tagAccent } from './forumUtils';
import { VIEW_ITEMS, viewHref } from './forumUtils';
import FacetPicker, { type FacetOption } from '@/components/shared/FacetPicker';
import FilterBar from '@/components/shared/FilterBar';
import FilterSearch from '@/components/shared/FilterSearch';
import { useAuth } from '@/hooks/useAuth';
import { FORUM_MEMBER_VIEWS, FORUM_PERIODS, FORUM_SORTS, useForumFilters, type ForumPeriod, type ForumSort } from '@/hooks/useForumFilters';
import { useForumOverview } from '@/hooks/useQuestions';
import { useTagName } from '@/hooks/useTags';
import { cn } from '@/lib/utils';

const slide = { type: 'spring', stiffness: 420, damping: 36 } as const;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

const SORT_ICONS: Record<ForumSort, LucideIcon> = {
  relevant: Flame,
  recent: Clock,
  top: Trophy,
};

/**
 * Les filtres du fil : sur téléphone, les vues du forum (dans la marge sur grand écran) ; la recherche (le titre, le
 * contenu, les tags ; « / » y amène) et le tag ; puis l'ordre, en onglets comme sur dev.to : « Pertinents » (votes et
 * réponses, pondérés par la fraîcheur), « Récents », « Top » sur la semaine, le mois, l'année ou depuis toujours.
 * Tout vit dans l'URL (hooks/useForumFilters) : la page se partage.
 */
export default function TopicFilters() {
  const { t } = useTranslation('forum');
  const { filters, set } = useForumFilters();
  const saved = filters.view === 'saved';

  return (
    <section aria-label={t('filters.label')} className="flex flex-col gap-4">
      <ViewStrip />

      <FilterBar
        search={
          <FilterSearch
            query={saved ? '' : filters.q}
            onSearch={(q, replace) => set({ q }, { replace })}
            fetchingKey={['questions', 'board']}
            label={t('filters.search')}
            placeholder={t('filters.searchPlaceholder')}
          />
        }
      >
        <TagPicker value={saved ? null : filters.tag} onChange={(tag) => set({ tag })} />
      </FilterBar>

      {!saved && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Segmented
            label={t('sort.label')}
            options={FORUM_SORTS.map((sort) => ({ value: sort, label: t(`sort.${sort}`), icon: SORT_ICONS[sort] }))}
            value={filters.sort}
            onChange={(sort) => set({ sort })}
            layoutId="forum-sort"
          />
          {filters.sort === 'top' && (
            <Segmented
              label={t('period.label')}
              options={FORUM_PERIODS.map((period) => ({ value: period, label: t(`period.${period}`) }))}
              value={filters.period}
              onChange={(period: ForumPeriod) => set({ period })}
              layoutId="forum-period"
              size="sm"
            />
          )}
        </div>
      )}
    </section>
  );
}

/** Sur téléphone et tablette : les vues du forum, en pastilles qui défilent au doigt. */
function ViewStrip() {
  const { t } = useTranslation('forum');
  const { isAuthenticated } = useAuth();
  const { filters, params } = useForumFilters();

  return (
    <nav aria-label={t('nav.views')} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden">
      <ul className="flex w-max gap-1.5">
        {VIEW_ITEMS.map(({ view, icon: Icon }) => {
          const current = filters.view === view;
          return (
            <li key={view}>
              <Link
                to={viewHref(view, params)}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors',
                  current ? 'border-gold/40 bg-gold/12 text-foreground' : 'border-glass-border bg-glass text-soft-foreground hover:text-foreground',
                  !isAuthenticated && FORUM_MEMBER_VIEWS.has(view) && !current && 'text-muted-foreground',
                  focusRing,
                )}
              >
                <Icon aria-hidden className={cn('size-4', current ? 'text-gold' : 'text-muted-foreground')} />
                {t(`views.${view}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Le tag du fil, à choisir dans les plus utilisés du forum (une liste qui se cherche au clavier). */
function TagPicker({ value, onChange }: { value: string | null; onChange: (tag: string | null) => void }) {
  const { t } = useTranslation('forum');
  const { data } = useForumOverview();
  const name = useTagName(value, data?.tags);

  // Le tag choisi reste dans la liste, même s'il n'est pas parmi les plus utilisés : on peut le retirer
  const options = useMemo<FacetOption[]>(() => {
    const known = data?.tags ?? [];
    const listed = value && !known.some((tag) => tag.slug === value) ? [{ slug: value, name: name ?? value, topics: 0 }, ...known] : known;
    return listed.map((tag) => ({
      value: tag.slug,
      label: tag.name,
      count: tag.topics || undefined,
      icon: (
        <span style={tagAccent(tag.slug)} className="font-mono text-sm font-semibold text-(--tag-accent)">
          #
        </span>
      ),
    }));
  }, [data, value, name]);

  return (
    <FacetPicker
      label={t('filters.tag')}
      icon={Hash}
      value={value}
      selected={value && name ? { label: name, icon: <Hash className="size-3.5" /> } : undefined}
      options={options}
      anyLabel={t('filters.anyTag')}
      searchPlaceholder={t('filters.tagSearch')}
      emptyLabel={t('filters.noTag')}
      loading={data === undefined}
      onChange={onChange}
      className="flex-1 justify-center md:flex-none"
    />
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  /** La pastille glisse d'un choix à l'autre (Motion) */
  layoutId: string;
  size?: 'md' | 'sm';
}

/**
 * Un choix unique en onglets (l'ordre, la période) : une pastille glisse sous le choix. Un seul arrêt de tabulation,
 * les flèches passent d'un choix à l'autre, comme un groupe de boutons radio.
 */
function Segmented<T extends string>({ label, options, value, onChange, layoutId, size = 'md' }: SegmentedProps<T>) {
  const group = useRef<HTMLDivElement>(null);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let step = keys[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    // En arabe, la flèche de droite recule
    if (getComputedStyle(event.currentTarget).direction === 'rtl' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      step = -step;
    }
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    requestAnimationFrame(() => group.current?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus());
  }

  return (
    <div ref={group} role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="flex items-center gap-0.5">
      {options.map(({ value: option, label: optionLabel, icon: Icon }) => {
        const checked = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={checked}
            data-value={option}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option)}
            className={cn(
              'relative inline-flex items-center gap-2 rounded-xl transition-colors duration-200',
              size === 'md' ? 'h-10 px-3.5 text-[0.9375rem]' : 'h-8 px-2.5 text-[0.8125rem]',
              checked ? 'font-bold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground',
              focusRing,
            )}
          >
            {checked && (
              <m.span
                layoutId={layoutId}
                transition={slide}
                className={cn('absolute inset-0 rounded-xl', size === 'md' ? 'bg-surface shadow-[0_2px_10px_-4px_var(--float-shadow)] ring-1 ring-foreground/6' : 'bg-foreground/7')}
              />
            )}
            {Icon && <Icon aria-hidden className={cn('relative size-4', checked ? 'text-gold' : 'text-faint-foreground')} />}
            <span className="relative">{optionLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
