import {
  ArrowUpRight,
  CircleCheck,
  CircleX,
  Clock,
  FileDiff,
  FileText,
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  MessageSquare,
  Sparkles,
  UserRoundMinus,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { pullRequestAuthor } from '@/components/reviews/pullRequestAuthor';
import { mergeStatusOf, PHASES, phaseOf, STATE_BADGES } from '@/components/reviews/reviewVisuals';
import GithubMark from '@/components/shared/GithubMark';
import UserAvatar from '@/components/shared/UserAvatar';
import { useNow } from '@/hooks/useNow';
import { useReviewClaim } from '@/hooks/useReviews';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { PullRequest, Reviewer, ReviewTab } from '@/types/review.types';
import { formatCount, formatRelativeTime, isolate } from '@/utils/formatters';

const HOUR = 3_600_000;
// Une revue qui attend depuis plus d'un jour se voit ; depuis plus de trois, elle presse
const WAITING_LONG = 24 * HOUR;
const WAITING_URGENT = 72 * HOUR;
// Carrés du diff, comme sur GitHub : la part des ajouts en vert, celle des suppressions en rouge
const DIFF_SQUARES = 5;
// Étiquettes montrées ; les autres sont comptées
const LABELS_SHOWN = 3;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

interface ReviewRequestItemProps {
  pullRequest: PullRequest;
  /** L'onglet où elle s'affiche : ce qu'elle dit d'abord, et l'action, en dépendent */
  tab: ReviewTab;
}

/**
 * Une pull request de la liste des revues. Design 3B (« #84 Cache Redis pour les horaires BRT · lagos-transit · +214
 * −38 · tu es relecteur requis · Relire ») et 3C (statut, branches, première contribution, relecteurs).
 *
 * Toute la carte mène à la revue. En tête, le projet, le numéro et ce qui distingue la PR (revue communautaire et sa
 * réputation, première contribution, brouillon) ; puis le titre, l'auteur et ses branches, depuis quand elle attend ;
 * le diff en chiffres et en carrés, les vérifications, les commentaires, les étiquettes. Au bout, les relecteurs et
 * leur verdict, et l'action de l'onglet : relire, se proposer comme relecteur, ou ce qui manque pour fusionner.
 */
export default function ReviewRequestItem({ pullRequest, tab }: ReviewRequestItemProps) {
  const { t } = useTranslation('reviews');
  const phase = phaseOf(pullRequest);
  const { icon: PhaseIcon, tone, accent } = PHASES[phase];
  const href = paths.review(pullRequest.project.slug, pullRequest.number);
  const preload = () => prefetch(pages.review);
  const shared = new Set(pullRequest.sharedSkills.map((skill) => skill.toLowerCase()));

  return (
    <article
      style={{ '--pr-accent': accent } as CSSProperties}
      className={cn(
        'group/pr glass relative rounded-2xl transition-[translate,border-color,box-shadow] duration-300 ease-out-expo',
        'hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--pr-accent)_40%,transparent)] hover:shadow-[0_22px_44px_-32px_var(--pr-accent)]',
        'focus-within:border-[color-mix(in_srgb,var(--pr-accent)_40%,transparent)]',
      )}
    >
      <div className="@container">
        <div className="flex gap-3.5 p-4 sm:gap-4 sm:p-5">
          <span aria-hidden className={cn('grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset', tone)}>
            <PhaseIcon className="size-4.5 transition-transform duration-500 ease-out-expo group-hover/pr:scale-110" />
          </span>

          <div className="min-w-0 flex-1">
            {/* Le projet, le numéro, et ce qui distingue la PR */}
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-xs text-muted-foreground">
              <bdi className="text-soft-foreground">{pullRequest.project.name}</bdi>
              <span className="text-faint-foreground">#{pullRequest.number}</span>
              <span className="sr-only">{t(`phase.${phase}`)}</span>
              {phase !== 'open' && <Tag tone={phase === 'merged' ? 'gold' : phase === 'closed' ? 'coral' : 'neutral'}>{t(`phase.${phase}`)}</Tag>}
              {pullRequest.community && (
                <Tag tone="jade">
                  {t('item.community')}
                  {pullRequest.reward !== null && <span className="font-bold">+{pullRequest.reward}</span>}
                </Tag>
              )}
              {pullRequest.firstContribution && (
                <Tag tone="gold">
                  <Sparkles aria-hidden className="size-3" />
                  {t('item.firstContribution')}
                </Tag>
              )}
              {pullRequest.github && (
                // Au-dessus du lien qui couvre la carte : celui-ci mène à la PR sur GitHub
                <a
                  href={pullRequest.github.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t('item.onGithubLabel', { number: pullRequest.number })}
                  className={cn(
                    'group/gh relative z-10 ms-auto inline-flex items-center gap-1 rounded-md px-1 text-[0.6875rem] font-semibold text-muted-foreground transition-colors hover:text-foreground',
                    focusRing,
                  )}
                >
                  <GithubMark className="size-3" />
                  {t('item.onGithub')}
                  <ArrowUpRight
                    aria-hidden
                    className="size-3 transition-transform group-hover/gh:-translate-y-px group-hover/gh:translate-x-px rtl:-scale-x-100"
                  />
                </a>
              )}
            </p>

            <h3 dir="auto" className="mt-1.5 text-start font-sans text-[0.9375rem] leading-snug font-bold text-foreground sm:text-base rtl:text-right">
              {/* Le lien couvre toute la carte */}
              <Link
                to={href}
                viewTransition
                onPointerEnter={preload}
                onFocus={preload}
                className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring/70"
              >
                {pullRequest.title}
              </Link>
            </h3>

            <Byline pullRequest={pullRequest} tab={tab} />

            <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-muted-foreground">
              <li>
                <DiffStat additions={pullRequest.additions} deletions={pullRequest.deletions} />
              </li>
              <Fact icon={FileText} label={t('item.files', { count: pullRequest.filesChanged })}>
                {pullRequest.filesChanged}
              </Fact>
              <Fact icon={GitCommitHorizontal} label={t('item.commits', { count: pullRequest.commits })}>
                {pullRequest.commits}
              </Fact>
              {pullRequest.checksTotal > 0 && (
                <li>
                  <Checks pullRequest={pullRequest} />
                </li>
              )}
              {pullRequest.commentCount > 0 && (
                <Fact icon={MessageSquare} label={t('item.comments', { count: pullRequest.commentCount })}>
                  {formatCount(pullRequest.commentCount)}
                </Fact>
              )}
              {pullRequest.labels.length > 0 && (
                <li className="flex min-w-0 flex-wrap gap-1">
                  {pullRequest.labels.slice(0, LABELS_SHOWN).map((label) => {
                    const yours = tab === 'COMMUNITY' && shared.has(label.toLowerCase());
                    return (
                      <span
                        key={label}
                        title={yours ? t('item.yourStack') : undefined}
                        className={cn(
                          'rounded-md px-1.5 py-px text-[0.6875rem]',
                          yours ? 'bg-jade/12 text-jade ring-1 ring-jade/25 ring-inset' : 'bg-foreground/6 text-soft-foreground',
                        )}
                      >
                        {label}
                      </span>
                    );
                  })}
                  {pullRequest.labels.length > LABELS_SHOWN && (
                    <span className="rounded-md bg-foreground/6 px-1.5 py-px text-[0.6875rem]">+{pullRequest.labels.length - LABELS_SHOWN}</span>
                  )}
                </li>
              )}
            </ul>

            {/* Carte étroite : les relecteurs et l'action passent dessous */}
            <div className="mt-3.5 flex items-center gap-3 border-t border-border-subtle pt-3.5 @2xl:hidden">
              <Reviewers reviewers={pullRequest.reviewers} />
              <div className="ms-auto">
                <Action pullRequest={pullRequest} tab={tab} href={href} />
              </div>
            </div>
          </div>

          {/* Carte large : les relecteurs et l'action à droite (à gauche en arabe) */}
          <div className="hidden w-44 shrink-0 flex-col items-end justify-between gap-3 @2xl:flex">
            <Reviewers reviewers={pullRequest.reviewers} />
            <Action pullRequest={pullRequest} tab={tab} href={href} />
          </div>
        </div>
      </div>
    </article>
  );
}

// ==================== LIGNES ====================

/**
 * L'auteur, ses branches, et le temps qui compte dans l'onglet : depuis quand la revue attend (en or au-delà d'un
 * jour, en rouge au-delà de trois), quand elle a été fusionnée ou fermée, ou sa dernière activité.
 */
function Byline({ pullRequest, tab }: { pullRequest: PullRequest; tab: ReviewTab }) {
  const { t } = useTranslation('reviews');
  const now = useNow(60_000);
  const waitingSince = tab === 'TO_REVIEW' && pullRequest.myReview ? pullRequest.myReview.requestedAt : null;
  const waited = waitingSince ? now - Date.parse(waitingSince) : 0;

  const time = (() => {
    if (waitingSince) {
      return (
        <span className={cn(waited >= WAITING_URGENT ? 'text-coral' : waited >= WAITING_LONG ? 'text-gold' : 'text-soft-foreground')}>
          <Clock aria-hidden className="me-1 inline size-3 -translate-y-px" />
          {t('item.waiting', { time: formatRelativeTime(waitingSince) })}
          {pullRequest.myReview?.required && <span className="font-semibold"> · {t('item.required')}</span>}
        </span>
      );
    }
    if (pullRequest.mergedAt) {
      return <time dateTime={pullRequest.mergedAt}>{t('item.merged', { time: formatRelativeTime(pullRequest.mergedAt) })}</time>;
    }
    if (pullRequest.closedAt) {
      return <time dateTime={pullRequest.closedAt}>{t('item.closed', { time: formatRelativeTime(pullRequest.closedAt) })}</time>;
    }
    if (tab === 'COMMUNITY') {
      return <time dateTime={pullRequest.createdAt}>{t('item.opened', { time: formatRelativeTime(pullRequest.createdAt) })}</time>;
    }
    return <time dateTime={pullRequest.lastActivityAt}>{t('item.active', { time: formatRelativeTime(pullRequest.lastActivityAt) })}</time>;
  })();

  // Un auteur qui n'est pas inscrit sur Ndadiee : son compte GitHub, marqué comme tel
  const author = pullRequestAuthor(pullRequest);

  // Chaque élément garde son point devant lui : à la ligne, le point part avec lui
  const items = [
    <span key="author" className="inline-flex min-w-0 items-center gap-1.5">
      <UserAvatar user={author.user} size="sm" className="size-5 text-[0.5rem]" />
      <bdi className="truncate font-semibold text-soft-foreground">{author.user.fullName}</bdi>
      {author.github && (
        <span title={t('item.githubAuthor')} className="inline-flex text-faint-foreground">
          <GithubMark className="size-3" />
          <span className="sr-only">{t('item.githubAuthor')}</span>
        </span>
      )}
    </span>,
    // Les branches gardent leur sens de lecture, même en arabe
    <span key="branches" dir="ltr" className="inline-flex min-w-0 items-center gap-1 font-mono">
      <GitBranch aria-hidden className="size-3 shrink-0 text-faint-foreground" />
      <span className="max-w-48 truncate">{pullRequest.sourceBranch}</span>
      <span aria-hidden className="text-faint-foreground">
        →
      </span>
      <span>{pullRequest.targetBranch}</span>
      <span className="sr-only">{t('item.branches', { source: pullRequest.sourceBranch, target: pullRequest.targetBranch })}</span>
    </span>,
    <span key="time">{time}</span>,
  ];

  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {items.map((item, index) => (
        <span key={item.key} className="inline-flex min-w-0 items-center gap-2">
          {index > 0 && (
            <span aria-hidden className="text-faint-foreground">
              ·
            </span>
          )}
          {item}
        </span>
      ))}
    </p>
  );
}

