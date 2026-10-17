// Le métier des pages de connexion et d'inscription : une étoffe kente tissée rangée après rangée, du bas
// vers le haut. Au-dessus de la ligne de tissage, la chaîne attend, tendue. Le canvas ne redessine que les
// rangées qui changent : tisser coûte une rangée par image, pas tout le panneau.

// Une case de l'étoffe : 5 px de large, 8 de haut
const CELL_W = 5;
const CELL_H = 8;
// Bandes de l'étoffe : rayures de chaîne et blocs de trame alternent, comme sur un kente
const BAND = 14;
// Un bloc de trame fait 12 fils de large
const BLOCK = 12;

type Thread = 'gold' | 'coral' | 'jade' | 'night';
type Rgb = readonly [number, number, number];

// La chaîne, fil après fil : or dominant, coupé de vert, de rouge et de fils sombres (période de 48 fils)
const WARP: readonly Thread[] = [
  ...repeat('gold', 6), 'night', ...repeat('jade', 3), 'gold', ...repeat('coral', 2), ...repeat('gold', 5), 'night',
  ...repeat('coral', 3), 'gold', ...repeat('jade', 4), ...repeat('gold', 7), 'night', ...repeat('coral', 2),
  ...repeat('gold', 3), ...repeat('jade', 2), ...repeat('gold', 6),
];

// Les blocs de trame : fond et motif, une paire par bloc
const BLOCKS: readonly (readonly [Thread, Thread])[] = [
  ['gold', 'night'],
  ['coral', 'gold'],
  ['jade', 'night'],
  ['gold', 'coral'],
  ['night', 'gold'],
  ['coral', 'jade'],
];

// Motifs des blocs, 12 × 14 : « # » couleur du motif, « . » fond. Losange, chevrons, damier.
const MOTIFS: readonly (readonly string[])[] = [
  ['............', '.....##.....', '....####....', '...##..##...', '..##....##..', '.##..##..##.', '##..####..##',
    '##..####..##', '.##..##..##.', '..##....##..', '...##..##...', '....####....', '.....##.....', '............'],
  ['##........##', '.##......##.', '..##....##..', '...##..##...', '....####....', '.....##.....', '............',
    '##........##', '.##......##.', '..##....##..', '...##..##...', '....####....', '.....##.....', '............'],
  ['###...###...', '###...###...', '###...###...', '...###...###', '...###...###', '...###...###', '###...###...',
    '###...###...', '###...###...', '...###...###', '...###...###', '...###...###', '............', '............'],
];

function repeat(thread: Thread, count: number): Thread[] {
  return Array.from({ length: count }, () => thread);
}

