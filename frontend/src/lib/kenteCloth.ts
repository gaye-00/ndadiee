import type { KenteThread } from '@/config/roles';

// Largeurs des bandes, en parts : des bandes larges coupées de bandes fines, comme sur la maquette
// (3, 1, 2, 1, 3, 1)
const WIDTHS = [3, 1, 2, 1, 3, 1, 2, 4] as const;
const THREADS: readonly KenteThread[] = ['gold', 'coral', 'jade'];
// Parts tissées en tout : assez de bandes pour que l'étoffe se lise, pas assez pour qu'elle grésille
const CLOTH_LENGTH = 30;

export interface ClothBand {
  thread: KenteThread;
  /** Début et fin de la bande, en % de la largeur de l'étoffe */
  from: number;
  to: number;
}

/**
 * Les bandes d'une étoffe kente, toujours les mêmes pour un même nom (le slug d'un hackathon, le pseudo d'un
 * membre) : comme un kente a son motif. Deux bandes voisines n'ont jamais la même couleur.
 */
export function clothOf(name: string): ClothBand[] {
  let seed = [...name].reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0, 7);
  const random = () => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    return seed / 2 ** 32;
  };

  const bands: { thread: KenteThread; width: number }[] = [];
  let length = 0;
  let previous = -1;
  while (length < CLOTH_LENGTH) {
    let thread = Math.floor(random() * THREADS.length);
    if (thread === previous) {
      thread = (thread + 1) % THREADS.length;
    }
    const width = WIDTHS[Math.floor(random() * WIDTHS.length)];
    bands.push({ thread: THREADS[thread], width });
    length += width;
    previous = thread;
  }

  let from = 0;
  return bands.map(({ thread, width }) => {
    const band = { thread, from, to: from + (width / length) * 100 };
    from = band.to;
    return band;
  });
}

/**
 * L'étoffe en un dégradé à arrêts francs : une seule image de fond, rien à dessiner de plus. Couleurs des formes
 * pleines (--*-graphic) : vives sur la nuit, assez foncées sur le papier.
 */
export function clothGradient(name: string): string {
  const stops = clothOf(name).map(({ thread, from, to }) => `var(--${thread}-graphic) ${from.toFixed(2)}% ${to.toFixed(2)}%`);
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
