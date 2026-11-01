import { useState } from 'react';
import KanbanBoard from '@/components/workspace/KanbanBoard';
import KanbanColumnSwitcher from '@/components/workspace/KanbanColumnSwitcher';
import type { TaskStatus } from '@/types/workspace.types';

/**
 * Espace d'équipe, onglet Tableau : le kanban du sprint. Design 3E, et 3G sur téléphone, où une colonne se montre à
 * la fois : le sélecteur et le balayage du tableau changent la même colonne.
 */
export default function WorkspaceBoardPage() {
  const [column, setColumn] = useState<TaskStatus>('TODO');
  return (
    <>
      <KanbanColumnSwitcher value={column} onChange={setColumn} />
      <KanbanBoard mobileColumn={column} onMobileColumnChange={setColumn} />
    </>
  );
}
