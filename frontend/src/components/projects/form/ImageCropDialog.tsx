import { Crop, Minus, Plus, RotateCcw, TriangleAlert, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { centeredCrop, FULL_WIDTH, PROJECT_IMAGE_ASPECT, SHARP_WIDTH, type CropArea } from '@/lib/projectImages';
import { cn } from '@/lib/utils';

/**
 * L'image d'origine à recadrer : décodée, son adresse locale pour l'afficher, et ses dimensions réelles (gardées à
 * part : l'image décodée est libérée dès le cadrage validé, pendant que la fenêtre disparaît)
 */
export interface CropSource {
  bitmap: ImageBitmap;
  url: string;
  name: string;
  width: number;
  height: number;
}

// On approche jusqu'à voir un quart de la largeur de l'image
const MAX_ZOOM = 4;
// Pas du clavier : une flèche déplace de 2 % du cadre (10 % avec Maj), + et - zooment de 10 %
const KEY_STEP = 0.02;
const KEY_STEP_LARGE = 0.1;
const KEY_ZOOM = 1.1;

/** Le cadrage : la largeur de la zone gardée et son centre, en pixels de l'image d'origine */
interface View {
  width: number;
  cx: number;
  cy: number;
}

function clampView(view: View, imageWidth: number, imageHeight: number): View {
  const maxWidth = Math.min(imageWidth, imageHeight * PROJECT_IMAGE_ASPECT);
  const width = Math.min(maxWidth, Math.max(maxWidth / MAX_ZOOM, view.width));
  const height = width / PROJECT_IMAGE_ASPECT;
  return {
    width,
    cx: Math.min(imageWidth - width / 2, Math.max(width / 2, view.cx)),
    cy: Math.min(imageHeight - height / 2, Math.max(height / 2, view.cy)),
  };
}

const viewOf = (crop: CropArea): View => ({ width: crop.width, cx: crop.x + crop.width / 2, cy: crop.y + crop.height / 2 });

const cropOf = (view: View): CropArea => {
  const height = view.width / PROJECT_IMAGE_ASPECT;
  return { x: view.cx - view.width / 2, y: view.cy - height / 2, width: view.width, height };
};

interface ImageCropDialogProps {
  source: CropSource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** « Cadrer la couverture », « Cadrer la capture » */
  title: string;
  /** Le cadrage d'avant, pour le reprendre ; sinon l'image entière, au centre */
  initialCrop?: CropArea | null;
  onConfirm: (crop: CropArea) => void;
}

/**
 * Cadrer une image au format de la page du projet (16:10), comme on le ferait sur son téléphone : on fait glisser
 * l'image sous le cadre, on zoome à la molette, en pinçant, avec le curseur ou au clavier (flèches, + et -). Ce qui
 * dépasse du cadre reste visible, assombri, pour savoir ce qu'on laisse de côté ; une grille des tiers apparaît pendant
 * qu'on déplace. Si la zone gardée est petite, on prévient qu'elle sera floue.
 *
 * Feuille en bas de l'écran sur téléphone, fenêtre centrée ailleurs.
 */
export default function ImageCropDialog({ source, open, onOpenChange, title, initialCrop, onConfirm }: ImageCropDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-kente-night/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 saver:backdrop-blur-none" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[94dvh] overflow-y-auto rounded-t-[1.75rem] border border-border bg-popover text-popover-foreground shadow-float outline-none',
            'pb-[env(safe-area-inset-bottom)] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-10',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(48rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:pb-0',
            'sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95',
          )}
        >
          {source && (
            <Cropper
              key={source.url}
              source={source}
              title={title}
              initialCrop={initialCrop}
              onCancel={() => onOpenChange(false)}
              onConfirm={onConfirm}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface CropperProps {
  source: CropSource;
  title: string;
  initialCrop?: CropArea | null;
  onCancel: () => void;
  onConfirm: (crop: CropArea) => void;
}

function Cropper({ source, title, initialCrop, onCancel, onConfirm }: CropperProps) {
  const { t } = useTranslation('projectForm');
  const reduced = useReducedMotion();
  const helpId = useId();
  const zoomId = useId();
  const imageWidth = source.width;
  const imageHeight = source.height;
  const fullView = viewOf(centeredCrop(imageWidth, imageHeight));
  const [view, setView] = useState<View>(() => clampView(initialCrop ? viewOf(initialCrop) : fullView, imageWidth, imageHeight));
  const [frameWidth, setFrameWidth] = useState(0);
  const [moving, setMoving] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  // Les doigts (ou le pointeur) posés sur le cadre, et l'écart des deux doigts au début d'un pincement
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; width: number } | null>(null);

  // La taille du cadre à l'écran : la feuille s'adapte à l'écran, et le téléphone peut tourner
  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width));
    observer.observe(element);
    setFrameWidth(element.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const maxWidth = Math.min(imageWidth, imageHeight * PROJECT_IMAGE_ASPECT);
  const zoom = maxWidth / view.width;
  const scale = frameWidth > 0 ? frameWidth / view.width : 0;
  const frameHeight = frameWidth / PROJECT_IMAGE_ASPECT;
  const outputWidth = Math.round(Math.min(FULL_WIDTH, view.width));
  const blurry = view.width < SHARP_WIDTH;

  const update = (next: (current: View) => View) => setView((current) => clampView(next(current), imageWidth, imageHeight));

  /**
   * Change la largeur gardée en laissant immobile le point de l'image qui se trouve sous (px, py), compté depuis le
   * centre du cadre : le pointeur, le milieu des deux doigts.
   */
  function zoomAround(widthOf: (current: View) => number, px = 0, py = 0) {
    update((current) => {
      const width = widthOf(current);
      const shift = (current.width - width) / frameWidth;
      return { width, cx: current.cx + px * shift, cy: current.cy + py * shift };
    });
  }

  /** Zoome d'un facteur (> 1 : on approche) */
  const zoomBy = (factor: number, px = 0, py = 0) => zoomAround((current) => current.width / factor, px, py);

  function fromCenter(event: { clientX: number; clientY: number }) {
    const rect = frame.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 };
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setMoving(true);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), width: view.width };
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous || frameWidth === 0) {
      return;
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size >= 2 && pinch.current) {
      // Pincement : la largeur gardée suit l'écart des doigts, autour du point entre eux
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const middle = fromCenter({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      const start = pinch.current;
      zoomAround(() => start.width / (distance / start.distance), middle.x, middle.y);
      return;
    }
    // Glisser : l'image suit le doigt, le cadre reste en place
    const ratio = view.width / frameWidth;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    update((current) => ({ ...current, cx: current.cx - dx * ratio, cy: current.cy - dy * ratio }));
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) {
      pinch.current = null;
    }
    if (pointers.current.size === 0) {
      setMoving(false);
    }
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    const point = fromCenter(event);
    zoomBy(Math.exp(-event.deltaY * 0.0015), point.x, point.y);
  }

  // La molette zoome dans le cadre au lieu de faire défiler la fenêtre : l'écouteur doit pouvoir l'empêcher
  useEffect(() => {
    const element = frame.current;
    if (!element) {
      return undefined;
    }
    const prevent = (event: globalThis.WheelEvent) => event.preventDefault();
    element.addEventListener('wheel', prevent, { passive: false });
    return () => element.removeEventListener('wheel', prevent);
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = view.width * (event.shiftKey ? KEY_STEP_LARGE : KEY_STEP);
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (moves[event.key]) {
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      update((current) => ({ ...current, cx: current.cx + dx, cy: current.cy + dy }));
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomBy(KEY_ZOOM);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      zoomBy(1 / KEY_ZOOM);
    } else if (event.key === '0') {
      event.preventDefault();
      setView(fullView);
    }
  }

  const tx = frameWidth / 2 - view.cx * scale;
  const ty = frameHeight / 2 - view.cy * scale;

  return (
    <div className="flex flex-col">
      <span aria-hidden className="mx-auto mt-3 block h-1 w-10 rounded-full bg-foreground/15 sm:hidden" />
      <div className="flex items-start gap-3 px-5 pt-4 sm:px-6 sm:pt-6">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/12 text-gold">
          <Crop className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <Dialog.Title className="font-display text-h5">{title}</Dialog.Title>
          <p id={helpId} className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
            {t('crop.help')}
          </p>
        </div>
        <Dialog.Close
          aria-label={t('crop.cancel')}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/7 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          <X aria-hidden className="size-4.5" />
        </Dialog.Close>
      </div>

      {/* ── La scène : l'image sous le cadre, ce qui dépasse assombri ── */}
      <div className="relative mt-4 overflow-hidden bg-kente-night px-6 py-7 hatch sm:px-12 sm:py-9">
        <div
          ref={frame}
          role="group"
          tabIndex={0}
          aria-roledescription={t('crop.frameRole')}
          aria-label={t('crop.frameLabel', { zoom: Math.round(zoom * 100) })}
          aria-describedby={helpId}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onKeyDown={onKeyDown}
          onFocus={() => setMoving(false)}
          className={cn(
            'relative aspect-[16/10] w-full touch-none select-none outline-none',
            moving ? 'cursor-grabbing' : 'cursor-grab',
            'focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-kente-night',
          )}
        >
          {scale > 0 && (
            <img
              src={source.url}
              alt=""
              draggable={false}
              style={{
                width: imageWidth,
                height: imageHeight,
                transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
              }}
              className={cn(
                'pointer-events-none absolute top-0 left-0 max-w-none origin-top-left',
                !moving && !reduced && 'transition-transform duration-200 ease-out',
              )}
            />
          )}
          {/* Le cadre : tout ce qui l'entoure est assombri, sa bordure et ses coins le dessinent */}
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[0.375rem] shadow-[0_0_0_100vmax_color-mix(in_srgb,var(--kente-night)_68%,transparent)] ring-1 ring-kente-paper/70" />
          {(['start-0 top-0 border-s-2 border-t-2', 'end-0 top-0 border-e-2 border-t-2', 'start-0 bottom-0 border-s-2 border-b-2', 'end-0 bottom-0 border-e-2 border-b-2'] as const).map(
            (corner) => (
              <span key={corner} aria-hidden className={cn('pointer-events-none absolute size-5 border-kente-gold', corner)} />
            ),
          )}
          {/* La grille des tiers, pendant qu'on déplace */}
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 transition-opacity duration-300',
              'bg-[linear-gradient(to_right,transparent_calc(33.333%-0.5px),rgb(245_245_242/0.45)_calc(33.333%-0.5px),rgb(245_245_242/0.45)_calc(33.333%+0.5px),transparent_calc(33.333%+0.5px),transparent_calc(66.666%-0.5px),rgb(245_245_242/0.45)_calc(66.666%-0.5px),rgb(245_245_242/0.45)_calc(66.666%+0.5px),transparent_calc(66.666%+0.5px)),linear-gradient(to_bottom,transparent_calc(33.333%-0.5px),rgb(245_245_242/0.45)_calc(33.333%-0.5px),rgb(245_245_242/0.45)_calc(33.333%+0.5px),transparent_calc(33.333%+0.5px),transparent_calc(66.666%-0.5px),rgb(245_245_242/0.45)_calc(66.666%-0.5px),rgb(245_245_242/0.45)_calc(66.666%+0.5px),transparent_calc(66.666%+0.5px))]',
              moving ? 'opacity-100' : 'opacity-0',
            )}
          />
        </div>
      </div>

      {/* ── Le zoom, et ce qui partira ── */}
      <div className="flex flex-col gap-3 px-5 pt-4 sm:px-6">
        <div className="flex items-center gap-3">
          <label htmlFor={zoomId} className="sr-only">
            {t('crop.zoom')}
          </label>
          <button
            type="button"
            onClick={() => zoomBy(1 / KEY_ZOOM)}
            disabled={zoom <= 1.001}
            aria-label={t('crop.zoomOut')}
            className="grid size-9 shrink-0 place-items-center rounded-full text-soft-foreground outline-none transition-colors hover:bg-foreground/7 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 disabled:opacity-40"
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <input
            id={zoomId}
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(event) => zoomAround(() => maxWidth / Number(event.target.value))}
            aria-valuetext={`${Math.round(zoom * 100)} %`}
            className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-foreground/12 accent-[var(--gold)] outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-4 focus-visible:ring-offset-popover"
          />
          <button
            type="button"
            onClick={() => zoomBy(KEY_ZOOM)}
            disabled={zoom >= MAX_ZOOM - 0.001}
            aria-label={t('crop.zoomIn')}
            className="grid size-9 shrink-0 place-items-center rounded-full text-soft-foreground outline-none transition-colors hover:bg-foreground/7 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 disabled:opacity-40"
          >
            <Plus aria-hidden className="size-4" />
          </button>
        </div>
        <p aria-live="polite" className={cn('flex items-center gap-2 font-mono text-xs', blurry ? 'text-gold' : 'text-muted-foreground')}>
          {blurry && <TriangleAlert aria-hidden className="size-3.5 shrink-0" />}
          <span>
            {t('crop.output', { width: outputWidth, height: Math.round(outputWidth / PROJECT_IMAGE_ASPECT) })}
            {blurry && ` · ${t('crop.blurry')}`}
          </span>
        </p>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2.5 border-t border-border-subtle px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <button
          type="button"
          onClick={() => setView(fullView)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[0.875rem] px-3.5 text-sm font-semibold text-soft-foreground outline-none transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 sm:me-auto"
        >
          <RotateCcw aria-hidden className="size-4" />
          {t('crop.reset')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-11 rounded-[0.875rem] px-4 text-sm font-semibold text-soft-foreground outline-none transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          {t('crop.cancel')}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(cropOf(view))}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[0.875rem] bg-kente-warm px-5 text-sm font-bold text-kente-night shadow-[0_12px_28px_-14px_var(--kente-coral)] outline-none transition-[translate] duration-300 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
        >
          <Crop aria-hidden className="size-4" />
          {t('crop.confirm')}
        </button>
      </div>
    </div>
  );
}
