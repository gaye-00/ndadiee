import { Outlet, ScrollRestoration } from 'react-router-dom';
import MobileNav from './MobileNav';
import Navbar from './Navbar';
import RightPanel from './RightPanel';
import Sidebar from './Sidebar';

/** Coquille des pages de l'application : barre du haut, navigation à gauche, panneau à droite. */
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <ScrollRestoration />
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-8 px-4">
        <Sidebar />
        {/* pb-24 sur mobile : le contenu ne doit pas passer sous la barre de navigation du bas */}
        <main className="min-w-0 flex-1 py-6 pb-24 md:pb-10">
          <Outlet />
        </main>
        <RightPanel />
      </div>
      <MobileNav />
    </div>
  );
}