function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <li title={label} className="inline-flex items-center gap-1.5">
      <Icon aria-hidden className="size-3.5 text-faint-foreground" />
      <span aria-hidden className="tabular-nums">
        {children}
      </span>
      <span className="sr-only">{label}</span>
    </li>
  );
}

/** « +214 −38 » et cinq carrés : la part des ajouts en vert, celle des suppressions en rouge. */
export function DiffStat({ additions, deletions, className }: { additions: number; deletions: number; className?: string }) {
  const { t } = useTranslation('reviews');
  const total = additions + deletions;
  const green = total === 0 ? 0 : Math.round((additions / total) * DIFF_SQUARES);
  const red = total === 0 ? 0 : Math.min(DIFF_SQUARES - green, Math.max(deletions > 0 ? 1 : 0, Math.round((deletions / total) * DIFF_SQUARES)));

  return (
    <span className={cn('inline-flex items-center gap-2', className)} title={t('item.diff', { additions, deletions })}>
      <span aria-hidden dir="ltr" className="tabular-nums">
        <span className="text-jade">+{formatCount(additions)}</span> <span className="text-coral">−{formatCount(deletions)}</span>
      </span>
      <span aria-hidden className="flex gap-0.5">
        {Array.from({ length: DIFF_SQUARES }, (_, index) => (
          <span
            key={index}
            className={cn(
              'size-1.5 rounded-[2px]',
              index < green ? 'bg-kente-jade' : index < green + red ? 'bg-kente-coral' : 'bg-foreground/12',
            )}
          />
        ))}
      </span>
      <span className="sr-only">{t('item.diff', { additions, deletions })}</span>
    </span>
  );
}

