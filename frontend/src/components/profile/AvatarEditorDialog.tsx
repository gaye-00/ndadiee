import { AlertCircle, ImageUp, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { Dialog } from 'radix-ui';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useUpdateAvatar } from '@/hooks/useUsers';
import {
  centeredFrame,
  cropOf,
  frameScale,
  MAX_AVATAR_SOURCE_BYTES,
  MAX_ZOOM,
  MIN_ZOOM,
  openAvatarSource,
  panFrame,
  renderAvatar,
  zoomFrame,
  type AvatarFrame,
} from '@/lib/avatarImage';
import { ImagePreparationError } from '@/lib/imageUpload';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/apiError';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-popover';

// Au clavier : un pas de flèche (plus grand avec Maj) et un cran de zoom
const KEY_STEP = 10;
const KEY_STEP_LARGE = 40;
const KEY_ZOOM = 0.1;
// Sensibilité de la molette : un cran ordinaire (100) zoome d'environ 15 %
const WHEEL_ZOOM = 0.0015;
// Les aperçus, aux tailles où la photo paraîtra : le profil, une liste, une pastille
const PREVIEWS = [64, 40, 28] as const;

/** La photo ouverte : son image orientée, de quoi l'afficher, et ses dimensions */
interface AvatarSource {
  bitmap: ImageBitmap;
  url: string;
  width: number;
  height: number;
}

interface AvatarEditorDialogProps {
  /** La photo choisie ; null : fenêtre fermée */
  file: File | null;
  onClose: () => void;
  /** Rouvre le choix d'une photo (une autre que celle-ci) */
  onPickAnother: () => void;
}

/**
 * Cadrer et envoyer sa photo de profil : la photo glisse sous un cercle (souris, doigt, flèches du clavier), on
 * s'approche avec le curseur, la molette ou deux doigts. Les aperçus montrent la photo aux tailles où elle paraîtra.
 * Le navigateur prépare un carré de 512 px (lib/avatarImage.ts) : c'est lui seul qui part. Feuille en bas de l'écran
 * sur téléphone, fenêtre centrée ailleurs.
 */
