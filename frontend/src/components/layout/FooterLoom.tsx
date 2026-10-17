import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react';
import { site } from '@/config/site';
import { cn } from '@/lib/utils';

// Une case de l'étoffe : un fil de trame (flotté) de 2,5 px sur 6,5, et l'écart qui laisse voir la chaîne
const CELL_W = 4;
const CELL_H = 9;
// Le motif se répète tous les 90 fils : la bande défile d'autant puis recommence, sans raccord visible
const PERIOD = 90;

// Rayures de la chaîne, fil après fil, sur une période : or dominant, coupé de vert, de rouge et de fils
// sombres, comme sur un kente
const STRIPES: readonly Thread[] = [
  ...repeat('gold', 9), 'ink', ...repeat('jade', 3), 'gold', ...repeat('coral', 2), ...repeat('gold', 6),
  ...repeat('jade', 1), ...repeat('gold', 4), 'ink', ...repeat('coral', 4), 'gold', ...repeat('jade', 5),
  ...repeat('gold', 8), 'coral', ...repeat('gold', 3), ...repeat('jade', 2), 'ink', ...repeat('gold', 7),
  ...repeat('coral', 3), ...repeat('gold', 5), 'jade', ...repeat('gold', 4),
];

type Thread = 'gold' | 'coral' | 'jade' | 'ink';

function repeat(thread: Thread, count: number): Thread[] {
  return Array.from({ length: count }, () => thread);
}

