import { ArrowRight, Bookmark, Hash, PenLine, RotateCcw, Rss, Search, type LucideIcon } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { viewHref } from './forumUtils';
import TagHeader from './TagHeader';
import TopicCard, { TopicCardSkeleton } from './TopicCard';
import ErrorState from '@/components/feedback/ErrorState';
import LoadMore from '@/components/feedback/LoadMore';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import ActiveFilters, { type ActiveFilter } from '@/components/shared/ActiveFilters';
import { useAuth } from '@/hooks/useAuth';
import { FORUM_MEMBER_VIEWS, useForumFilters, type ForumView } from '@/hooks/useForumFilters';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useMemberAction } from '@/hooks/useMemberAction';
import { TOPICS_PAGE_SIZE, useForumOverview, useTopicBoard } from '@/hooks/useQuestions';
import { useTagName } from '@/hooks/useTags';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import { useDataSaverStore } from '@/store/useDataSaverStore';
import type { QuestionSummary } from '@/types/question.types';

// Les cartes arrivent l'une après l'autre, page après page ; elles glissent à leur nouvelle place quand les filtres
// ou l'ordre changent
const ease = [0.16, 1, 0.3, 1] as const;
const cardTransition = (index: number) =>
  ({
    layout: { type: 'spring', stiffness: 260, damping: 32 },
    default: { duration: 0.45, ease, delay: (index % TOPICS_PAGE_SIZE) * 0.03 },
  }) as const;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

const primaryButton = cn(
  'inline-flex h-11 items-center gap-2 rounded-[0.875rem] bg-kente-warm px-5 text-sm font-bold text-kente-night transition-[translate,filter] duration-300 hover:-translate-y-px hover:brightness-105 active:translate-y-0',
  focusRing,
  'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
);
const secondaryButton = cn(
  'group/secondary inline-flex h-11 items-center gap-2 rounded-[0.875rem] border border-border-strong px-4 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5',
  focusRing,
);

// Un sujet publié entre deux pages décale la suite d'un cran : le même revient, il n'est montré qu'une fois
function uniqueById(topics: QuestionSummary[]): QuestionSummary[] {
  const seen = new Set<number>();
  return topics.filter((topic) => !seen.has(topic.id) && seen.add(topic.id));
}

/**
 * Le fil du forum : les sujets de la vue et des filtres de l'URL (hooks/useForumFilters), quinze à la fois, la suite
 * chargée à l'approche du bas de la page (à la demande en économie de données).
 *
 * En tête, le nombre de sujets, les filtres actifs (chacun se retire d'un clic) et, pour un tag, sa présentation et
 * « Suivre ». Pendant qu'un filtre charge, le fil d'avant reste, atténué. Chaque vue a son état vide, qui dit quoi
 * faire ; celles des membres invitent un visiteur à se connecter. Au bout du fil, de quoi poser sa question.
 */
