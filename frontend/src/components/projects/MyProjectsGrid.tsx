import { ArrowRight, PenLine, Plus } from 'lucide-react';
import { m } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import DashboardSectionTitle from '@/components/dashboard/DashboardSectionTitle';
import { DASHBOARD_ANCHORS, revealSection } from '@/components/dashboard/sections';
import AvatarStack from '@/components/shared/AvatarStack';
import type { KenteThread } from '@/config/roles';
import { useDashboard } from '@/hooks/useDashboard';
import { useNow } from '@/hooks/useNow';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { daysUntil } from '@/lib/hackathonTime';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { DashboardProject } from '@/types/dashboard.types';
import { formatRelativeTime, isolate } from '@/utils/formatters';

// Le fil de chaque carte, dans l'ordre du design : vert, or, rouge
const THREADS: readonly KenteThread[] = ['jade', 'gold', 'coral'];
// Couleur de marque (pastille, barres) et couleur lisible (texte) de chaque fil
const BRAND: Record<KenteThread, string> = { gold: 'var(--kente-gold)', coral: 'var(--kente-coral)', jade: 'var(--kente-jade)' };
const READABLE: Record<KenteThread, string> = { gold: 'var(--gold)', coral: 'var(--coral)', jade: 'var(--jade)' };

// Une release plus ancienne ne dit plus rien du rythme de l'équipe
const RECENT_RELEASE_DAYS = 21;

const ease = [0.16, 1, 0.3, 1] as const;
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * « Mes projets » : les équipes du membre, les plus vivantes d'abord, puis ses candidatures en attente. Design 3B.
 *
 * Chaque carte porte un fil du kente : le nom du projet, son prochain rendez-vous (hackathon, dernière release),
 * l'histogramme de ses commits sur douze semaines, l'équipe, et ce qui attend le membre (candidatures à étudier,
 * revues à rendre, places à pourvoir, avis reçus). Toute la carte mène au projet. Sur téléphone, les cartes défilent de côté ;
 * une place pour lancer un projet complète la rangée.
 */
export default function MyProjectsGrid() {
  const { t } = useTranslation('dashboard');
  const projects = useDashboard((dashboard) => dashboard.projects);

  if (projects.isError) {
    return null;
  }

  return (
    <section id={DASHBOARD_ANCHORS.projects} aria-labelledby="atelier-projets-title" tabIndex={-1} className="scroll-mt-24 outline-none">
      <DashboardSectionTitle id="atelier-projets-title">{t('projects.title')}</DashboardSectionTitle>

      <div className="@container mt-3.5">
        {projects.isPending ? (
          <Row>
            {[0, 1, 2].map((index) => (
              <li key={index} className={cell}>
                <ProjectCardSkeleton />
              </li>
            ))}
          </Row>
        ) : projects.data.length === 0 ? (
          <NoTeamYet />
        ) : (
          <Row>
            {projects.data.map((project, index) => (
              <li key={project.id} className={cell}>
                <ProjectCard project={project} thread={THREADS[index % THREADS.length]} index={index} />
              </li>
            ))}
            {/* Une rangée incomplète garde une place pour le prochain projet */}
            {projects.data.length % 3 !== 0 && (
              <li className={cell}>
                <LaunchCard index={projects.data.length} />
              </li>
            )}
          </Row>
        )}
      </div>
    </section>
  );
}

// Téléphone : une rangée qui défile de côté, carte après carte ; plus large : une grille de deux, puis trois
const cell = 'w-[min(18.5rem,calc(100%-2rem))] shrink-0 snap-start @lg:w-auto';

function Row({ children }: { children: ReactNode }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3.5 overflow-x-auto px-4 pt-1 pb-3 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 @lg:mx-0 @lg:grid @lg:grid-cols-2 @lg:overflow-visible @lg:px-0 @lg:pb-0 @3xl:grid-cols-3">
      {children}
    </ul>
  );
}

