import KanbanBoard from '@/components/workspace/KanbanBoard';
import KanbanColumnSwitcher from '@/components/workspace/KanbanColumnSwitcher';

/** Espace d'équipe, onglet Tableau : le kanban du sprint. Design 3E, et 3G sur mobile. */
export default function WorkspaceBoardPage() {
  return (
    <>
      <KanbanColumnSwitcher />
      <KanbanBoard />
    </>
  );
}
