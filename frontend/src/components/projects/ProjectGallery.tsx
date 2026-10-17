import { ChevronLeft, ChevronRight, Expand, ImageIcon, X } from 'lucide-react';
import { AnimatePresence, m, useMotionTemplate, useMotionValue, useSpring, type PanInfo } from 'motion/react';
import { Dialog } from 'radix-ui';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import LazyImage from '@/components/shared/LazyImage';
import { useLanguage } from '@/hooks/useLanguage';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { useDataSaverStore } from '@/store/useDataSaverStore';
import type { Project } from '@/types/project.types';

/** Une image de la galerie : les captures du projet, puis sa couverture */
interface Shot {
  key: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  credit: string | null;
  sourceUrl: string | null;
}

function shotsOf(project: Project): Shot[] {
  const gallery: Shot[] = (project.gallery ?? []).map((media) => ({
    key: `media-${media.id}`,
    url: media.url,
    thumbnailUrl: media.thumbnailUrl,
    caption: media.caption,
    credit: media.credit,
    sourceUrl: media.sourceUrl,
  }));
  const cover: Shot[] = project.coverUrl
    ? [
        {
          key: 'cover',
          url: project.coverUrl,
          thumbnailUrl: project.coverThumbnailUrl,
          caption: null,
          credit: project.coverCredit,
          sourceUrl: project.coverSourceUrl,
        },
      ]
    : [];
  return [...gallery, ...cover];
}

// Glisser d'au moins cette distance (px) change d'image
const SWIPE = 60;

/**
 * Galerie du projet : la capture principale et ses miniatures. Design 3D.
 *
 * - La capture s'incline doucement sous le pointeur, avec un reflet qui le suit (ordinateur).
 * - Une miniature, les flèches du clavier, ou un glissé du doigt changent d'image ; la nouvelle glisse
 *   depuis le côté d'où l'on vient.
 * - « Agrandir » ouvre la visionneuse plein écran : flèches, glissé, Échap, légendes et crédits.
 */
export default function ProjectGallery({ project }: { project: Project }) {
  const { t } = useTranslation();
  const shots = shotsOf(project);
  const [[index, direction], setIndex] = useState<[number, number]>([0, 0]);
  const [viewer, setViewer] = useState(false);
  const panelId = useId();

  // `next` peut sortir de la liste (après la dernière, la première) : le sens du glissé vient de lui
  function show(next: number) {
    const target = (next + shots.length) % shots.length;
    setIndex(([current]) => [target, Math.sign(next - current)]);
  }

  if (shots.length === 0) {
    return (
      <div className="glass grid aspect-[16/10] place-items-center rounded-[1.375rem] hatch">
        <span className="flex items-center gap-2 font-mono text-xs text-faint-foreground">
          <ImageIcon aria-hidden className="size-4" />
          {t('project.gallery.empty')}
        </span>
      </div>
    );
  }

  const active = shots[Math.min(index, shots.length - 1)];

  return (
    <section aria-label={t('project.gallery.label', { name: project.name })} className="relative min-w-0">
      <m.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="glass overflow-hidden rounded-[1.375rem] shadow-[0_40px_80px_-48px_rgb(0_0_0/0.6)]"
      >
        <Stage
          id={panelId}
          shots={shots}
          index={index}
          direction={direction}
          onShow={show}
          onOpen={() => setViewer(true)}
          name={project.name}
        />
        {shots.length > 1 && <Thumbnails shots={shots} index={index} panelId={panelId} onShow={show} name={project.name} />}
      </m.div>
      <span className="sr-only" aria-live="polite">
        {t('project.gallery.item', { index: index + 1, total: shots.length })}
        {active.caption ? ` : ${active.caption}` : ''}
      </span>

      <Viewer open={viewer} onOpenChange={setViewer} shots={shots} index={index} direction={direction} onShow={show} name={project.name} />
    </section>
  );
}

interface StageProps {
  id: string;
  shots: Shot[];
  index: number;
  direction: number;
  onShow: (index: number) => void;
  onOpen: () => void;
  name: string;
}

