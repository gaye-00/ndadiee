import { ArrowUpRight, Check, Clock, Plus, Send, Sparkles, Users } from 'lucide-react';
import { useInView } from 'motion/react';
import { useRef, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MatchRing } from '@/components/projects/OpenRoleCard';
import Chip from '@/components/shared/Chip';
import StackLogo from '@/components/shared/StackLogo';
import WovenMotif from '@/components/shared/WovenMotif';
import { roleOf, type KenteThread, type RoleDefinition } from '@/config/roles';
import { isTechnology, tagLogoOf } from '@/config/stacks';
import { useAuth } from '@/hooks/useAuth';
import { useStackLogos } from '@/hooks/useStackLogos';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import { useDataSaverStore } from '@/store/useDataSaverStore';
import type { ProjectBrief, ProjectOpening } from '@/types/project.types';
import type { Tag } from '@/types/tag.types';
import { countryFlag, formatRelativeTime, isolate } from '@/utils/formatters';
import { starterIssueUrl } from '@/utils/repository';

// Couleur lisible (texte, bordure) et couleur de marque (fils de la lisière) de chaque fil du kente
const ACCENTS: Record<KenteThread, string> = {
  gold: 'var(--gold)',
  coral: 'var(--coral)',
  jade: 'var(--jade)',
};
const THREADS: Record<KenteThread, string> = {
  gold: 'var(--kente-gold)',
  coral: 'var(--kente-coral)',
  jade: 'var(--kente-jade)',
};

// Technologies du projet citées sur la carte ; les autres sont comptées (« +2 »)
const STACK_SHOWN = 4;
// Places dessinées sur la lisière ; au-delà, un nombre
const SEATS_DRAWN = 3;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

// L'action se range au bout de la carte ; sur une carte étroite (téléphone), elle passe dessous, en pleine largeur
const actionPlace = 'ms-auto justify-center @max-xs:ms-0 @max-xs:w-full';

/** Une annonce de la liste des annonces : son projet l'accompagne toujours */
export type BoardOpening = ProjectOpening & { project: ProjectBrief };

/** Qui regarde l'annonce : un visiteur, un membre qui peut postuler, l'équipe du projet, son porteur */
type OpeningViewer = 'visitor' | 'candidate' | 'member' | 'owner';

function viewerOf(opening: BoardOpening, userId: number | undefined): OpeningViewer {
  if (userId === undefined) {
    return 'visitor';
  }
  if (opening.project.owner.id === userId) {
    return 'owner';
  }
  return opening.project.myMembershipStatus === 'ACCEPTED' ? 'member' : 'candidate';
}

interface OpeningCardProps {
  opening: BoardOpening;
  /** La plus proche du profil du membre connecté : bordure kente qui tourne */
  best?: boolean;
  /** Ordre d'arrivée dans la page : les motifs se tissent l'un après l'autre */
  index?: number;
  onApply: () => void;
}

/**
 * Une annonce, comme une bande de kente : sur sa lisière, le motif tissé du rôle et ses places à prendre ; puis
 * l'intitulé, la compatibilité avec le profil du membre connecté, ce qu'on attend, les conditions (places,
 * candidatures, date), l'issue « premier pas » pour commencer, les technologies du projet, et le projet et son
 * porteur. Toute la carte mène au projet, en haut de sa page ; « Postuler » ouvre la candidature. Design 3B.
 */
