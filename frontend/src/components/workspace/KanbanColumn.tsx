import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, CornerDownLeft, Plus } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cardId, columnId, columnOf } from './board';
import { useTaskSummary } from './labels';
import TaskCard from './TaskCard';
import { useWorkspaceContext } from './workspaceContext';
import { ease, focusRing, threadStyle } from './workspaceStyles';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useTaskDialog } from '@/hooks/useTaskDialog';
import { useCreateTask } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus } from '@/types/workspace.types';
import { getApiError, getApiErrorMessage } from '@/utils/apiError';

// Cartes terminées montrées avant « Voir les autres » : la colonne ne s'allonge pas sans fin entre deux sprints
const DONE_SHOWN = 8;
const MAX_TITLE = 140;

interface KanbanColumnProps {
  status: TaskStatus;
  /** Les cartes à montrer, dans l'ordre (filtrées s'il y a un filtre) */
  tasks: Task[];
  /** Toutes les cartes de la colonne, filtre ou pas */
  total: number;
  /** Un filtre cache des cartes : la colonne dit combien elle en montre sur combien */
  filtering: boolean;
  /** Une carte est en train d'être portée : la colonne peut la recevoir */
  dragging: boolean;
  /** Le numéro de la carte portée : sa place reste en creux */
  activeNumber: number | null;
  className?: string;
}

/**
 * Colonne du kanban : titre, nombre de cartes et zone de dépôt. Design 3E.
 *
 * Chaque colonne porte un fil du kente (or en cours, rouge en revue, vert terminé). Une carte portée au-dessus l'éclaire
 * en pointillés. En bas, « Ajouter une tâche » écrit une tâche sans quitter le tableau : Entrée l'ajoute et garde le
 * champ ouvert pour la suivante, Échap le referme. Au-delà de huit tâches terminées, les plus anciennes se replient.
 */
export default function KanbanColumn({ status, tasks, total, filtering, dragging, activeNumber, className }: KanbanColumnProps) {
  const { t } = useTranslation('workspace');
  const [expanded, setExpanded] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: columnId(status) });
  const column = columnOf(status);
  const titleId = useId();
  const folded = status === 'DONE' && !expanded && !dragging && tasks.length > DONE_SHOWN;
  const shown = folded ? tasks.slice(0, DONE_SHOWN) : tasks;

  return (
    <section
      aria-labelledby={titleId}
      style={threadStyle(column.thread)}
      className={cn(
        'flex min-w-0 flex-col rounded-2xl border p-2 transition-[background-color,border-color] duration-300',
        isOver ? 'border-dashed border-(--thread)/55 bg-(--thread)/[0.06]' : 'border-transparent bg-foreground/[0.025]',
        className,
      )}
    >
      <header className="flex items-center gap-2 px-1.5 pt-1 pb-2.5">
        <span aria-hidden className={cn('size-2 rounded-full bg-(--thread)', column.thread && 'shadow-[0_0_8px_-1px_var(--thread)]')} />
        <h2 id={titleId} className="font-mono text-[0.6875rem] font-semibold tracking-[0.08em] text-soft-foreground uppercase">
          {t(`columns.${status}`)}
        </h2>
        <span className="rounded-full bg-foreground/8 px-1.5 font-mono text-[0.6875rem] text-soft-foreground tabular-nums">
          {filtering ? t('board.filteredCount', { shown: tasks.length, total }) : tasks.length}
        </span>
      </header>

      <SortableContext id={columnId(status)} items={shown.map((task) => cardId(task.number))} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} aria-labelledby={titleId} className="flex min-h-24 flex-1 flex-col gap-2">
          {shown.map((task) => (
            <SortableTask key={task.id} task={task} placeholder={task.number === activeNumber} />
          ))}
          {shown.length === 0 && (
            <li aria-hidden className="grid min-h-24 flex-1 place-items-center rounded-xl border border-dashed border-border px-4 text-center text-xs leading-relaxed text-faint-foreground">
              {total > 0 ? t('board.columnFiltered') : t(`board.empty.${status}`)}
            </li>
          )}
        </ul>
      </SortableContext>

      {status === 'DONE' && tasks.length > DONE_SHOWN && !dragging && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className={cn('mt-2 inline-flex h-8 items-center justify-center gap-1 rounded-lg text-xs font-bold text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground', focusRing)}
        >
          {expanded ? t('board.fewerDone') : t('board.moreDone', { count: tasks.length - DONE_SHOWN })}
          <ChevronDown aria-hidden className={cn('size-3.5 transition-transform duration-300', expanded && 'rotate-180')} />
        </button>
      )}

      <QuickAdd status={status} />
    </section>
  );
}

