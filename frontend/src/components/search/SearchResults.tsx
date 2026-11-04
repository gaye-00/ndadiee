import { ArrowRight, MessageSquarePlus, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import Highlight from './Highlight';
import SearchHitVisual from './SearchHitVisual';
import { hitKey, hitLink, hitPage, hitSubtitle, hitTitle } from './searchHits';
import ErrorState from '@/components/feedback/ErrorState';
import LoadMore from '@/components/feedback/LoadMore';
import { WovenThreads } from '@/components/shared/WovenMotif';
import { PUBLIC_NAV } from '@/config/navigation';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { MIN_SEARCH_LENGTH, SEARCH_GROUPS, useSearchGroup, useSearchOverview, type SearchGroup, type SearchHit } from '@/hooks/useSearch';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import { useDataSaverStore } from '@/store/useDataSaverStore';
import { formatCount } from '@/utils/formatters';

// Résultats montrés par groupe dans la vue d'ensemble ; les autres à l'onglet du groupe
const PREVIEW = 5;
const TYPING_DELAY = 300;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

const groupOf = (value: string | null): SearchGroup | null => SEARCH_GROUPS.find((group) => group === value) ?? null;

// L'adresse d'une recherche : on peut la partager, et y revenir
function searchOf(query: string, group: SearchGroup | null): string {
  const params = new URLSearchParams();
  if (query) {
    params.set('q', query);
  }
  if (group) {
    params.set('type', group);
  }
  return `?${params}`;
}

/**
 * Résultats complets d'une recherche : rôles, projets, devs, sujets du forum. La recherche est dans l'adresse
 * (/search?q=flutter&type=roles) : elle se partage et survit au retour en arrière.
 *
 * « Tout » montre les premiers de chaque groupe ; l'onglet d'un groupe les déroule tous.
 */
export default function SearchResults() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const query = (params.get('q') ?? '').trim();
  const group = groupOf(params.get('type'));
  const fieldId = useId();
  const field = useRef<HTMLInputElement>(null);

  const [text, setText] = useState(query);
  const typing = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Retour en arrière, palette : l'adresse change sans passer par le champ, qui la suit
  const [seenQuery, setSeenQuery] = useState(query);
  if (query !== seenQuery) {
    setSeenQuery(query);
    if (query !== text.trim()) {
      setText(query);
    }
  }

  // La frappe, une fois posée, passe dans l'adresse, sans empiler l'historique
  function type(value: string) {
    setText(value);
    clearTimeout(typing.current);
    typing.current = setTimeout(() => setParams((current) => searchOf(value.trim(), groupOf(current.get('type'))), { replace: true }), TYPING_DELAY);
  }
  useEffect(() => () => clearTimeout(typing.current), []);

  const ready = query.length >= MIN_SEARCH_LENGTH;
  const overview = useSearchOverview(query, PREVIEW);

  return (
    <div className="relative isolate overflow-x-clip">
      {/* Les dégradés des fils des motifs tissés : ceux des rôles trouvés */}
      <WovenThreads />
      <div aria-hidden className="halo halo-gold -top-72 -start-64 -z-10 size-[44rem] animate-float" />
      <div aria-hidden className="halo halo-jade top-[20rem] end-[-18rem] -z-10 size-[34rem] opacity-50" />

      <div className="mx-auto max-w-4xl px-4 pt-8 pb-24 sm:px-6 sm:pt-10 lg:pb-32">
        <h1 className="sr-only">{t('pages.search')}</h1>

        <div className="glass overflow-hidden rounded-[1.75rem]">
          <span aria-hidden className="block h-1.5 bg-kente" />
          <div className="flex items-center gap-3 px-5 py-4 sm:gap-4 sm:px-7 sm:py-5">
            <Search aria-hidden className="size-6 shrink-0 text-gold" />
            <label htmlFor={fieldId} className="sr-only">
              {t('search.placeholder')}
            </label>
            <input
              ref={field}
              id={fieldId}
              type="search"
              value={text}
              onChange={(event) => type(event.target.value)}
              placeholder={t('search.placeholder')}
              autoFocus={!query}
              dir="auto"
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent font-display text-h3 text-foreground outline-none placeholder:text-faint-foreground/50 [&::-webkit-search-cancel-button]:hidden"
            />
            {text && (
              <button
                type="button"
                onClick={() => {
                  type('');
                  field.current?.focus();
                }}
                aria-label={t('search.clear')}
                className={cn('grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/7 hover:text-foreground', focusRing)}
              >
                <X aria-hidden className="size-4.5" />
              </button>
            )}
          </div>
        </div>

        {ready && (
          <nav aria-label={t('pages.search')} className="mt-5 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {[null, ...SEARCH_GROUPS].map((tab) => {
              const count = tab ? overview.groups[tab].total : overview.total;
              const current = tab === group;
              return (
                <Link
                  key={tab ?? 'all'}
                  to={searchOf(query, tab)}
                  replace
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors',
                    focusRing,
                    current ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
                  )}
                >
                  {tab ? t(`search.groups.${tab}`) : t('search.all')}
                  {!overview.isPending && <span className={cn('font-mono text-xs tabular-nums', current ? 'opacity-70' : 'text-faint-foreground')}>{formatCount(count)}</span>}
                </Link>
              );
            })}
          </nav>
        )}

        <p role="status" className="sr-only">
          {ready && !overview.isPending && !overview.isStale && t('search.resultCount', { count: overview.total })}
        </p>

        <div className="mt-6">
          {!ready ? (
            <Prompt tooShort={query.length > 0} />
          ) : overview.isError ? (
            <ErrorState title={t('search.failed')} onRetry={overview.refetch} />
          ) : overview.isPending ? (
            <HitsPlaceholder label={t('states.loading')} />
          ) : overview.total === 0 ? (
            <NoResults query={query} />
          ) : group ? (
            <GroupHits query={query} group={group} />
          ) : (
            <div className={cn('flex flex-col gap-8 transition-opacity duration-200', overview.isStale && 'opacity-60')}>
              {SEARCH_GROUPS.map((section) => {
                const { hits, total } = overview.groups[section];
                return hits.length === 0 ? null : (
                  <section key={section} aria-labelledby={`search-${section}`}>
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 id={`search-${section}`} className="eyebrow">
                        {t(`search.groups.${section}`)}
                      </h2>
                      {total > hits.length && (
                        <Link
                          to={searchOf(query, section)}
                          replace
                          className={cn('group/all inline-flex items-center gap-1.5 rounded-full text-[0.8125rem] font-bold text-gold', focusRing)}
                        >
                          {`${t('actions.seeAll')} (${formatCount(total)})`}
                          <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/all:translate-x-0.5 rtl:-scale-x-100" />
                        </Link>
                      )}
                    </div>
                    <HitList hits={hits} query={query} className="mt-2.5" />
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Tous les résultats d'un groupe : la suite arrive au fil du défilement. */
function GroupHits({ query, group }: { query: string; group: SearchGroup }) {
  const { t } = useTranslation();
  const dataSaver = useDataSaverStore((s) => s.enabled);
  const results = useSearchGroup(query, group);
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, isPlaceholderData, fetchNextPage } = results;
  const hits = useMemo(() => {
    // Un résultat ajouté pendant la lecture décale les pages : le même peut revenir dans la suivante
    const unique = new Map((data?.pages ?? []).flatMap((page) => page.hits).map((hit) => [hitKey(hit), hit]));
    return [...unique.values()];
  }, [data]);
  const sentinel = useInfiniteScroll<HTMLDivElement>(() => void fetchNextPage(), hasNextPage && !isFetchingNextPage && !isFetchNextPageError && !isPlaceholderData && !dataSaver);

  if (results.isPending) {
    return <HitsPlaceholder label={t('states.loading')} />;
  }
  if (results.isError) {
    return <ErrorState title={t('search.failed')} onRetry={() => void results.refetch()} />;
  }
  if (hits.length === 0) {
    return <p className="px-1 py-6 text-sm text-muted-foreground">{t('search.noResults', { query })}</p>;
  }
  return (
    <>
      <HitList hits={hits} query={query} className={cn('transition-opacity duration-200', isPlaceholderData && 'opacity-60')} />
      {hasNextPage && (
        <LoadMore
          sentinel={sentinel}
          loading={isFetchingNextPage}
          failed={isFetchNextPageError}
          manual={dataSaver}
          onMore={() => void fetchNextPage()}
          moreLabel={t('search.more')}
          loadingLabel={t('search.loadingMore')}
          errorLabel={t('search.moreFailed')}
        />
      )}
    </>
  );
}

function HitList({ hits, query, className }: { hits: SearchHit[]; query: string; className?: string }) {
  const { t } = useTranslation();

  return (
    <ul className={cn('glass flex flex-col gap-0.5 rounded-2xl p-1.5', className)}>
      {hits.map((hit) => (
        <li key={hitKey(hit)}>
          <Link
            to={hitLink(hit)}
            viewTransition
            onPointerEnter={() => prefetch(hitPage(hit))}
            onFocus={() => prefetch(hitPage(hit))}
            className={cn('group/hit flex items-center gap-3.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-foreground/5', focusRing)}
          >
            <SearchHitVisual hit={hit} />
            <span className="min-w-0 flex-1">
              <span dir="auto" className="block truncate text-[0.9375rem] font-semibold text-foreground">
                <Highlight text={hitTitle(hit)} query={query} />
              </span>
              <span dir="auto" className="mt-0.5 block truncate text-[0.8125rem] text-muted-foreground">
                <Highlight text={hitSubtitle(hit, t)} query={query} />
              </span>
            </span>
            <ArrowRight aria-hidden className="size-4 shrink-0 text-faint-foreground transition-[translate,color] group-hover/hit:translate-x-0.5 group-hover/hit:text-foreground rtl:-scale-x-100" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Rien de cherché encore : ce qu'on peut trouver, et par où passer sans chercher. */
function Prompt({ tooShort }: { tooShort: boolean }) {
  const { t } = useTranslation();

  return (
    <div className="px-1 pt-4">
      <h2 className="font-display text-h4">{t('search.promptTitle')}</h2>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{tooShort ? t('search.tooShort') : t('search.promptText')}</p>
      <nav aria-label={t('search.groups.pages')} className="mt-6 flex flex-wrap gap-2">
        {PUBLIC_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            viewTransition
            onPointerEnter={() => prefetch(item.preload)}
            onFocus={() => prefetch(item.preload)}
            className={cn('inline-flex h-9 items-center gap-2 rounded-full border border-border px-3.5 text-sm font-semibold text-soft-foreground transition-colors hover:border-gold/45 hover:text-foreground', focusRing)}
          >
            <item.icon aria-hidden className="size-4" />
            {t(`nav.${item.labelKey}`)}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Aucun résultat : vérifier, ou poser la question au forum, dont le titre est déjà écrit. */
function NoResults({ query }: { query: string }) {
  const { t } = useTranslation();

  return (
    <div className="px-1 pt-4">
      <h2 dir="auto" className="font-display text-h4 text-balance">
        {t('search.noResults', { query })}
      </h2>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{t('search.noResultsText')}</p>
      <Link
        to={paths.newTopic}
        state={{ title: query }}
        viewTransition
        className={cn('mt-5 inline-flex h-11 items-center gap-2 rounded-xl border border-border-strong px-4 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5', focusRing)}
      >
        <MessageSquarePlus aria-hidden className="size-4" />
        {t('search.askForum')}
      </Link>
    </div>
  );
}

/** Le temps du premier chargement : des lignes de la forme de celles qui arrivent. */
function HitsPlaceholder({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="glass flex flex-col gap-0.5 rounded-2xl p-1.5">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} aria-hidden className="flex items-center gap-3.5 px-3 py-2.5">
          <span className="skeleton-shimmer size-9 shrink-0 rounded-xl" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="skeleton-shimmer h-3 w-3/5 rounded-full" />
            <span className="skeleton-shimmer h-2.5 w-2/5 rounded-full" />
          </span>
        </div>
      ))}
    </div>
  );
}