function ProjectCard({ project, thread, index }: { project: DashboardProject; thread: KenteThread; index: number }) {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation();
  const now = useNow(60_000);
  const pending = project.myStatus === 'PENDING';
  const href = paths.project(project.slug);
  const preload = () => prefetch(pages.project);

  // Sa place dans l'équipe : porteur, mainteneur, ou le rôle qu'il y tient
  const place =
    project.myRole === 'OWNER'
      ? tc('project.team.founder')
      : project.myRole === 'MAINTAINER'
        ? tc('project.team.maintainer')
        : project.mySpecialty
          ? tc(`project.specialty.${project.mySpecialty.toLowerCase() as Lowercase<NonNullable<DashboardProject['mySpecialty']>>}`)
          : null;

  // Le prochain rendez-vous de l'équipe ; sinon sa dernière release, sinon son accroche
  const pulse = (() => {
    if (pending) {
      return project.appliedTo ? t('projects.applied', { role: isolate(project.appliedTo) }) : t('projects.appliedNoRole');
    }
    const hackathon = project.hackathon;
    if (hackathon?.startsAt && (!hackathon.endsAt || Date.parse(hackathon.endsAt) > now)) {
      return Date.parse(hackathon.startsAt) <= now
        ? t('projects.hackathonLive', { title: isolate(hackathon.title) })
        : t('projects.hackathonIn', { title: isolate(hackathon.title), count: daysUntil(hackathon.startsAt, now) });
    }
    if (project.lastRelease && project.lastReleaseAt && now - Date.parse(project.lastReleaseAt) < RECENT_RELEASE_DAYS * 86_400_000) {
      return t('projects.release', { version: isolate(project.lastRelease), time: formatRelativeTime(project.lastReleaseAt) });
    }
    return project.tagline ?? '';
  })();

  return (
    <m.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -30px 0px' }}
      transition={{ duration: 0.55, ease, delay: Math.min(index, 5) * 0.06 }}
      style={{ '--thread': BRAND[thread], '--thread-text': READABLE[thread] } as CSSProperties}
      className={cn(
        'group/card @container/card relative flex h-full flex-col gap-3 rounded-2xl p-5 transition-[translate,border-color,box-shadow,background-color] duration-300 ease-out-expo',
        'hover:-translate-y-[3px] focus-within:-translate-y-[3px]',
        pending
          ? 'border border-dashed border-border-strong bg-foreground/[0.015] hover:border-[color-mix(in_srgb,var(--thread)_55%,transparent)]'
          : 'glass hover:border-[color-mix(in_srgb,var(--thread)_40%,transparent)] hover:shadow-[0_24px_48px_-32px_var(--thread)] focus-within:border-[color-mix(in_srgb,var(--thread)_40%,transparent)]',
      )}
    >
      {/* Le nom, et sa place dans l'équipe */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            'size-2.5 shrink-0 rounded-[3px] transition-transform duration-500 ease-out-expo group-hover/card:rotate-45',
            pending ? 'border-[1.5px] border-(--thread)' : 'bg-(--thread) shadow-[0_0_10px_-1px_var(--thread)]',
          )}
        />
        <h3 dir="auto" className="min-w-0 flex-1 truncate text-start font-mono text-[0.9375rem] leading-6 font-medium text-foreground">
          {/* Le lien couvre toute la carte */}
          <Link
            to={href}
            viewTransition
            onPointerEnter={preload}
            onFocus={preload}
            className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring/70"
          >
            {project.name}
          </Link>
        </h3>
        {pending ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold/12 px-2 py-0.5 font-mono text-[0.625rem] tracking-wide text-gold uppercase">
            <span aria-hidden className="size-1.5 rounded-full bg-kente-gold animate-pulse-dot" />
            {t('projects.pending')}
          </span>
        ) : (
          // Sur une carte étroite, le nom du projet passe avant
          place && <span className="max-w-[45%] shrink-0 truncate font-mono text-[0.6875rem] text-faint-foreground @max-[15rem]/card:hidden">{place}</span>
        )}
        {/* Son porteur le modifie d'ici : au-dessus du lien qui couvre la carte */}
        {project.myRole === 'OWNER' && !pending && (
          <Link
            to={paths.editProject(project.slug)}
            viewTransition
            aria-label={tc('project.owner.editNamed', { name: project.name })}
            title={tc('project.owner.edit')}
            onPointerEnter={() => prefetch(pages.editProject)}
            onFocus={() => prefetch(pages.editProject)}
            className="relative z-10 -me-1.5 grid size-7 shrink-0 place-items-center rounded-lg text-faint-foreground outline-none transition-colors hover:bg-foreground/8 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <PenLine aria-hidden className="size-3.5" />
          </Link>
        )}
      </div>

      <p dir="auto" className="-mt-1 line-clamp-1 min-h-5 text-start text-[0.8125rem] leading-5 text-muted-foreground">
        {pulse}
      </p>

      {pending ? (
        <p className="flex items-center gap-2 font-mono text-[0.6875rem] text-faint-foreground">
          <span aria-hidden className="size-1.5 rounded-full bg-kente-gold animate-pulse-dot" />
          <time dateTime={project.joinedAt}>{t('projects.sent', { time: formatRelativeTime(project.joinedAt) })}</time>
        </p>
      ) : (
        <CommitWeeks project={project} />
      )}

      {/* L'équipe, et ce qui attend le membre */}
      <div className="mt-auto flex items-center gap-2.5 pt-0.5">
        {project.team.length > 0 && (
          <>
            {/* Des candidatures à étudier : le libellé est long, l'équipe se resserre */}
            <AvatarStack users={project.team} max={project.pendingApplications > 0 || project.reviewRequests > 0 ? 2 : 4} ringClassName="ring-surface" />
            <span className="sr-only">{t('projects.team', { count: project.memberCount })}</span>
          </>
        )}
        <span className="flex-1" />
        <NeedsYou project={project} />
      </div>
    </m.article>
  );
}

