import { Outlet } from 'react-router-dom';
import MobileTabBar from './MobileTabBar';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { ADMIN_APP_NAV, APP_NAV } from '@/config/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePrefetchWhenIdle } from '@/hooks/usePrefetchWhenIdle';

/**
 * Coquille de l'application connectée. Design 3B, 3C, 3E, 3G.
 *
 * - Tablette et ordinateur : le rail des sections à gauche (à droite en arabe), la barre du haut au-dessus
 *   du contenu.
 * - Téléphone : la barre du haut seule, et les onglets en bas de l'écran, à portée de pouce.
 */
export default function AppLayout() {
  const { isAdmin } = useAuth();
  usePrefetchWhenIdle(isAdmin ? ADMIN_APP_NAV : APP_NAV);

  return (
    <div className="relative min-h-dvh md:grid md:grid-cols-[5.5rem_minmax(0,1fr)]">
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <Topbar />
        {/* tabIndex -1 : le lien d'évitement y pose le focus */}
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          <Outlet />
        </main>
        {/* Place réservée sous le contenu : les onglets du téléphone ne le cachent jamais */}
        <div aria-hidden className="h-[calc(6.5rem+env(safe-area-inset-bottom))] md:hidden" />
      </div>
      <MobileTabBar />
    </div>
  );
}
