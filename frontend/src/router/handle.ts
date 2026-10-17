import type { PageName } from './pages';

/** Données attachées à une route (`handle`), lues avec useMatches(). */
export interface RouteHandle {
  /** Page affichée, qui donne le titre de l'onglet (voir hooks/useDocumentTitle.ts) */
  page: PageName;
}