export default function OpeningCard({ opening, best = false, index = 0, onApply }: OpeningCardProps) {
  const { t: tc } = useTranslation();
  const { user } = useAuth();
  const card = useRef<HTMLElement>(null);
  // Le motif se tisse, passe après passe, quand la carte arrive à l'écran
  const seen = useInView(card, { once: true, margin: '0px 0px -40px 0px' });
  const role = roleOf(opening.role);
  const project = opening.project;
  const viewer = viewerOf(opening, user?.id);
  const match = viewer === 'candidate' ? opening.match : null;
  // La page du projet s'ouvre en haut : on découvre le projet, puis ses rôles juste dessous
  const href = paths.project(project.slug);
  const preload = () => prefetch(pages.project);

  return (
    <article
      ref={card}
      data-weave={seen ? 'in' : 'wait'}
      style={{ '--card-accent': ACCENTS[role?.colors[0] ?? 'gold'] } as CSSProperties}
      className={cn(
        'opening-card group/opening relative h-full rounded-2xl transition-[translate,border-color,box-shadow] duration-300 ease-out-expo hover:-translate-y-1',
        best
          ? 'border-kente-spin shadow-[0_24px_48px_-30px_var(--kente-jade)]'
          : cn(
              'glass overflow-hidden',
              'hover:border-[color-mix(in_srgb,var(--card-accent)_45%,transparent)] hover:shadow-[0_24px_48px_-28px_var(--card-accent)]',
              'focus-within:border-[color-mix(in_srgb,var(--card-accent)_45%,transparent)]',
            ),
      )}
    >
      <div className={cn('flex h-full overflow-hidden', best ? 'rounded-[calc(var(--radius-2xl)-1px)] bg-surface' : 'rounded-2xl')}>
        {role && <Selvedge role={role} seats={opening.seats} delay={index} />}

        <div className="@container flex min-w-0 flex-1 flex-col gap-3.5 p-5 sm:p-5.5">
          {/* ── Le rôle ── */}
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {best && (
                <Chip tone="jade" className="mb-2">
                  <Sparkles aria-hidden className="size-3" />
                  {tc('project.roles.bestMatch')}
                </Chip>
              )}
              {role && <p className="eyebrow text-(--card-accent)">{tc(`teamRoles.${role.id}`)}</p>}
              <h3 dir="auto" className="mt-1.5 text-start text-lg leading-snug font-bold text-foreground rtl:text-right">
                {/* Le lien couvre toute la carte */}
                <Link
                  to={href}
                  viewTransition
                  onPointerEnter={preload}
                  onFocus={preload}
                  className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring/70"
                >
                  {opening.title}
                </Link>
              </h3>
              {match && match.skills.length > 0 && (
                <p className="mt-1 truncate text-xs text-jade">
                  {tc('project.roles.matchSkills', { skills: match.skills.map(isolate).join(' · ') })}
                </p>
              )}
            </div>
            {match && <MatchBadge score={match.score} />}
          </div>

          {opening.description && (
            <p dir="auto" className="line-clamp-2 text-start text-sm leading-relaxed text-muted-foreground rtl:text-right">
              {opening.description}
            </p>
          )}

          <Conditions opening={opening} />
          <StarterIssue opening={opening} project={project} />
          {project.tags && project.tags.length > 0 && <Stack tags={project.tags} known={match?.skills ?? []} />}

          {/* ── Le projet, et agir ── */}
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-3 border-t border-border-subtle pt-3.5">
            <Byline project={project} />
            <OpeningAction opening={opening} viewer={viewer} best={best} onApply={onApply} />
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * La lisière : des fils de chaîne aux deux couleurs du motif, le motif du rôle posé dessus, et les places à
 * prendre en pointillés. Au survol de la carte, la lisière s'éclaire et la première place s'ouvre : c'est celle du
 * visiteur. Décorative : le rôle et les places sont écrits dans la carte.
 */
function Selvedge({ role, seats, delay }: { role: RoleDefinition; seats: number; delay: number }) {
  return (
    <div
      aria-hidden
      style={{ '--selvedge-a': THREADS[role.colors[0]], '--selvedge-b': THREADS[role.colors[1]] } as CSSProperties}
      className="opening-selvedge flex w-14 shrink-0 flex-col items-center justify-between gap-4 py-5 sm:w-16"
    >
      <span
        data-weave-in
        style={{ '--motif-delay': `${150 + (delay % 6) * 90}ms` } as CSSProperties}
        className="grid size-11 place-items-center rounded-xl bg-background/85 shadow-[0_6px_18px_-10px_var(--float-shadow)] ring-1 ring-foreground/6 saver:bg-background sm:size-12"
      >
        <WovenMotif motif={role.motif} colors={role.colors} className="h-7 w-auto max-w-9 transition-transform duration-500 ease-out-expo group-hover/opening:-translate-y-0.5" />
      </span>

      <span className="flex flex-col items-center gap-1.5">
        {Array.from({ length: Math.min(seats, SEATS_DRAWN) }, (_, seat) => (
          <span
            key={seat}
            className={cn(
              'grid size-6 place-items-center rounded-full border border-dashed border-foreground/30 bg-background/80 text-jade saver:bg-background',
              'transition-[border-color,scale] duration-300 ease-out-expo',
              seat === 0 && 'group-hover/opening:scale-110 group-hover/opening:border-jade/80',
            )}
          >
            {seat === 0 && <Plus className="size-3 scale-50 opacity-0 transition-[scale,opacity] duration-300 ease-out-expo group-hover/opening:scale-100 group-hover/opening:opacity-100" />}
          </span>
        ))}
        {seats > SEATS_DRAWN && <span className="font-mono text-[0.625rem] leading-none text-muted-foreground">+{seats - SEATS_DRAWN}</span>}
      </span>
    </div>
  );
}

/** La compatibilité avec le profil du membre connecté : un anneau qui se remplit jusqu'au score. */
function MatchBadge({ score }: { score: number }) {
  const { t } = useTranslation('openings');
  const { t: tc } = useTranslation();

  return (
    <span className="relative z-10 grid size-12 shrink-0 place-items-center" title={tc('project.roles.match', { score })}>
      <MatchRing score={score} className="absolute inset-0 size-12" />
      <span aria-hidden className="font-mono text-[0.6875rem] font-bold text-jade tabular-nums">
        {t('card.matchScore', { score })}
      </span>
      <span className="sr-only">{tc('project.roles.match', { score })}</span>
    </span>
  );
}

/** Les conditions : places, candidatures en attente (personne encore : une chance à saisir), date de publication. */
function Conditions({ opening }: { opening: ProjectOpening }) {
  const { t } = useTranslation('openings');
  const applicants = opening.applicants ?? 0;

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-xs text-muted-foreground">
      <Condition icon={<Users className="size-3.5" />}>{t('card.seats', { count: opening.seats })}</Condition>
      <Condition icon={applicants === 0 ? <span className="live-dot size-1.5" /> : <Send className="size-3.5" />}>
        {applicants === 0 ? <span className="text-jade">{t('card.noApplicants')}</span> : t('card.applicants', { count: applicants })}
      </Condition>
      <Condition icon={<Clock className="size-3.5" />}>
        <time dateTime={opening.createdAt}>{formatRelativeTime(opening.createdAt)}</time>
      </Condition>
    </ul>
  );
}

function Condition({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span aria-hidden className="grid size-3.5 place-items-center text-faint-foreground">
        {icon}
      </span>
      {children}
    </li>
  );
}

/** L'issue « premier pas » : par où commencer, et le lien vers l'issue quand le projet a son dépôt. */
function StarterIssue({ opening, project }: { opening: ProjectOpening; project: ProjectBrief }) {
  const { t } = useTranslation('openings');

  if (!opening.starterIssueNumber) {
    return (
      <p className="rounded-xl border border-dashed border-border-strong px-3 py-2.5 font-mono text-xs text-faint-foreground">
        {t('card.noIssue')}
      </p>
    );
  }

  // Pas de lien vers l'issue d'un dépôt fictif (projets de démonstration) : il ne mènerait nulle part
  const issueUrl = starterIssueUrl(project.repositoryUrl, opening.starterIssueNumber);
  const body = (
    <>
      <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-kente-gold font-mono text-[0.6875rem] font-bold text-kente-night">
        1
      </span>
      <span className="min-w-0 flex-1">
        <span className="eyebrow block text-gold">{t('card.firstStep')}</span>
        <span className="block truncate font-mono text-xs text-soft-foreground">
          <span className="text-faint-foreground">#{opening.starterIssueNumber}</span>
          {opening.starterIssueTitle && (
            <>
              {' · '}
              <bdi>{opening.starterIssueTitle}</bdi>
            </>
          )}
        </span>
      </span>
    </>
  );
  const ticket = 'flex items-center gap-3 rounded-xl border border-gold/25 bg-gold/8 px-3 py-2.5';

  return issueUrl ? (
    <a
      href={issueUrl}
      target="_blank"
      rel="noreferrer"
      title={t('card.openIssue')}
      className={cn(ticket, 'group/issue relative z-10 transition-[border-color,background-color] duration-300 hover:border-gold/45 hover:bg-gold/12', focusRing)}
    >
      {body}
      <ArrowUpRight
        aria-hidden
        className="size-4 shrink-0 text-gold opacity-60 transition-[opacity,translate] duration-300 group-hover/issue:translate-x-0.5 group-hover/issue:-translate-y-0.5 group-hover/issue:opacity-100 rtl:-scale-x-100 rtl:group-hover/issue:-translate-x-0.5"
      />
      <span className="sr-only">{t('card.openIssue')}</span>
    </a>
  ) : (
    <div className={ticket}>{body}</div>
  );
}

/**
 * Les technologies du projet : les plus connues d'abord, puis les plus répandues. Celles que le membre connecté
 * a dans son profil sont en vert : c'est d'elles que vient sa compatibilité.
 */
function Stack({ tags, known }: { tags: Tag[]; known: string[] }) {
  const logos = useStackLogos();
  const mine = new Set(known.map((skill) => skill.toLowerCase()));
  const sorted = [...tags].sort((a, b) => {
    const technology = Number(isTechnology(b.name)) - Number(isTechnology(a.name));
    return technology || b.usageCount - a.usageCount;
  });
  const shown = sorted.slice(0, STACK_SHOWN);

  return (
    <ul className="flex flex-wrap gap-1.5">
      {shown.map((tag) => {
        const logo = tagLogoOf(tag.slug);
        const yours = mine.has(tag.name.toLowerCase());
        return (
          <li key={tag.slug} className="min-w-0">
            <Chip tone={yours ? 'jade' : 'neutral'}>
              {logo && logos !== false && <StackLogo path={logos?.[logo]} className={cn('size-3', !yours && 'text-muted-foreground')} />}
              {yours && !logo && <Check aria-hidden className="size-3" strokeWidth={3} />}
              <span className="truncate">{tag.name}</span>
            </Chip>
          </li>
        );
      })}
      {sorted.length > STACK_SHOWN && (
        <li>
          <Chip className="text-muted-foreground">+{sorted.length - STACK_SHOWN}</Chip>
        </li>
      )}
    </ul>
  );
}

/** Le projet et son porteur : la miniature (sauf en économie de données), le nom, le drapeau et le nom du porteur. */
function Byline({ project }: { project: ProjectBrief }) {
  const dataSaver = useDataSaverStore((s) => s.enabled);
  const owner = project.owner;

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span aria-hidden className="hatch grid size-9 shrink-0 place-items-center overflow-hidden rounded-[0.625rem] ring-1 ring-foreground/8">
        {project.coverThumbnailUrl && !dataSaver ? (
          <img src={project.coverThumbnailUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <span className="font-mono text-xs font-bold text-muted-foreground">{project.name.slice(0, 1).toUpperCase()}</span>
        )}
      </span>
      <span className="min-w-0">
        <span dir="auto" className="block truncate font-mono text-[0.8125rem] leading-5 font-medium text-foreground">
          {project.name}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {owner.country && <span className="text-[0.8125rem] leading-none">{countryFlag(owner.country)}</span>}
          <span dir="auto" className="truncate">
            {owner.fullName}
          </span>
        </span>
      </span>
    </span>
  );
}

interface OpeningActionProps {
  opening: BoardOpening;
  viewer: OpeningViewer;
  best: boolean;
  onApply: () => void;
}

/**
 * Agir selon qui regarde : postuler (un visiteur passe d'abord par la connexion), la candidature envoyée, son
 * équipe, ou pour le porteur, les candidatures à traiter.
 */
function OpeningAction({ opening, viewer, best, onApply }: OpeningActionProps) {
  const { t } = useTranslation('openings');
  const { t: tc } = useTranslation();
  const project = opening.project;
  const applicants = opening.applicants ?? 0;

  if (viewer === 'owner') {
    return (
      <Link
        to={paths.workspaceRoles(project.slug)}
        viewTransition
        className={cn(
          'relative z-10 inline-flex h-10 items-center gap-2 rounded-xl border border-border-strong px-3.5 text-sm font-bold whitespace-nowrap text-foreground transition-colors hover:bg-foreground/5',
          actionPlace,
          focusRing,
        )}
      >
        <Users aria-hidden className="size-4" />
        {tc('project.roles.manage')}
        {applicants > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-kente-coral px-1.5 font-mono text-[0.625rem] text-white">{applicants}</span>
        )}
      </Link>
    );
  }
  if (viewer === 'member') {
    return (
      <span className={cn('inline-flex h-10 items-center gap-2 rounded-xl bg-foreground/6 px-3.5 text-sm font-bold whitespace-nowrap text-soft-foreground', actionPlace)}>
        <Users aria-hidden className="size-4" />
        {t('card.yourTeam')}
      </span>
    );
  }
  if (opening.appliedByMe) {
    return (
      <span className={cn('inline-flex h-10 items-center gap-2 rounded-xl bg-jade/12 px-3.5 text-sm font-bold whitespace-nowrap text-jade', actionPlace)}>
        <Check aria-hidden className="size-4" strokeWidth={3} />
        {tc('project.roles.applied')}
      </span>
    );
  }

  // Une candidature à la fois par projet : celle en attente vise un autre rôle
  const waiting = viewer === 'candidate' && project.myMembershipStatus === 'PENDING';
  return (
    <button
      type="button"
      onClick={onApply}
      disabled={waiting}
      title={waiting ? tc('project.apply.alreadyPending') : undefined}
      className={cn(
        'group/apply relative isolate z-10 inline-flex h-10 items-center gap-2 overflow-hidden rounded-xl px-4 text-sm font-bold whitespace-nowrap',
        actionPlace,
        'transition-[translate,background-color,border-color,box-shadow,opacity] duration-300 ease-out-expo focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-45',
        focusRing,
        best
          ? 'bg-kente-warm text-kente-night shadow-[0_12px_28px_-14px_var(--kente-coral)] enabled:hover:-translate-y-px enabled:hover:shadow-[0_16px_34px_-12px_var(--kente-coral)]'
          : 'border border-border-strong text-foreground enabled:hover:-translate-y-px enabled:hover:border-[color-mix(in_srgb,var(--card-accent)_55%,transparent)] enabled:hover:bg-foreground/5',
      )}
    >
      {tc('project.roles.apply')}
      {best && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-0 -z-10 w-1/3 -translate-x-full skew-x-[-20deg] bg-linear-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 ease-out-expo group-hover/apply:translate-x-[400%] rtl:translate-x-full rtl:group-hover/apply:-translate-x-[400%]"
        />
      )}
    </button>
  );
}