export default function AvatarEditorDialog({ file, onClose, onPickAnother }: AvatarEditorDialogProps) {
  const [saving, setSaving] = useState(false);

  return (
    <Dialog.Root open={file !== null} onOpenChange={(open) => !open && !saving && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-kente-night/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 saver:backdrop-blur-none" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[94dvh] overflow-y-auto rounded-t-[1.75rem] border border-border bg-popover text-popover-foreground shadow-float outline-none',
            'pb-[env(safe-area-inset-bottom)] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-10',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(31rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:pb-0',
            'sm:data-[state=open]:slide-in-from-bottom-4 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95',
          )}
        >
          {/* Une nouvelle photo repart d'un cadrage neuf */}
          {file && <AvatarEditor key={`${file.name}-${file.size}-${file.lastModified}`} file={file} saving={saving} onSavingChange={setSaving} onDone={onClose} onPickAnother={onPickAnother} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface AvatarEditorProps {
  file: File;
  saving: boolean;
  onSavingChange: (saving: boolean) => void;
  onDone: () => void;
  onPickAnother: () => void;
}

function AvatarEditor({ file, saving, onSavingChange, onDone, onPickAnother }: AvatarEditorProps) {
  const { t } = useTranslation('profile');
  const upload = useUpdateAvatar();
  const [source, setSource] = useState<AvatarSource | null>(null);
  const [unreadable, setUnreadable] = useState<string | null>(null);
  const [frame, setFrame] = useState<AvatarFrame>({ cx: 0, cy: 0, zoom: MIN_ZOOM });
  const [stage, setStage] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // Les doigts (ou la souris) posés sur la photo, et l'écart des deux doigts au début d'un pincement
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const zoomId = useId();
  const hintId = useId();

  // La photo choisie s'ouvre (et s'oriente) ; elle est libérée quand on en change ou qu'on ferme
  useEffect(() => {
    let cancelled = false;
    let opened: ImageBitmap | null = null;
    const url = URL.createObjectURL(file);
    openAvatarSource(file)
      .then((bitmap) => {
        if (cancelled) {
          bitmap.close();
          return;
        }
        opened = bitmap;
        setSource({ bitmap, url, width: bitmap.width, height: bitmap.height });
        setFrame(centeredFrame(bitmap));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setUnreadable(
            error instanceof ImagePreparationError && error.reason === 'size'
              ? t('avatar.tooBig', { max: MAX_AVATAR_SOURCE_BYTES / (1024 * 1024) })
              : t('avatar.unreadable'),
          );
        }
      });
    return () => {
      cancelled = true;
      opened?.close();
      URL.revokeObjectURL(url);
    };
  }, [file, t]);

  // Le cercle suit la largeur de la fenêtre (téléphone) : ses calculs aussi
  useEffect(() => {
    const element = stageRef.current;
    if (!element) {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => setStage(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // La molette zoome autour de la souris ; elle ne fait pas défiler la fenêtre pour autant
  useEffect(() => {
    const element = stageRef.current;
    if (!element || !source) {
      return undefined;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const around = { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 };
      setFrame((current) => zoomFrame(current, source, rect.width, current.zoom * Math.exp(-event.deltaY * WHEEL_ZOOM), around));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [source]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!source || saving) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: frame.zoom };
    }
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!source || !previous) {
      return;
    }
    const current = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, current);
    if (pointers.current.size === 1) {
      setFrame((value) => panFrame(value, source, stage, current.x - previous.x, current.y - previous.y));
    } else if (pointers.current.size === 2 && pinch.current) {
      // Deux doigts : le zoom suit leur écart, autour du point entre eux
      const [a, b] = [...pointers.current.values()];
      const rect = event.currentTarget.getBoundingClientRect();
      const around = { x: (a.x + b.x) / 2 - rect.left - rect.width / 2, y: (a.y + b.y) / 2 - rect.top - rect.height / 2 };
      const zoom = (pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.distance;
      setFrame((value) => zoomFrame(value, source, stage, zoom, around));
    }
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) {
      pinch.current = null;
    }
    if (pointers.current.size === 0) {
      setDragging(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!source || saving) {
      return;
    }
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (event.key in moves) {
      const [dx, dy] = moves[event.key];
      setFrame((value) => panFrame(value, source, stage, dx, dy));
    } else if (event.key === '+' || event.key === '=') {
      setFrame((value) => zoomFrame(value, source, stage, value.zoom + KEY_ZOOM));
    } else if (event.key === '-' || event.key === '_') {
      setFrame((value) => zoomFrame(value, source, stage, value.zoom - KEY_ZOOM));
    } else if (event.key === '0') {
      setFrame(centeredFrame(source));
    } else {
      return;
    }
    event.preventDefault();
  }

  async function save() {
    if (!source || saving) {
      return;
    }
    setFailure(null);
    setProgress(0);
    onSavingChange(true);
    try {
      const image = await renderAvatar(source.bitmap, cropOf(frame, source));
      await upload.mutateAsync({ image: image.blob, name: image.name, onProgress: setProgress });
      toast.success(t('avatar.saved'));
      onDone();
    } catch (error) {
      setFailure(error instanceof ImagePreparationError ? t('avatar.unreadable') : getApiErrorMessage(error, t('avatar.failed')));
    } finally {
      onSavingChange(false);
    }
  }

  return (
    <div className="relative p-5 sm:p-6">
      {/* La poignée de la feuille, sur téléphone */}
      <span aria-hidden className="mx-auto -mt-2 mb-4 block h-1 w-10 rounded-full bg-foreground/15 sm:hidden" />
      <Dialog.Close
        disabled={saving}
        aria-label={t('avatar.close')}
        className="absolute end-4 top-4 grid size-9 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/7 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 disabled:opacity-50"
      >
        <X aria-hidden className="size-4.5" />
      </Dialog.Close>

      <div className="pe-10">
        <p className="eyebrow">{t('avatar.eyebrow')}</p>
        <Dialog.Title className="mt-1 font-display text-h5">{t('avatar.title')}</Dialog.Title>
      </div>
      <Dialog.Description id={hintId} className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {t('avatar.hint')}
      </Dialog.Description>

      {unreadable ? (
        <div role="alert" className="mt-5 flex flex-col items-start gap-3 rounded-2xl border border-coral/25 bg-coral/8 p-4">
          <p className="flex items-start gap-2 text-sm text-coral">
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {unreadable}
          </p>
          <button
            type="button"
            onClick={onPickAnother}
            className={cn('inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-3.5 text-sm font-bold text-background transition-opacity hover:opacity-85', focusRing)}
          >
            <ImageUp aria-hidden className="size-4" />
            {t('avatar.pickAnother')}
          </button>
        </div>
      ) : (
        <>
          {/* Le cercle : la photo glisse dessous */}
          <div
            ref={stageRef}
            role="group"
            tabIndex={0}
            aria-label={t('avatar.stage')}
            aria-describedby={hintId}
            aria-busy={!source}
            dir="ltr"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onKeyDown={onKeyDown}
            className={cn(
              'relative mx-auto mt-5 aspect-square w-full max-w-[18rem] touch-none overflow-hidden rounded-[1.75rem] bg-muted select-none',
              source && (dragging ? 'cursor-grabbing' : 'cursor-grab'),
              focusRing,
            )}
          >
            {source && stage > 0 ? (
              <FramedImage source={source} frame={frame} size={stage} />
            ) : (
              <span className="absolute inset-0 grid place-items-center skeleton-shimmer">
                <PulsatingDots label={t('avatar.opening')} />
              </span>
            )}
            {/* Autour du cercle, l'ombre de ce qui ne sera pas gardé */}
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_100vmax_rgb(7_8_13/0.58)] ring-2 ring-kente-paper/80" />
            {/* Pendant qu'on cadre : les tiers, pour placer le visage */}
            <span
              aria-hidden
              className={cn('pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300', dragging ? 'opacity-100' : 'opacity-0')}
              style={{ backgroundImage: `${thirds(90)}, ${thirds(180)}` }}
            />
          </div>

          {/* Le zoom */}
          <div className="mx-auto mt-4 flex max-w-[18rem] items-center gap-2.5">
            <ZoomOut aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <label htmlFor={zoomId} className="sr-only">
              {t('avatar.zoom')}
            </label>
            <input
              id={zoomId}
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={frame.zoom}
              disabled={!source || saving}
              onChange={(event) => source && setFrame((value) => zoomFrame(value, source, stage, Number(event.target.value)))}
              aria-valuetext={`${Math.round(frame.zoom * 100)} %`}
              className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--kente-gold)] disabled:cursor-default disabled:opacity-50"
            />
            <ZoomIn aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <button
              type="button"
              disabled={!source || saving}
              onClick={() => source && setFrame(centeredFrame(source))}
              aria-label={t('avatar.recenter')}
              title={t('avatar.recenter')}
              className={cn('grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/7 hover:text-foreground disabled:opacity-50', focusRing)}
            >
              <RotateCcw aria-hidden className="size-4" />
            </button>
          </div>

          {/* Les aperçus */}
          <div className="mt-5 flex items-center justify-center gap-4 rounded-2xl bg-foreground/4 px-4 py-3">
            <span className="eyebrow">{t('avatar.preview')}</span>
            {PREVIEWS.map((size) => (
              <span
                key={size}
                aria-hidden
                dir="ltr"
                className="relative shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-surface"
                style={{ width: size, height: size }}
              >
                {source && <FramedImage source={source} frame={frame} size={size} />}
              </span>
            ))}
          </div>
        </>
      )}

      <AnimatePresence initial={false}>
        {failure && (
          <m.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <span className="mt-4 flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/8 px-3.5 py-3 text-sm text-coral">
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {failure}
            </span>
          </m.p>
        )}
      </AnimatePresence>

      <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
        {!unreadable && (
          <button
            type="button"
            disabled={saving}
            onClick={onPickAnother}
            className={cn('inline-flex h-11 items-center justify-center gap-2 rounded-[0.875rem] px-3 text-sm font-bold text-gold transition-colors hover:bg-gold/8 disabled:opacity-50 sm:me-auto', focusRing)}
          >
            <ImageUp aria-hidden className="size-4" />
            {t('avatar.pickAnother')}
          </button>
        )}
        <Dialog.Close
          disabled={saving}
          className={cn('inline-flex h-11 items-center justify-center rounded-[0.875rem] px-4 text-sm font-bold text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground disabled:opacity-50', focusRing, unreadable && 'sm:ms-auto')}
        >
          {t('avatar.cancel')}
        </Dialog.Close>
        {!unreadable && (
          <button
            type="button"
            onClick={() => void save()}
            disabled={!source}
            aria-busy={saving || undefined}
            className={cn(
              'relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-[0.875rem] bg-kente-warm px-5 text-sm font-bold text-kente-night shadow-[0_12px_28px_-14px_var(--kente-coral)] transition-[translate,box-shadow,opacity] duration-300 ease-out-expo hover:-translate-y-px disabled:opacity-60 disabled:hover:translate-y-0',
              focusRing,
            )}
          >
            {/* L'envoi avance sous le bouton, comme un fil qui se tisse */}
            {saving && (
              <span aria-hidden className="absolute inset-y-0 start-0 bg-kente-paper/30 transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
            )}
            {saving && <PulsatingDots size="sm" tone="current" />}
            <span className="relative">{saving ? t('avatar.saving', { percent: Math.round(progress * 100) }) : t('avatar.save')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Les deux lignes des tiers, dans un sens (90 : verticales, 180 : horizontales) */
function thirds(angle: 90 | 180): string {
  const line = 'rgb(245 245 242 / 0.45)';
  return `linear-gradient(${angle}deg, transparent calc(33.33% - 0.5px), ${line} calc(33.33% - 0.5px) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px) calc(66.67% - 0.5px), ${line} calc(66.67% - 0.5px) calc(66.67% + 0.5px), transparent calc(66.67% + 0.5px))`;
}

/** La photo placée selon le cadrage, dans un cercle de cette taille (en pixels d'écran) */
function FramedImage({ source, frame, size }: { source: AvatarSource; frame: AvatarFrame; size: number }) {
  const scale = frameScale(frame, source, size);
  return (
    <img
      src={source.url}
      alt=""
      draggable={false}
      className="pointer-events-none absolute top-0 left-0 max-w-none select-none"
      style={{
        width: source.width * scale,
        height: source.height * scale,
        transform: `translate3d(${size / 2 - frame.cx * scale}px, ${size / 2 - frame.cy * scale}px, 0)`,
      }}
    />
  );
}
