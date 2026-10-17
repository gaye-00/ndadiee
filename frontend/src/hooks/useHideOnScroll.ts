import { useMotionValueEvent, useScroll } from 'motion/react';
import { useCallback, useRef, useState } from 'react';

/** Distance à parcourir dans un même sens avant de ranger ou de ressortir la barre (px) */
const TRAVEL = 12;

/**
 * Barre qui se range quand on descend dans la page et revient dès qu'on remonte, ou en bas de la
 * page : plus de place pour lire sur un petit écran.
 *
 * - `hidden` : la barre est rangée ;
 * - `scrolled` : la page n'est plus tout en haut, la barre passe au-dessus du contenu ;
 * - `reveal()` : fait revenir la barre, par exemple quand le focus du clavier y entre.
 *
 * @param offset hauteur de page en dessous de laquelle la barre reste toujours visible (px)
 */
export function useHideOnScroll(offset = 240) {
  const { scrollY } = useScroll();
  const [state, setState] = useState(() => ({ hidden: false, scrolled: window.scrollY > 8 }));
  const travel = useRef(0);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const delta = y - (scrollY.getPrevious() ?? y);
    // Changement de sens : on recommence à compter
    if (delta * travel.current < 0) {
      travel.current = 0;
    }
    travel.current += delta;

    const atBottom = y + window.innerHeight >= document.documentElement.scrollHeight - 2;

    setState((previous) => {
      let hidden = previous.hidden;
      if (y < offset || atBottom) {
        hidden = false;
      } else if (travel.current > TRAVEL) {
        hidden = true;
      } else if (travel.current < -TRAVEL) {
        hidden = false;
      }
      const scrolled = y > 8;
      // Même état : pas de nouveau rendu à chaque image du défilement
      return hidden === previous.hidden && scrolled === previous.scrolled ? previous : { hidden, scrolled };
    });
  });

  const reveal = useCallback(() => {
    setState((previous) => (previous.hidden ? { ...previous, hidden: false } : previous));
  }, []);

  return { ...state, reveal };
}