/** Bruit déterministe dans [0, 1[ : la même étoffe à chaque affichage. */
function noise(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smoothstep(from: number, to: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

type Rgb = [number, number, number];

/** Couleur d'une variable CSS, résolue par le navigateur (thème clair ou sombre). */
function readColor(probe: HTMLElement, variable: string): Rgb {
  probe.style.color = `var(${variable})`;
  const match = getComputedStyle(probe).color.match(/[\d.]+/g) ?? ['0', '0', '0'];
  return [Number(match[0]), Number(match[1]), Number(match[2])];
}

const mix = ([r, g, b]: Rgb, [r2, g2, b2]: Rgb, amount: number) =>
  `rgb(${r + (r2 - r) * amount} ${g + (g2 - g) * amount} ${b + (b2 - b) * amount})`;

/**
 * Tisse l'étoffe sur le canvas : dense en bas, de plus en plus clairsemée vers le haut, comme une
 * étoffe qui sort du métier. Chaque flotté est arrondi, son bord dans l'ombre, son milieu éclairé.
 */
function weave(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const probe = document.createElement('span');
  probe.style.display = 'none';
  canvas.parentElement?.append(probe);
  const ink = readColor(probe, '--foreground');
  const night = readColor(probe, '--kente-night');
  const paper = readColor(probe, '--kente-paper');
  const base: Record<Thread, Rgb> = {
    gold: readColor(probe, '--gold'),
    coral: readColor(probe, '--coral'),
    jade: readColor(probe, '--jade'),
    ink,
  };
  probe.remove();
  const shades = Object.fromEntries(
    Object.entries(base).map(([thread, rgb]) => [
      thread,
      { edge: mix(rgb, night, 0.35), body: mix(rgb, night, 0), sheen: mix(rgb, paper, 0.35) },
    ]),
  ) as Record<Thread, { edge: string; body: string; sheen: string }>;

  const columns = Math.ceil(width / CELL_W);
  const rows = Math.ceil(height / CELL_H) + 1;
  const threadW = CELL_W - 1.5;
  const floatH = CELL_H - 2.5;

  for (let column = 0; column < columns; column++) {
    const k = column % PERIOD;
    const thread = STRIPES[k % STRIPES.length];
    const shade = shades[thread];
    const x = column * CELL_W + 1;
    // Une colonne sur deux décalée d'une demi-case : les flottés s'entrecroisent
    const shift = column % 2 ? CELL_H / 2 : 0;

    for (let row = 0; row < rows; row++) {
      const y = row * CELL_H + shift - CELL_H / 2;
      const depth = Math.min(1, Math.max(0, (y + floatH / 2) / height));
      // Probabilité qu'un fil soit tissé ici : presque rien en haut, l'étoffe pleine sur les deux tiers du bas
      const density = 0.02 + 0.98 * smoothstep(0.06, 0.6, depth);
      if (noise(k, row * 2 + (column % 2)) >= density) {
        continue;
      }
      ctx.globalAlpha = (thread === 'ink' ? 0.45 : 0.78) + noise(k + 101, row) * 0.22;
      ctx.fillStyle = shade.edge;
      ctx.beginPath();
      ctx.roundRect(x, y, threadW, floatH, threadW / 2);
      ctx.fill();
      ctx.fillStyle = shade.body;
      ctx.fillRect(x + 0.5, y + 1, threadW - 1, floatH - 2);
      ctx.fillStyle = shade.sheen;
      ctx.fillRect(x + 0.9, y + 1.5, 0.6, floatH - 3);
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Bande du pied de page : le nom de la plateforme n'est pas dessiné, c'est un vide dans un kente.
 * Plein là où la trame est dense, il se défait vers le haut, là où les fils se raréfient.
 *
 * L'étoffe est tissée une fois sur un canvas (au premier passage à l'écran, puis si la taille ou le
 * thème changent) ; elle glisse ensuite en CSS, sans être redessinée, comme sortant du métier.
 * Sous la souris, une lampe l'éclaire : les fils proches gardent leur éclat, les autres s'éteignent un peu.
 */
export default function FooterLoom({ className }: { className?: string }) {
  const band = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);

  useEffect(() => {
    const element = band.current;
    const surface = canvas.current;
    if (!element || !surface) {
      return;
    }
    let visible = false;
    let timer = 0;
    let drawn = '';

    const draw = () => {
      // Une période de plus que la bande : elle glisse d'une période puis recommence
      const width = element.clientWidth + PERIOD * CELL_W;
      const height = element.clientHeight;
      const theme = document.documentElement.className;
      const key = `${width}x${height}:${theme}`;
      if (!visible || key === drawn || width === 0) {
        return;
      }
      drawn = key;
      surface.style.width = `${width}px`;
      surface.style.height = `${height}px`;
      weave(surface, width, height);
    };
    const later = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(draw, 120);
    };

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      draw();
    }, { rootMargin: '200px' });
    intersection.observe(element);
    const size = new ResizeObserver(later);
    size.observe(element);
    // Changement de thème : la classe de <html> change, les couleurs des fils aussi
    const theme = new MutationObserver(later);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.clearTimeout(timer);
      intersection.disconnect();
      size.disconnect();
      theme.disconnect();
    };
  }, []);

  // La lampe suit la souris ; au doigt ou au stylet, l'étoffe reste égale
  function light(event: PointerEvent<HTMLDivElement>) {
    const surface = field.current;
    if (event.pointerType !== 'mouse' || !surface) {
      return;
    }
    const box = surface.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      surface.style.setProperty('--lamp-x', `${x}px`);
      surface.style.setProperty('--lamp-y', `${y}px`);
      surface.setAttribute('data-lit', '');
    });
  }

  function dark() {
    cancelAnimationFrame(frame.current);
    field.current?.removeAttribute('data-lit');
  }

  return (
    <div
      ref={band}
      aria-hidden
      onPointerMove={light}
      onPointerLeave={dark}
      className={cn('footer-loom relative h-36 overflow-hidden sm:h-48 lg:h-60', className)}
    >
      <div ref={field} className="footer-loom-field absolute inset-0">
        <canvas
          ref={canvas}
          className="footer-loom-cloth absolute top-0 start-0"
          style={{ '--loom-period': `${PERIOD * CELL_W}px` } as CSSProperties}
        />
      </div>
      <p className="footer-loom-mark pointer-events-none absolute inset-x-0 -bottom-[0.06em] text-center font-display text-[clamp(4.5rem,19vw,13rem)] leading-[0.8] font-extrabold tracking-[-0.05em] text-background select-none">
        {site.name}
      </p>
    </div>
  );
}