/** Même encombrement qu'une annonce, pendant le chargement. Design 3H (squelette à reflet). */
export function OpeningCardSkeleton() {
  return (
    <div aria-hidden className="glass flex h-full overflow-hidden rounded-2xl">
      <div className="w-14 shrink-0 border-e border-glass-border p-2.5 sm:w-16">
        <div className="mx-auto mt-2.5 size-11 rounded-xl skeleton-shimmer sm:size-12" />
      </div>
      <div className="flex flex-1 flex-col gap-3.5 p-5 sm:p-5.5">
        <div className="h-3 w-24 rounded-full skeleton-shimmer" />
        <div className="h-5 w-3/5 rounded-full skeleton-shimmer" />
        <div className="h-3 w-full rounded-full skeleton-shimmer" />
        <div className="flex gap-4">
          <div className="h-3 w-16 rounded-full skeleton-shimmer" />
          <div className="h-3 w-28 rounded-full skeleton-shimmer" />
          <div className="h-3 w-20 rounded-full skeleton-shimmer" />
        </div>
        <div className="h-12 rounded-xl skeleton-shimmer" />
        <div className="flex gap-1.5">
          <div className="h-6 w-20 rounded-full skeleton-shimmer" />
          <div className="h-6 w-16 rounded-full skeleton-shimmer" />
          <div className="h-6 w-24 rounded-full skeleton-shimmer" />
        </div>
        <div className="mt-auto flex items-center gap-2.5 border-t border-border-subtle pt-3.5">
          <div className="size-9 rounded-[0.625rem] skeleton-shimmer" />
          <div className="h-3 w-28 rounded-full skeleton-shimmer" />
          <div className="ms-auto h-10 w-24 rounded-xl skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
