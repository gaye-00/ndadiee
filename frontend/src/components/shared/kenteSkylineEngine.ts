/**
 * Moteur de dessin du tissage kente (KenteSkyline.tsx), en canvas 2D, sans bibliothèque.
 *
 * Une seule scène, vue par une caméra qui bouge :
 * - vue « pagne » : la caméra regarde le tissu d'en haut. Chaque semaine est une bande, chaque jour
 *   un bloc ; comme sur un vrai kente, les blocs alternent fils de chaîne (rayures verticales) et
 *   fils de trame (rayures horizontales), en damier d'une bande à l'autre.
 * - vue « ville » : la caméra s'incline, en perspective, et chaque jour se lève en immeuble, d'autant
 *   plus haut qu'il a été chargé. La nuit (thème sombre), des fenêtres s'allument.
 *
 * Au premier affichage, les bandes se tissent de gauche à droite, puis le pagne bascule en ville.
 * Une nouvelle année (un pseudo GitHub) se retisse de la même façon.
 *
 * Idée du passage de la grille à l'horizon en 3D : « Contribution Skyline » de Kedhareswer Naidu
 * (21st.dev, licence MIT). Ici, caméra en perspective, tissage kente et ville la nuit.
 */
import { monthLabels, type ContributionYear } from '@/lib/contributions';

export type SkylineView = 'cloth' | 'city';

type RGB = [number, number, number];

interface Camera {
  // Position, direction du regard, vecteurs droite et haut de l'écran
  px: number;
  py: number;
  pz: number;
  fx: number;
  fy: number;
  fz: number;
  rx: number;
  ry: number;
  ux: number;
  uy: number;
  uz: number;
}

export interface KenteSkylineOptions {
  /** Animations coupées : réglage du système ou mode économie de données */
  reducedMotion: () => boolean;
  /** Locales Intl de la langue de l'interface (noms des mois et des jours) */
  locales: () => readonly string[];
  /** Jour mis en avant (survol, toucher, clavier) : index dans year.cells, ou -1 */
  onActive: (index: number) => void;
  /** Jour atteint au clavier, à annoncer aux lecteurs d'écran */
  onAnnounce: (index: number) => void;
}

// ── Réglages ──

/** Tissage d'une année, bande par bande */
const WEAVE_MS = 1150;
/** Passage du pagne à la ville */
const MORPH_MS = 1400;
/** Part du passage pendant laquelle un immeuble attend son tour : la vague va des semaines anciennes aux récentes */
const WAVE = 0.42;
/** Largeur minimale d'une bande à l'écran (px) : sur un écran étroit, on montre les dernières semaines */
const MIN_STRIP = 13;
/** Colonne des contenus de la page, que le pagne suit avant de s'élargir en ville (theme.css : container-page) */
const CONTENT_WIDTH = 1248;

const rad = (degrees: number) => (degrees * Math.PI) / 180;
const CITY_ELEVATION = rad(27);
const ELEVATION_MIN = rad(12);
const ELEVATION_MAX = rad(62);
const YAW_MAX = 0.45;
/** Caméra très éloignée : vue du dessus sans perspective */
const FLAT_DISTANCE = 4000;

// ── Petites fonctions ──

const clamp01 = (v: number) => (v > 0 ? (v < 1 ? v : 1) : 0);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOutCubic = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const luminance = (c: RGB) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const rgb = (r: number, g: number, b: number, a = 1) =>
  a >= 1
    ? `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`
    : `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a.toFixed(3)})`;

// Toute couleur CSS (hex, rgb, oklch, color-mix…) → RGB, en la faisant peindre par le navigateur
let probe: CanvasRenderingContext2D | null = null;
function toRGB(color: string, fallback: RGB): RGB {
  probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!probe || !color.trim()) {
    return fallback;
  }
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = 'rgba(0,0,0,0)';
  probe.fillStyle = color.trim();
  probe.fillRect(0, 0, 1, 1);
  const data = probe.getImageData(0, 0, 1, 1).data;
  return data[3] < 8 ? fallback : [data[0], data[1], data[2]];
}

