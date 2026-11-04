import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ArrowRightLeft, Search, X } from 'lucide-react';
import { m } from 'motion/react';
import { useMemo, useRef, useState, type TouchEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { COLUMNS, isFiltering, matchesFilter, NO_FILTER, toBoard, type BoardFilter } from './board';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import { useWorkspaceContext } from './workspaceContext';
import { ease, focusRing, primaryButton } from './workspaceStyles';
import ErrorState from '@/components/feedback/ErrorState';
import UserAvatar from '@/components/shared/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useNow } from '@/hooks/useNow';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTaskDialog } from '@/hooks/useTaskDialog';
import { useMoveTask, useWorkspaceTasks } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';
import { TASK_STATUSES, type Task, type TaskStatus } from '@/types/workspace.types';
import { formatRelativeTime, isolate } from '@/utils/formatters';

/** Les cartes de chaque colonne, par numéro, dans l'ordre : ce que le glisser-déposer réarrange avant de l'envoyer */
type Order = Record<TaskStatus, number[]>;

const orderOf = (board: Record<TaskStatus, Task[]>): Order =>
  Object.fromEntries(TASK_STATUSES.map((status) => [status, board[status].map((task) => task.number)])) as Order;

const numberOf = (id: UniqueIdentifier) => Number(String(id).replace('task:', ''));
const statusOfColumn = (id: UniqueIdentifier) => (String(id).startsWith('column:') ? (String(id).slice(7) as TaskStatus) : null);

// Un balayage du doigt d'au moins 60 px, plus large que haut, change de colonne sur téléphone
const SWIPE = 60;

interface KanbanBoardProps {
  /** Sur téléphone : la colonne montrée (design 3G) */
  mobileColumn: TaskStatus;
  onMobileColumnChange: (status: TaskStatus) => void;
}

/**
 * Tableau kanban à glisser-déposer : À faire, En cours, En revue, Terminé. Design 3E, et 3G sur téléphone.
 *
 * <ul>
 * <li>Une carte se glisse à la souris, au doigt (appui long, pour laisser défiler la page), ou au clavier : Espace la
 * soulève, les flèches la déplacent, Espace la pose, Échap annule ; un lecteur d'écran annonce chaque étape. Un clic ou
 * Entrée ouvre sa fiche.</li>
 * <li>Le geste se voit tout de suite (useMoveTask), puis prend l'ordre du serveur, celui de toute l'équipe ; le pouls de
 * l'espace apporte les gestes des autres.</li>
 * <li>Un mot filtre les cartes (titre, « #38 »), comme « les miennes » ou « sans preneur » ; on peut encore les glisser,
 * elles se posent à côté de leurs voisines visibles.</li>
 * <li>Sur téléphone, une colonne à la fois (KanbanColumnSwitcher), qu'un balayage change.</li>
 * </ul>
 */
export default function KanbanBoard({ mobileColumn, onMobileColumnChange }: KanbanBoardProps) {
  const { t, i18n } = useTranslation('workspace');
  const { slug } = useWorkspaceContext();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const tasks = useWorkspaceTasks(slug);
  const moveTask = useMoveTask(slug);
  const { create } = useTaskDialog();
  const [filter, setFilter] = useState<BoardFilter>(NO_FILTER);
  const [order, setOrder] = useState<Order | null>(null);
  const [active, setActive] = useState<Task | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const all = useMemo(() => tasks.data ?? [], [tasks.data]);
  const byNumber = useMemo(() => new Map(all.map((task) => [task.number, task])), [all]);
  const full = useMemo(() => toBoard(all), [all]);
  const visible = useMemo(() => toBoard(all.filter((task) => matchesFilter(task, filter, user?.id))), [all, filter, user?.id]);
  // Pendant un geste, l'ordre du geste ; sinon celui du tableau
  const columns = order ?? orderOf(visible);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );

  const containerOf = (id: UniqueIdentifier, current: Order): TaskStatus | null =>
    statusOfColumn(id) ?? TASK_STATUSES.find((status) => current[status].includes(numberOf(id))) ?? null;

  function onDragStart({ active: dragged }: DragStartEvent) {
    setActive(byNumber.get(numberOf(dragged.id)) ?? null);
    setOrder(orderOf(visible));
  }

  // La carte passe au-dessus d'une autre colonne : elle y prend place, là où le pointeur la tient
  function onDragOver({ active: dragged, over }: DragOverEvent) {
    if (!over || !order) {
      return;
    }
    const from = containerOf(dragged.id, order);
    const to = containerOf(over.id, order);
    if (!from || !to || from === to) {
      return;
    }
    const number = numberOf(dragged.id);
    setOrder((current) => {
      if (!current) {
        return current;
      }
      const target = current[to];
      const overIndex = statusOfColumn(over.id) ? target.length : target.indexOf(numberOf(over.id));
      const translated = dragged.rect.current.translated;
      const below = translated && translated.top > over.rect.top + over.rect.height / 2;
      const index = overIndex < 0 ? target.length : overIndex + (below ? 1 : 0);
      return {
        ...current,
        [from]: current[from].filter((candidate) => candidate !== number),
        [to]: [...target.slice(0, index), number, ...target.slice(index)],
      };
    });
  }

  function onDragEnd({ active: dragged, over }: DragEndEvent) {
    const current = order;
    setActive(null);
    setOrder(null);
    const task = byNumber.get(numberOf(dragged.id));
    if (!over || !current || !task) {
      return;
    }
    const status = containerOf(dragged.id, current);
    if (!status) {
      return;
    }
    // Dans la même colonne : la carte prend la place de celle qu'elle survole
    let final = current[status];
    if (!statusOfColumn(over.id) && containerOf(over.id, current) === status) {
      final = arrayMove(final, final.indexOf(task.number), final.indexOf(numberOf(over.id)));
    }
    const position = positionIn(full[status].filter((candidate) => candidate.number !== task.number), final, task.number);
    if (status === task.status && position === full[status].findIndex((candidate) => candidate.number === task.number)) {
      return;
    }
    moveTask.mutate({ number: task.number, move: { status, position } });
  }

  function onDragCancel() {
    setActive(null);
    setOrder(null);
  }

  // Sur téléphone, un balayage passe à la colonne voisine (de droite à gauche en arabe)
  function onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    swipe.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }
  function onTouchEnd(event: TouchEvent) {
    const start = swipe.current;
    const touch = event.changedTouches[0];
    swipe.current = null;
    if (!start || !touch || active) {
      return;
    }
    const dx = touch.clientX - start.x;
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(touch.clientY - start.y) * 1.5) {
      return;
    }
    const forward = i18n.dir() === 'rtl' ? dx > 0 : dx < 0;
    const index = TASK_STATUSES.indexOf(mobileColumn) + (forward ? 1 : -1);
    if (index >= 0 && index < TASK_STATUSES.length) {
      onMobileColumnChange(TASK_STATUSES[index]);
    }
  }

  const columnName = (status: TaskStatus) => t(`columns.${status}`);
  const titleOf = (id: UniqueIdentifier) => {
    const task = byNumber.get(numberOf(id));
    return task ? `#${task.number} « ${task.title} »` : '';
  };
  const announcements: Announcements = {
    onDragStart: ({ active: dragged }) => t('dnd.picked', { task: titleOf(dragged.id) }),
    onDragOver: ({ active: dragged, over }) =>
      over ? t('dnd.over', { task: titleOf(dragged.id), column: columnName(containerOf(over.id, columns) ?? 'TODO') }) : t('dnd.outside', { task: titleOf(dragged.id) }),
    onDragEnd: ({ active: dragged, over }) =>
      over ? t('dnd.dropped', { task: titleOf(dragged.id), column: columnName(containerOf(over.id, columns) ?? 'TODO') }) : t('dnd.cancelled', { task: titleOf(dragged.id) }),
    onDragCancel: ({ active: dragged }) => t('dnd.cancelled', { task: titleOf(dragged.id) }),
  };

  if (tasks.isError) {
    return <ErrorState title={t('board.errorTitle')} description={t('board.errorText')} onRetry={() => void tasks.refetch()} />;
  }

  const filtering = isFiltering(filter);
  const shownCount = TASK_STATUSES.reduce((sum, status) => sum + visible[status].length, 0);

  return (
    <div className="flex flex-col gap-4">
      <BoardToolbar
        filter={filter}
        onFilterChange={setFilter}
        tasks={all}
        shown={shownCount}
        filtering={filtering}
        loading={tasks.isPending}
      />

      {!tasks.isPending && all.length === 0 && <FirstThread onCreate={() => create()} />}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        accessibility={{ announcements, screenReaderInstructions: { draggable: t('dnd.instructions') } }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="-mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:auto-cols-[minmax(13rem,1fr)] md:grid-flow-col md:gap-3 md:overflow-x-auto md:px-0 md:pb-2 md:[scrollbar-width:thin]"
        >
          {COLUMNS.map(({ status }) =>
            tasks.isPending ? (
              <ColumnSkeleton key={status} className={cn(status !== mobileColumn && 'max-md:hidden')} />
            ) : (
              <KanbanColumn
                key={status}
                status={status}
                tasks={columns[status].map((number) => byNumber.get(number)).filter((task): task is Task => task !== undefined)}
                total={full[status].length}
                filtering={filtering}
                dragging={active !== null}
                activeNumber={active?.number ?? null}
                className={cn(status !== mobileColumn && 'max-md:hidden')}
              />
            ),
          )}
        </div>
        <DragOverlay dropAnimation={reduced ? null : { duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
          {active ? <TaskCard task={active} lifted /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

/**
 * La place d'une carte dans toute sa colonne, d'après l'ordre de ce qui est montré (un filtre peut en cacher) : juste
 * après sa voisine visible du dessus, sinon juste avant celle du dessous, sinon en bas.
 */
function positionIn(column: Task[], shown: number[], number: number): number {
  const index = shown.indexOf(number);
  const above = shown[index - 1];
  if (above !== undefined) {
    const at = column.findIndex((task) => task.number === above);
    if (at >= 0) {
      return at + 1;
    }
  }
  const below = shown[index + 1];
  if (below !== undefined) {
    const at = column.findIndex((task) => task.number === below);
    if (at >= 0) {
      return at;
    }
  }
  return column.length;
}

// ==================== LA BARRE DU TABLEAU ====================

interface BoardToolbarProps {
  filter: BoardFilter;
  onFilterChange: (filter: BoardFilter) => void;
  tasks: Task[];
  shown: number;
  filtering: boolean;
  loading: boolean;
}

/** Filtrer les cartes (un mot, à qui elles sont), et le dernier geste de l'équipe sur le tableau. */
function BoardToolbar({ filter, onFilterChange, tasks, shown, filtering, loading }: BoardToolbarProps) {
  const { t } = useTranslation('workspace');
  const { user } = useAuth();
  const owners = [
    { id: 'all', count: tasks.length },
    { id: 'mine', count: tasks.filter((task) => task.assignee?.id === user?.id).length },
    { id: 'unassigned', count: tasks.filter((task) => task.assignee === null).length },
  ] as const;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="group/search relative flex h-10 min-w-0 flex-1 basis-56 items-center gap-2 rounded-xl border border-border bg-surface px-3 transition-[border-color,box-shadow] duration-300 focus-within:border-gold/55 focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--kente-gold)_14%,transparent)] sm:max-w-xs">
          <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">{t('board.searchLabel')}</span>
          <input
            type="search"
            value={filter.query}
            onChange={(event) => onFilterChange({ ...filter, query: event.target.value })}
            onKeyDown={(event) => event.key === 'Escape' && onFilterChange({ ...filter, query: '' })}
            placeholder={t('board.searchPlaceholder')}
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint-foreground sm:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {filter.query && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filter, query: '' })}
              aria-label={t('board.clearSearch')}
              className={cn('grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-foreground/8 hover:text-foreground', focusRing)}
            >
              <X aria-hidden className="size-3.5" />
            </button>
          )}
        </label>

        <div role="radiogroup" aria-label={t('board.ownerLabel')} className="flex h-10 items-center gap-0.5 rounded-xl bg-foreground/5 p-1">
          {owners.map((owner) => {
            const selected = filter.owner === owner.id;
            return (
              <button
                key={owner.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onFilterChange({ ...filter, owner: owner.id })}
                className={cn(
                  'relative flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold transition-colors',
                  selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  focusRing,
                )}
              >
                {selected && (
                  <m.span
                    layoutId="board-owner"
                    aria-hidden
                    transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                    className="absolute inset-0 rounded-lg bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12)]"
                  />
                )}
                <span className="relative">{t(`board.owner.${owner.id}`)}</span>
                {!loading && <span className="relative font-mono text-[0.6875rem] text-faint-foreground tabular-nums">{owner.count}</span>}
              </button>
            );
          })}
        </div>

        <p aria-live="polite" className={cn('text-xs text-muted-foreground', !filtering && 'sr-only')}>
          {filtering && !loading ? t('board.shown', { count: shown }) : ''}
        </p>
      </div>
      <LastMove tasks={tasks} />
    </div>
  );
}

