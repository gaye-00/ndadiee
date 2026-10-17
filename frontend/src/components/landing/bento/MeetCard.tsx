import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, GitPullRequestArrow } from 'lucide-react';
import { animate, m } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import StackLogo from '@/components/shared/StackLogo';
import WovenMotif from '@/components/shared/WovenMotif';
import { roleOf } from '@/config/roles';
import { tagLogoOf } from '@/config/stacks';
import { openingsQuery, useOpenings, useOpeningStackSummary } from '@/hooks/useOpenings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useStackLogos } from '@/hooks/useStackLogos';
import type { StackLogoId } from '@/lib/stackLogos';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { OpeningFilters, ProjectOpening } from '@/types/project.types';
import { formatCount, isolate } from '@/utils/formatters';
import BentoCard from './BentoCard';

// Technologies proposées, et annonces montrées pour l'une d'elles
const STACKS_SHOWN = 6;
const RESULTS_SHOWN = 4;
// On en demande plus pour varier les projets : trois annonces d'un même projet en diraient moins
const RESULTS_FETCHED = 9;

interface Stack {
  slug: string;
  name: string;
  logo?: StackLogoId;
  /** Places proposées par les projets qui l'utilisent, quand le résumé est là */
  seats?: number;
}

// Sans le résumé (backend d'avant GET /v1/openings/stacks) : des technologies courantes, sans les chiffres
const FALLBACK_STACKS: readonly Stack[] = [
  { slug: 'flutter', name: 'Flutter' },
  { slug: 'go', name: 'Go' },
  { slug: 'python', name: 'Python' },
  { slug: 'kotlin', name: 'Kotlin' },
  { slug: 'react-native', name: 'React Native' },
  { slug: 'kubernetes', name: 'Kubernetes' },
].map((stack) => ({ ...stack, logo: tagLogoOf(stack.slug) }));

const filtersOf = (slug: string): OpeningFilters => ({ tag: slug, size: RESULTS_FETCHED });
const EASE_THREAD = [0.65, 0, 0.35, 1] as const;

/**
 * 01 · Se rencontrer. On choisit sa stack ; des fils partent de la technologie vers les annonces des
 * projets qui l'utilisent (API), tirés par une navette de lumière. Chaque annonce mène à son projet.
 */
export default function MeetCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { stacks, loading } = useStacks();
  const [picked, setPicked] = useState<string | null>(null);
  // La plus demandée, tant qu'on n'a rien choisi
  const stack = stacks.find((item) => item.slug === picked) ?? stacks[0];

  return (
    <BentoCard
      step={1}
      accent="gold"
      eyebrow={t('features.meet.eyebrow')}
      title={t('features.meet.title')}
      text={t('features.meet.text')}
      className={className}
    >
      {loading ? (
        <MatchmakerSkeleton />
      ) : (
        stack && <Matchmaker stacks={stacks} stack={stack} onPick={setPicked} />
      )}
    </BentoCard>
  );
}

/**
 * Les technologies des projets qui recrutent, celles qui ont un logo (les autres tags sont des sujets,
 * comme « Open Data »). D'abord celles qui mènent à de nouvelles équipes : Flutter, Dart et Firebase
 * ouvrent souvent les mêmes portes, autant proposer Go ou Python à côté.
 */
function useStacks(): { stacks: readonly Stack[]; loading: boolean } {
  const { data, isPending, isError } = useOpeningStackSummary();
  const known = (data ?? []).filter((summary) => tagLogoOf(summary.slug) !== undefined);
  const reached = new Set<number>();
  const opening = known.filter((summary) => {
    const fresh = summary.projectIds.some((id) => !reached.has(id));
    summary.projectIds.forEach((id) => reached.add(id));
    return fresh;
  });
  const stacks = [...opening, ...known.filter((summary) => !opening.includes(summary))]
    .slice(0, STACKS_SHOWN)
    // Dans l'ordre de la demande
    .sort((a, b) => known.indexOf(a) - known.indexOf(b))
    .map((summary) => ({ slug: summary.slug, name: summary.name, logo: tagLogoOf(summary.slug), seats: summary.seats }));
  if (isError || (data && stacks.length === 0)) {
    return { stacks: FALLBACK_STACKS, loading: false };
  }
  return { stacks, loading: isPending };
}

