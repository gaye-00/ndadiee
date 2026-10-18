import { Lock } from 'lucide-react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { tagAccent, VIEW_ITEMS, viewHref } from './forumUtils';
import { useAuth } from '@/hooks/useAuth';
import { FORUM_MEMBER_VIEWS, forumSearch, useForumFilters } from '@/hooks/useForumFilters';
import { useForumOverview } from '@/hooks/useQuestions';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import { formatCount } from '@/utils/formatters';

// La pastille de la vue ouverte glisse d'une vue à l'autre
const slide = { type: 'spring', stiffness: 420, damping: 36 } as const;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * La marge gauche du forum, comme celle de dev.to : les vues (tous les sujets, son fil, sans réponse, résolus, ses
 * sujets, sa liste de lecture), les tags qu'on suit, puis les tags les plus utilisés. Un visiteur y trouve d'abord
 * l'invitation à rejoindre la communauté ; les vues des membres portent un cadenas. Sur grand écran seulement : sur
 * téléphone, les vues passent au-dessus du fil (TopicFilters).
 */
export default function ForumNav({ className }: { className?: string }) {
  const { t } = useTranslation('forum');
  const { isAuthenticated, user } = useAuth();
  const { filters, params } = useForumFilters();
  const { data: overview } = useForumOverview();
  const followed = user?.followedTags ?? [];

  return (
    <aside aria-label={t('nav.label')} className={cn('flex flex-col gap-6', className)}>
      {!isAuthenticated && <JoinCard contributors={overview?.contributors} />}

      <nav aria-label={t('nav.views')}>
        <ul className="flex flex-col gap-0.5">
          {VIEW_ITEMS.map(({ view, icon: Icon, count }) => {
            const current = filters.view === view;
            const locked = !isAuthenticated && FORUM_MEMBER_VIEWS.has(view);
            const value = overview && count ? count(overview) : undefined;
            return (
              <li key={view}>
                <Link
                  to={viewHref(view, params)}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'group/view relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-200',
                    current ? 'font-semibold text-foreground' : 'text-soft-foreground hover:bg-foreground/5 hover:text-foreground',
                    focusRing,
                  )}
                >
                  {current && (
                    <>
                      <m.span layoutId="forum-view" transition={slide} className="absolute inset-0 rounded-xl bg-foreground/8 ring-1 ring-foreground/6 ring-inset" />
                      <m.span
                        layoutId="forum-view-thread"
                        transition={slide}
                        aria-hidden
                        className="absolute -start-1 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-linear-to-b from-kente-gold via-kente-coral to-kente-jade"
                      />
                    </>
                  )}
                  <Icon
                    aria-hidden
                    strokeWidth={current ? 2.25 : 2}
                    className={cn(
                      'relative size-4.5 shrink-0 transition-transform duration-300 ease-out-expo group-hover/view:scale-110',
                      view === 'unanswered' && value ? 'text-gold' : current ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  />
                  <span className="relative min-w-0 flex-1 truncate">{t(`views.${view}`)}</span>
                  {locked ? (
                    <Lock aria-label={t('nav.membersOnly')} className="relative size-3.5 shrink-0 text-faint-foreground" />
                  ) : (
                    value !== undefined && (
                      <span className="relative font-mono text-xs text-muted-foreground tabular-nums">{formatCount(value)}</span>
                    )
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {isAuthenticated && <FollowedTags tags={followed} activeTag={filters.tag} params={params} />}

      {overview && overview.tags.length > 0 && (
        <section aria-labelledby="forum-popular-tags">
          <h2 id="forum-popular-tags" className="eyebrow px-3">
            {t('nav.popularTags')}
          </h2>
          <ul className="mt-2 flex flex-col gap-0.5">
            {overview.tags.map((tag) => (
              <li key={tag.slug}>
                <TagLink tag={tag} count={tag.topics} active={filters.tag === tag.slug} params={params} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

/** Les tags que le membre suit : son fil est fait de leurs sujets. Sans tag suivi, l'invitation à en suivre. */
function FollowedTags({ tags, activeTag, params }: { tags: { slug: string; name: string }[]; activeTag: string | null; params: URLSearchParams }) {
  const { t } = useTranslation('forum');

  return (
    <section aria-labelledby="forum-followed-tags">
      <h2 id="forum-followed-tags" className="eyebrow px-3">
        {t('nav.followedTags')}
      </h2>
      {tags.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-0.5">
          {tags.map((tag) => (
            <li key={tag.slug}>
              <TagLink tag={tag} active={activeTag === tag.slug} params={params} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 px-3 text-xs leading-relaxed text-muted-foreground">{t('nav.noFollowedTags')}</p>
      )}
    </section>
  );
}

/** Un tag de la marge : son dièse coloré, son nom, ses sujets. Choisi, un clic le retire. */
function TagLink({ tag, count, active, params }: { tag: { slug: string; name: string }; count?: number; active: boolean; params: URLSearchParams }) {
  const { t } = useTranslation('forum');

  return (
    <Link
      to={`${paths.forum}${forumSearch({ tag: active ? null : tag.slug }, params)}`}
      aria-current={active ? 'true' : undefined}
      title={active ? t('nav.removeTag', { tag: tag.name }) : undefined}
      style={tagAccent(tag.slug)}
      className={cn(
        'flex h-9 items-center gap-1 rounded-xl px-3 text-sm transition-colors duration-200',
        active
          ? 'bg-[color-mix(in_srgb,var(--tag-accent)_11%,transparent)] font-semibold text-foreground'
          : 'text-soft-foreground hover:bg-foreground/5 hover:text-foreground',
        focusRing,
      )}
    >
      <span aria-hidden className="font-mono font-semibold text-(--tag-accent)">
        #
      </span>
      <span className="min-w-0 flex-1 truncate">{tag.name}</span>
      {count !== undefined && <span className="font-mono text-xs text-muted-foreground tabular-nums">{count}</span>}
    </Link>
  );
}

/** Pour un visiteur, en tête de la marge : rejoindre la communauté, comme la carte de dev.to. */
function JoinCard({ contributors }: { contributors: number | undefined }) {
  const { t } = useTranslation('forum');
  const location = useLocation();

  return (
    <div className="glass relative overflow-hidden rounded-2xl p-4">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-kente" />
      <p className="font-display text-h5">{t('join.title')}</p>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
        {contributors ? t('join.textCount', { count: contributors }) : t('join.text')}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Link
          to={paths.register}
          state={{ from: location }}
          viewTransition
          onPointerEnter={() => prefetch(pages.register)}
          className={cn(
            'inline-flex h-10 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-bold text-background transition-opacity hover:opacity-90',
            focusRing,
            'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          {t('join.register')}
        </Link>
        <Link
          to={paths.login}
          state={{ from: location }}
          viewTransition
          onPointerEnter={() => prefetch(pages.login)}
          className={cn('inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-soft-foreground transition-colors hover:bg-foreground/5 hover:text-foreground', focusRing)}
        >
          {t('join.login')}
        </Link>
      </div>
    </div>
  );
}
