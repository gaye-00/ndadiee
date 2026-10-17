import { ArrowUpRight, Check, Sparkles, Users } from 'lucide-react';
import { m, useAnimate, useInView } from 'motion/react';
import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Chip from '@/components/shared/Chip';
import WovenMotif from '@/components/shared/WovenMotif';
import { roleOf } from '@/config/roles';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Project, ProjectOpening } from '@/types/project.types';
import { isolate } from '@/utils/formatters';

/** Qui regarde la carte : le porteur gère les candidatures, un membre ne postule plus */
export type RoleViewer = 'owner' | 'member' | 'visitor';

interface OpenRoleCardProps {
  opening: ProjectOpening;
  project: Project;
  index: number;
  /** Le rôle le plus proche du profil du membre connecté : bordure kente qui tourne */
  best: boolean;
  /**
   * Change quand on veut rejoindre l'équipe (« Rejoindre l'équipe ») ou qu'on arrive par un lien vers ce rôle :
   * la carte s'anime et prend le focus. 0 : rien à montrer
   */
  highlight: number;
  viewer: RoleViewer;
  /** Une candidature est déjà en attente, pour un autre rôle : une seule à la fois par projet */
  waiting: boolean;
  onApply: () => void;
}

/**
 * Un rôle recherché : son motif tissé, son intitulé, l'issue « premier pas » pour commencer, et selon qui
 * regarde, la compatibilité avec son profil ou les candidatures reçues. Design 3D.
 */
