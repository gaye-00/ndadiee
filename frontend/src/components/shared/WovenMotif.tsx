import { memo, type CSSProperties } from 'react';
import type { KenteThread } from '@/config/roles';
import { cn } from '@/lib/utils';

// Une case du motif : 10 unités. Le fil en occupe 7,6 ; l'écart laisse voir la chaîne entre deux passes.
const CELL = 10;
const THREAD = 7.6;

type Float = { column: number; top: number; length: number; thread: KenteThread | 'ink' };

/**
 * Découpe le motif en flottés : sur une bande posée à l'horizontale, la trame va de haut en bas.
 * Chaque colonne est une passe de la navette ; les cases voisines d'une même couleur forment un seul
 * fil qui flotte par-dessus la chaîne.
 */
function floatsOf(motif: readonly string[], colors: readonly [KenteThread, KenteThread]): Float[] {
  const threads: Record<string, Float['thread']> = { '#': colors[0], '+': colors[1], o: 'ink' };
  const floats: Float[] = [];
  const width = motif[0]?.length ?? 0;

  for (let column = 0; column < width; column++) {
    let row = 0;
    while (row < motif.length) {
      const mark = motif[row][column];
      const thread = threads[mark];
      if (!thread) {
        row++;
        continue;
      }
      const top = row;
      while (row < motif.length && motif[row][column] === mark) {
        row++;
      }
      floats.push({ column, top, length: row - top, thread });
    }
  }
  return floats;
}

interface WovenMotifProps {
  motif: readonly string[];
  colors: readonly [KenteThread, KenteThread];
  /** Hauteur du cadre, en rangées : les motifs plus courts y sont centrés, avec des fils de même épaisseur */
  rows?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Motif tissé d'un rôle (config/roles.ts), dessiné fil par fil en SVG. Les dégradés des fils sont
 * définis une fois par page : <WovenThreads />. Décoratif.
 *
 * Les fils peuvent se tisser à l'apparition, passe après passe : `data-weave="in"` sur un parent et
 * `data-weave-in` sur le bloc du motif (styles/effects.css, « Motifs tissés »).
 */
const WovenMotif = memo(function WovenMotif({ motif, colors, rows = 15, className, style }: WovenMotifProps) {
  const width = (motif[0]?.length ?? 0) * CELL;
  const height = Math.max(rows, motif.length) * CELL;
  const offset = ((Math.max(rows, motif.length) - motif.length) * CELL) / 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      focusable="false"
      className={cn('woven-motif shrink-0 overflow-visible', className)}
      style={{ '--passes': motif[0]?.length ?? 0, ...style } as CSSProperties}
    >
      {floatsOf(motif, colors).map(({ column, top, length, thread }) => (
        <rect
          key={`${column}-${top}`}
          x={column * CELL + (CELL - THREAD) / 2}
          y={offset + top * CELL + 0.7}
          width={THREAD}
          height={length * CELL - 1.4}
          rx={THREAD / 2}
          fill={`url(#woven-${thread})`}
          style={{ '--pass': column } as CSSProperties}
        />
      ))}
    </svg>
  );
});

export default WovenMotif;

const SHADES: Record<KenteThread | 'ink', string> = {
  gold: 'var(--gold)',
  coral: 'var(--coral)',
  jade: 'var(--jade)',
  ink: 'var(--foreground)',
};

/**
 * Dégradés des fils, à poser une fois dans la page qui affiche des motifs : un fil est rond, son bord
 * passe dans l'ombre, la lumière glisse sur son milieu comme sur la soie d'un kente.
 */
export function WovenThreads() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        {Object.entries(SHADES).map(([thread, color]) => (
          <linearGradient key={thread} id={`woven-${thread}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" style={{ stopColor: `color-mix(in srgb, ${color} 58%, var(--kente-night))` }} />
            <stop offset="0.38" style={{ stopColor: color }} />
            <stop offset="0.55" style={{ stopColor: `color-mix(in srgb, ${color} 72%, var(--kente-paper))` }} />
            <stop offset="1" style={{ stopColor: `color-mix(in srgb, ${color} 66%, var(--kente-night))` }} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}