/** Les vérifications : en échec (rouge), en cours (or), toutes réussies (vert). */
function Checks({ pullRequest }: { pullRequest: PullRequest }) {
  const { t } = useTranslation('reviews');
  const { checksTotal: total, checksPassed: passed, checksFailed: failed } = pullRequest;
  const running = total - passed - failed;

  if (failed > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-coral">
        <CircleX aria-hidden className="size-3.5" />
        {t('item.checksFailed', { count: failed })}
      </span>
    );
  }
  if (running > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-gold">
        <span aria-hidden className="size-1.5 rounded-full bg-kente-gold animate-pulse-dot" />
        {t('item.checksRunning', { passed, total })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-jade" title={t('item.checksPassed', { passed, total })}>
      <CircleCheck aria-hidden className="size-3.5" />
      <span aria-hidden className="tabular-nums">
        {passed}/{total}
      </span>
      <span className="sr-only">{t('item.checksPassed', { passed, total })}</span>
    </span>
  );
}

// ==================== RELECTEURS ====================

/**
 * Les relecteurs (design 3C : « Chinedu · changements demandés, Tunde · approuvé, Wanjiru · communauté ») : chaque
 * avatar porte le verdict de sa revue ; une revue encore attendue est en pointillés. Le détail au survol, et en
 * entier pour les lecteurs d'écran.
 */
