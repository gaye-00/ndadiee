import { Outlet } from 'react-router-dom';
import AdminConsole from '@/components/admin/AdminConsole';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { ADMIN_SECTIONS } from '@/config/navigation';
import { usePrefetchWhenIdle } from '@/hooks/usePrefetchWhenIdle';

/**
 * Coquille du back-office, distincte de celle des membres : une console toujours sombre à gauche (les sections,
 * des raccourcis vers le site, le compte), le travail à droite, dans le thème choisi.
 *
 * Sur téléphone et tablette, la console laisse la place à une barre en haut, avec les sections en pastilles.
 */
export default function AdminLayout() {
  usePrefetchWhenIdle(ADMIN_SECTIONS);

  return (
    <div className="relative min-h-dvh lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      <AdminConsole />
      <div className="flex min-w-0 flex-col">
        <AdminTopbar />
        {/* tabIndex -1 : le lien d'évitement y pose le focus */}
        <main id="main" tabIndex={-1} className="relative isolate flex-1 overflow-x-clip outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
