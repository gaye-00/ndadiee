import { GitPullRequest } from 'lucide-react';
import {
  animate,
  m,
  useDragControls,
  useInView,
  useMotionValue,
  type AnimationPlaybackControls,
  type MotionValue,
  type PanInfo,
} from 'motion/react';
import { Fragment, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { isolate } from '@/utils/formatters';
import BentoCard from './BentoCard';
import CrewAvatar from './CrewAvatar';
import { CREW, type CrewMember } from './crew';

// Le tableau du sprint 7 de lagos-transit (design 3E), réduit à trois colonnes
const COLUMNS = ['todo', 'doing', 'review'] as const;
type Column = (typeof COLUMNS)[number];
const COLUMN_LABELS = { todo: 'kanban.todo', doing: 'kanban.inProgress', review: 'kanban.inReview' } as const;

interface Task {
  id: TaskId;
  label: 'mobile' | 'design' | 'api' | 'data';
  who: CrewMember;
  /** Issue « premier pas » : c'est elle qu'on prend pour postuler */
  firstStep?: boolean;
  /** Sa pull request attend une revue */
  pullRequest?: boolean;
  /** En cours depuis… (jours) */
  days?: number;
}

const TASKS: Record<TaskId, Task> = {
  33: { id: 33, label: 'mobile', who: 'tunde', firstStep: true },
  40: { id: 40, label: 'design', who: 'kwame' },
  46: { id: 46, label: 'api', who: 'chinedu' },
  38: { id: 38, label: 'mobile', who: 'tunde', days: 2 },
  45: { id: 45, label: 'data', who: 'kwame' },
  84: { id: 84, label: 'api', who: 'ama', pullRequest: true },
};
const TITLES = {
  33: 'features.team.tasks.t33',
  40: 'features.team.tasks.t40',
  46: 'features.team.tasks.t46',
  38: 'features.team.tasks.t38',
  45: 'features.team.tasks.t45',
  84: 'features.team.tasks.t84',
} as const;
type TaskId = keyof typeof TITLES;
const START: Record<Column, readonly TaskId[]> = { todo: [33, 40, 46], doing: [38, 45], review: [84] };
const ONLINE: readonly CrewMember[] = ['chinedu', 'tunde', 'ama'];

// Même ressort pour la carte qui se pose et pour sa place qui change : déposée, elle glisse en ligne
// droite jusqu'à sa place, sans détour
const SETTLE = { type: 'spring', stiffness: 420, damping: 38 } as const;

interface Activity {
  who: CrewMember | 'you';
  task: TaskId;
  column: Column;
}

/** Les mouvements d'une carte, pour la démo qui la déplace elle-même. */
type Hands = Map<number, { x: MotionValue<number>; y: MotionValue<number>; element: HTMLElement }>;

/**
 * 04 · Collaborer. Le kanban d'une équipe, pour de vrai : on glisse une carte d'une colonne à l'autre
 * (souris, stylet), on la touche pour l'avancer (doigt, clic), ou on la déplace au clavier (Entrée,
 * flèches). À l'arrivée à l'écran, Tunde, de l'équipe, déplace lui-même une carte : on voit son curseur.
 */
export default function TeamCard({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const reduced = useReducedMotion();
  const [board, setBoard] = useState(START);
  const [over, setOver] = useState<Column | null>(null);
  const [carried, setCarried] = useState<number | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const hands = useRef<Hands>(new Map());
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const cursorOpacity = useMotionValue(0);
  const interrupted = useRef(false);
  const played = useRef(false);
  const playing = useRef(false);
  const inView = useInView(area, { once: true, amount: 0.7 });
  const rtl = i18n.dir() === 'rtl';
  const rows = 1 + Math.max(...COLUMNS.map((column) => board[column].length));

  function columnOf(id: TaskId): Column {
    return COLUMNS.find((column) => board[column].includes(id)) ?? 'todo';
  }

  function move(id: TaskId, to: Column, who: Activity['who']) {
    setBoard((current) => {
      const from = COLUMNS.find((column) => current[column].includes(id));
      if (!from || from === to) {
        return current;
      }
      return { ...current, [from]: current[from].filter((task) => task !== id), [to]: [...current[to], id] };
    });
    setActivity({ who, task: id, column: to });
  }

  // La colonne sous le pointeur, en ignorant la carte qu'on porte
  function columnAt(point: { x: number; y: number }, dragged: number): Column | null {
    const carriedElement = hands.current.get(dragged)?.element;
    for (const element of document.elementsFromPoint(point.x - window.scrollX, point.y - window.scrollY)) {
      if (carriedElement?.contains(element) || !area.current?.contains(element)) {
        continue;
      }
      const column = (element as HTMLElement).closest<HTMLElement>('[data-column]')?.dataset.column;
      if (column) {
        return column as Column;
      }
    }
    return null;
  }

  // Tunde déplace « Mode hors-ligne » vers « En revue », une fois, à l'arrivée du tableau à l'écran
  useEffect(() => {
    const element = area.current;
    if (!inView || reduced || interrupted.current || played.current || !element) {
      return;
    }
    let cancelled = false;
    const running: AnimationPlaybackControls[] = [];
    const play = <T,>(controls: T & AnimationPlaybackControls) => {
      running.push(controls);
      return controls;
    };
    const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
    const alive = () => !cancelled && !interrupted.current;

    async function story() {
      const hand = hands.current.get(38);
      const last = hands.current.get(84);
      if (!hand || !last || !element) {
        return;
      }
      playing.current = true;
      await pause(500);
      if (!alive()) {
        return;
      }
      // Jouée : elle ne recommencera pas (changement de langue, retour à l'écran)
      played.current = true;
      const card = boxIn(hand.element, element);
      const slot = boxIn(last.element, element);
      // Le curseur entre par le bas, du côté de la fin de ligne
      cursorX.set(rtl ? -24 : element.offsetWidth + 24);
      cursorY.set(element.offsetHeight + 24);
      const grabX = card.left + card.width * (rtl ? 0.35 : 0.65);
      const grabY = card.top + card.height * 0.55;
      play(animate(cursorOpacity, 1, { duration: 0.3 }));
      await Promise.all([
        play(animate(cursorX, grabX, { duration: 1, ease: [0.45, 0, 0.2, 1] })),
        play(animate(cursorY, grabY, { duration: 1, ease: [0.45, 0, 0.2, 1] })),
      ]);
      if (!alive()) {
        return;
      }
      setCarried(38);
      await pause(260);
      if (!alive()) {
        return;
      }
      // Sous la dernière carte de la revue
      const dx = slot.left - card.left;
      const dy = slot.top + slot.height + 8 - card.top;
      const carry = { duration: 1.1, ease: [0.45, 0, 0.2, 1] } as const;
      await Promise.all([
        play(animate(hand.x, dx, carry)),
        play(animate(hand.y, dy, carry)),
        play(animate(cursorX, grabX + dx, carry)),
        play(animate(cursorY, grabY + dy, carry)),
      ]);
      if (!alive()) {
        return;
      }
      // La carte change de place maintenant : elle se pose depuis là où le curseur l'a laissée
      flushSync(() => {
        move(38, 'review', 'tunde');
        setCarried(null);
      });
      play(animate(hand.x, 0, SETTLE));
      play(animate(hand.y, 0, SETTLE));
      await pause(350);
      play(animate(cursorX, grabX + dx + (rtl ? -40 : 40), { duration: 0.8, ease: 'easeOut' }));
      play(animate(cursorY, grabY + dy + 36, { duration: 0.8, ease: 'easeOut' }));
      await play(animate(cursorOpacity, 0, { duration: 0.6, delay: 0.2 }));
    }

    void story().finally(() => {
      playing.current = false;
    });
    return () => {
      cancelled = true;
      running.forEach((controls) => controls.stop());
    };
  }, [inView, reduced, rtl, cursorX, cursorY, cursorOpacity]);

  // On prend la main : la démo s'arrête, la carte qu'elle portait retourne à sa place
  function takeOver() {
    if (interrupted.current) {
      return;
    }
    interrupted.current = true;
    if (playing.current) {
      const hand = hands.current.get(38);
      if (hand) {
        animate(hand.x, 0, SETTLE);
        animate(hand.y, 0, SETTLE);
      }
      setCarried(null);
      animate(cursorOpacity, 0, { duration: 0.3 });
    }
  }

  const label = (column: Column) => t(COLUMN_LABELS[column]);
  const taskTitle = (id: TaskId) => t(TITLES[id]);

  return (
    <BentoCard
      step={4}
      accent="gold"
      eyebrow={t('features.team.eyebrow')}
      title={t('features.team.title')}
      text={t('features.team.text')}
      className={className}
    >
      {/* L'équipe : qui est là */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm">
          <bdi className="font-semibold">lagos-transit</bdi>
          <span className="text-muted-foreground"> · {t('features.team.sprint')}</span>
        </p>
        <div className="flex items-center gap-2.5">
          <span className="flex -space-x-1">
            {(Object.keys(CREW) as CrewMember[]).slice(0, 4).map((who) => (
              <span key={who} className="relative">
                <CrewAvatar who={who} className="ring-2 ring-surface" />
                {ONLINE.includes(who) && (
                  <span className="absolute -end-0.5 -bottom-0.5 size-2 rounded-full bg-jade ring-2 ring-surface" />
                )}
              </span>
            ))}
          </span>
          <span className="text-xs text-muted-foreground">{t('features.team.online', { count: ONLINE.length })}</span>
        </div>
      </div>

      <div ref={area} onPointerDownCapture={takeOver} onKeyDownCapture={takeOver} className="relative mt-4">
        <ul
          aria-label={t('features.team.board')}
          className="flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-x-3"
          style={{ '--rows': rows } as CSSProperties}
        >
          {COLUMNS.map((column, index) => (
            <Fragment key={column}>
              {/* Le fond de la colonne : là où l'on dépose */}
              <li
                aria-hidden
                data-column={column}
                className={cn(
                  'pointer-events-auto -m-1.5 hidden rounded-xl border border-dashed transition-colors duration-300 md:block',
                  over === column ? 'border-(--card-ink)/45 bg-(--card-tint)/8' : 'border-transparent bg-foreground/[0.025]',
                )}
                style={{ gridColumn: index + 1, gridRow: '1 / span var(--rows)' }}
              />
              <li
                aria-hidden
                data-column={column}
                className={cn(
                  'flex items-center gap-2 px-1 pt-1 font-mono text-[0.6875rem] tracking-[0.06em] text-faint-foreground uppercase md:[grid-column:var(--col)] md:[grid-row:1]',
                  index > 0 && 'max-md:mt-3',
                )}
                style={{ '--col': index + 1, order: index * 100 } as CSSProperties}
              >
                {label(column)}
                <span className="rounded-full bg-foreground/8 px-1.5 text-soft-foreground tabular-nums">{board[column].length}</span>
              </li>
            </Fragment>
          ))}
          {COLUMNS.flatMap((column, index) =>
            board[column].map((id, row) => (
              <TaskCard
                key={id}
                task={TASKS[id]}
                title={taskTitle(id)}
                column={column}
                lifted={carried === id}
                hands={hands}
                style={{ '--col': index + 1, '--row': row + 2, order: index * 100 + row + 1 } as CSSProperties}
                onDrag={(point) => setOver(columnAt(point, id))}
                onDrop={(point) => {
                  setOver(null);
                  const to = columnAt(point, id);
                  if (!to || to === column) {
                    return false;
                  }
                  move(id, to, 'you');
                  return true;
                }}
                onStep={(step) => {
                  const at = COLUMNS.indexOf(columnOf(id));
                  // Entrée : la colonne suivante, et retour au début après la revue ; flèches : la voisine
                  // (en arabe, les colonnes vont de droite à gauche)
                  const forward = rtl ? step === 'left' : step === 'right';
                  const next = step === 'next' ? (at + 1) % COLUMNS.length : at + (forward ? 1 : -1);
                  if (next >= 0 && next < COLUMNS.length) {
                    move(id, COLUMNS[next], 'you');
                  }
                }}
              />
            )),
          )}
        </ul>
        <p id="team-keys" className="sr-only">
          {t('features.team.keys')}
        </p>

        {/* Le curseur de Tunde, comme dans un éditeur partagé */}
        <m.div
          aria-hidden
          style={{ x: cursorX, y: cursorY, opacity: cursorOpacity }}
          className="pointer-events-none absolute top-0 left-0 z-30"
        >
          <svg viewBox="0 0 16 16" className="size-4 -translate-x-px -translate-y-px drop-shadow-[0_2px_4px_rgb(0_0_0/0.35)] rtl:-scale-x-100">
            <path d="M1 1 L14 6.5 L8 8 L6.5 14 Z" fill="var(--kente-coral)" stroke="var(--kente-paper)" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          <span className="ms-3 -mt-0.5 inline-block rounded-full bg-kente-coral px-2 py-0.5 text-[0.6875rem] font-bold whitespace-nowrap text-kente-night">
            {CREW.tunde.name}
          </span>
        </m.div>
      </div>

      <div className="mt-4 flex min-h-5 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
        <p role="status" className="min-w-0 text-muted-foreground">
          {activity &&
            t(activity.who === 'you' ? 'features.team.youMoved' : 'features.team.moved', {
              name: activity.who === 'you' ? '' : isolate(CREW[activity.who].name),
              task: taskTitle(activity.task),
              column: label(activity.column),
            })}
        </p>
        <p className="text-faint-foreground">
          <span className="pointer-coarse:hidden">{t('features.team.hintPointer')}</span>
          <span className="hidden pointer-coarse:inline">{t('features.team.hintTouch')}</span>
        </p>
      </div>
    </BentoCard>
  );
}

interface TaskCardProps {
  task: Task;
  title: string;
  column: Column;
  lifted: boolean;
  hands: { current: Hands };
  style: CSSProperties;
  onDrag: (point: PanInfo['point']) => void;
  /** @returns true si la carte a changé de colonne */
  onDrop: (point: PanInfo['point']) => boolean;
  onStep: (step: 'next' | 'left' | 'right') => void;
}

/** Une carte du tableau. Toujours la même hauteur : les colonnes partagent les rangées de la grille. */
function TaskCard({ task, title, column, lifted, hands, style, onDrag, onDrop, onStep }: TaskCardProps) {
  const { t } = useTranslation();
  const controls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const item = useRef<HTMLLIElement>(null);
  const dragged = useRef(false);
  const landing = useRef(false);
  const [dragging, setDragging] = useState(false);

  function settle() {
    animate(x, 0, SETTLE);
    animate(y, 0, SETTLE);
  }

  useEffect(() => {
    const element = item.current;
    const registry = hands.current;
    if (element) {
      registry.set(task.id, { x, y, element });
    }
    return () => {
      registry.delete(task.id);
    };
  }, [hands, task.id, x, y]);

  // Au doigt, la page doit pouvoir défiler : on n'y glisse pas les cartes, on les touche
  function grab(event: PointerEvent<HTMLLIElement>) {
    dragged.current = false;
    if (event.pointerType !== 'touch') {
      controls.start(event);
    }
  }

  function keys(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      onStep(event.key === 'ArrowLeft' ? 'left' : 'right');
    }
  }

  const up = lifted || dragging;

  return (
    <m.li
      ref={item}
      layout
      drag
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      onPointerDown={grab}
      onDragStart={() => {
        dragged.current = true;
        setDragging(true);
      }}
      onDrag={(_, info) => onDrag(info.point)}
      onDragEnd={(_, info) => {
        let moved = false;
        flushSync(() => {
          setDragging(false);
          moved = onDrop(info.point);
        });
        // Déposée ailleurs : elle se pose quand sa place part vers la nouvelle (onLayoutAnimationStart),
        // du même ressort, pour glisser en ligne droite. Sinon, elle revient d'où elle vient.
        if (moved) {
          landing.current = true;
        } else {
          settle();
        }
      }}
      onLayoutAnimationStart={() => {
        if (landing.current) {
          landing.current = false;
          settle();
        }
      }}
      data-column={column}
      transition={{ layout: SETTLE }}
      style={{ ...style, x, y, zIndex: up ? 20 : 1 }}
      className="relative md:[grid-column:var(--col)] md:[grid-row:var(--row)]"
    >
      <m.button
        type="button"
        animate={up ? { scale: 1.04, rotate: 1.5 } : { scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        onClick={() => {
          if (dragged.current) {
            dragged.current = false;
            return;
          }
          onStep('next');
        }}
        onKeyDown={keys}
        aria-label={t('features.team.card', { number: task.id, task: title, column: t(COLUMN_LABELS[column]) })}
        aria-describedby="team-keys"
        className={cn(
          'flex w-full cursor-grab flex-col gap-y-2 rounded-xl border bg-surface p-3 text-start transition-[border-color,box-shadow] duration-300 outline-none select-none active:cursor-grabbing md:h-[6.25rem] md:gap-y-0',
          'hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring/70',
          up ? 'border-(--card-ink)/40 shadow-lift' : 'border-glass-border shadow-[0_1px_2px_rgb(0_0_0/0.06)]',
          'pointer-coarse:cursor-pointer',
        )}
      >
        <span className="flex items-center gap-2 font-mono text-[0.6875rem] text-faint-foreground">
          #{task.id}
          {task.firstStep && (
            <span className="rounded-full bg-jade/12 px-1.5 font-sans font-semibold text-jade">{t('features.team.firstStep')}</span>
          )}
          {task.pullRequest && (
            <span className="inline-flex items-center gap-1 rounded-full bg-coral/12 px-1.5 font-sans font-semibold text-coral">
              <GitPullRequest aria-hidden className="size-2.5" />
              {t('features.team.changes')}
            </span>
          )}
          {task.days !== undefined && <span className="ms-auto">{t('features.team.days', { count: task.days })}</span>}
        </span>
        <span className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug font-semibold">{title}</span>
        <span className="mt-auto flex items-center justify-between">
          <span className="rounded-md bg-foreground/6 px-1.5 py-px font-mono text-[0.625rem] text-muted-foreground">{task.label}</span>
          <CrewAvatar who={task.who} size="xs" />
        </span>
      </m.button>
    </m.li>
  );
}

/** Place d'un élément dans `area`, sans les transformations en cours. */
function boxIn(element: HTMLElement, area: HTMLElement) {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = element;
  while (node && node !== area) {
    left += node.offsetLeft;
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { left, top, width: element.offsetWidth, height: element.offsetHeight };
}
