import { ChevronDown, Star } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { DASHBOARD_ANCHORS, revealSection } from './sections';
import AvatarStack from '@/components/shared/AvatarStack';
import { roleOf } from '@/config/roles';
import { useDashboard } from '@/hooks/useDashboard';
import { useNow } from '@/hooks/useNow';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages, type PageImport } from '@/router/pages';
import { paths } from '@/router/paths';
import type { TeamActivity, TeamActivityType } from '@/types/dashboard.types';
import { formatRelativeTime, isolate } from '@/utils/formatters';

// Événements montrés avant « Voir plus »
const SHOWN = 6;

const ease = [0.16, 1, 0.3, 1] as const;
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

// Le fil de chaque genre d'événement : or pour ce qui sort, vert pour qui arrive, rouge pour ce qui demande une réponse
const DOTS: Record<TeamActivityType, string> = {
  RELEASE: 'bg-kente-gold shadow-[0_0_8px_-1px_var(--kente-gold)]',
  DEVLOG: 'bg-foreground/35',
  MEMBER_JOINED: 'bg-kente-jade',
  APPLICATION: 'bg-kente-coral',
  OPENING_PUBLISHED: 'bg-kente-jade',
  FEEDBACK_REQUESTED: 'bg-kente-gold',
  FEEDBACK_GIVEN: 'bg-kente-coral',
  HACKATHON_REGISTERED: 'bg-kente-jade shadow-[0_0_8px_-1px_var(--kente-jade)]',
  PR_OPENED: 'bg-foreground/35',
  PR_MERGED: 'bg-kente-gold shadow-[0_0_8px_-1px_var(--kente-gold)]',
  PR_APPROVED: 'bg-kente-jade',
  PR_CHANGES_REQUESTED: 'bg-kente-coral',
};

/**
 * « Dans tes équipes » : l'activité des projets du membre, en direct. Design 3B (« ama.o a poussé 2 commits sur
 * #84 · il y a 40 s »).
 *
 * Releases et devlog, pull requests ouvertes, relues et fusionnées, arrivées, candidatures (là où il les traite), rôles
 * publiés, demandes de retours et avis reçus, inscriptions aux hackathons : ses propres gestes n'y sont pas. Le fil se rafraîchit chaque minute (sauf en
 * économie de données) : un nouvel événement s'y glisse en haut. Chacun mène à ce qu'il raconte.
 */
export default function TeamActivityFeed() {
  const { t } = useTranslation('dashboard');
  const activity = useDashboard((dashboard) => dashboard.activity);
  const [expanded, setExpanded] = useState(false);
  // Les heures relatives avancent toutes seules
  useNow(30_000);

  if (activity.isError) {
    return null;
  }
  const events = activity.data ?? [];
  const shown = expanded ? events : events.slice(0, SHOWN);

  return (
    <section aria-labelledby="atelier-activite-title" className="glass flex flex-col rounded-2xl p-5">
      <h2 id="atelier-activite-title" className="flex items-center gap-2 font-sans text-[0.9375rem] font-bold">
        <span aria-hidden className="live-dot size-2" />
        {t('activity.title')}
        <span className="ms-auto font-mono text-[0.625rem] font-normal tracking-[0.08em] text-faint-foreground uppercase">{t('activity.live')}</span>
      </h2>

      {activity.isPending ? (
        <ul aria-hidden className="mt-4 flex flex-col gap-4">
          {[0, 1, 2, 3].map((index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full skeleton-shimmer" />
              <span className="flex flex-1 flex-col gap-1.5">
                <span className="h-3 w-full rounded-full skeleton-shimmer" />
                <span className="h-2.5 w-16 rounded-full skeleton-shimmer" />
              </span>
            </li>
          ))}
        </ul>
      ) : events.length === 0 ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-foreground">{t('activity.emptyTitle')}</p>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">{t('activity.emptyText')}</p>
        </div>
      ) : (
        <>
          <ol className="relative mt-3.5 -mx-2">
            {/* Le fil du temps, derrière les pastilles */}
            <span aria-hidden className="absolute start-[0.8125rem] top-3 bottom-3 w-px bg-linear-to-b from-border-strong via-border to-transparent" />
            <AnimatePresence initial={false}>
              {shown.map((event) => (
                <m.li
                  key={event.key}
                  layout="position"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.45, ease }}
                  className="relative overflow-hidden"
                >
                  <ActivityItem event={event} />
                </m.li>
              ))}
            </AnimatePresence>
          </ol>
          {events.length > SHOWN && (
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              className={cn('mt-2 inline-flex items-center gap-1 self-start rounded-md text-xs font-bold text-muted-foreground transition-colors hover:text-foreground', focusRing)}
            >
              {expanded ? t('activity.less') : t('activity.more')}
              <ChevronDown aria-hidden className={cn('size-3.5 transition-transform duration-300', expanded && 'rotate-180')} />
            </button>
          )}
        </>
      )}
    </section>
  );
}

