import { m } from 'motion/react';
import { useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { COLUMNS } from './board';
import { useWorkspaceContext } from './workspaceContext';
import { focusRing, threadStyle } from './workspaceStyles';
import { useWorkspaceTasks } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types/workspace.types';

interface KanbanColumnSwitcherProps {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
}

/**
 * Choix de la colonne du kanban sur téléphone : À faire, En cours, En revue, Terminé. Design 3G.
 *
 * Une colonne à la fois, à portée de pouce : la barre reste sous la barre du haut pendant qu'on fait défiler les
 * cartes, chaque colonne avec son nombre de cartes et son fil. La pastille glisse vers la colonne choisie ; les flèches
 * passent d'une colonne à l'autre, comme un balayage sur le tableau.
 */
export default function KanbanColumnSwitcher({ value, onChange }: KanbanColumnSwitcherProps) {
  const { t, i18n } = useTranslation('workspace');
  const { slug } = useWorkspaceContext();
  const tasks = useWorkspaceTasks(slug);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function keys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    const forward = (event.key === 'ArrowRight') !== (i18n.dir() === 'rtl');
    const index = (COLUMNS.findIndex((column) => column.status === value) + (forward ? 1 : COLUMNS.length - 1)) % COLUMNS.length;
    onChange(COLUMNS[index].status);
    buttons.current[index]?.focus();
  }

  return (
    <div className="sticky top-16 z-20 -mx-4 bg-background/80 px-4 py-2 backdrop-blur-xl saver:bg-background md:hidden">
      <div role="radiogroup" aria-label={t('board.columnSwitcher')} onKeyDown={keys} className="grid grid-cols-4 gap-1 rounded-2xl bg-foreground/5 p-1">
        {COLUMNS.map((column, index) => {
          const selected = column.status === value;
          const count = tasks.data?.filter((task) => task.status === column.status).length;
          return (
            <button
              key={column.status}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(column.status)}
              style={threadStyle(column.thread)}
              className={cn(
                'relative flex h-12 min-w-0 flex-col items-center justify-center rounded-xl px-1 transition-colors',
                selected ? 'text-foreground' : 'text-muted-foreground',
                focusRing,
              )}
            >
              {selected && (
                <m.span
                  layoutId="column-switcher"
                  aria-hidden
                  transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                  className="absolute inset-0 rounded-xl bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.14)]"
                />
              )}
              <span className="relative flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums">
                <span aria-hidden className={cn('size-1.5 rounded-full bg-(--thread)', !selected && 'opacity-60')} />
                {count ?? '·'}
              </span>
              <span className="relative w-full truncate text-center text-[0.6875rem] font-semibold">{t(`columns.${column.status}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