/**
 * Les commits des douze dernières semaines, en barres : la semaine en cours dans la couleur du fil. Elles montent
 * quand la carte arrive à l'écran. Sans dépôt synchronisé, un fil en pointillés le dit.
 */
function CommitWeeks({ project }: { project: DashboardProject }) {
  const { t } = useTranslation('dashboard');
  const reduced = useReducedMotion();
  const weeks = project.commitWeeks;

  if (!weeks || weeks.length === 0) {
    return (
      <p className="flex h-7 items-center gap-2.5 font-mono text-[0.6875rem] text-faint-foreground">
        <span aria-hidden className="h-px flex-1 border-t border-dashed border-border-strong" />
        {t('projects.notSynced')}
      </p>
    );
  }
  const max = Math.max(1, ...weeks);
  const thisWeek = project.commitsThisWeek ?? weeks[weeks.length - 1];

  return (
    <div className="flex h-7 items-end gap-3">
      <ol aria-hidden className="flex h-full flex-1 items-end gap-[3px]">
        {weeks.map((count, index) => {
          const current = index === weeks.length - 1;
          return (
            <li key={index} className="flex h-full flex-1 items-end">
              <m.span
                initial={reduced ? false : { scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15 + index * 0.035, ease }}
                style={{ height: `${Math.max(10, (count / max) * 100)}%` }}
                className={cn(
                  'block w-full origin-bottom rounded-[2px] transition-colors duration-300',
                  current ? 'bg-(--thread) shadow-[0_0_10px_-2px_var(--thread)]' : 'bg-foreground/12 group-hover/card:bg-foreground/20',
                )}
              />
            </li>
          );
        })}
      </ol>
      <span className="shrink-0 font-mono text-[0.6875rem] leading-none text-(--thread-text) tabular-nums">
        {t('projects.commits', { count: thisWeek })}
      </span>
    </div>
  );
}

/**
 * Ce qui attend le membre dans ce projet, au bout de la carte : les candidatures à étudier (elles mènent aux revues
 * de l'atelier), les places à pourvoir (aux rôles du projet), les avis reçus ; sinon, l'équipe est au complet.
 */
