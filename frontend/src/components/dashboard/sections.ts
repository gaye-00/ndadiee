/** Ancres des sections de l'atelier : le résumé du jour, les cartes et le fil y mènent */
export const DASHBOARD_ANCHORS = {
  reviews: 'atelier-revues',
  projects: 'atelier-projets',
} as const;

/**
 * Descend à une section de l'atelier, sous la barre du haut (scroll-margin de la section), et y pose le focus : le
 * clavier et les lecteurs d'écran repartent de là.
 *
 * @returns false si la section n'est pas dans la page
 */
export function revealSection(id: string, reducedMotion: boolean): boolean {
  const section = document.getElementById(id);
  if (!section) {
    return false;
  }
  section.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  section.focus({ preventScroll: true });
  return true;
}
