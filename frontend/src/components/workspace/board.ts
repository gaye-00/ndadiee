import type { KenteThread } from '@/config/roles';
import { TASK_STATUSES, type Task, type TaskStatus } from '@/types/workspace.types';

/** Les colonnes du tableau, dans leur ordre ; chacune avec son fil du kente (et une colonne neutre pour « À faire ») */
export const COLUMNS: ReadonlyArray<{ status: TaskStatus; slug: string; thread: KenteThread | null }> = [
  { status: 'TODO', slug: 'todo', thread: null },
  { status: 'IN_PROGRESS', slug: 'in-progress', thread: 'gold' },
  { status: 'IN_REVIEW', slug: 'in-review', thread: 'coral' },
  { status: 'DONE', slug: 'done', thread: 'jade' },
];

export const columnOf = (status: TaskStatus) => COLUMNS.find((column) => column.status === status)!;

/** Les identifiants du glisser-déposer : une colonne, une carte */
export const columnId = (status: TaskStatus) => `column:${status}`;
export const cardId = (number: number) => `task:${number}`;

export type Board = Record<TaskStatus, Task[]>;

/** Le tableau, colonne par colonne, de haut en bas. */
export function toBoard(tasks: readonly Task[]): Board {
  const board = Object.fromEntries(TASK_STATUSES.map((status) => [status, [] as Task[]])) as Board;
  for (const task of tasks) {
    board[task.status].push(task);
  }
  for (const status of TASK_STATUSES) {
    board[status].sort((a, b) => a.position - b.position || a.id - b.id);
  }
  return board;
}

/**
 * Le tableau après qu'une tâche a été glissée à une place d'une colonne (au-delà de la dernière : en bas), comme le
 * backend le fera (TaskService.relocate) : les colonnes touchées se renumérotent sans trou, et une tâche qui change de
 * colonne note quand et qui l'a déplacée. Sert à montrer le geste tout de suite, avant la réponse.
 */
export function moveTask(
  tasks: readonly Task[],
  number: number,
  to: TaskStatus,
  position: number,
  mover: Task['movedBy'],
): Task[] {
  const moving = tasks.find((task) => task.number === number);
  if (!moving) {
    return [...tasks];
  }
  const board = toBoard(tasks);
  const source = board[moving.status].filter((task) => task.number !== number);
  const changed = moving.status !== to;
  const target = changed ? [...board[to]] : source;
  const moved: Task = changed ? { ...moving, status: to, statusChangedAt: new Date().toISOString(), movedBy: mover } : moving;
  target.splice(Math.min(Math.max(position, 0), target.length), 0, moved);

  const renumbered = new Map<number, Task>();
  for (const column of changed ? [source, target] : [target]) {
    column.forEach((task, index) => renumbered.set(task.id, task.position === index && task !== moved ? task : { ...task, position: index }));
  }
  return tasks.map((task) => renumbered.get(task.id) ?? task);
}

/** Le tableau sans une tâche : sa colonne se resserre. */
export function removeTask(tasks: readonly Task[], number: number): Task[] {
  const removed = tasks.find((task) => task.number === number);
  if (!removed) {
    return [...tasks];
  }
  let position = 0;
  const column = new Map(
    toBoard(tasks)[removed.status]
      .filter((task) => task.number !== number)
      .map((task) => [task.id, position++] as const),
  );
  return tasks
    .filter((task) => task.number !== number)
    .map((task) => (column.has(task.id) && column.get(task.id) !== task.position ? { ...task, position: column.get(task.id)! } : task));
}

// Recherche sans accents ni majuscules : « reseau » trouve « Réseau »
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();

/** Les filtres du tableau : un mot (titre, « #38 », « 38 »), et à qui sont les tâches */
export interface BoardFilter {
  query: string;
  owner: 'all' | 'mine' | 'unassigned';
}

export const NO_FILTER: BoardFilter = { query: '', owner: 'all' };

export function isFiltering(filter: BoardFilter): boolean {
  return filter.query.trim() !== '' || filter.owner !== 'all';
}

export function matchesFilter(task: Task, filter: BoardFilter, userId: number | undefined): boolean {
  if (filter.owner === 'mine' && task.assignee?.id !== userId) {
    return false;
  }
  if (filter.owner === 'unassigned' && task.assignee !== null) {
    return false;
  }
  const query = fold(filter.query.trim()).replace(/^#/, '');
  if (!query) {
    return true;
  }
  return String(task.number).startsWith(query) || fold(task.title).includes(query);
}
