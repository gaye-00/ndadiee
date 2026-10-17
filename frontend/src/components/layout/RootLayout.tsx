import { Outlet, ScrollRestoration } from 'react-router-dom';
import SkipLink from './SkipLink';
import NavigationProgress from '@/components/feedback/NavigationProgress';
import CommandPalette from '@/components/search/CommandPalette';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * Racine de toutes les pages : titre de l'onglet, position de défilement restaurée à chaque
 * navigation, barre de progression et palette de recherche (Ctrl K) disponibles partout.
 */
export default function RootLayout() {
  useDocumentTitle();

  return (
    <>
      <SkipLink />
      <NavigationProgress />
      <Outlet />
      <CommandPalette />
      <ScrollRestoration />
    </>
  );
}
