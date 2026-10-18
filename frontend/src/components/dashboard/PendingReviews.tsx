import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, ChevronDown, Star, UserRoundCheck, X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardSectionTitle from './DashboardSectionTitle';
import { DASHBOARD_ANCHORS } from './sections';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { FeedbackForm } from '@/components/projects/FeedbackRequestCard';
import { DiffStat } from '@/components/reviews/ReviewRequestItem';
import Chip from '@/components/shared/Chip';
import UserAvatar from '@/components/shared/UserAvatar';
import { roleOf } from '@/config/roles';
import { dashboardQuery, useDashboard, useDecideApplication } from '@/hooks/useDashboard';
import { useNow } from '@/hooks/useNow';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { ApplicationReview, Dashboard, FeedbackReview } from '@/types/dashboard.types';
import type { PullRequest } from '@/types/review.types';
import { formatRelativeTime, isolate } from '@/utils/formatters';

// Lignes montrées avant « Voir tout »
const SHOWN = 5;
// Le refus se confirme dans ce délai, puis le bouton revient à « Décliner »
const CONFIRM_MS = 4000;
// Le merci reste à l'écran, puis la demande quitte la liste
const THANKS_MS = 2600;

const ease = [0.16, 1, 0.3, 1] as const;
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

type Review =
  | { kind: 'pullRequest'; key: string; item: PullRequest }
  | { kind: 'application'; key: string; item: ApplicationReview }
  | { kind: 'feedback'; key: string; item: FeedbackReview };

function reviewsOf(dashboard: Dashboard): Review[] {
  return [
    ...dashboard.pullRequests.map((item) => ({ kind: 'pullRequest' as const, key: `pull-request-${item.id}`, item })),
    ...dashboard.applications.map((item) => ({ kind: 'application' as const, key: `application-${item.memberId}`, item })),
    ...dashboard.feedbackRequests.map((item) => ({ kind: 'feedback' as const, key: `feedback-${item.call.id}`, item })),
  ];
}

/**
 * « Revues qui t'attendent » : ce qui attend la décision ou l'avis du membre. Design 3B.
 *
 * - Les pull requests dont il est relecteur, les plus anciennes d'abord (« #84 Cache Redis pour les horaires BRT ·
 *   lagos-transit · +214 −38 · tu es relecteur requis · Relire »). « Tout voir » mène à la page des revues.
 * - Les candidatures reçues par les projets qu'il porte ou maintient, les plus anciennes d'abord : « Étudier »
 *   déplie le mot du candidat et sa compatibilité avec le rôle ; on l'accueille dans l'équipe, ou on décline
 *   (un second geste confirme le refus).
 * - Les demandes de retours d'autres projets, où son avis compte (revue communautaire) : l'avis se donne ici
 *   même.
 *
 * Une revue traitée quitte la liste en se repliant. Sans rien à relire, la carte le dit.
 */