function Reviewers({ reviewers }: { reviewers: Reviewer[] }) {
  const { t } = useTranslation('reviews');

  if (reviewers.length === 0) {
    return <span className="font-mono text-[0.6875rem] text-faint-foreground">{t('item.noReviewer')}</span>;
  }
  return (
    <ul className="flex items-center -space-x-1.5" aria-label={t('item.reviewers')}>
      {reviewers.slice(0, 4).map((reviewer) => {
        const { icon: Icon, tone } = STATE_BADGES[reviewer.state];
        const label = t('item.reviewerState', {
          name: reviewer.user.fullName,
          state: t(`state.${reviewer.state}`),
          context: reviewer.required ? 'required' : reviewer.community ? 'community' : undefined,
        });
        return (
          <li key={reviewer.user.id} title={label} className="relative">
            <UserAvatar
              user={reviewer.user}
              size="sm"
              className={cn('ring-2 ring-surface', reviewer.state === 'REQUESTED' && 'opacity-60 outline-1 outline-offset-1 outline-dashed outline-border-strong')}
            />
            <span aria-hidden className={cn('absolute -end-0.5 -bottom-0.5 grid size-3.5 place-items-center rounded-full ring-2 ring-surface', tone)}>
              <Icon className="size-2" strokeWidth={3} />
            </span>
            <span className="sr-only">{label}</span>
          </li>
        );
      })}
      {reviewers.length > 4 && (
        <li className="grid size-7 place-items-center rounded-full bg-muted font-mono text-[0.625rem] text-muted-foreground ring-2 ring-surface">
          +{reviewers.length - 4}
        </li>
      )}
    </ul>
  );
}

