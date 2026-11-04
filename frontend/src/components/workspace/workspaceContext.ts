import { createContext, useContext } from 'react';
import type { Workspace } from '@/types/workspace.types';

export interface WorkspaceContextValue {
  slug: string;
  workspace: Workspace;
}

/** L'espace d'équipe ouvert : posé par WorkspaceLayout une fois chargé, lu par l'en-tête, le tableau et la discussion. */
export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/** L'espace d'équipe ouvert. Seulement sous WorkspaceLayout, qui ne rend ses enfants qu'une fois l'espace chargé. */
export function useWorkspaceContext(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error('useWorkspaceContext : en dehors de WorkspaceLayout');
  }
  return value;
}
