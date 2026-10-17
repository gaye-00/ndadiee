import { Outlet } from 'react-router-dom';
import MobileTabBar from './MobileTabBar';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { APP_NAV } from '@/config/navigation';
import { usePrefetchWhenIdle } from '@/hooks/usePrefetchWhenIdle';

/**
 * Coquille de l'application connectée : rail à gauche (ordinateur), barre du haut, contenu,
 * barre d'onglets en bas (mobile). Design 3B, 3C, 3E, 3G.
 */
export default function AppLayout() {
  usePrefetchWhenIdle(APP_NAV);

  return (
    <>
      <Sidebar />
      <Topbar />
      <main id="main">
        <Outlet />
      </main>
      <MobileTabBar />
    </>
  );
}