// ==================== ACTION ====================

/**
 * Ce que le membre peut faire de la PR : la relire (sa revue est attendue), se proposer comme relecteur (revue
 * communautaire), se retirer d'une revue qu'il avait prise ; sinon, ce qui manque pour fusionner.
 */
function Action({ pullRequest, tab, href }: { pullRequest: PullRequest; tab: ReviewTab; href: string }) {
  const { t } = useTranslation('reviews');
  const claim = useReviewClaim();
  const mine = pullRequest.myReview;
  const pending = claim.isPending;
  const waitingForMe = pullRequest.status === 'OPEN' && mine !== null && (mine.state === 'REQUESTED' || (mine.state === 'COMMENTED' && mine.required));
  // Une revue qu'il a prise lui-même, pas encore commencée : il peut la rendre à la communauté
  const releasable = mine !== null && !mine.required && mine.state === 'REQUESTED';

  if (waitingForMe) {
    return (
      <span className="relative z-10 flex flex-col items-end gap-1.5">
        <Link
          to={href}
          viewTransition
          onPointerEnter={() => prefetch(pages.review)}
          className={cn(
            'group/review relative isolate inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-xl px-3.5 text-[0.8125rem] font-bold whitespace-nowrap transition-[translate,box-shadow,background-color] duration-300 ease-out-expo hover:-translate-y-px',
            mine.required
              ? 'bg-kente-warm text-kente-night shadow-[0_10px_24px_-14px_var(--kente-coral)] hover:shadow-[0_14px_30px_-12px_var(--kente-coral)]'
              : 'bg-inverse text-inverse-foreground',
            focusRing,
            'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          {t('action.review')}
          <span aria-hidden className="transition-transform duration-300 group-hover/review:translate-x-0.5 rtl:-scale-x-100">
            →
          </span>
        </Link>
        {releasable && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              claim.mutate(
                { id: pullRequest.id, claim: false },
                { onSuccess: () => toast(t('action.released', { number: pullRequest.number })) },
              )
            }
            className={cn('inline-flex items-center gap-1 rounded-md text-[0.6875rem] font-semibold text-muted-foreground transition-colors hover:text-coral disabled:opacity-50', focusRing)}
          >
            {pending ? <PulsatingDots size="sm" tone="current" /> : <UserRoundMinus aria-hidden className="size-3" />}
            {t('action.release')}
          </button>
        )}
      </span>
    );
  }

  if (tab === 'COMMUNITY' && pullRequest.status === 'OPEN' && mine === null) {
    return (
      <button
        type="button"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() =>
          claim.mutate(
            { id: pullRequest.id, claim: true },
            { onSuccess: () => toast.success(t('action.claimed', { number: pullRequest.number, project: isolate(pullRequest.project.name) })) },
          )
        }
        className={cn(
          'relative z-10 inline-flex h-9 items-center gap-1.5 rounded-xl border border-jade/40 bg-jade/10 px-3.5 text-[0.8125rem] font-bold whitespace-nowrap text-jade',
          'transition-[translate,background-color,border-color] duration-300 ease-out-expo enabled:hover:-translate-y-px enabled:hover:border-jade/60 enabled:hover:bg-jade/15 disabled:opacity-60',
          focusRing,
        )}
      >
        {pending ? <PulsatingDots size="sm" tone="current" /> : <UserRoundPlus aria-hidden className="size-4" />}
        {t('action.claim')}
      </button>
    );
  }

  return <Verdict pullRequest={pullRequest} />;
}

