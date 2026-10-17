import { lazy, Suspense, type ComponentType } from 'react';
import { Outlet } from 'react-router-dom';
import Footer from './Footer';
import PublicNavbar from './PublicNavbar';
import ScrollToTop from './ScrollToTop';
import { PUBLIC_NAV } from '@/config/navigation';
import { usePrefetchWhenIdle } from '@/hooks/usePrefetchWhenIdle';

// Corde du thème : sa bibliothèque arrive après le premier affichage, pendant qu'elle tombe du plafond.
// Si son téléchargement échoue, la page s'en passe.
const ThemePullCord = lazy<ComponentType>(() => import('./ThemePullCord').catch(() => ({ default: () => null })));

/**
 * Coquille du visiteur : barre de navigation flottante, corde du thème, contenu, pied de page, et le
 * bouton pour remonter. Design 3A.
 */
export default function PublicLayout() {
  usePrefetchWhenIdle(PUBLIC_NAV);

  return (
    <>
      <PublicNavbar />
      <Suspense fallback={null}>
        <ThemePullCord />
      </Suspense>
      {/* tabIndex -1 : le lien d'évitement et « remonter » y posent le focus */}
      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
