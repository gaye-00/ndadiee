import { m } from 'motion/react';
import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { DASHBOARD_ANCHORS, revealSection } from './sections';
import ErrorState from '@/components/feedback/ErrorState';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { useNow } from '@/hooks/useNow';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { currentLanguage } from '@/i18n';
import { daysUntil } from '@/lib/hackathonTime';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages, type PageImport } from '@/router/pages';
import { paths } from '@/router/paths';
import type { Dashboard } from '@/types/dashboard.types';
import { formatDay, isolate } from '@/utils/formatters';

// Un hackathon plus lointain ne fait pas partie du « jour »
const HACKATHON_HORIZON_DAYS = 45;

const ease = [0.16, 1, 0.3, 1] as const;

/** Ce que le résumé du jour sait de l'atelier : ce qui attend, et le prochain rendez-vous */
interface Agenda {
  pullRequests: number;
  applications: number;
  feedbackRequests: number;
  hackathon: { title: string; slug: string; startsAt: string; endsAt: string | null } | null;
  waiting: { project: string; slug: string } | null;
  projects: number;
}

function agendaOf(dashboard: Dashboard): Agenda {
  // Le hackathon le plus proche de ses équipes
  const hackathon = dashboard.projects
    .filter((project) => project.myStatus === 'ACCEPTED' && project.hackathon?.startsAt)
    .map((project) => project.hackathon!)
    .sort((a, b) => Date.parse(a.startsAt!) - Date.parse(b.startsAt!))[0];
  const waiting = dashboard.projects.find((project) => project.myStatus === 'PENDING');
  return {
    pullRequests: dashboard.pullRequests.length,
    applications: dashboard.applications.length,
    feedbackRequests: dashboard.feedbackRequests.length,
    hackathon: hackathon ? { title: hackathon.title, slug: hackathon.slug, startsAt: hackathon.startsAt!, endsAt: hackathon.endsAt } : null,
    waiting: waiting ? { project: waiting.name, slug: waiting.slug } : null,
    projects: dashboard.projects.length,
  };
}

/**
 * En-tête de l'atelier : la date, la salutation et le résumé du jour. Design 3B (« Salut Chinedu / Aujourd'hui :
 * 2 revues t'attendent, 3 tâches, 1 candidature à étudier »).
 *
 * Chaque élément du résumé mène à ce qu'il annonce : les revues plus bas dans la page, le hackathon, la
 * candidature en attente. La recherche et « Nouveau projet » sont dans la barre du haut, au-dessus.
 */
export default function DashboardHeader() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const now = useNow(60_000);
  const agenda = useDashboard(agendaOf);
  // Le prénom : le premier mot du nom complet
  const name = user?.fullName.trim().split(/\s+/)[0] || user?.username || '';

  return (
    <header className="relative flex flex-col gap-2">
      <m.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="eyebrow flex items-center gap-2"
      >
        <span aria-hidden className="flex h-2.5 gap-px overflow-hidden rounded-[2px]">
          <span className="w-1.5 bg-kente-gold" />
          <span className="w-0.5 bg-kente-jade" />
          <span className="w-1 bg-kente-coral" />
        </span>
        <time dateTime={new Date(now).toISOString().slice(0, 10)}>{formatDay(new Date(now))}</time>
      </m.p>

      <m.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.05 }}
        className="font-display text-[1.625rem] leading-tight font-bold tracking-[-0.02em] text-balance sm:text-[1.75rem]"
      >
        {t('header.hello', { name: isolate(name) })}
      </m.h1>

      {agenda.isPending ? (
        <span aria-hidden className="mt-1 h-4 w-full max-w-md rounded-full skeleton-shimmer" />
      ) : agenda.data ? (
        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease, delay: 0.15 }}
          className="max-w-3xl text-[0.9375rem] leading-relaxed text-muted-foreground"
        >
          <Summary agenda={agenda.data} now={now} />
        </m.p>
      ) : null}

      {agenda.isError && (
        <ErrorState
          title={t('header.error')}
          description={t('header.errorText')}
          onRetry={() => void agenda.refetch()}
          className="mt-3"
        />
      )}
    </header>
  );
}