export default function OpenRoleCard({ opening, project, index, best, highlight, viewer, waiting, onApply }: OpenRoleCardProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const role = roleOf(opening.role);
  const [scope, animate] = useAnimate<HTMLLIElement>();
  const action = useRef<HTMLButtonElement>(null);
  const seen = useInView(scope, { once: true, margin: '0px 0px -60px 0px' });
  const issueUrl =
    opening.starterIssueNumber && project.repositoryUrl
      ? `${project.repositoryUrl.replace(/\/+$/, '')}/issues/${opening.starterIssueNumber}`
      : null;

  // « Rejoindre l'équipe », ou l'arrivée par un lien vers ce rôle : la carte s'éclaire et son bouton prend le
  // focus. Pas avant qu'elle soit à l'écran : la page est peut-être encore en train de descendre jusqu'à elle.
  useEffect(() => {
    if (highlight === 0 || !seen) {
      return;
    }
    action.current?.focus({ preventScroll: true });
    if (!reduced && scope.current) {
      void animate('[data-flash]', { opacity: [0, 1, 0] }, { duration: 1.4, ease: 'easeInOut', delay: 0.35 });
    }
  }, [highlight, seen, reduced, animate, scope]);

  return (
    <m.li
      ref={scope}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.55, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
      // Le motif du rôle se tisse, passe après passe, quand la carte arrive à l'écran
      data-weave={seen ? 'in' : 'wait'}
    >
      <div
        className={cn(
          'group/role relative rounded-[1.375rem] transition-[translate,box-shadow] duration-300 ease-out-expo hover:-translate-y-0.5',
          best ? 'border-kente-spin shadow-[0_24px_48px_-32px_var(--kente-jade)]' : 'glass hover:border-border-strong',
        )}
      >
        <div
          className={cn(
            // Étroit : tout en colonne ; moyen : le rôle, puis l'issue et le bouton côte à côte ; large : trois colonnes
            'relative grid gap-4 p-5 @lg:grid-cols-[minmax(0,1fr)_auto] @lg:items-center @3xl:grid-cols-[minmax(0,1fr)_minmax(0,15.5rem)_auto] @3xl:gap-5 @3xl:p-5.5',
            best && 'rounded-[calc(1.375rem-1px)] bg-surface',
          )}
        >
          {/* Le rôle */}
          <div className="flex min-w-0 gap-4 @lg:col-span-2 @3xl:col-span-1">
            {role && (
              <span
                aria-hidden
                data-weave-in
                style={{ '--motif-delay': `${200 + index * 120}ms` } as CSSProperties}
                className="grid size-12 shrink-0 place-items-center rounded-2xl bg-foreground/5 ring-1 ring-foreground/6 ring-inset"
              >
                <WovenMotif motif={role.motif} colors={role.colors} className="h-7 w-auto" />
              </span>
            )}
            <div className="min-w-0">
              {best && (
                <Chip tone="jade" className="mb-1.5">
                  <Sparkles aria-hidden className="size-3" />
                  {t('project.roles.bestMatch')}
                </Chip>
              )}
              <h3 dir="auto" className="text-start font-sans text-[1.0625rem] leading-snug font-bold text-foreground rtl:text-right">
                {opening.title}
              </h3>
              {opening.description && (
                <p dir="auto" className="mt-1 text-start text-sm leading-relaxed text-muted-foreground rtl:text-right">
                  {opening.description}
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {role && <Chip>{t(`teamRoles.${role.id}`)}</Chip>}
                {opening.seats > 1 && <Chip>{t('project.roles.seats', { count: opening.seats })}</Chip>}
              </div>
            </div>
          </div>

          {/* L'issue « premier pas », et la compatibilité ou les candidatures */}
          <div className="flex min-w-0 flex-col gap-1 @3xl:border-s @3xl:border-border-subtle @3xl:ps-5">
            <span className="eyebrow">{t('project.roles.starterIssue')}</span>
            {opening.starterIssueNumber ? (
              issueUrl ? (
                <a
                  href={issueUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group/issue rounded-sm font-mono text-[0.8125rem] leading-snug text-soft-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
                >
                  <span className="text-faint-foreground">#{opening.starterIssueNumber}</span> · <span dir="auto">{opening.starterIssueTitle}</span>
                  <ArrowUpRight aria-hidden className="ms-1 inline size-3 -translate-y-px opacity-0 transition-opacity group-hover/issue:opacity-100 rtl:-scale-x-100" />
                </a>
              ) : (
                <span className="font-mono text-[0.8125rem] text-soft-foreground">
                  #{opening.starterIssueNumber} · <span dir="auto">{opening.starterIssueTitle}</span>
                </span>
              )
            ) : (
              <span className="font-mono text-[0.8125rem] text-faint-foreground">{t('project.roles.noIssue')}</span>
            )}
            <RoleStatus opening={opening} viewer={viewer} />
          </div>

          {/* Agir */}
          <div className="flex items-center @lg:justify-end">
            <RoleAction opening={opening} project={project} best={best} viewer={viewer} waiting={waiting} onApply={onApply} action={action} />
          </div>
        </div>
        {/* L'éclair qui montre la carte quand on veut rejoindre l'équipe */}
        <span aria-hidden data-flash className="pointer-events-none absolute -inset-1 rounded-[1.625rem] opacity-0 ring-2 ring-kente-gold" />
      </div>
    </m.li>
  );
}

/** Compatibilité (membre connecté hors de l'équipe), sinon les candidatures reçues. */
function RoleStatus({ opening, viewer }: { opening: ProjectOpening; viewer: RoleViewer }) {
  const { t } = useTranslation();
  const applicants = opening.applicants ?? 0;

  if (viewer === 'visitor' && opening.match) {
    return (
      <span className="mt-1 flex items-start gap-2">
        <MatchRing score={opening.match.score} className="mt-px size-4.5" />
        <span className="min-w-0">
          <span className="block font-mono text-xs font-semibold text-jade">{t('project.roles.match', { score: opening.match.score })}</span>
          {opening.match.skills.length > 0 && (
            <span className="block truncate text-[0.6875rem] text-faint-foreground">
              {t('project.roles.matchSkills', { skills: opening.match.skills.map(isolate).join(' · ') })}
            </span>
          )}
        </span>
      </span>
    );
  }
  return (
    <span className="mt-1 font-mono text-xs text-muted-foreground">
      {applicants > 0 ? t('project.roles.applicants', { count: applicants }) : t('project.roles.noApplicants')}
    </span>
  );
}

interface RoleActionProps {
  opening: ProjectOpening;
  project: Project;
  best: boolean;
  viewer: RoleViewer;
  waiting: boolean;
  onApply: () => void;
  action: RefObject<HTMLButtonElement | null>;
}

function RoleAction({ opening, project, best, viewer, waiting, onApply, action }: RoleActionProps) {
  const { t } = useTranslation();

  if (viewer === 'owner') {
    return (
      <Link
        to={paths.workspaceRoles(project.slug)}
        viewTransition
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border-strong px-3.5 text-sm font-bold whitespace-nowrap text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/70"
      >
        <Users aria-hidden className="size-4" />
        {t('project.roles.manage')}
        {(opening.applicants ?? 0) > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-kente-coral px-1.5 font-mono text-[0.625rem] text-white">{opening.applicants}</span>
        )}
      </Link>
    );
  }
  if (viewer === 'member') {
    return null;
  }
  if (opening.appliedByMe) {
    return (
      <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-jade/12 px-3.5 text-sm font-bold whitespace-nowrap text-jade">
        <Check aria-hidden className="size-4" strokeWidth={3} />
        {t('project.roles.applied')}
      </span>
    );
  }
  return (
    <button
      ref={action}
      type="button"
      onClick={onApply}
      disabled={waiting}
      title={waiting ? t('project.apply.alreadyPending') : undefined}
      className={cn(
        'group/apply relative isolate inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-[0.875rem] px-4.5 text-sm font-bold whitespace-nowrap outline-none @lg:w-auto',
        'transition-[translate,background-color,border-color,box-shadow,opacity] duration-300 ease-out-expo focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-45',
        best
          ? 'bg-kente-warm text-kente-night shadow-[0_12px_28px_-14px_var(--kente-coral)] enabled:hover:-translate-y-px enabled:hover:shadow-[0_16px_34px_-12px_var(--kente-coral)]'
          : 'border border-border-strong text-foreground enabled:hover:-translate-y-px enabled:hover:border-foreground/30 enabled:hover:bg-foreground/5',
      )}
    >
      {t('project.roles.apply')}
      {best && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-0 -z-10 w-1/3 -translate-x-full skew-x-[-20deg] bg-linear-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 ease-out-expo group-hover/apply:translate-x-[400%] rtl:translate-x-full rtl:group-hover/apply:-translate-x-[400%]"
        />
      )}
    </button>
  );
}

/** Anneau de compatibilité : il se remplit jusqu'au score quand la carte arrive à l'écran. */
export function MatchRing({ score, className }: { score: number; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cn('shrink-0 -rotate-90', className)}>
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="3" className="text-jade/18" />
      <m.circle
        cx="10"
        cy="10"
        r="8"
        fill="none"
        stroke="var(--jade)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: score / 100 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}
