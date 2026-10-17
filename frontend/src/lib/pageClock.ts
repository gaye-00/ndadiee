/**
 * Horloge de la page : les animations CSS d'un élément et de ses enfants partent de l'ouverture de la page
 * (instant 0), et non de leur apparition. Deux loaders battent alors en mesure, et celui qui en remplace un
 * autre (index.html, puis React) reprend la vague là où elle en était, sans à-coup. Un délai en CSS
 * (« après 0,3 s ») compte lui aussi depuis l'ouverture de la page. En ref : <div ref={alignWithPageClock}>.
 * Même règle dans le script de index.html.
 */
export function alignWithPageClock(node: Element | null): void {
  for (const animation of node?.getAnimations({ subtree: true }) ?? []) {
    // Les animations de Motion, elles, gardent leur propre départ
    if (animation instanceof CSSAnimation) {
      animation.startTime = 0;
    }
  }
}