/** « Aujourd'hui : 2 candidatures à étudier, 3 demandes de retours et FinTech Afrique dans 27 jours. » */
function Summary({ agenda, now }: { agenda: Agenda; now: number }) {
  const { t } = useTranslation('dashboard');
  const items: ReactNode[] = [];

  if (agenda.pullRequests > 0) {
    items.push(
      <SummaryLink key="pull-requests" to={`#${DASHBOARD_ANCHORS.reviews}`} tone="gold">
        {t('header.pullRequests', { count: agenda.pullRequests })}
      </SummaryLink>,
    );
  }
  if (agenda.applications > 0) {
    items.push(
      <SummaryLink key="applications" to={`#${DASHBOARD_ANCHORS.reviews}`} tone="coral">
        {t('header.applications', { count: agenda.applications })}
      </SummaryLink>,
    );
  }
  if (agenda.feedbackRequests > 0) {
    items.push(
      <SummaryLink key="feedback" to={`#${DASHBOARD_ANCHORS.reviews}`} tone="gold">
        {t('header.feedback', { count: agenda.feedbackRequests })}
      </SummaryLink>,
    );
  }
  const hackathon = agenda.hackathon;
  if (hackathon) {
    const live = Date.parse(hackathon.startsAt) <= now && (!hackathon.endsAt || Date.parse(hackathon.endsAt) > now);
    const days = daysUntil(hackathon.startsAt, now);
    if (live || days <= HACKATHON_HORIZON_DAYS) {
      items.push(
        <SummaryLink key="hackathon" to={paths.hackathon(hackathon.slug)} preload={pages.hackathon} tone="jade">
          {live
            ? t('header.hackathonLive', { title: isolate(hackathon.title) })
            : t('header.hackathonIn', { title: isolate(hackathon.title), count: days })}
        </SummaryLink>,
      );
    }
  }
  if (agenda.waiting && items.length < 4) {
    items.push(
      <SummaryLink key="waiting" to={paths.project(agenda.waiting.slug)} preload={pages.project} tone="neutral">
        {t('header.waiting', { project: isolate(agenda.waiting.project) })}
      </SummaryLink>,
    );
  }

  if (items.length === 0) {
    return <>{agenda.projects === 0 ? t('header.newcomer') : t('header.calm')}</>;
  }
  return (
    <>
      {t('header.today')} <ListOf items={items} />.
    </>
  );
}

/** Des éléments liés comme une phrase de la langue : « a, b et c », « a، b و c »… */
function ListOf({ items }: { items: ReactNode[] }) {
  const format = new Intl.ListFormat([...currentLanguage().intl], { type: 'conjunction' });
  // Chaque élément est remplacé par son rang le temps du formatage, puis remis à sa place
  const parts = format.formatToParts(items.map((_, index) => String(index)));
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>{part.type === 'element' ? items[Number(part.value)] : part.value}</Fragment>
      ))}
    </>
  );
}

const TONES = {
  coral: 'text-coral decoration-coral/35 hover:decoration-coral',
  gold: 'text-gold decoration-gold/35 hover:decoration-gold',
  jade: 'text-jade decoration-jade/35 hover:decoration-jade',
  neutral: 'text-soft-foreground decoration-foreground/25 hover:decoration-foreground/60',
} as const;

function SummaryLink({ to, tone, preload, children }: { to: string; tone: keyof typeof TONES; preload?: PageImport; children: ReactNode }) {
  const reduced = useReducedMotion();
  const className = cn(
    'rounded-sm font-semibold underline decoration-2 underline-offset-4 transition-[text-decoration-color] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
    TONES[tone],
  );
  // Une section de la page : on y descend, et le focus suit
  if (to.startsWith('#')) {
    return (
      <a
        href={to}
        onClick={(event) => {
          if (revealSection(to.slice(1), reduced)) {
            event.preventDefault();
          }
        }}
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={to} viewTransition onPointerEnter={() => preload && prefetch(preload)} onFocus={() => preload && prefetch(preload)} className={className}>
      {children}
    </Link>
  );
}