export default function TopicList() {
  const { t } = useTranslation('forum');
  const { isAuthenticated } = useAuth();
  const { filters, api, params, clear, activeCount } = useForumFilters();
  const saved = filters.view === 'saved';
  const gated = !isAuthenticated && FORUM_MEMBER_VIEWS.has(filters.view);
  const query = useTopicBoard(api, { saved, enabled: !gated });
  const overview = useForumOverview();
  const dataSaver = useDataSaverStore((s) => s.enabled);
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, isPlaceholderData, fetchNextPage } = query;

  const topics = useMemo(() => uniqueById(data?.pages.flatMap((page) => page.content) ?? []), [data]);
  const total = data?.pages[0]?.totalElements;
  const filtered = !saved && (activeCount > 0 || filters.view !== 'all');

  // La suite arrive d'elle-même à l'approche du bas ; en économie de données, chaque page attend qu'on la demande
  const sentinel = useInfiniteScroll<HTMLDivElement>(
    () => void fetchNextPage(),
    hasNextPage && !isFetchingNextPage && !isFetchNextPageError && !isPlaceholderData && !dataSaver,
  );

  if (gated) {
    return <MemberGate view={filters.view as 'following' | 'mine' | 'saved'} />;
  }

  return (
    <section aria-labelledby="forum-results" className="mt-5">
      {filters.tag && !saved && <TagHeader slug={filters.tag} />}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-baseline gap-2.5">
          <h2 id="forum-results" tabIndex={-1} aria-live="polite" aria-atomic="true" className="font-display text-h5 tabular-nums outline-none">
            {total === undefined ? (
              <>
                <span aria-hidden className="inline-block h-5 w-28 rounded-full align-middle skeleton-shimmer" />
                <span className="sr-only">{t('results.loading')}</span>
              </>
            ) : (
              t(saved ? 'results.saved' : 'results.count', { count: total })
            )}
          </h2>
          {total !== undefined && filtered && overview.data && overview.data.topics !== total && (
            <span className="font-mono text-xs text-muted-foreground">{t('results.outOf', { total: overview.data.topics })}</span>
          )}
        </div>
        {query.isFetching && !isFetchingNextPage && total !== undefined && <PulsatingDots size="sm" />}
        {!saved && <ForumActiveFilters className="w-full sm:w-auto sm:flex-1" />}
      </div>

      <div className="mt-4">
        {query.isPending ? (
          <ul aria-hidden className="flex flex-col gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index}>
                <TopicCardSkeleton />
              </li>
            ))}
          </ul>
        ) : query.isError && topics.length === 0 ? (
          <ErrorState title={t('results.errorTitle')} description={t('results.errorText')} onRetry={() => void query.refetch()} />
        ) : topics.length === 0 ? (
          activeCount > 0 && !saved ? (
            <NoMatch query={filters.q} onClear={clear} />
          ) : (
            <EmptyView view={filters.view} />
          )
        ) : (
          <ul
            aria-busy={query.isFetching}
            className={cn(
              'relative flex flex-col gap-3 transition-[opacity,filter] duration-300',
              // Les sujets des filtres d'avant, le temps que les nouveaux arrivent
              isPlaceholderData && 'opacity-55 saturate-50',
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {topics.map((topic, index) => (
                <m.li
                  key={topic.id}
                  layout="position"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={cardTransition(index)}
                >
                  <TopicCard topic={topic} params={params} activeTag={filters.tag} />
                </m.li>
              ))}
              {isFetchingNextPage &&
                Array.from({ length: 2 }, (_, index) => (
                  <m.li key={`next-${index}`} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden>
                    <TopicCardSkeleton />
                  </m.li>
                ))}
              {!hasNextPage && !isPlaceholderData && !saved && (
                <m.li key="ask" layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={cardTransition(topics.length)}>
                  <AskCard />
                </m.li>
              )}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {hasNextPage && !query.isPending && (
        <LoadMore
          sentinel={sentinel}
          loading={isFetchingNextPage}
          failed={isFetchNextPageError}
          manual={dataSaver}
          onMore={() => void fetchNextPage()}
          moreLabel={t('results.more')}
          loadingLabel={t('results.loadingMore')}
          errorLabel={t('results.moreError')}
        />
      )}
    </section>
  );
}

/** Les filtres choisis, en pastilles (shared/ActiveFilters) : la recherche, le tag. */
function ForumActiveFilters({ className }: { className?: string }) {
  const { t: tc } = useTranslation();
  const { filters, set, clear } = useForumFilters();
  const { data: overview } = useForumOverview();
  const tagName = useTagName(filters.tag, overview?.tags);

  const chips: ActiveFilter[] = [];
  if (filters.q) {
    chips.push({
      key: 'q',
      label: tc('filters.query', { query: filters.q }),
      icon: <Search className="size-3.5 text-muted-foreground" />,
      remove: () => set({ q: '' }),
    });
  }
  if (filters.tag && tagName) {
    chips.push({ key: 'tag', label: tagName, icon: <Hash className="size-3.5 text-muted-foreground" />, remove: () => set({ tag: null }) });
  }

  return <ActiveFilters filters={chips} onClear={clear} resultsId="forum-results" className={className} />;
}

/** « Poser la question » : le formulaire pour un membre (avec la recherche en titre), la connexion sinon. */
function useAsk() {
  const navigate = useNavigate();
  const memberAction = useMemberAction();
  return (title?: string) => memberAction('ask', () => void navigate(paths.newTopic, { state: title ? { title } : undefined, viewTransition: true }));
}

/**
 * Aucun sujet pour cette recherche ou ce tag : le métier attend, sans fil de trame. On peut tout effacer, ou poser
 * la question soi-même (la recherche devient le début du titre).
 */
function NoMatch({ query, onClear }: { query: string; onClear: () => void }) {
  const { t } = useTranslation('forum');
  const { t: tc } = useTranslation();
  const ask = useAsk();

  return (
    <div className="glass flex flex-col items-center rounded-[1.75rem] px-6 py-14 text-center sm:py-16">
      <span aria-hidden className="empty-loom h-16 w-48" />
      <p className="mt-6 font-display text-h4">{t('results.noMatchTitle')}</p>
      {query && (
        <p dir="auto" className="mt-3 max-w-full truncate font-mono text-sm text-soft-foreground">
          {tc('filters.query', { query })}
        </p>
      )}
      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">{t('results.noMatchText')}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-2.5">
        <button type="button" onClick={onClear} className={primaryButton}>
          <RotateCcw aria-hidden className="size-4" />
          {t('results.clearFilters')}
        </button>
        <button type="button" onClick={() => ask(query || undefined)} className={secondaryButton}>
          <PenLine aria-hidden className="size-4" />
          {t('results.askIt')}
        </button>
      </div>
    </div>
  );
}

/** Une vue sans sujet, sans filtre : ce qu'elle montrera, et quoi faire en attendant. */
function EmptyView({ view }: { view: ForumView }) {
  const { t } = useTranslation('forum');
  const { params } = useForumFilters();
  const ask = useAsk();
  const icons: Partial<Record<ForumView, LucideIcon>> = { following: Rss, saved: Bookmark, mine: PenLine };
  const Icon = icons[view];
  // Écrire, ou parcourir tous les sujets
  const action =
    view === 'all' || view === 'mine' ? (
      <button type="button" onClick={() => ask()} className={primaryButton}>
        <PenLine aria-hidden className="size-4" />
        {t('intro.ask')}
      </button>
    ) : (
      <Link to={viewHref('all', params)} className={secondaryButton}>
        {t('empty.browse')}
        <ArrowRight aria-hidden className="size-4 transition-transform group-hover/secondary:translate-x-0.5 rtl:-scale-x-100" />
      </Link>
    );

  return (
    <div className="glass flex flex-col items-center rounded-[1.75rem] px-6 py-14 text-center sm:py-16">
      {Icon ? (
        <span aria-hidden className="grid size-14 place-items-center rounded-2xl bg-gold/10 text-gold">
          <Icon className="size-6" />
        </span>
      ) : (
        <span aria-hidden className="empty-loom h-16 w-48" />
      )}
      <p className="mt-6 font-display text-h4">{t(`empty.${view}.title`)}</p>
      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">{t(`empty.${view}.text`)}</p>
      <div className="mt-7">{action}</div>
    </div>
  );
}

/** Une vue des membres (son fil, ses sujets, sa liste de lecture), ouverte par un visiteur : ce qu'il y trouvera. */
function MemberGate({ view }: { view: 'following' | 'mine' | 'saved' }) {
  const { t } = useTranslation('forum');
  const location = useLocation();
  const icons: Record<typeof view, LucideIcon> = { following: Rss, saved: Bookmark, mine: PenLine };
  const Icon = icons[view];

  return (
    <section aria-labelledby="forum-gate" className="glass relative mt-5 flex flex-col items-center overflow-hidden rounded-[1.75rem] px-6 py-14 text-center sm:py-16">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-kente" />
      <span aria-hidden className="grid size-14 place-items-center rounded-2xl bg-kente-conic text-kente-night shadow-[0_12px_28px_-14px_var(--kente-coral)]">
        <Icon className="size-6" />
      </span>
      <h2 id="forum-gate" className="mt-6 font-display text-h4">
        {t(`gate.${view}.title`)}
      </h2>
      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">{t(`gate.${view}.text`)}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-2.5">
        <Link to={paths.login} state={{ from: location }} viewTransition onPointerEnter={() => prefetch(pages.login)} className={primaryButton}>
          {t('signIn.login')}
        </Link>
        <Link to={paths.register} state={{ from: location }} viewTransition onPointerEnter={() => prefetch(pages.register)} className={secondaryButton}>
          {t('signIn.register')}
        </Link>
      </div>
    </section>
  );
}

/**
 * Au bout du fil, la question qui manque : celle du visiteur. Même anatomie qu'un sujet (l'auteur, le titre, ce
 * qu'il s'y passe), en pointillés.
 */
function AskCard() {
  const { t } = useTranslation('forum');
  const ask = useAsk();
  const dashed = 'border-dashed border-border-strong transition-colors duration-300 group-hover/ask:border-gold/55';

  return (
    <button
      type="button"
      onClick={() => ask()}
      onPointerEnter={() => prefetch(pages.newTopic)}
      className={cn('group/ask flex w-full items-center gap-4 rounded-2xl border p-4 text-start sm:p-5', dashed, focusRing)}
    >
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-full border border-dashed border-gold/70 bg-background/70 text-gold transition-transform duration-500 ease-out-expo group-hover/ask:rotate-12 group-hover/ask:scale-105"
      >
        <PenLine className="size-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-foreground">{t('askCard.title')}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{t('askCard.text')}</span>
      </span>
      <ArrowRight
        aria-hidden
        className="size-4 shrink-0 text-gold transition-transform duration-300 group-hover/ask:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/ask:-translate-x-0.5"
      />
    </button>
  );
}