/** « Tunde a déplacé #38 Mode hors-ligne vers En revue · il y a 2 h » : le dernier geste sur le tableau. */
function LastMove({ tasks }: { tasks: Task[] }) {
  const { t } = useTranslation('workspace');
  const { user } = useAuth();
  useNow(30_000);
  const last = tasks
    .filter((task) => task.movedBy !== null)
    .reduce<Task | null>((latest, task) => (!latest || Date.parse(task.statusChangedAt) > Date.parse(latest.statusChangedAt) ? task : latest), null);
  if (!last?.movedBy) {
    return null;
  }
  const mine = last.movedBy.id === user?.id;
  const values = { name: isolate(last.movedBy.fullName), number: last.number, task: isolate(last.title), column: t(`columns.${last.status}`) };

  return (
    <m.p
      key={`${last.id}-${last.statusChangedAt}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"
    >
      <ArrowRightLeft aria-hidden className="size-3.5 shrink-0 text-gold" />
      <UserAvatar user={last.movedBy} size="sm" className="size-5 text-[0.5rem]" />
      <span className="min-w-0 truncate">
        <Trans
          t={t}
          i18nKey={mine ? 'board.youMoved' : 'board.moved'}
          values={values}
          components={{ b: <bdi className="font-semibold text-soft-foreground" />, task: <bdi className="font-semibold text-foreground" /> }}
        />
      </span>
      <time dateTime={last.statusChangedAt} className="shrink-0 font-mono text-[0.6875rem] text-faint-foreground">
        {formatRelativeTime(last.statusChangedAt)}
      </time>
    </m.p>
  );
}

/** Le tableau vide : le premier fil à tisser. */
function FirstThread({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation('workspace');
  return (
    <m.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease }}
      aria-labelledby="first-thread-title"
      className="glass relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6"
    >
      {/* Les fils de chaîne, tendus, qui attendent leur trame */}
      <span aria-hidden className="flex h-12 shrink-0 items-stretch gap-1">
        {['bg-kente-gold', 'bg-foreground/15', 'bg-kente-coral', 'bg-foreground/15', 'bg-kente-jade'].map((tint, index) => (
          <m.span
            key={index}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.6, ease, delay: 0.15 + index * 0.07 }}
            className={cn('w-1.5 origin-bottom rounded-full', tint)}
          />
        ))}
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="first-thread-title" className="font-bold text-foreground">
          {t('board.firstTitle')}
        </h2>
        <p className="mt-1 max-w-prose text-[0.8125rem] leading-relaxed text-muted-foreground">{t('board.firstText')}</p>
      </div>
      <button type="button" onClick={onCreate} className={primaryButton}>
        {t('board.firstAction')}
      </button>
    </m.section>
  );
}

function ColumnSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('flex flex-col gap-2 rounded-2xl bg-foreground/[0.025] p-2', className)}>
      <span className="mx-1.5 mt-1 mb-1.5 h-3.5 w-24 rounded-full skeleton-shimmer" />
      {[0, 1, 2].map((index) => (
        <span key={index} className="h-24 rounded-xl skeleton-shimmer" />
      ))}
    </div>
  );
}