/**
 * Où en est la PR, en une ligne : fusionnée, fermée, des changements demandés, prête à fusionner (tous les relecteurs
 * requis ont approuvé), ou combien de revues on attend encore.
 */
function Verdict({ pullRequest }: { pullRequest: PullRequest }) {
  const { t } = useTranslation('reviews');
  const status = mergeStatusOf(pullRequest);
  const label = 'inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap';

  switch (status.kind) {
    case 'merged':
      return (
        <span className={cn(label, 'text-gold')}>
          <GitMerge aria-hidden className="size-3.5" />
          {t('verdict.merged')}
        </span>
      );
    case 'closed':
      return <span className={cn(label, 'text-muted-foreground')}>{t('verdict.closed')}</span>;
    case 'draft':
      return <span className={cn(label, 'font-semibold text-muted-foreground')}>{t('verdict.draft')}</span>;
    case 'changes':
      return (
        <span className={cn(label, 'text-coral')}>
          <FileDiff aria-hidden className="size-3.5" />
          {t('verdict.changes')}
        </span>
      );
    case 'ready':
      return (
        <span className={cn(label, 'text-jade')}>
          <CircleCheck aria-hidden className="size-3.5" />
          {t('verdict.ready')}
        </span>
      );
    case 'awaiting':
      return <span className={cn(label, 'font-semibold text-muted-foreground')}>{t('verdict.awaiting', { count: status.count })}</span>;
    case 'noReviewer':
      return <span className={cn(label, 'font-semibold text-muted-foreground')}>{t('verdict.noReviewer')}</span>;
  }
}

const TAG_TONES = {
  neutral: 'bg-foreground/6 text-soft-foreground',
  gold: 'bg-gold/12 text-gold',
  coral: 'bg-coral/10 text-coral',
  jade: 'bg-jade/12 text-jade',
} as const;

function Tag({ tone, children }: { tone: keyof typeof TAG_TONES; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-px font-sans text-[0.6875rem] font-semibold', TAG_TONES[tone])}>
      {children}
    </span>
  );
}

/** Même encombrement qu'une PR, pendant le chargement. Design 3H (squelette à reflet). */
export function ReviewRequestItemSkeleton() {
  return (
    <div aria-hidden className="glass flex gap-4 rounded-2xl p-4 sm:p-5">
      <span className="size-10 shrink-0 rounded-xl skeleton-shimmer" />
      <div className="flex flex-1 flex-col gap-2.5">
        <span className="h-3 w-40 rounded-full skeleton-shimmer" />
        <span className="h-4 w-3/4 rounded-full skeleton-shimmer" />
        <span className="h-3 w-1/2 rounded-full skeleton-shimmer" />
        <span className="mt-1 h-3 w-2/3 rounded-full skeleton-shimmer" />
      </div>
      <div className="hidden w-32 flex-col items-end justify-between sm:flex">
        <span className="h-7 w-20 rounded-full skeleton-shimmer" />
        <span className="h-9 w-24 rounded-xl skeleton-shimmer" />
      </div>
    </div>
  );
}