/** Bruit déterministe dans [0, 1[ : la même étoffe à chaque visite. */
function noise(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Couleur d'une variable CSS de tokens.css, résolue par le navigateur. */
function readColor(probe: HTMLElement, variable: string): Rgb {
  probe.style.color = `var(${variable})`;
  const match = getComputedStyle(probe).color.match(/[\d.]+/g) ?? ['0', '0', '0'];
  return [Number(match[0]), Number(match[1]), Number(match[2])];
}

const css = ([r, g, b]: Rgb, light = 0, toward: Rgb = [255, 255, 255]) =>
  `rgb(${r + (toward[0] - r) * light} ${g + (toward[1] - g) * light} ${b + (toward[2] - b) * light})`;

export interface Loom {
  /** Rangées tissées en tout, à la taille actuelle du panneau */
  readonly capacity: number;
  /** Tisse (ou détisse) jusqu'à cette rangée, en partant du bas */
  weaveTo(rows: number): void;
  /** Nouvelle taille du panneau : la chaîne est retendue, l'étoffe retissée jusqu'où elle en était */
  resize(width: number, height: number): void;
}

/**
 * Prépare le métier sur un canvas. Les couleurs viennent des variables de la marque (--kente-gold…), lues
 * une fois : le panneau du métier garde la nuit dans les deux thèmes.
 */
export function createLoom(canvas: HTMLCanvasElement): Loom {
  const ctx = canvas.getContext('2d');
  const probe = document.createElement('span');
  probe.style.display = 'none';
  canvas.parentElement?.append(probe);
  const colors: Record<Thread, Rgb> = {
    gold: readColor(probe, '--kente-gold'),
    coral: readColor(probe, '--kente-coral'),
    jade: readColor(probe, '--kente-jade'),
    night: readColor(probe, '--kente-night'),
  };
  const paper = readColor(probe, '--kente-paper');
  probe.remove();

  let width = 0;
  let height = 0;
  let columns = 0;
  let capacity = 0;
  let woven = 0;

  // Haut de la rangée `row` (0 = la plus basse)
  const rowTop = (row: number) => height - (row + 1) * CELL_H;

  /** La chaîne seule, tendue, sur une bande de rangées : des fils fins, un peu éteints. */
  function warp(fromRow: number, toRow: number) {
    if (!ctx) {
      return;
    }
    const top = Math.max(0, rowTop(toRow - 1));
    const bottom = Math.min(height, rowTop(fromRow) + CELL_H);
    ctx.clearRect(0, top, width, bottom - top);
    for (let column = 0; column < columns; column++) {
      const thread = WARP[column % WARP.length];
      ctx.fillStyle = css(colors[thread === 'night' ? 'gold' : thread], 0);
      ctx.globalAlpha = thread === 'night' ? 0.08 : 0.16 + noise(column, 7) * 0.08;
      ctx.fillRect(column * CELL_W + CELL_W / 2 - 0.6, top, 1.2, bottom - top);
    }
    ctx.globalAlpha = 1;
  }

  /** Une rangée d'étoffe : flottés de chaîne (rayures) ou de trame (blocs à motif), selon la bande. */
  function row(index: number) {
    if (!ctx) {
      return;
    }
    const top = rowTop(index);
    const band = Math.floor(index / BAND);
    const inBand = index % BAND;
    const weftBand = band % 2 === 1;
    ctx.clearRect(0, top, width, CELL_H);
    ctx.fillStyle = css(colors.night, 0.06);
    ctx.fillRect(0, top, width, CELL_H);

    for (let column = 0; column < columns; column++) {
      const x = column * CELL_W;
      const shade = (noise(column, index) - 0.5) * 0.12;
      if (weftBand) {
        // Bloc de trame : le fil court à l'horizontale, d'une case à l'autre
        const block = Math.floor(column / BLOCK);
        const [ground, figure] = BLOCKS[(block + band) % BLOCKS.length];
        const motif = MOTIFS[(block + Math.floor(band / 2)) % MOTIFS.length];
        const thread = motif[inBand]?.[column % BLOCK] === '#' ? figure : ground;
        ctx.fillStyle = css(colors[thread], thread === 'night' ? 0.08 : Math.max(0, shade));
        ctx.fillRect(x, top + 1.2, CELL_W, CELL_H - 2.4);
        // La lumière glisse sur le fil
        ctx.fillStyle = css(colors[thread], thread === 'night' ? 0.2 : 0.38, paper);
        ctx.fillRect(x, top + CELL_H / 2 - 0.9, CELL_W, 0.9);
      } else {
        // Rayures de chaîne : le fil monte à la verticale ; la trame passe une case sur deux
        const thread = WARP[column % WARP.length];
        const over = (column + index) % 2 === 0;
        ctx.fillStyle = css(colors[thread], thread === 'night' ? 0.06 : Math.max(0, shade));
        ctx.fillRect(x + 0.6, top, CELL_W - 1.2, CELL_H);
        // Là où la trame passe dessus, une ombre fine coupe le fil
        if (over) {
          ctx.fillStyle = css(colors.night);
          ctx.globalAlpha = 0.28;
          ctx.fillRect(x + 0.6, top + CELL_H - 1.4, CELL_W - 1.2, 1.4);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = css(colors[thread], thread === 'night' ? 0.18 : 0.42, paper);
        ctx.fillRect(x + CELL_W / 2 - 0.45, top, 0.9, CELL_H);
      }
    }
  }

  function weaveTo(rows: number) {
    const target = Math.max(0, Math.min(capacity, Math.round(rows)));
    if (target > woven) {
      for (let index = woven; index < target; index++) {
        row(index);
      }
    } else if (target < woven) {
      warp(target, woven);
    }
    woven = target;
  }

  function resize(nextWidth: number, nextHeight: number) {
    if (!ctx || nextWidth <= 0 || nextHeight <= 0) {
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = nextWidth;
    height = nextHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    columns = Math.ceil(width / CELL_W);
    const before = capacity > 0 ? woven / capacity : 0;
    capacity = Math.ceil(height / CELL_H);
    woven = 0;
    warp(0, capacity);
    weaveTo(before * capacity);
  }

  return {
    get capacity() {
      return capacity;
    },
    weaveTo,
    resize,
  };
}