/** Petit nombre stable tiré d'une date : fenêtres allumées et ordre d'allumage */
function hashDate(date: string): number {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) {
    h = Math.imul(h ^ date.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/** Hauteur d'un immeuble (en largeurs de bande) : par paliers de niveau, nuancée par le nombre */
function heightOf(count: number, level: number, max: number): number {
  if (count <= 0) {
    return 0.12;
  }
  return 0.35 + level * 0.85 + Math.pow(count / Math.max(1, max), 0.6) * 3.6;
}

function makeCamera(cx: number, cy: number, elevation: number, yaw: number, distance: number): Camera {
  const ce = Math.cos(elevation);
  const se = Math.sin(elevation);
  const cyaw = Math.cos(yaw);
  const syaw = Math.sin(yaw);
  // Devant le tissu (côté des derniers jours de la semaine), au-dessus, tournée vers son centre
  return {
    px: cx + distance * ce * syaw,
    py: cy + distance * ce * cyaw,
    pz: distance * se,
    fx: -ce * syaw,
    fy: -ce * cyaw,
    fz: -se,
    rx: cyaw,
    ry: -syaw,
    ux: -se * syaw,
    uy: -se * cyaw,
    uz: ce,
  };
}

function pointInQuad(p: Float32Array, o: number, x: number, y: number): boolean {
  let sign = 0;
  for (let k = 0; k < 4; k++) {
    const ax = p[o + k * 2];
    const ay = p[o + k * 2 + 1];
    const bx = p[o + ((k + 1) % 4) * 2];
    const by = p[o + ((k + 1) % 4) * 2 + 1];
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (Math.abs(cross) < 1e-9) {
      continue;
    }
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) {
      sign = s;
    } else if (s !== sign) {
      return false;
    }
  }
  return sign !== 0;
}

function quadPath(ctx: CanvasRenderingContext2D, p: Float32Array, o: number) {
  ctx.moveTo(p[o], p[o + 1]);
  ctx.lineTo(p[o + 2], p[o + 3]);
  ctx.lineTo(p[o + 4], p[o + 5]);
  ctx.lineTo(p[o + 6], p[o + 7]);
  ctx.closePath();
}

// Faces visibles d'un immeuble, en plus du toit
const FACE_FRONT = 1;
const FACE_SIDE = 2;

export class KenteSkylineEngine {
  private readonly ctx: CanvasRenderingContext2D;

  // ── Année affichée ──
  private year: ContributionYear | null = null;
  /** Index, dans year.cells, du premier jour montré (écrans étroits : dernières semaines seulement) */
  private base = 0;
  private n = 0;
  private weeks = 0;
  private wk = new Float32Array(0);
  private dy = new Float32Array(0);
  private lv = new Uint8Array(0);
  private hgt = new Float32Array(0);
  private zs = new Float32Array(0);
  private present = new Float32Array(0);
  private hover = new Float32Array(0);
  private dim = new Float32Array(0);
  private seeds = new Uint32Array(0);
  private keys = new Float32Array(0);
  private polys = new Float32Array(0);
  private faces = new Uint8Array(0);
  private order: number[] = [];
  private months: Array<{ week: number; label: string }> = [];
  private weekdays: Array<{ day: number; label: string }> = [];

  // ── Mise en page ──
  private W = 0;
  private H = 0;
  private dpr = 1;
  private gutter = 0;
  private font = '500 10px monospace';

  // ── Couleurs : vide, niveaux 1 à 4 (RGB × 5), animées vers leur cible ──
  private readonly col = new Float32Array(15);
  private readonly colGoal = new Float32Array(15);
  private colReady = false;
  private fg: RGB = [242, 243, 247];
  private bg: RGB = [7, 8, 13];
  private gold: RGB = [255, 181, 71];
  private accents: RGB[] = [];
  /** 0 le jour, 1 la nuit : les fenêtres s'allument une à une */
  private night = 0;
  private nightGoal = 0;

  // ── Animation ──
  /** 0 → 1 : tissage de l'année, bande par bande (rien n'est dessiné avant qu'il commence) */
  private weave = 0;
  /** La scène est à l'écran, mais on attend encore les données à tisser */
  private held = false;
  private seen = false;
  /** 0 : pagne, 1 : ville (temps linéaire, la caméra l'adoucit) */
  private t = 0;
  private target = 0;
  private wantCity = false;
  private entered = false;
  private yaw = 0;
  private yawGoal = 0;
  private elev = 0;
  private elevGoal = 0;
  private raf = 0;
  private last = 0;

  // ── Interaction ──
  private legendLevel = -1;
  private hovered = -1;
  private pinned = -1;
  private active = -1;
  private tipWidth = 0;
  private drag: {
    id: number;
    x: number;
    y: number;
    yaw: number;
    elev: number;
    moved: boolean;
    orbit: boolean;
    mouse: boolean;
  } | null = null;

  private readonly observers: Array<{ disconnect: () => void }> = [];
  private readonly stage: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly tip: HTMLElement;
  private readonly options: KenteSkylineOptions;

  constructor(stage: HTMLElement, canvas: HTMLCanvasElement, tip: HTMLElement, options: KenteSkylineOptions) {
    this.stage = stage;
    this.canvas = canvas;
    this.tip = tip;
    this.options = options;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D indisponible');
    }
    this.ctx = ctx;

    const resize = new ResizeObserver(() => {
      if (Math.round(this.stage.clientWidth) !== this.W) {
        this.relayout();
      }
    });
    resize.observe(stage);
    this.observers.push(resize);

    // Thème changé (classe dark sur <html>) : les couleurs se fondent, les fenêtres s'allument ou s'éteignent
    const theme = new MutationObserver(() => this.retheme());
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    this.observers.push(theme);

    // Le tissage commence quand la scène arrive à l'écran
    const visible = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          visible.disconnect();
          this.seen = true;
          this.enter();
        }
      },
      { threshold: 0.25 },
    );
    visible.observe(stage);
    this.observers.push(visible);

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onCancel);
    canvas.addEventListener('pointerleave', this.onLeave);
    canvas.addEventListener('dblclick', this.onDoubleClick);
    canvas.addEventListener('keydown', this.onKey);
    canvas.addEventListener('blur', this.onBlur);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.observers.forEach((observer) => observer.disconnect());
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onCancel);
    this.canvas.removeEventListener('pointerleave', this.onLeave);
    this.canvas.removeEventListener('dblclick', this.onDoubleClick);
    this.canvas.removeEventListener('keydown', this.onKey);
    this.canvas.removeEventListener('blur', this.onBlur);
  }

  // ── API ──

  /** Nouvelle année. `reweave` : elle se tisse bande par bande (en ville, les immeubles poussent). */
  setYear(year: ContributionYear, reweave: boolean): void {
    this.year = year;
    this.hovered = -1;
    this.pinned = -1;
    this.refreshActive();
    this.load();
    this.retheme();
    this.relayout();
    if (reweave && this.entered && !this.options.reducedMotion()) {
      this.weave = 0;
    }
    this.kick();
  }

  setView(view: SkylineView): void {
    this.wantCity = view === 'city';
    this.applyTarget();
  }

  /** Niveau mis en avant depuis la légende (les autres jours s'estompent), -1 pour aucun */
  setLegendLevel(level: number): void {
    this.legendLevel = level;
    this.kick();
  }

  /** En attente des données à tisser (pseudo GitHub retrouvé) : le tissage ne commence pas encore */
  setHeld(held: boolean): void {
    this.held = held;
    if (!held && this.seen) {
      this.enter();
    }
  }

  /** Largeur de l'infobulle, pour la garder dans la scène */
  setTipWidth(width: number): void {
    this.tipWidth = width;
    this.draw();
  }

  /** Langue changée : noms des mois et des jours */
  relabel(): void {
    this.labels();
    this.measureGutter();
    this.relayout();
  }

  // ── Données ──

  private load(): void {
    const year = this.year;
    if (!year) {
      return;
    }
    const width = Math.max(this.stage.clientWidth, 1);
    const fitting = Math.floor((Math.min(width, CONTENT_WIDTH) - 32) / MIN_STRIP);
    const shown = Math.max(16, Math.min(year.weeks, fitting));
    this.weeks = shown;
    this.base = (year.weeks - shown) * 7;
    const n = year.cells.length - this.base;
    this.n = n;

    if (this.wk.length !== n) {
      this.wk = new Float32Array(n);
      this.dy = new Float32Array(n);
      this.lv = new Uint8Array(n);
      this.hgt = new Float32Array(n);
      this.zs = new Float32Array(n);
      this.present = new Float32Array(n).fill(1);
      this.hover = new Float32Array(n);
      this.dim = new Float32Array(n);
      this.seeds = new Uint32Array(n);
      this.keys = new Float32Array(n);
      this.polys = new Float32Array(n * 24);
      this.faces = new Uint8Array(n);
      this.order = Array.from({ length: n }, (_, i) => i);
    }
    for (let i = 0; i < n; i++) {
      const cell = year.cells[this.base + i];
      this.wk[i] = cell.week - this.base / 7;
      this.dy[i] = cell.day;
      this.lv[i] = cell.level;
      this.hgt[i] = heightOf(cell.count, cell.level, year.max);
      this.seeds[i] = hashDate(cell.date);
    }
    this.labels();
  }

  private labels(): void {
    const year = this.year;
    if (!year) {
      return;
    }
    const cells = year.cells.slice(this.base);
    this.months = monthLabels(cells, this.weeks, this.options.locales());
    const format = new Intl.DateTimeFormat(this.options.locales() as string[], { weekday: 'short', timeZone: 'UTC' });
    this.weekdays = [1, 3, 5]
      .filter((day) => day < cells.length)
      .map((day) => ({ day, label: format.format(new Date(cells[day].date + 'T00:00:00Z')) }));
  }

  // ── Couleurs ──

  retheme(): void {
    const style = getComputedStyle(this.stage);
    const fg = toRGB(style.color, [242, 243, 247]);
    const bg = toRGB(getComputedStyle(document.body).backgroundColor, [7, 8, 13]);
    const isDark = luminance(bg) < 0.45;
    const variable = (name: string, fallback: RGB) => toRGB(style.getPropertyValue(name), fallback);
    const gold = variable('--kente-gold', [255, 181, 71]);
    const coral = variable('--kente-coral', [255, 90, 78]);
    const jade = variable('--kente-jade', [34, 211, 166]);

    this.fg = fg;
    this.bg = bg;
    this.gold = gold;
    this.font = `500 10px ${style.getPropertyValue('--typeface-mono') || 'monospace'}`;
    this.nightGoal = isDark ? 1 : 0;

    // Tissu non tissé, puis de plus en plus chargé : vert, or, rouge
    const empty = mix(bg, fg, isDark ? 0.085 : 0.075);
    const palette: RGB[] = [empty, mix(empty, jade, isDark ? 0.45 : 0.55), jade, gold, coral];
    // Fil d'une autre couleur au milieu des blocs, comme les fils de chaîne d'un kente
    this.accents = [fg, gold, gold, coral, jade];
    palette.forEach((color, k) => this.colGoal.set(color, k * 3));

    if (!this.colReady || this.options.reducedMotion()) {
      this.col.set(this.colGoal);
      this.night = this.nightGoal;
      this.colReady = true;
    }
    this.kick();
  }

  // ── Mise en page ──

  private measureGutter(): void {
    this.ctx.font = this.font;
    const widest = Math.max(0, ...this.weekdays.map((row) => this.ctx.measureText(row.label).width));
    this.gutter = Math.ceil(widest) + 10;
  }

  private relayout(): void {
    const width = Math.round(this.stage.clientWidth);
    if (!width || !this.year) {
      return;
    }
    // Moins de place : moins de semaines
    this.W = width;
    this.load();
    this.measureGutter();
    if (width < 520) {
      this.gutter = 0;
    }
    this.dpr = Math.min(2, window.devicePixelRatio || 1);

    // Hauteur fixe, celle de la ville : le passage du pagne à la ville ne fait pas bouger la page
    const city = this.bounds(this.cameraAt(1, 0, 0), 1, true);
    const cityHeight = ((city.maxy - city.miny) / (city.maxx - city.minx)) * width + 40;
    const flat = this.bounds(this.cameraAt(0, 0, 0), 0, true);
    const clothWidth = Math.min(width, CONTENT_WIDTH) - 32 - this.gutter;
    const clothHeight = ((flat.maxy - flat.miny) / (flat.maxx - flat.minx)) * clothWidth + 34;
    this.H = Math.round(Math.min(Math.max(cityHeight, clothHeight, 210), 440));

    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${this.H}px`;
    this.stage.style.height = `${this.H}px`;
    this.draw();
  }

  /** Caméra pour un avancement e du passage (0 pagne, 1 ville), décalée par la rotation à la souris */
  private cameraAt(e: number, yaw: number, elev: number): Camera {
    const elevation = lerp(Math.PI / 2, Math.min(ELEVATION_MAX, Math.max(ELEVATION_MIN, CITY_ELEVATION + elev)), e);
    const distance = Math.exp(lerp(Math.log(FLAT_DISTANCE), Math.log(this.weeks * 1.05 + 8), e));
    return makeCamera(this.weeks / 2, 3.5, elevation, yaw * e, distance);
  }

  /** Coordonnées écran d'un point, avant mise à l'échelle */
  private static project(cam: Camera, x: number, y: number, z: number, out: Float32Array, o: number): void {
    const dx = x - cam.px;
    const dy = y - cam.py;
    const dz = z - cam.pz;
    const depth = dx * cam.fx + dy * cam.fy + dz * cam.fz;
    out[o] = (dx * cam.rx + dy * cam.ry) / depth;
    out[o + 1] = -(dx * cam.ux + dy * cam.uy + dz * cam.uz) / depth;
  }

  private readonly corner = new Float32Array(2);

  /**
   * Étendue de la scène à l'écran. `full` : immeubles à leur hauteur finale (cadrage stable pendant
   * le tissage) ; sinon à leur hauteur du moment.
   */
  private bounds(cam: Camera, e: number, full: boolean) {
    const p = this.corner;
    let minx = Infinity;
    let maxx = -Infinity;
    let miny = Infinity;
    let maxy = -Infinity;
    const add = (x: number, y: number, z: number) => {
      KenteSkylineEngine.project(cam, x, y, z, p, 0);
      minx = Math.min(minx, p[0]);
      maxx = Math.max(maxx, p[0]);
      miny = Math.min(miny, p[1]);
      maxy = Math.max(maxy, p[1]);
    };
    for (let i = 0; i < this.n; i++) {
      const x = this.wk[i];
      const y = this.dy[i];
      const z = full ? this.hgt[i] * e : this.zs[i];
      add(x, y, 0);
      add(x + 1, y, 0);
      add(x, y + 1, 0);
      add(x + 1, y + 1, 0);
      if (z > 0) {
        add(x, y, z);
        add(x + 1, y, z);
        add(x, y + 1, z);
        add(x + 1, y + 1, z);
      }
    }
    return { minx, maxx, miny, maxy };
  }

  // ── Dessin ──

  /** 0 → 1 : présence d'un bloc pendant le tissage (les bandes arrivent de gauche à droite) */
  private presence(i: number): number {
    if (this.weave >= 1) {
      return 1;
    }
    const start = (this.wk[i] / Math.max(1, this.weeks - 1)) * 0.68 + this.dy[i] * 0.004;
    return easeOutCubic((this.weave - start) / 0.3);
  }

  /** 0 → 1 : un immeuble se lève pendant le passage à la ville, en vague des semaines anciennes aux récentes */
  private rise(i: number): number {
    const delay = (this.wk[i] / Math.max(1, this.weeks - 1)) * 0.36 + (this.dy[i] / 6) * 0.06;
    return easeOutCubic((this.t - delay) / (1 - WAVE));
  }

  private draw = (): void => {
    const { ctx, n, W, H } = this;
    if (!W || !n) {
      return;
    }
    const e = easeInOutCubic(this.t);
    const cam = this.cameraAt(e, this.yaw, this.elev);

    for (let i = 0; i < n; i++) {
      this.present[i] = this.presence(i);
      this.zs[i] = this.hgt[i] * this.rise(i) * this.present[i];
    }

    // Cadrage : le pagne suit la colonne des contenus ; la ville part du bord gauche (le passé s'y
    // efface) et s'arrête un peu avant le bord droit, pour qu'aujourd'hui reste net
    const b = this.bounds(cam, e, true);
    const column = Math.max(16, (W - CONTENT_WIDTH) / 2 + 16);
    const left = lerp(column, 0, e) + this.gutter * (1 - e);
    const right = lerp(column, Math.min(32, W * 0.04), e);
    const top = lerp(22, 12, e);
    const bottom = lerp(10, 26, e);
    const aw = W - left - right;
    const ah = H - top - bottom;
    const bw = Math.max(1e-6, b.maxx - b.minx);
    const bh = Math.max(1e-6, b.maxy - b.miny);
    const s = Math.min(aw / bw, ah / bh);
    const ox = left + (aw - bw * s) / 2 - b.minx * s;
    const oy = top + (ah - bh * s) / 2 - b.miny * s;

    const p = this.corner;
    const P = (x: number, y: number, z: number, out: Float32Array, o: number) => {
      KenteSkylineEngine.project(cam, x, y, z, p, 0);
      out[o] = ox + p[0] * s;
      out[o + 1] = oy + p[1] * s;
    };

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Du plus loin au plus près de la caméra
    for (let i = 0; i < n; i++) {
      const cx = this.wk[i] + 0.5 - cam.px;
      const cy = this.dy[i] + 0.5 - cam.py;
      this.keys[i] = cx * cx + cy * cy;
    }
    this.order.sort((a, c) => this.keys[c] - this.keys[a]);

    // Pagne : bandes jointes, séparées par une couture. Ville : immeubles séparés par des rues.
    const wx = lerp(0.9, 0.74, e);
    const wy = lerp(0.985, 0.74, e);
    const offx = (1 - wx) / 2;
    const offy = (1 - wy) / 2;
    const lift = 0.6 * e;
    const polys = this.polys;
    const col = this.col;
    const today = n - 1;
    const windowsOn = this.night > 0.01 && e > 0.55;

    for (let k = 0; k < n; k++) {
      const i = this.order[k];
      const presence = this.present[i];
      if (presence <= 0.002) {
        this.faces[i] = 0;
        polys.fill(0, i * 24, i * 24 + 24);
        continue;
      }
      // Pendant le tissage, une bande descend un peu avant de se poser
      const drop = (1 - presence) * 0.9 * (1 - e);
      const x0 = this.wk[i] + offx;
      const x1 = x0 + wx;
      const y0 = this.dy[i] + offy - drop;
      const y1 = y0 + wy;
      const z = this.zs[i] + this.hover[i] * lift;
      const o = i * 24;

      // Toit
      P(x0, y0, z, polys, o);
      P(x1, y0, z, polys, o + 2);
      P(x1, y1, z, polys, o + 4);
      P(x0, y1, z, polys, o + 6);
      // Façade (côté des jours suivants, face à la caméra)
      P(x0, y1, 0, polys, o + 8);
      P(x1, y1, 0, polys, o + 10);
      polys[o + 12] = polys[o + 4];
      polys[o + 13] = polys[o + 5];
      polys[o + 14] = polys[o + 6];
      polys[o + 15] = polys[o + 7];
      // Côté tourné vers la caméra
      const rightSide = cam.px > x1;
      const sx = rightSide ? x1 : x0;
      P(sx, y0, 0, polys, o + 16);
      P(sx, y1, 0, polys, o + 18);
      P(sx, y1, z, polys, o + 20);
      P(sx, y0, z, polys, o + 22);

      let faces = 0;
      const frontHeight = Math.abs(polys[o + 9] - polys[o + 15]);
      if (frontHeight > 0.4) {
        faces |= FACE_FRONT;
      }
      if ((rightSide || cam.px < x0) && Math.abs(polys[o + 16] - polys[o + 22]) + Math.abs(polys[o + 17] - polys[o + 23]) > 0.6 && frontHeight > 0.4) {
        faces |= FACE_SIDE;
      }
      this.faces[i] = faces;

      // Couleur du jour, estompée par la légende, éclaircie au survol
      const L = this.lv[i] * 3;
      let r = col[L];
      let g = col[L + 1];
      let bl = col[L + 2];
      const d = this.dim[i];
      if (d > 0.002) {
        r += (col[0] - r) * 0.72 * d;
        g += (col[1] - g) * 0.72 * d;
        bl += (col[2] - bl) * 0.72 * d;
      }
      const h = this.hover[i];
      if (h > 0.002) {
        r += (this.fg[0] - r) * 0.18 * h;
        g += (this.fg[1] - g) * 0.18 * h;
        bl += (this.fg[2] - bl) * 0.18 * h;
      }

      ctx.globalAlpha = presence;
      if (faces & FACE_SIDE) {
        ctx.beginPath();
        quadPath(ctx, polys, o + 16);
        ctx.fillStyle = rgb(r * 0.62, g * 0.62, bl * 0.62);
        ctx.fill();
      }
      if (faces & FACE_FRONT) {
        ctx.beginPath();
        quadPath(ctx, polys, o + 8);
        ctx.fillStyle = rgb(r * 0.8, g * 0.8, bl * 0.8);
        ctx.fill();
        if (windowsOn && this.lv[i] > 0) {
          this.drawWindows(i, x0, x1, y1, this.zs[i], P);
        }
      }
      ctx.beginPath();
      quadPath(ctx, polys, o);
      ctx.fillStyle = rgb(r, g, bl);
      ctx.fill();
      this.drawWeave(i, o, r, g, bl);

      if (i === today) {
        this.drawToday(o, x0 + wx / 2, y0 + wy / 2, z, e, P);
      }
      if (h > 0.02) {
        ctx.beginPath();
        quadPath(ctx, polys, o);
        ctx.strokeStyle = rgb(this.fg[0], this.fg[1], this.fg[2], 0.9 * h);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    this.drawLabels(e, offx, P);
    this.placeTip(e, offx, offy, wx, wy, P);
  };

  /**
   * Aujourd'hui : un cadre doré sur le pagne ; en ville, une antenne au sommet de l'immeuble du jour,
   * avec son feu, comme en haut des tours.
   */
  private drawToday(
    o: number,
    cx: number,
    cy: number,
    z: number,
    e: number,
    P: (x: number, y: number, z: number, out: Float32Array, o: number) => void,
  ): void {
    const ctx = this.ctx;
    const [r, g, b] = this.gold;
    const frame = 1 - smoothstep(0.2, 0.6, e);
    if (frame > 0.01) {
      ctx.beginPath();
      quadPath(ctx, this.polys, o);
      ctx.strokeStyle = rgb(r, g, b, frame);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    const antenna = smoothstep(0.6, 1, e);
    if (antenna > 0.01) {
      const q = this.windowQuad;
      P(cx, cy, z, q, 0);
      P(cx, cy, z + 2.2, q, 2);
      ctx.beginPath();
      ctx.moveTo(q[0], q[1]);
      ctx.lineTo(q[2], q[3]);
      ctx.strokeStyle = rgb(this.fg[0], this.fg[1], this.fg[2], 0.7 * antenna);
      ctx.lineWidth = 1.25;
      ctx.stroke();
      // Le feu luit davantage la nuit
      ctx.save();
      ctx.shadowColor = rgb(r, g, b, 0.9 * this.night);
      ctx.shadowBlur = 12 * this.night;
      ctx.beginPath();
      ctx.arc(q[2], q[3], 3.5, 0, Math.PI * 2);
      ctx.fillStyle = rgb(r, g, b, antenna);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Fils du bloc : chaîne (verticale) ou trame (horizontale) en damier, et un fil de couleur au milieu */
  private drawWeave(i: number, o: number, r: number, g: number, b: number): void {
    const p = this.polys;
    const size = Math.hypot(p[o + 2] - p[o], p[o + 3] - p[o + 1]);
    if (size < 8) {
      return;
    }
    const ctx = this.ctx;
    const warp = (Math.round(this.wk[i]) + this.dy[i]) % 2 === 0;
    // Point du toit aux coordonnées (u, v), entre ses quatre coins
    const at = (u: number, v: number, axis: 0 | 1) => {
      const top = p[o + axis] + (p[o + 2 + axis] - p[o + axis]) * u;
      const bottom = p[o + 6 + axis] + (p[o + 4 + axis] - p[o + 6 + axis]) * u;
      return top + (bottom - top) * v;
    };
    const line = (u0: number, v0: number, u1: number, v1: number) => {
      ctx.moveTo(at(u0, v0, 0), at(u0, v0, 1));
      ctx.lineTo(at(u1, v1, 0), at(u1, v1, 1));
    };
    const thread = Math.max(0.7, size * 0.055);
    const level = this.lv[i];

    ctx.beginPath();
    for (const q of [0.22, 0.78]) {
      if (warp) {
        line(q, 0.1, q, 0.9);
      } else {
        line(0.1, q, 0.9, q);
      }
    }
    ctx.strokeStyle = level === 0 ? rgb(this.fg[0], this.fg[1], this.fg[2], 0.07) : rgb(r * 0.7, g * 0.7, b * 0.7, 0.55);
    ctx.lineWidth = thread;
    ctx.stroke();

    if (level >= 2) {
      const accent = this.accents[level];
      ctx.beginPath();
      if (warp) {
        line(0.5, 0.1, 0.5, 0.9);
      } else {
        line(0.1, 0.5, 0.9, 0.5);
      }
      ctx.strokeStyle = rgb(accent[0], accent[1], accent[2], 0.85);
      ctx.lineWidth = thread * 1.15;
      ctx.stroke();
    }
  }

  /** Fenêtres allumées la nuit, sur la façade, une rangée par étage */
  private drawWindows(
    i: number,
    x0: number,
    x1: number,
    y1: number,
    z: number,
    P: (x: number, y: number, z: number, out: Float32Array, o: number) => void,
  ): void {
    const floors = Math.floor((z - 0.25) / 0.9);
    if (floors < 1) {
      return;
    }
    const q = this.windowQuad;
    const seed = this.seeds[i];
    const ctx = this.ctx;
    const [gr, gg, gb] = this.gold;
    ctx.beginPath();
    let any = false;
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < 2; c++) {
        const bit = (seed >>> ((f * 2 + c) % 31)) & 1;
        if (!bit) {
          continue;
        }
        // Chaque fenêtre a son moment pour s'allumer quand la nuit tombe
        const threshold = ((seed >>> ((f * 3 + c * 7) % 29)) & 15) / 25;
        if (this.night <= threshold) {
          continue;
        }
        const u0 = c === 0 ? 0.2 : 0.58;
        const u1 = u0 + 0.22;
        const zb = 0.3 + f * 0.9;
        const zt = zb + 0.42;
        P(lerp(x0, x1, u0), y1, zb, q, 0);
        P(lerp(x0, x1, u1), y1, zb, q, 2);
        P(lerp(x0, x1, u1), y1, zt, q, 4);
        P(lerp(x0, x1, u0), y1, zt, q, 6);
        if (Math.abs(q[5] - q[1]) < 0.8) {
          continue;
        }
        quadPath(ctx, q, 0);
        any = true;
      }
    }
    if (any) {
      ctx.fillStyle = rgb(gr, gg, gb, 0.75 * this.night);
      ctx.fill();
    }
  }

  private readonly windowQuad = new Float32Array(8);

  /** Mois et jours : en haut et à gauche du pagne, au pied de la ville. Ils se fondent, sans saut. */
  private drawLabels(e: number, offx: number, P: (x: number, y: number, z: number, out: Float32Array, o: number) => void): void {
    const ctx = this.ctx;
    const muted = mix(this.bg, this.fg, 0.55);
    const q = this.windowQuad;
    ctx.font = this.font;
    const flat = 1 - smoothstep(0, 0.35, e);
    const city = smoothstep(0.65, 1, e);

    if (flat > 0.004) {
      ctx.fillStyle = rgb(muted[0], muted[1], muted[2], flat);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      let edge = -Infinity;
      for (const month of this.months) {
        P(month.week + offx, 0, 0, q, 0);
        const width = ctx.measureText(month.label).width;
        if (q[0] < edge || q[0] + width > this.W) {
          continue;
        }
        ctx.fillText(month.label, q[0], q[1] - 5);
        edge = q[0] + width + 6;
      }
      if (this.gutter > 0) {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (const row of this.weekdays) {
          P(0, row.day + 0.5, 0, q, 0);
          ctx.fillText(row.label, q[0] - 8, q[1]);
        }
      }
    }
    if (city > 0.004) {
      ctx.fillStyle = rgb(muted[0], muted[1], muted[2], city);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      let edge = -Infinity;
      for (const month of this.months) {
        P(month.week + 0.5, 7.35, 0, q, 0);
        const width = ctx.measureText(month.label).width;
        if (q[0] < edge || q[0] < 4 || q[0] + width > this.W - 4) {
          continue;
        }
        ctx.fillText(month.label, q[0], q[1] + 3);
        edge = q[0] + width + 12;
      }
    }
  }

  /** L'infobulle suit le jour mis en avant, pendant les animations et les rotations */
  private placeTip(
    e: number,
    offx: number,
    offy: number,
    wx: number,
    wy: number,
    P: (x: number, y: number, z: number, out: Float32Array, o: number) => void,
  ): void {
    const i = this.active;
    if (i < 0 || i >= this.n) {
      return;
    }
    const q = this.windowQuad;
    const z = this.zs[i] + this.hover[i] * 0.6 * e;
    const x0 = this.wk[i] + offx;
    const y0 = this.dy[i] + offy;
    P(x0 + wx / 2, y0 + wy / 2, z, q, 0);
    P(x0, y0, z, q, 2);
    P(x0 + wx, y0, z, q, 4);
    const tx = q[0];
    const ty = Math.min(q[3], q[5], q[1]);
    const half = this.tipWidth / 2;
    const cx = Math.min(this.W - half - 6, Math.max(half + 6, tx));
    this.tip.style.transform = `translate(${(cx - half).toFixed(1)}px, ${(ty - 10).toFixed(1)}px) translateY(-100%)`;
    this.tip.style.setProperty('--arrow', `${(tx - cx + half).toFixed(1)}px`);
  }

  // ── Animation ──

  private enter(): void {
    if (this.entered || this.held) {
      return;
    }
    this.entered = true;
    if (this.options.reducedMotion()) {
      this.weave = 1;
      this.t = this.wantCity ? 1 : 0;
      this.target = this.t;
      this.draw();
      return;
    }
    this.weave = 0;
    this.kick();
  }

  /** La vue demandée s'applique une fois la première année tissée */
  private applyTarget(): void {
    if (!this.entered || this.weave < 1) {
      this.kick();
      return;
    }
    const goal = this.wantCity ? 1 : 0;
    if (goal !== this.target) {
      this.target = goal;
      if (goal === 0) {
        this.yawGoal = 0;
        this.elevGoal = 0;
      }
      this.canvas.style.cursor = goal === 1 ? 'grab' : 'default';
    }
    this.kick();
  }

  private kick = (): void => {
    if (this.raf) {
      return;
    }
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  };

  private tick = (now: number): void => {
    this.raf = 0;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const reduced = this.options.reducedMotion();
    let moving = false;

    if (this.entered && this.weave < 1) {
      this.weave = reduced ? 1 : Math.min(1, this.weave + (dt * 1000) / WEAVE_MS);
      moving = true;
      if (this.weave >= 1) {
        this.applyTarget();
      }
    }

    if (this.t !== this.target) {
      const step = reduced ? 1 : (dt * 1000) / MORPH_MS;
      this.t = this.target > this.t ? Math.min(this.target, this.t + step) : Math.max(this.target, this.t - step);
      moving = true;
    }

    const orbit = reduced ? 1 : 1 - Math.exp(-dt * 12);
    this.yaw += (this.yawGoal - this.yaw) * orbit;
    this.elev += (this.elevGoal - this.elev) * orbit;
    if (Math.abs(this.yawGoal - this.yaw) > 1e-4 || Math.abs(this.elevGoal - this.elev) > 1e-4) {
      moving = true;
    } else {
      this.yaw = this.yawGoal;
      this.elev = this.elevGoal;
    }

    const blend = reduced ? 1 : 1 - Math.exp(-dt * 7);
    for (let k = 0; k < 15; k++) {
      const delta = this.colGoal[k] - this.col[k];
      if (Math.abs(delta) > 0.4) {
        this.col[k] += delta * blend;
        moving = true;
      } else {
        this.col[k] = this.colGoal[k];
      }
    }
    if (this.night !== this.nightGoal) {
      const step = reduced ? 1 : dt / 0.9;
      this.night = this.nightGoal > this.night ? Math.min(this.nightGoal, this.night + step) : Math.max(this.nightGoal, this.night - step);
      moving = true;
    }

    const hoverBlend = reduced ? 1 : 1 - Math.exp(-dt * 16);
    const dimBlend = reduced ? 1 : 1 - Math.exp(-dt * 10);
    for (let i = 0; i < this.n; i++) {
      const hoverGoal = i === this.active ? 1 : 0;
      const dimGoal = this.legendLevel >= 0 && this.lv[i] !== this.legendLevel ? 1 : 0;
      if (this.hover[i] !== hoverGoal) {
        const v = this.hover[i] + (hoverGoal - this.hover[i]) * hoverBlend;
        this.hover[i] = Math.abs(hoverGoal - v) < 0.003 ? hoverGoal : v;
        moving = true;
      }
      if (this.dim[i] !== dimGoal) {
        const v = this.dim[i] + (dimGoal - this.dim[i]) * dimBlend;
        this.dim[i] = Math.abs(dimGoal - v) < 0.003 ? dimGoal : v;
        moving = true;
      }
    }

    this.draw();
    if (moving) {
      this.raf = requestAnimationFrame(this.tick);
    }
  };

  // ── Interaction ──

  private refreshActive(): void {
    const next = this.hovered >= 0 ? this.hovered : this.pinned;
    if (next === this.active) {
      return;
    }
    this.active = next;
    this.options.onActive(next >= 0 ? this.base + next : -1);
    this.kick();
  }

  private hit(x: number, y: number): number {
    for (let k = this.n - 1; k >= 0; k--) {
      const i = this.order[k];
      const o = i * 24;
      if (this.present[i] < 0.5) {
        continue;
      }
      if (pointInQuad(this.polys, o, x, y)) {
        return i;
      }
      if (this.faces[i] & FACE_FRONT && pointInQuad(this.polys, o + 8, x, y)) {
        return i;
      }
      if (this.faces[i] & FACE_SIDE && pointInQuad(this.polys, o + 16, x, y)) {
        return i;
      }
    }
    return -1;
  }

  private local(event: PointerEvent | MouseEvent): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  private canOrbit(): boolean {
    return this.target === 1;
  }

  private onDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }
    const orbit = this.canOrbit();
    this.drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      yaw: this.yawGoal,
      elev: this.elevGoal,
      moved: false,
      orbit,
      mouse: event.pointerType === 'mouse',
    };
    if (orbit) {
      try {
        this.canvas.setPointerCapture(event.pointerId);
      } catch {
        // La capture n'est qu'un confort
      }
    }
  };

  private onMove = (event: PointerEvent): void => {
    const drag = this.drag;
    if (drag?.orbit && event.pointerId === drag.id) {
      const dx = event.clientX - drag.x;
      const dyy = event.clientY - drag.y;
      if (drag.moved || Math.hypot(dx, dyy) > 4) {
        drag.moved = true;
        this.yawGoal = Math.min(YAW_MAX, Math.max(-YAW_MAX, drag.yaw - dx * 0.005));
        if (drag.mouse) {
          this.elevGoal = Math.min(
            ELEVATION_MAX - CITY_ELEVATION,
            Math.max(ELEVATION_MIN - CITY_ELEVATION, drag.elev + dyy * 0.004),
          );
        }
        this.canvas.style.cursor = 'grabbing';
        this.hovered = -1;
        this.refreshActive();
        this.kick();
        return;
      }
    }
    if (event.pointerType !== 'mouse') {
      return;
    }
    const [x, y] = this.local(event);
    const i = this.hit(x, y);
    if (i !== this.hovered) {
      this.hovered = i;
      this.refreshActive();
    }
    this.canvas.style.cursor = this.canOrbit() ? 'grab' : i >= 0 ? 'pointer' : 'default';
  };

  private onUp = (event: PointerEvent): void => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.id) {
      return;
    }
    this.drag = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    this.canvas.style.cursor = this.canOrbit() ? 'grab' : 'default';
    if (drag.moved) {
      return;
    }
    // Toucher ou clic : le jour reste affiché (toucher à nouveau pour le refermer)
    const [x, y] = this.local(event);
    const i = this.hit(x, y);
    this.pinned = i === this.pinned ? -1 : i;
    if (event.pointerType !== 'mouse') {
      this.hovered = -1;
    }
    this.refreshActive();
  };

  private onCancel = (): void => {
    this.drag = null;
  };

  private onLeave = (): void => {
    if (this.drag) {
      return;
    }
    this.hovered = -1;
    this.refreshActive();
  };

  private onDoubleClick = (): void => {
    this.yawGoal = 0;
    this.elevGoal = 0;
    this.kick();
  };

  private onKey = (event: KeyboardEvent): void => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'];
    if (!keys.includes(event.key) || !this.n) {
      return;
    }
    event.preventDefault();
    if (event.key === 'Escape') {
      this.pinned = -1;
      this.hovered = -1;
      this.refreshActive();
      return;
    }
    let i = this.pinned >= 0 ? this.pinned : this.active >= 0 ? this.active : this.n - 1;
    if (this.pinned >= 0 || this.active >= 0) {
      if (event.key === 'ArrowLeft') i -= 7;
      if (event.key === 'ArrowRight') i += 7;
      if (event.key === 'ArrowUp') i -= 1;
      if (event.key === 'ArrowDown') i += 1;
      if (event.key === 'Home') i = 0;
      if (event.key === 'End') i = this.n - 1;
    }
    i = Math.max(0, Math.min(this.n - 1, i));
    this.pinned = i;
    this.hovered = -1;
    this.refreshActive();
    this.options.onAnnounce(this.base + i);
  };

  private onBlur = (): void => {
    this.pinned = -1;
    this.refreshActive();
  };
}
