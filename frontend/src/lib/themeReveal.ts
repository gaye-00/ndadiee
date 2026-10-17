import { useThemeStore, type ResolvedTheme } from '@/store/useThemeStore';

/**
 * Change de thème en ouvrant la nouvelle palette en cercle depuis un point de l'écran, comme la
 * lumière d'une lampe qu'on allume (corde du thème : components/layout/ThemePullCord.tsx).
 *
 * API View Transitions. Sans elle, ou quand les animations sont coupées, le thème change d'un coup.
 *
 * @param from centre du cercle, en pixels depuis le coin haut gauche de l'écran
 */
export function revealTheme(theme: ResolvedTheme, from: { x: number; y: number }, animate: boolean): void {
  const { setTheme } = useThemeStore.getState();

  if (!animate || typeof document.startViewTransition !== 'function') {
    setTheme(theme);
    return;
  }

  const root = document.documentElement;
  // Toute la page dans une seule image, barres de navigation comprises (voir styles/effects.css)
  root.setAttribute('data-theme-reveal', '');
  const transition = document.startViewTransition(() => setTheme(theme));

  // Rayon final : jusqu'au coin de l'écran le plus éloigné du point de départ
  const radius = Math.hypot(
    Math.max(from.x, window.innerWidth - from.x),
    Math.max(from.y, window.innerHeight - from.y),
  );
  const at = `at ${from.x}px ${from.y}px`;

  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px ${at})`, `circle(${radius}px ${at})`] },
        { duration: 650, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    // Transition sautée (une autre a commencé) : le thème a quand même changé
    .catch(() => undefined);

  const cleanUp = () => root.removeAttribute('data-theme-reveal');
  transition.finished.then(cleanUp, cleanUp);
}