/** La capture principale : inclinaison au pointeur, glissé du doigt, légende et crédit. */
function Stage({ id, shots, index, direction, onShow, onOpen, name }: StageProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const reduced = useReducedMotion();
  const shot = shots[index];
  const rtl = language.dir === 'rtl';
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  // Inclinaison 3D et reflet, sous le pointeur
  const rotateX = useSpring(0, { stiffness: 160, damping: 18 });
  const rotateY = useSpring(0, { stiffness: 160, damping: 18 });
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgb(255 255 255 / 0.16), transparent 55%)`;

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== 'mouse') {
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    rotateY.set((x - 0.5) * 7);
    rotateX.set((0.5 - y) * 6);
    glareX.set(x * 100);
    glareY.set(y * 100);
  }

  function onPointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    // En arabe, la galerie se lit de droite à gauche : glisser vers la droite avance
    const forward = rtl ? info.offset.x > SWIPE : info.offset.x < -SWIPE;
    const backward = rtl ? info.offset.x < -SWIPE : info.offset.x > SWIPE;
    if (forward) {
      onShow(index + 1);
    } else if (backward) {
      onShow(index - 1);
    }
  }

  return (
    <div className="[perspective:1200px]">
      <m.div
        id={id}
        role="tabpanel"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="group/stage relative aspect-[16/10] overflow-hidden bg-surface-raised hatch"
      >
        <AnimatePresence initial={false} custom={direction}>
          <m.div
            key={shot.key}
            custom={direction}
            variants={{
              enter: (dir: number) => ({ opacity: 0, x: `${(rtl ? -dir : dir) * 12}%`, scale: 1.03 }),
              center: { opacity: 1, x: 0, scale: 1 },
              exit: (dir: number) => ({ opacity: 0, x: `${(rtl ? dir : -dir) * 12}%`, scale: 0.98 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            drag={shots.length > 1 && coarse ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={onDragEnd}
            className="absolute inset-0"
          >
            <LazyImage
              src={shot.url}
              thumbnail={shot.thumbnailUrl}
              sizes="(min-width: 1024px) 520px, 100vw"
              alt={shot.caption ?? name}
              className="size-full"
              imageClassName="pointer-events-none select-none"
              loader
            />
          </m.div>
        </AnimatePresence>

        {/* Reflet */}
        {!reduced && (
          <m.span
            aria-hidden
            style={{ backgroundImage: glare }}
            className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500 group-hover/stage:opacity-100"
          />
        )}

        {/* Rang et agrandissement */}
        <span
          dir="ltr"
          className="pointer-events-none absolute end-3 top-3 z-20 rounded-full bg-kente-night/55 px-2 py-0.5 font-mono text-[0.6875rem] text-kente-paper/90 backdrop-blur-sm"
        >
          {index + 1} / {shots.length}
        </span>
        <button
          type="button"
          onClick={onOpen}
          aria-label={t('project.gallery.open')}
          title={t('project.gallery.open')}
          className="absolute start-3 top-3 z-20 grid size-9 place-items-center rounded-full bg-kente-night/55 text-kente-paper backdrop-blur-sm outline-none transition-[background-color,scale] duration-300 hover:scale-105 hover:bg-kente-night/75 focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          <Expand aria-hidden className="size-4" />
        </button>

        {/* Précédente, suivante : au survol */}
        {shots.length > 1 && (
          <>
            <StageArrow side="start" label={t('project.gallery.previous')} onClick={() => onShow(index - 1)} />
            <StageArrow side="end" label={t('project.gallery.next')} onClick={() => onShow(index + 1)} />
          </>
        )}

        {/* Légende et crédit */}
        {(shot.caption || shot.credit) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 bg-linear-to-t from-kente-night/85 via-kente-night/45 to-transparent px-4 pt-12 pb-3">
            <AnimatePresence mode="wait" initial={false}>
              <m.p
                key={shot.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                dir="auto"
                className="min-w-0 text-start text-[0.8125rem] leading-snug font-semibold text-kente-paper rtl:text-right"
              >
                {shot.caption}
              </m.p>
            </AnimatePresence>
            {shot.credit && <Credit credit={shot.credit} source={shot.sourceUrl} />}
          </div>
        )}
      </m.div>
    </div>
  );
}

function StageArrow({ side, label, onClick }: { side: 'start' | 'end'; label: string; onClick: () => void }) {
  const Icon = side === 'start' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'absolute top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-kente-night/55 text-kente-paper backdrop-blur-sm outline-none',
        'opacity-0 transition-[opacity,background-color,scale] duration-300 group-hover/stage:opacity-100 hover:scale-105 hover:bg-kente-night/75 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/70',
        'pointer-coarse:hidden',
        side === 'start' ? 'start-3' : 'end-3',
      )}
    >
      <Icon aria-hidden className="size-4.5 rtl:-scale-x-100" />
    </button>
  );
}

/** Crédit d'une image empruntée, vers sa source. */
function Credit({ credit, source }: { credit: string; source: string | null }) {
  const { t } = useTranslation();
  const label = t('showcase.photoCredit', { credit });
  const className = 'pointer-events-auto max-w-[55%] shrink-0 truncate rounded-full bg-kente-night/55 px-2 py-0.5 font-mono text-[0.625rem] leading-4 text-kente-paper/80 backdrop-blur-sm';
  return source ? (
    <a href={source} target="_blank" rel="noreferrer" className={cn(className, 'outline-none hover:text-kente-paper focus-visible:ring-2 focus-visible:ring-ring/70')}>
      {label}
    </a>
  ) : (
    <span className={className}>{label}</span>
  );
}

interface ThumbnailsProps {
  shots: Shot[];
  index: number;
  panelId: string;
  onShow: (index: number) => void;
  name: string;
}

/**
 * Les miniatures : des onglets qui choisissent la capture. Flèches, Début et Fin les parcourent ; un fil
 * kente glisse sous la miniature choisie.
 */
function Thumbnails({ shots, index, panelId, onShow, name }: ThumbnailsProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dataSaver = useDataSaverStore((s) => s.enabled);
  const list = useRef<HTMLDivElement>(null);

  function move(event: KeyboardEvent<HTMLDivElement>) {
    const forward = language.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = language.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    const next =
      event.key === forward ? index + 1 : event.key === backward ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? shots.length - 1 : null;
    if (next === null) {
      return;
    }
    event.preventDefault();
    const target = (next + shots.length) % shots.length;
    onShow(target);
    list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[target]?.focus();
  }

  return (
    <div
      ref={list}
      role="tablist"
      aria-label={t('project.gallery.label', { name })}
      onKeyDown={move}
      // Quatre miniatures à la fois ; au-delà, la rangée défile
      className="flex overflow-x-auto border-t border-glass-border [scrollbar-width:none]"
    >
      {shots.map((shot, position) => {
        const selected = position === index;
        return (
          <button
            key={shot.key}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            aria-label={t('project.gallery.item', { index: position + 1, total: shots.length })}
            onClick={() => onShow(position)}
            style={{ width: `${100 / Math.min(shots.length, 4)}%` }}
            className={cn(
              'group/thumb relative h-[4.5rem] shrink-0 overflow-hidden border-e border-glass-border bg-background outline-none last:border-e-0 sm:h-20',
              'focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-inset',
            )}
          >
            {dataSaver ? (
              <span className="grid size-full place-items-center hatch font-mono text-[0.625rem] text-faint-foreground">{position + 1}</span>
            ) : (
              <img
                src={shot.thumbnailUrl ?? shot.url}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className={cn(
                  'size-full object-cover transition-[opacity,scale] duration-500 ease-out-expo',
                  selected ? 'opacity-100' : 'opacity-55 group-hover/thumb:scale-105 group-hover/thumb:opacity-90',
                )}
              />
            )}
            {selected && (
              <m.span
                layoutId="gallery-thumb"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                className="absolute inset-x-0 bottom-0 h-[3px] bg-kente"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

interface ViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shots: Shot[];
  index: number;
  direction: number;
  onShow: (index: number) => void;
  name: string;
}

/**
 * La visionneuse plein écran : la capture en grand (1280 px), sa légende et son crédit ; flèches du
 * clavier et glissé pour changer d'image, glissé vers le bas ou Échap pour fermer.
 */
function Viewer({ open, onOpenChange, shots, index, direction, onShow, name }: ViewerProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const rtl = language.dir === 'rtl';
  const shot = shots[index];

  // Les voisines se chargent d'avance : la suivante s'affiche sans attendre
  useEffect(() => {
    if (!open) {
      return;
    }
    for (const neighbour of [shots[(index + 1) % shots.length], shots[(index - 1 + shots.length) % shots.length]]) {
      const image = new Image();
      image.src = neighbour.url;
    }
  }, [open, index, shots]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (shots.length < 2) {
      return;
    }
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward) {
      event.preventDefault();
      onShow(index + 1);
    } else if (event.key === backward) {
      event.preventDefault();
      onShow(index - 1);
    }
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 120 && Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
      onOpenChange(false);
      return;
    }
    const forward = rtl ? info.offset.x > SWIPE : info.offset.x < -SWIPE;
    const backward = rtl ? info.offset.x < -SWIPE : info.offset.x > SWIPE;
    if (forward) {
      onShow(index + 1);
    } else if (backward) {
      onShow(index - 1);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-kente-night/92 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 saver:backdrop-blur-none" />
        <Dialog.Content
          onKeyDown={onKeyDown}
          aria-describedby={undefined}
          className="dark fixed inset-0 z-50 flex flex-col text-foreground outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div className="flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 sm:px-6">
            <Dialog.Title className="min-w-0 flex-1 truncate text-sm font-semibold">
              <span dir="ltr" className="inline-block font-mono text-muted-foreground">
                {index + 1} / {shots.length}
              </span>
              <span className="mx-2 text-faint-foreground">·</span>
              <span dir="auto">{shot.caption ?? name}</span>
            </Dialog.Title>
            <Dialog.Close
              aria-label={t('project.gallery.close')}
              className="grid size-10 place-items-center rounded-full bg-foreground/10 text-foreground outline-none transition-colors hover:bg-foreground/20 focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 sm:px-20">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <m.img
                key={shot.key}
                src={shot.url}
                alt={shot.caption ?? name}
                custom={direction}
                variants={{
                  enter: (dir: number) => ({ opacity: 0, x: (rtl ? -dir : dir) * 80 }),
                  center: { opacity: 1, x: 0, y: 0 },
                  exit: (dir: number) => ({ opacity: 0, x: (rtl ? dir : -dir) * 80 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.35}
                onDragEnd={onDragEnd}
                draggable={false}
                className="max-h-full max-w-full cursor-grab rounded-xl object-contain shadow-[0_40px_120px_-40px_rgb(0_0_0/0.9)] select-none active:cursor-grabbing"
              />
            </AnimatePresence>
            {shots.length > 1 && (
              <>
                <ViewerArrow side="start" label={t('project.gallery.previous')} onClick={() => onShow(index - 1)} />
                <ViewerArrow side="end" label={t('project.gallery.next')} onClick={() => onShow(index + 1)} />
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {shot.credit && <Credit credit={shot.credit} source={shot.sourceUrl} />}
            {shots.length > 1 && (
              <div className="flex max-w-full gap-2 overflow-x-auto p-1">
                {shots.map((candidate, position) => (
                  <button
                    key={candidate.key}
                    type="button"
                    onClick={() => onShow(position)}
                    aria-label={t('project.gallery.item', { index: position + 1, total: shots.length })}
                    aria-current={position === index || undefined}
                    className={cn(
                      'relative h-12 w-[4.75rem] shrink-0 overflow-hidden rounded-lg outline-none transition-[opacity,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-ring/70',
                      position === index ? 'opacity-100 ring-2 ring-kente-gold' : 'opacity-45 hover:opacity-80',
                    )}
                  >
                    <img src={candidate.thumbnailUrl ?? candidate.url} alt="" loading="lazy" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground pointer-fine:hidden">{t('project.gallery.hint')}</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ViewerArrow({ side, label, onClick }: { side: 'start' | 'end'; label: string; onClick: () => void }) {
  const Icon = side === 'start' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'absolute top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-foreground/10 text-foreground outline-none transition-[background-color,scale] duration-300 hover:scale-105 hover:bg-foreground/20 focus-visible:ring-2 focus-visible:ring-ring/70 sm:grid',
        side === 'start' ? 'start-4' : 'end-4',
      )}
    >
      <Icon aria-hidden className="size-6 rtl:-scale-x-100" />
    </button>
  );
}