function Matchmaker({ stacks, stack, onPick }: { stacks: readonly Stack[]; stack: Stack; onPick: (slug: string) => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const logos = useStackLogos();
  const { data, isPending, isError, isPlaceholderData, refetch } = useOpenings(filtersOf(stack.slug));
  // Le temps d'aller chercher une autre technologie, les annonces d'avant restent, estompées
  const openings = varied(data?.content ?? [], RESULTS_SHOWN);
  const board = useRef<HTMLDivElement>(null);

  return (
    <>
      <div ref={board} className="relative mb-6 grid grid-cols-1 gap-5 sm:mb-8 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:gap-14 lg:gap-20">
        <div>
          <p className="flex justify-between gap-4 font-mono text-[0.6875rem] tracking-[0.08em] text-faint-foreground uppercase">
            <span id="meet-pick">{t('features.meet.pick')}</span>
            {/* La colonne des places, quand le résumé les donne */}
            {stacks.some((item) => item.seats !== undefined) && (
              <span aria-hidden className="hidden pe-4 sm:inline">
                {t('features.meet.seatsHeader')}
              </span>
            )}
          </p>
          <ul
            aria-labelledby="meet-pick"
            className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-col sm:overflow-visible sm:p-0"
          >
            {stacks.map((item) => {
              const active = item.slug === stack.slug;
              const preload = () => prefetch(() => queryClient.prefetchQuery(openingsQuery(filtersOf(item.slug))));
              return (
                <li key={item.slug} className="shrink-0">
                  <button
                    type="button"
                    data-stack={item.slug}
                    aria-pressed={active}
                    onClick={() => onPick(item.slug)}
                    onPointerEnter={preload}
                    onFocus={preload}
                    className={cn(
                      'group/stack flex h-10 w-full items-center gap-2.5 rounded-full border ps-3 pe-4 text-sm font-semibold whitespace-nowrap',
                      'transition-[background-color,border-color,color,box-shadow] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
                      active
                        ? 'border-(--card-ink)/50 bg-(--card-tint)/14 text-foreground shadow-[0_10px_30px_-18px_var(--card-tint)]'
                        : 'border-glass-border bg-surface/50 text-soft-foreground hover:border-border-strong hover:text-foreground saver:bg-surface',
                    )}
                  >
                    {/* Sans logos (économie de données), pas de place vide devant le nom */}
                    {logos !== false && (
                      <StackLogo
                        path={logos && item.logo ? logos[item.logo] : undefined}
                        className={cn(
                          'size-4 transition-colors',
                          active ? 'text-(--card-ink)' : 'text-faint-foreground group-hover/stack:text-soft-foreground',
                        )}
                      />
                    )}
                    {item.name}
                    {item.seats !== undefined && (
                      <>
                        <span aria-hidden className="ms-auto hidden ps-3 font-mono text-[0.6875rem] font-medium text-faint-foreground tabular-nums sm:inline">
                          {formatCount(item.seats)}
                        </span>
                        <span className="sr-only">, {t('features.meet.seats', { count: item.seats })}</span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0">
          <p role="status" className="font-mono text-[0.6875rem] tracking-[0.08em] text-faint-foreground uppercase">
            {data && !isPlaceholderData
              ? t('features.meet.found', { count: data.totalElements, name: isolate(stack.name) })
              : t('features.meet.loading')}
          </p>

          {isError && !data ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t('features.meet.error')}{' '}
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-sm font-semibold text-(--card-ink) underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70"
              >
                {t('actions.retry')}
              </button>
            </p>
          ) : isPending ? (
            <ResultsSkeleton />
          ) : openings.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-border-strong p-5 text-sm text-muted-foreground">
              {t('features.meet.empty', { name: isolate(stack.name) })}
            </p>
          ) : (
            <ul
              data-weave="in"
              className={cn('mt-3 flex flex-col gap-2.5 transition-opacity duration-300', isPlaceholderData && 'opacity-45')}
            >
              {openings.map((opening, index) => (
                <OpeningRow key={opening.id} opening={opening} index={index} />
              ))}
            </ul>
          )}
        </div>

        {!isPlaceholderData && openings.length > 0 && (
          <Threads board={board} stack={stack.slug} targets={openings.map((opening) => opening.id)} />
        )}
      </div>

      {/* Comment on postule, et toutes les annonces de la technologie, en bas de la carte */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-glass-border pt-4">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <GitPullRequestArrow aria-hidden className="size-4 shrink-0 text-jade" />
          {t('features.meet.howTo')}
        </p>
        <Link
          to={`${paths.openings}?tag=${encodeURIComponent(stack.slug)}`}
          viewTransition
          onPointerEnter={() => prefetch(pages.openings)}
          onFocus={() => prefetch(pages.openings)}
          className={cn(
            'group/all inline-flex shrink-0 items-center gap-1.5 rounded-full text-sm font-semibold text-(--card-ink) outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
            // Sans annonce, le lien mènerait à une liste vide : sa place reste, il n'est plus là
            !(data && data.totalElements > 0) && 'invisible',
          )}
        >
          {t('features.meet.all', { name: isolate(stack.name) })}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover/all:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/all:-translate-x-0.5"
          />
        </Link>
      </div>
    </>
  );
}

/** Une annonce : le motif tissé du rôle, l'intitulé, le projet, et l'issue « premier pas » pour postuler. */
function OpeningRow({ opening, index }: { opening: ProjectOpening; index: number }) {
  const { t } = useTranslation();
  const role = roleOf(opening.role);
  const project = opening.project;
  const body = (
    <>
      <span aria-hidden className="grid h-10 w-11 shrink-0 place-items-center">
        {role && <WovenMotif motif={role.motif} colors={role.colors} className="h-8 w-auto max-w-11" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold" dir="auto">
          {opening.title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          <bdi>{project?.name}</bdi> · {t('features.meet.seats', { count: opening.seats })}
        </span>
        {opening.starterIssueNumber !== null && (
          <span className="mt-1 block truncate font-mono text-[0.6875rem] text-jade">
            {t('features.meet.firstStep', { number: opening.starterIssueNumber })}
            {opening.starterIssueTitle && (
              <>
                {' · '}
                <bdi>{opening.starterIssueTitle}</bdi>
              </>
            )}
          </span>
        )}
      </span>
    </>
  );
  const rowClass = 'group/row flex items-center gap-3 rounded-xl border border-glass-border bg-surface/60 py-2.5 ps-2 pe-3 saver:bg-surface';

  return (
    // Fondu seul, sans glissement : les fils visent la place de la ligne, pas une position en mouvement
    <m.li
      data-opening={opening.id}
      data-weave-in
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.25 + index * 0.12 }}
      style={{ '--motif-delay': `${300 + index * 120}ms` } as CSSProperties}
    >
      {project ? (
        <Link
          to={paths.project(project.slug)}
          viewTransition
          onPointerEnter={() => prefetch(pages.project)}
          onFocus={() => prefetch(pages.project)}
          className={cn(
            rowClass,
            'transition-[border-color,background-color] duration-300 outline-none hover:border-(--card-ink)/40 hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring/70',
          )}
        >
          {body}
          <ArrowRight
            aria-hidden
            className="size-4 shrink-0 text-(--card-ink) opacity-0 transition-[opacity,translate] duration-300 group-hover/row:translate-x-0.5 group-hover/row:opacity-100 group-focus-visible/row:opacity-100 rtl:-scale-x-100 rtl:group-hover/row:-translate-x-0.5"
          />
        </Link>
      ) : (
        <div className={rowClass}>{body}</div>
      )}
    </m.li>
  );
}

interface Thread {
  id: number;
  d: string;
  end: readonly [number, number];
}

/**
 * Les fils, de la technologie choisie vers chacune de ses annonces quand elles sont à côté (sur
 * téléphone, elles sont dessous : pas de fil). Une navette de lumière tire chaque fil.
 */
function Threads({ board, stack, targets }: { board: RefObject<HTMLDivElement | null>; stack: string; targets: number[] }) {
  const { i18n } = useTranslation();
  const reduced = useReducedMotion();
  const [threads, setThreads] = useState<Thread[]>([]);
  const rtl = i18n.dir() === 'rtl';
  // targets est recréé à chaque rendu : `key` en résume le contenu
  const key = targets.join(' ');

  useLayoutEffect(() => {
    const element = board.current;
    if (!element) {
      return;
    }
    const measure = () => {
      const chip = element.querySelector<HTMLElement>(`[data-stack="${CSS.escape(stack)}"]`);
      if (!chip) {
        setThreads([]);
        return;
      }
      const source = boxIn(chip, element);
      const sx = rtl ? source.left : source.left + source.width;
      const sy = source.top + source.height / 2;
      const next = key.split(' ').flatMap((id): Thread[] => {
        const row = element.querySelector<HTMLElement>(`[data-opening="${id}"]`);
        if (!row) {
          return [];
        }
        const target = boxIn(row, element);
        const tx = rtl ? target.left + target.width : target.left;
        const ty = target.top + target.height / 2;
        if (rtl ? tx > sx - 24 : tx < sx + 24) {
          return [];
        }
        const mid = sx + (tx - sx) / 2;
        return [{ id: Number(id), d: `M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${ty}, ${tx} ${ty}`, end: [tx, ty] }];
      });
      setThreads(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [board, stack, key, rtl]);

  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
      {threads.map((thread, index) => (
        <g key={`${stack}-${thread.id}`}>
          <m.path
            d={thread.d}
            fill="none"
            stroke="var(--card-ink)"
            strokeOpacity="0.5"
            strokeWidth="1.25"
            strokeLinecap="round"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: EASE_THREAD, delay: index * 0.12 }}
          />
          <m.circle
            cx={thread.end[0]}
            cy={thread.end[1]}
            r="2.5"
            fill="var(--card-ink)"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.7 + index * 0.12 }}
          />
          {!reduced && <Shuttle d={thread.d} delay={index * 0.12} />}
        </g>
      ))}
    </svg>
  );
}

/** La navette : une perle de lumière qui court le long du fil pendant qu'il se dessine, puis s'éteint. */
function Shuttle({ d, delay }: { d: string; delay: number }) {
  const path = useRef<SVGPathElement>(null);
  const bead = useRef<SVGCircleElement>(null);

  // Une seule course, à l'arrivée du fil : un tracé recalculé (fenêtre redimensionnée) ne la relance pas
  useEffect(() => {
    const line = path.current;
    const dot = bead.current;
    if (!line || !dot) {
      return;
    }
    const running = animate(0, 1, {
      duration: 0.8,
      delay,
      ease: EASE_THREAD,
      onUpdate: (progress) => {
        const point = line.getPointAtLength(progress * line.getTotalLength());
        dot.setAttribute('cx', String(point.x));
        dot.setAttribute('cy', String(point.y));
        dot.style.opacity = progress > 0.02 && progress < 0.97 ? '1' : '0';
      },
      onComplete: () => {
        dot.style.opacity = '0';
      },
    });
    return () => running.stop();
  }, [delay]);

  return (
    <>
      <path ref={path} d={d} fill="none" stroke="none" />
      <circle ref={bead} r="3.5" className="bento-shuttle" style={{ opacity: 0 }} />
    </>
  );
}

/** Place d'un élément dans `board`, sans les transformations en cours (animations d'entrée de la carte). */
function boxIn(element: HTMLElement, board: HTMLElement) {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = element;
  while (node && node !== board) {
    left += node.offsetLeft;
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { left, top, width: element.offsetWidth, height: element.offsetHeight };
}

/** Quelques annonces, de projets différents tant que possible, dans l'ordre reçu (les plus récentes d'abord). */
function varied(openings: ProjectOpening[], count: number): ProjectOpening[] {
  const seen = new Set<number | undefined>();
  const firsts = openings.filter((opening) => {
    const project = opening.project?.id;
    if (seen.has(project)) {
      return false;
    }
    seen.add(project);
    return true;
  });
  const picked = new Set([...firsts, ...openings.filter((opening) => !firsts.includes(opening))].slice(0, count));
  return openings.filter((opening) => picked.has(opening));
}

function ResultsSkeleton() {
  return (
    <ul aria-hidden className="mt-3 flex flex-col gap-2.5">
      {Array.from({ length: RESULTS_SHOWN }, (_, index) => (
        <li key={index} className="skeleton-shimmer h-[4.75rem] rounded-xl" />
      ))}
    </ul>
  );
}

/** Même encombrement que les technologies et leurs annonces, le temps que le résumé arrive. */
function MatchmakerSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:gap-14 lg:gap-20">
      <div>
        <div className="h-4" />
        <div className="mt-3 flex gap-2 sm:flex-col">
          {Array.from({ length: STACKS_SHOWN }, (_, index) => (
            <div key={index} className="skeleton-shimmer h-10 w-28 shrink-0 rounded-full sm:w-full" />
          ))}
        </div>
      </div>
      <div>
        <div className="h-4" />
        <ResultsSkeleton />
      </div>
    </div>
  );
}