export default function PendingReviews() {
  const { t } = useTranslation('dashboard');
  const reviews = useDashboard(reviewsOf);
  const [expanded, setExpanded] = useState(false);

  if (reviews.isError) {
    return null;
  }
  const all = reviews.data ?? [];
  const shown = expanded ? all : all.slice(0, SHOWN);

  return (
    <section id={DASHBOARD_ANCHORS.reviews} aria-labelledby="atelier-revues-title" tabIndex={-1} className="scroll-mt-24 outline-none">
      <DashboardSectionTitle
        id="atelier-revues-title"
        count={all.length}
        action={{ to: paths.reviews, label: t('reviews.all'), preload: pages.reviews }}
      >
        {t('reviews.title')}
      </DashboardSectionTitle>

      <div className="glass @container mt-3.5 overflow-hidden rounded-2xl">
        {reviews.isPending ? (
          <ul aria-hidden>
            {[0, 1].map((index) => (
              <li key={index} className="flex items-center gap-3.5 border-border-subtle px-4 py-4 not-first:border-t sm:px-5">
                <span className="size-9 shrink-0 rounded-full skeleton-shimmer" />
                <span className="flex flex-1 flex-col gap-2">
                  <span className="h-3.5 w-3/5 rounded-full skeleton-shimmer" />
                  <span className="h-2.5 w-2/5 rounded-full skeleton-shimmer" />
                </span>
                <span className="h-9 w-20 rounded-xl skeleton-shimmer" />
              </li>
            ))}
          </ul>
        ) : all.length === 0 ? (
          <AllClear />
        ) : (
          <>
            <ul>
              <AnimatePresence initial={false}>
                {shown.map((review, index) => (
                  <m.li
                    key={review.key}
                    layout="position"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease, delay: Math.min(index, 4) * 0.05 } }}
                    exit={{ opacity: 0, height: 0, transition: { duration: 0.35, ease } }}
                    className="overflow-hidden border-border-subtle not-first:border-t"
                  >
                    {review.kind === 'pullRequest' ? (
                      <PullRequestRow pullRequest={review.item} />
                    ) : review.kind === 'application' ? (
                      <ApplicationRow application={review.item} />
                    ) : (
                      <FeedbackRow review={review.item} />
                    )}
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>
            {all.length > SHOWN && (
              <button
                type="button"
                onClick={() => setExpanded((open) => !open)}
                aria-expanded={expanded}
                className={cn(
                  'flex w-full items-center justify-center gap-1.5 border-t border-border-subtle py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-foreground/4 hover:text-foreground',
                  focusRing,
                )}
              >
                {expanded ? t('reviews.less') : t('reviews.more', { count: all.length - SHOWN })}
                <ChevronDown aria-hidden className={cn('size-3.5 transition-transform duration-300', expanded && 'rotate-180')} />
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ==================== PULL REQUESTS ====================

/** Une PR à relire : son auteur, son titre, le diff, si la revue est requise et depuis quand elle attend ; « Relire ». */
function PullRequestRow({ pullRequest }: { pullRequest: PullRequest }) {
  const { t } = useTranslation('dashboard');
  useNow(60_000);
  const mine = pullRequest.myReview;

  return (
    <Row
      avatar={<UserAvatar user={pullRequest.author} className="size-9 text-xs" />}
      title={
        <>
          <span className="font-mono font-medium text-faint-foreground">#{pullRequest.number}</span> <bdi>{pullRequest.title}</bdi>
        </>
      }
      meta={[
        <bdi key="project" className="text-soft-foreground">
          {pullRequest.project.name}
        </bdi>,
        <DiffStat key="diff" additions={pullRequest.additions} deletions={pullRequest.deletions} />,
        mine && (
          <span key="why" className={mine.required ? 'text-gold' : 'text-jade'}>
            {mine.required ? t('reviews.requiredReviewer') : mine.community ? t('reviews.communityReviewer') : t('reviews.requestedReviewer')}
          </span>
        ),
        mine && (
          <time key="time" dateTime={mine.requestedAt}>
            {formatRelativeTime(mine.requestedAt)}
          </time>
        ),
      ]}
      action={
        <Link
          to={paths.review(pullRequest.project.slug, pullRequest.number)}
          viewTransition
          onPointerEnter={() => prefetch(pages.review)}
          onFocus={() => prefetch(pages.review)}
          className={cn(
            'group/review inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border-strong px-3.5 text-[0.8125rem] font-bold whitespace-nowrap text-foreground transition-[background-color,border-color] duration-300 hover:bg-foreground/5',
            focusRing,
          )}
        >
          {t('reviews.review')}
          <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/review:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/review:-translate-x-0.5" />
        </Link>
      }
    />
  );
}

// ==================== CANDIDATURES ====================

function ApplicationRow({ application }: { application: ApplicationReview }) {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  useNow(60_000);
  const role = application.role ? roleOf(application.role) : undefined;
  const roleName = application.openingTitle ?? (role ? tc(`teamRoles.${role.id}`) : null);

  return (
    <>
      <Row
        avatar={<UserAvatar user={application.applicant} className="size-9 text-xs" />}
        title={
          <>
            <bdi>{application.applicant.fullName}</bdi>{' '}
            <span className="font-medium text-muted-foreground">
              {roleName ? t('reviews.applies', { role: isolate(roleName) }) : t('reviews.appliesNoRole')}
            </span>
          </>
        }
        meta={[
          <bdi key="project" className="text-soft-foreground">{application.project.name}</bdi>,
          application.match && <span key="match" className="text-jade">{t('reviews.match', { score: application.match.score })}</span>,
          <time key="time" dateTime={application.createdAt}>{formatRelativeTime(application.createdAt)}</time>,
          <span key="kind" className="text-coral">{t('reviews.application')}</span>,
        ]}
        action={
          <ToggleButton open={open} controls={panelId} onClick={() => setOpen((value) => !value)}>
            {open ? t('reviews.close') : t('reviews.study')}
          </ToggleButton>
        }
      />
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease }}
            className="overflow-hidden"
          >
            <ApplicationPanel application={application} />
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Le mot du candidat, ce qui compte pour le rôle, et la décision. */
function ApplicationPanel({ application }: { application: ApplicationReview }) {
  const { t } = useTranslation('dashboard');
  const decide = useDecideApplication();
  const [confirming, setConfirming] = useState(false);
  const name = application.applicant.fullName.split(/\s+/)[0] || application.applicant.username;

  // Sans second geste dans le délai, le refus est abandonné
  useEffect(() => {
    if (!confirming) {
      return;
    }
    const timer = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  function settle(accept: boolean) {
    decide.mutate(
      { application, accept },
      {
        onSuccess: () => {
          if (accept) {
            toast.success(t('reviews.accepted', { name: isolate(name), project: isolate(application.project.name) }));
          } else {
            toast(t('reviews.declined', { name: isolate(name) }));
          }
        },
      },
    );
  }
  const pendingAccept = decide.isPending && decide.variables?.accept === true;
  const pendingDecline = decide.isPending && decide.variables?.accept === false;

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-4 sm:ps-[4.375rem] sm:pe-5">
      <figure>
        <figcaption className="eyebrow">{t('reviews.motivation')}</figcaption>
        {application.motivation ? (
          <blockquote dir="auto" className="mt-1.5 border-s-2 border-gold/50 ps-3 text-start text-sm leading-relaxed text-soft-foreground">
            {application.motivation}
          </blockquote>
        ) : (
          <p className="mt-1.5 text-sm text-faint-foreground">{t('reviews.noMotivation')}</p>
        )}
      </figure>

      {application.match && application.match.skills.length > 0 && (
        <div>
          <p className="eyebrow">{t('reviews.skills')}</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {application.match.skills.map((skill) => (
              <li key={skill}>
                <Chip tone="jade">
                  <Check aria-hidden className="size-3" strokeWidth={3} />
                  {skill}
                </Chip>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => settle(true)}
          disabled={decide.isPending}
          aria-busy={pendingAccept || undefined}
          className={cn(
            'group/accept relative isolate inline-flex h-9 items-center gap-2 overflow-hidden rounded-xl bg-kente-warm px-3.5 text-[0.8125rem] font-bold text-kente-night',
            'shadow-[0_10px_24px_-14px_var(--kente-coral)] transition-[translate,box-shadow,opacity] duration-300 ease-out-expo enabled:hover:-translate-y-px enabled:hover:shadow-[0_14px_30px_-12px_var(--kente-coral)] disabled:opacity-60',
            focusRing,
            'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          {pendingAccept ? <PulsatingDots size="sm" tone="current" /> : <UserRoundCheck aria-hidden className="size-4" />}
          {t('reviews.accept')}
        </button>
        <button
          type="button"
          onClick={() => (confirming ? settle(false) : setConfirming(true))}
          disabled={decide.isPending}
          aria-busy={pendingDecline || undefined}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-bold transition-[background-color,color,border-color] duration-300 disabled:opacity-60',
            confirming
              ? 'border border-coral/40 bg-coral/10 text-coral hover:bg-coral/15'
              : 'border border-transparent text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
            focusRing,
          )}
        >
          {pendingDecline ? <PulsatingDots size="sm" tone="current" /> : <X aria-hidden className="size-3.5" />}
          {/* Le libellé change : les lecteurs d'écran l'annoncent */}
          <span aria-live="polite">{confirming ? t('reviews.confirmDecline') : t('reviews.decline')}</span>
        </button>
        <Link
          to={paths.profile(application.applicant.username)}
          viewTransition
          onPointerEnter={() => prefetch(pages.profile)}
          onFocus={() => prefetch(pages.profile)}
          className={cn('group/profile ms-auto inline-flex items-center gap-1 rounded-md text-xs font-bold text-gold', focusRing)}
        >
          {t('reviews.profile')}
          <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/profile:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/profile:-translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

// ==================== REVUES COMMUNAUTAIRES ====================

function FeedbackRow({ review }: { review: FeedbackReview }) {
  const { t } = useTranslation('dashboard');
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [thanked, setThanked] = useState(false);
  const panelId = useId();
  const { call, project } = review;

  // Le merci, puis la demande quitte la liste
  useEffect(() => {
    if (!thanked) {
      return;
    }
    const timer = setTimeout(() => {
      qc.setQueryData<Dashboard>(dashboardQuery.queryKey, (dashboard) =>
        dashboard && { ...dashboard, feedbackRequests: dashboard.feedbackRequests.filter((request) => request.call.id !== call.id) },
      );
      void qc.invalidateQueries({ queryKey: dashboardQuery.queryKey });
    }, THANKS_MS);
    return () => clearTimeout(timer);
  }, [thanked, qc, call.id]);

  if (thanked) {
    return (
      <m.p
        role="status"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="flex items-center gap-3 px-4 py-4 text-sm font-semibold text-jade sm:px-5"
      >
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-jade/12">
          <Check className="size-4" strokeWidth={3} />
        </span>
        {t('reviews.thanks', { project: isolate(project.name) })}
      </m.p>
    );
  }

  return (
    <>
      <Row
        avatar={<UserAvatar user={call.author} className="size-9 text-xs" />}
        title={<bdi>{call.title}</bdi>}
        meta={[
          <bdi key="project" className="text-soft-foreground">{project.name}</bdi>,
          <span key="count" className="inline-flex items-center gap-1.5">
            {t('reviews.feedbackCount', { count: call.feedbackCount })}
            {call.averageRating !== null && (
              <span className="inline-flex items-center gap-0.5 text-coral">
                <Star aria-hidden className="size-3 fill-current" />
                {call.averageRating.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </span>
            )}
          </span>,
          <span key="why" className="text-jade">
            {review.starred
              ? t('reviews.starred')
              : review.sharedSkills.length > 0
                ? t('reviews.sharedSkills', { skills: review.sharedSkills.map(isolate).join(', ') })
                : t('reviews.communityOpen')}
          </span>,
        ]}
        action={
          <ToggleButton open={open} controls={panelId} onClick={() => setOpen((value) => !value)}>
            {open ? t('reviews.close') : t('reviews.give')}
          </ToggleButton>
        }
      />
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 sm:ps-[4.375rem] sm:pe-5">
              {call.prompt && (
                <p dir="auto" className="mb-3 text-start text-sm leading-relaxed text-muted-foreground">
                  {call.prompt}{' '}
                  <Link
                    to={paths.project(project.slug)}
                    viewTransition
                    onPointerEnter={() => prefetch(pages.project)}
                    className={cn('rounded-sm font-bold whitespace-nowrap text-gold hover:underline hover:underline-offset-4', focusRing)}
                  >
                    {t('reviews.seeProject')}
                  </Link>
                </p>
              )}
              <FeedbackForm projectId={project.id} call={call} onCancel={() => setOpen(false)} onSent={() => setThanked(true)} />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ==================== LIGNES ====================

/**
 * Une ligne du design 3B : l'avatar, le titre, la ligne mono du projet, et l'action au bout. Dans une carte étroite
 * (téléphone), l'action passe sous le texte.
 */
function Row({ avatar, title, meta, action }: { avatar: ReactNode; title: ReactNode; meta: ReactNode[]; action: ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2.5 px-4 py-3.5 sm:px-5 sm:py-4 @md:grid-cols-[auto_minmax(0,1fr)_auto]">
      <span className="shrink-0 self-start rounded-full ring-2 ring-surface @md:self-center">{avatar}</span>
      <div className="min-w-0 leading-snug">
        <p dir="auto" className="line-clamp-2 text-start text-[0.9375rem] font-bold text-foreground">
          {title}
        </p>
        {/* Chaque élément garde son point devant lui : à la ligne, le point part avec lui */}
        <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 font-mono text-xs text-muted-foreground">
          {meta.filter(Boolean).map((item, index) => (
            <span key={index} className="inline-flex min-w-0 items-center gap-1.5">
              {index > 0 && (
                <span aria-hidden className="text-faint-foreground">
                  ·
                </span>
              )}
              {item}
            </span>
          ))}
        </p>
      </div>
      <div className="col-start-2 @md:col-start-auto">{action}</div>
    </div>
  );
}

function ToggleButton({ open, controls, onClick, children }: { open: boolean; controls: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-[0.8125rem] font-bold whitespace-nowrap transition-[background-color,border-color,color] duration-300',
        open ? 'border-border bg-foreground/6 text-foreground' : 'border-border-strong text-foreground hover:bg-foreground/5',
        focusRing,
      )}
    >
      {children}
      <ChevronDown aria-hidden className={cn('size-3.5 transition-transform duration-300 ease-out-expo', open && 'rotate-180')} />
    </button>
  );
}

/** Rien à relire : la carte le dit, sans attirer l'œil. */
function AllClear() {
  const { t } = useTranslation('dashboard');
  return (
    <div className="flex items-center gap-3.5 px-5 py-5">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-jade/12 text-jade">
        <Check className="size-4.5" strokeWidth={2.75} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">{t('reviews.emptyTitle')}</p>
        <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">{t('reviews.emptyText')}</p>
      </div>
    </div>
  );
}