/** Une carte qu'on glisse : à la souris, au doigt (appui long), au clavier (Espace). Un clic ou Entrée ouvre sa fiche. */
function SortableTask({ task, placeholder }: { task: Task; placeholder: boolean }) {
  const { open } = useTaskDialog();
  const summary = useTaskSummary();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cardId(task.number),
    data: { status: task.status },
  });

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className="relative">
      <TaskCard
        task={task}
        placeholder={placeholder || isDragging}
        {...attributes}
        {...listeners}
        aria-label={summary(task)}
        onClick={() => open(task.number)}
        onKeyDown={(event) => {
          // Entrée ouvre la fiche ; Espace et les flèches restent au glisser-déposer
          if (event.key === 'Enter') {
            event.preventDefault();
            open(task.number);
            return;
          }
          listeners?.onKeyDown?.(event);
        }}
      />
    </li>
  );
}

/** « Ajouter une tâche » en bas d'une colonne : un titre, Entrée, et la suivante. */
function QuickAdd({ status }: { status: TaskStatus }) {
  const { t } = useTranslation('workspace');
  const { slug } = useWorkspaceContext();
  const createTask = useCreateTask(slug);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const errorId = useId();

  function close() {
    setOpen(false);
    setTitle('');
    setError(null);
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const value = title.trim();
    if (!value || createTask.isPending) {
      return;
    }
    setError(null);
    createTask.mutate(
      { title: value, status },
      {
        onSuccess: () => {
          setTitle('');
          field.current?.focus();
        },
        onError: (failure) => setError(getApiError(failure)?.validationErrors?.title ?? getApiErrorMessage(failure)),
      },
    );
  }

  function keys(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  return (
    <AnimatePresence initial={false} mode="wait">
      {open ? (
        <m.form
          key="form"
          onSubmit={submit}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease }}
          className="mt-2"
        >
          <textarea
            ref={field}
            autoFocus
            rows={2}
            value={title}
            maxLength={MAX_TITLE}
            onChange={(event) => setTitle(event.target.value.replace(/\n/g, ' '))}
            onKeyDown={keys}
            onBlur={() => !title.trim() && !createTask.isPending && close()}
            dir="auto"
            aria-label={t('board.quickAddLabel', { column: t(`columns.${status}`) })}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            placeholder={t('board.quickAddPlaceholder')}
            className={cn(
              'block w-full resize-none rounded-xl border border-(--thread)/40 bg-surface px-3 py-2.5 text-[0.8125rem] leading-snug font-semibold outline-none placeholder:font-normal placeholder:text-faint-foreground',
              'shadow-[0_0_0_4px_color-mix(in_srgb,var(--thread)_12%,transparent)]',
            )}
          />
          {error && (
            <p id={errorId} role="alert" className="mt-1.5 px-1 text-xs text-coral">
              {error}
            </p>
          )}
          <p className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[0.6875rem] text-faint-foreground">
            <span className="inline-flex items-center gap-1">
              {createTask.isPending ? <PulsatingDots size="sm" /> : <CornerDownLeft aria-hidden className="size-3" />}
              {t('board.quickAddHint')}
            </span>
            <button type="button" onClick={close} className={cn('rounded-md px-1.5 py-0.5 font-semibold hover:text-foreground', focusRing)}>
              {t('board.quickAddClose')}
            </button>
          </p>
        </m.form>
      ) : (
        <m.button
          key="button"
          type="button"
          onClick={() => setOpen(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'group/add mt-2 flex h-9 w-full items-center gap-2 rounded-xl px-2.5 text-[0.8125rem] font-semibold text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground',
            focusRing,
          )}
        >
          <Plus aria-hidden className="size-4 transition-transform duration-300 group-hover/add:rotate-90" />
          {t('board.quickAdd')}
        </m.button>
      )}
    </AnimatePresence>
  );
}