function NeedsYou({ project }: { project: DashboardProject }) {
  const { t } = useTranslation('dashboard');
  const reduced = useReducedMotion();
  const label = 'relative z-10 inline-flex min-w-0 items-center gap-1 rounded-md text-xs font-bold';

  if (project.myStatus === 'PENDING') {
    return <span className={cn(label, 'text-gold')}>{t('projects.waiting')}</span>;
  }
  if (project.pendingApplications > 0) {
    return (
      <button
        type="button"
        onClick={() => revealSection(DASHBOARD_ANCHORS.reviews, reduced)}
        className={cn(label, 'group/needs text-coral', focusRing)}
      >
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-kente-coral animate-pulse-dot" />
        <span className="truncate">{t('projects.needs.applications', { count: project.pendingApplications })}</span>
        <ArrowRight aria-hidden className="size-3 shrink-0 rotate-90 transition-transform group-hover/needs:translate-y-0.5 @max-[15rem]/card:hidden" />
      </button>
    );
  }
  if (project.reviewRequests > 0) {
    return (
      <Link
        to={`${paths.reviews}?project=${encodeURIComponent(project.slug)}`}
        viewTransition
        onPointerEnter={() => prefetch(pages.reviews)}
        className={cn(label, 'text-gold hover:underline hover:underline-offset-4', focusRing)}
      >
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-kente-gold animate-pulse-dot" />
        <span className="truncate">{t('projects.needs.reviews', { count: project.reviewRequests })}</span>
      </Link>
    );
  }
  if (project.openSeats > 0) {
    return (
      <Link
        to={paths.projectRoles(project.slug)}
        viewTransition
        onPointerEnter={() => prefetch(pages.project)}
        className={cn(label, 'text-(--thread-text) hover:underline hover:underline-offset-4', focusRing)}
      >
        <span className="truncate">{t('projects.needs.seats', { count: project.openSeats })}</span>
      </Link>
    );
  }
  if (project.feedbackReceived > 0) {
    return <span className={cn(label, 'text-soft-foreground')}>{t('projects.needs.feedback', { count: project.feedbackReceived })}</span>;
  }
  return <span className={cn(label, 'font-semibold text-faint-foreground')}>{t('projects.needs.complete')}</span>;
}

/** La place du prochain projet : « Lancer un projet ». */
function LaunchCard({ index }: { index: number }) {
  const { t } = useTranslation('dashboard');
  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease, delay: Math.min(index, 5) * 0.06 }}
      className="h-full"
    >
      <Link
        to={paths.newProject}
        viewTransition
        onPointerEnter={() => prefetch(pages.newProject)}
        onFocus={() => prefetch(pages.newProject)}
        className={cn(
          'group/launch flex h-full min-h-44 flex-col items-start justify-center gap-3 rounded-2xl border border-dashed border-border-strong p-5 text-start',
          'transition-[border-color,background-color] duration-300 hover:border-gold/60 hover:bg-gold/5',
          focusRing,
        )}
      >
        <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-kente-warm text-kente-night shadow-[0_10px_24px_-14px_var(--kente-coral)]">
          <Plus className="size-4.5 transition-transform duration-500 ease-out-expo group-hover/launch:rotate-90" strokeWidth={2.5} />
        </span>
        <span>
          <span className="block text-sm font-bold text-foreground">{t('projects.launch')}</span>
          <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted-foreground">{t('projects.launchHint')}</span>
        </span>
      </Link>
    </m.div>
  );
}

/** Pas encore d'équipe : rejoindre un projet qui recrute, ou lancer le sien. */
function NoTeamYet() {
  const { t } = useTranslation('dashboard');
  return (
    <div className="glass relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl p-6 @xl:flex-row @xl:items-center @xl:gap-6">
      <span aria-hidden className="size-12 shrink-0 rounded-[0.875rem] bg-kente-conic opacity-85" />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-foreground">{t('projects.emptyTitle')}</p>
        <p className="mt-1 max-w-prose text-[0.8125rem] leading-relaxed text-muted-foreground">{t('projects.emptyText')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          to={paths.openings}
          viewTransition
          onPointerEnter={() => prefetch(pages.openings)}
          className={cn('inline-flex h-10 items-center rounded-xl bg-inverse px-4 text-sm font-bold text-inverse-foreground transition-[translate,opacity] hover:-translate-y-px hover:opacity-90', focusRing)}
        >
          {t('projects.browse')}
        </Link>
        <Link
          to={paths.newProject}
          viewTransition
          onPointerEnter={() => prefetch(pages.newProject)}
          className={cn('inline-flex h-10 items-center rounded-xl border border-border-strong px-4 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5', focusRing)}
        >
          {t('projects.launch')}
        </Link>
      </div>
    </div>
  );
}

/** Même encombrement qu'une carte de projet, pendant le chargement. */
function ProjectCardSkeleton() {
  return (
    <div aria-hidden className="glass flex h-full min-h-44 flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-[3px] skeleton-shimmer" />
        <span className="h-3.5 w-32 rounded-full skeleton-shimmer" />
      </div>
      <span className="h-3 w-3/4 rounded-full skeleton-shimmer" />
      <span className="h-7 rounded-md skeleton-shimmer" />
      <div className="mt-auto flex items-center gap-2">
        <span className="h-7 w-20 rounded-full skeleton-shimmer" />
        <span className="ms-auto h-3 w-24 rounded-full skeleton-shimmer" />
      </div>
    </div>
  );
}
