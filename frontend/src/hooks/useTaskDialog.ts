import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { TASK_STATUSES, type TaskStatus } from '@/types/workspace.types';

const TASK = 'task';
const COLUMN = 'column';
const NEW = 'new';

/** Ce que l'adresse demande : une tâche à lire (« ?task=38 »), une tâche à créer (« ?task=new&column=IN_REVIEW »). */
export type TaskDialogTarget = { mode: 'edit'; number: number } | { mode: 'create'; status: TaskStatus } | null;

function parse(params: URLSearchParams): TaskDialogTarget {
  const task = params.get(TASK);
  if (task === NEW) {
    const column = params.get(COLUMN) as TaskStatus | null;
    return { mode: 'create', status: column && TASK_STATUSES.includes(column) ? column : 'TODO' };
  }
  const number = Number(task);
  return task && Number.isInteger(number) && number > 0 ? { mode: 'edit', number } : null;
}

/**
 * La fiche d'une tâche, ouverte par l'adresse : « ?task=38 » se partage dans la discussion, et Précédent la ferme.
 * Ouverte depuis l'espace, la fermer revient en arrière ; ouverte par un lien, elle retire seulement le paramètre.
 */
export function useTaskDialog() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const target = parse(params);

  const openWith = useCallback(
    (changes: Record<string, string>) => {
      const next = new URLSearchParams(params);
      next.delete(COLUMN);
      Object.entries(changes).forEach(([key, value]) => next.set(key, value));
      // Une fiche déjà ouverte est remplacée : Précédent ne repasse pas par elle
      const opened = (location.state as { taskDialog?: boolean } | null)?.taskDialog === true;
      void navigate({ search: `?${next.toString()}` }, { replace: opened && target !== null, state: { taskDialog: true }, preventScrollReset: true });
    },
    [location.state, navigate, params, target],
  );

  const open = useCallback((number: number) => openWith({ [TASK]: String(number) }), [openWith]);
  const create = useCallback((status: TaskStatus = 'TODO') => openWith({ [TASK]: NEW, [COLUMN]: status }), [openWith]);

  const close = useCallback(() => {
    if ((location.state as { taskDialog?: boolean } | null)?.taskDialog) {
      void navigate(-1);
      return;
    }
    const next = new URLSearchParams(params);
    next.delete(TASK);
    next.delete(COLUMN);
    setParams(next, { replace: true, preventScrollReset: true });
  }, [location.state, navigate, params, setParams]);

  return { target, open, create, close };
}
