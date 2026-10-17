import { Outlet } from 'react-router-dom';
import TeamChatPanel from '@/components/workspace/TeamChatPanel';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import WorkspaceTabs from '@/components/workspace/WorkspaceTabs';

/** Espace d'équipe d'un projet : en-tête, onglets, contenu de l'onglet et discussion d'équipe. Design 3E. */
export default function WorkspaceLayout() {
  return (
    <>
      <WorkspaceHeader />
      <WorkspaceTabs />
      <Outlet />
      <TeamChatPanel />
    </>
  );
}