function ActivityItem({ event }: { event: TeamActivity }) {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation();
  const reduced = useReducedMotion();
  const name = event.actor?.fullName ?? '';
  const role = event.role ? roleOf(event.role) : undefined;
  const roleName = role ? tc(`teamRoles.${role.id}`) : '';
  const values = { name: isolate(name), project: isolate(event.project.name), title: isolate(event.subject ?? '') };
  const pullRequestValues = { ...values, number: event.number ?? '' };
  const components = {
    b: <bdi className="font-bold text-foreground" />,
    hl: <bdi className="text-gold" />,
    p: <bdi className="font-mono text-[0.75rem] text-soft-foreground" />,
  };

  const sentence = (() => {
    switch (event.type) {
      case 'RELEASE':
        return <Trans t={t} i18nKey="activity.release" values={{ ...values, version: isolate(event.subject ?? '') }} components={components} />;
      case 'DEVLOG':
        return <Trans t={t} i18nKey="activity.devlog" values={values} components={components} />;
      case 'MEMBER_JOINED':
        return role ? (
          <Trans t={t} i18nKey="activity.joinedAs" values={{ ...values, role: roleName }} components={components} />
        ) : (
          <Trans t={t} i18nKey="activity.joined" values={values} components={components} />
        );
      case 'APPLICATION':
        return event.subject ? (
          <Trans t={t} i18nKey="activity.application" values={values} components={components} />
        ) : (
          <Trans t={t} i18nKey="activity.applicationNoRole" values={values} components={components} />
        );
      case 'OPENING_PUBLISHED':
        return <Trans t={t} i18nKey="activity.opening" count={event.count} values={values} components={components} />;
      case 'FEEDBACK_REQUESTED':
        return <Trans t={t} i18nKey="activity.feedbackRequested" values={values} components={components} />;
      case 'FEEDBACK_GIVEN':
        return event.count > 1 ? (
          <Trans t={t} i18nKey="activity.feedbackGivenMany" count={event.count - 1} values={values} components={components} />
        ) : (
          <Trans t={t} i18nKey="activity.feedbackGiven" values={values} components={components} />
        );
      case 'HACKATHON_REGISTERED':
        return <Trans t={t} i18nKey="activity.hackathon" values={values} components={components} />;
      case 'PR_OPENED':
        return <Trans t={t} i18nKey="activity.prOpened" values={pullRequestValues} components={components} />;
      case 'PR_MERGED':
        return <Trans t={t} i18nKey="activity.prMerged" values={pullRequestValues} components={components} />;
      case 'PR_APPROVED':
        return <Trans t={t} i18nKey="activity.prApproved" values={pullRequestValues} components={components} />;
      case 'PR_CHANGES_REQUESTED':
        return <Trans t={t} i18nKey="activity.prChangesRequested" values={pullRequestValues} components={components} />;
    }
  })();

  // Ce que raconte l'événement : la candidature plus haut dans l'atelier, le hackathon, les rôles, ou le projet
  const target: { to: string; preload?: PageImport } | 'reviews' =
    event.type === 'APPLICATION'
      ? 'reviews'
      : event.type === 'HACKATHON_REGISTERED' && event.hackathonSlug
        ? { to: paths.hackathon(event.hackathonSlug), preload: pages.hackathon }
        : event.type === 'OPENING_PUBLISHED'
          ? { to: paths.projectRoles(event.project.slug), preload: pages.project }
          : event.type.startsWith('PR_') && event.number !== null
            ? { to: paths.review(event.project.slug, event.number), preload: pages.review }
            : { to: paths.project(event.project.slug), preload: pages.project };

  const body = (
    <>
      <span aria-hidden className={cn('absolute start-[0.625rem] top-[0.8125rem] size-1.5 rounded-full ring-4 ring-surface', DOTS[event.type])} />
      <span className="block text-[0.8125rem] leading-normal text-soft-foreground">{sentence}</span>
      {event.body && (
        <span dir="auto" className="mt-0.5 line-clamp-2 block text-start text-xs leading-relaxed text-muted-foreground">
          {/* Un avis est la parole de quelqu'un : entre guillemets */}
          {event.type === 'FEEDBACK_GIVEN' ? t('activity.quote', { text: event.body }) : event.body}
        </span>
      )}
      <span className="mt-1 flex items-center gap-2 font-mono text-[0.6875rem] text-faint-foreground">
        <time dateTime={event.at}>{formatRelativeTime(event.at)}</time>
        {event.rating !== null && (
          <span className="inline-flex items-center gap-0.5 text-coral" title={t('activity.rating', { count: event.rating })}>
            <Star aria-hidden className="size-2.5 fill-current" />
            {event.rating}
            <span className="sr-only">{t('activity.rating', { count: event.rating })}</span>
          </span>
        )}
        {event.others.length > 0 && <AvatarStack users={event.others} max={3} ringClassName="ring-surface" className="ms-auto [&>span]:size-5 [&>span]:text-[0.5rem]" />}
      </span>
    </>
  );
  const className = cn(
    'group/event relative block w-full rounded-xl py-2 ps-7 pe-2 text-start transition-colors duration-200 hover:bg-foreground/4',
    focusRing,
  );

  if (target === 'reviews') {
    return (
      <button
        type="button"
        onClick={() => revealSection(DASHBOARD_ANCHORS.reviews, reduced)}
        className={className}
      >
        {body}
      </button>
    );
  }
  return (
    <ItemLink to={target.to} preload={target.preload} className={className}>
      {body}
    </ItemLink>
  );
}

function ItemLink({ to, preload, className, children }: { to: string; preload?: PageImport; className: string; children: ReactNode }) {
  return (
    <Link to={to} viewTransition onPointerEnter={() => preload && prefetch(preload)} onFocus={() => preload && prefetch(preload)} className={className}>
      {children}
    </Link>
  );
}
