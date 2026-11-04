import { ArrowLeft, ArrowRight, Camera, Crop, GripVertical, ImagePlus, Monitor, PenLine, RefreshCw, Trash2, TriangleAlert } from 'lucide-react';
import { AnimatePresence, m, Reorder, useDragControls } from 'motion/react';
import { Popover } from 'radix-ui';
import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { OverlayButton, ProgressBadge } from './CoverPicker';
import { FormField } from './FormSection';
import { inputClass } from './formStyles';
import ImageCropDialog from './ImageCropDialog';
import { draftId, LIMITS, withScheme, type DraftErrors, type DraftShot } from './projectDraft';
import { imageFilesOf, useCropSession, type CroppedImage, type LocalImages } from './useLocalImages';
import { useProjectImageUpload } from '@/hooks/useProjectImageUpload';
import { centeredCrop, openImage } from '@/lib/projectImages';
import { cn } from '@/lib/utils';
import type { MediaKind } from '@/types/project.types';

/** Une image en route : son aperçu, son avancement, ou ce qui a échoué */
interface PendingShot {
  id: string;
  preview: string;
  progress: number;
  error: string | null;
  image: CroppedImage;
  /** Un recadrage remplace l'image à cet emplacement, légende comprise */
  replaces: string | null;
}

const originalKey = (id: string) => `shot-${id}`;

interface GalleryEditorProps {
  id: string;
  value: DraftShot[];
  onChange: (gallery: DraftShot[]) => void;
  errors: DraftErrors;
  images: LocalImages;
  track: <T>(promise: Promise<T>) => Promise<T>;
}

/**
 * Les captures du projet, après la couverture, dans l'ordre de la galerie de sa page (12 au plus). On en dépose
 * plusieurs d'un coup : chacune est cadrée au centre en 16:10 et part aussitôt ; « Recadrer » permet d'ajuster. On les
 * range en les faisant glisser par leur poignée (ou au clavier : Alt + flèches), et chacune reçoit sa légende, son
 * type (capture d'écran ou photo) et, si elle est empruntée, son crédit.
 */
export default function GalleryEditor({ id, value, onChange, errors, images, track }: GalleryEditorProps) {
  const { t } = useTranslation('projectForm');
  const { prepare, upload } = useProjectImageUpload();
  const picker = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingShot[]>([]);
  const [dragging, setDragging] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  // La galerie à jour, pour les envois qui se terminent pendant qu'on la modifie
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });
  const cropper = useCropSession((image, key) => void send(image, key), setRefused);

  // Les aperçus des envois abandonnés (composant quitté en cours d'envoi)
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  });
  useEffect(() => () => pendingRef.current.forEach((shot) => URL.revokeObjectURL(shot.preview)), []);

  const room = LIMITS.gallery - value.length - pending.filter((shot) => !shot.replaces).length;

  async function send(image: CroppedImage, replaces: string | null, retry?: PendingShot) {
    const shot: PendingShot = retry
      ? { ...retry, error: null, progress: 0 }
      : { id: draftId(), preview: URL.createObjectURL(image.files.thumbnail), progress: 0, error: null, image, replaces };
    setPending((current) => (retry ? current.map((other) => (other.id === shot.id ? shot : other)) : [...current, shot]));
    try {
      const uploaded = await track(
        upload(image.files, (progress) => setPending((current) => current.map((other) => (other.id === shot.id ? { ...other, progress } : other)))),
      );
      images.keepPreview(uploaded.url, shot.preview);
      const target = shot.replaces ?? shot.id;
      images.keepOriginal(originalKey(target), image.original);
      const gallery = latest.current;
      const replaced = gallery.find((other) => other.id === shot.replaces);
      onChange(
        replaced
          ? gallery.map((other) => (other.id === replaced.id ? { ...replaced, ...uploaded } : other))
          : [...gallery, { id: target, kind: 'SCREENSHOT', caption: '', credit: '', sourceUrl: '', ...uploaded }],
      );
      setPending((current) => current.filter((other) => other.id !== shot.id));
    } catch (error) {
      setPending((current) =>
        current.map((other) => (other.id === shot.id ? { ...other, error: error instanceof Error ? error.message : String(error) } : other)),
      );
    }
  }

  /** Des fichiers déposés ou choisis : cadrés au centre, puis envoyés ; décodés un par un, pour ménager la mémoire */
  async function add(files: File[]) {
    setRefused(null);
    const accepted = files.slice(0, Math.max(0, room));
    if (files.length > accepted.length) {
      setRefused(t('gallery.full', { count: LIMITS.gallery }));
    }
    for (const file of accepted) {
      try {
        const bitmap = await openImage(file);
        const crop = centeredCrop(bitmap.width, bitmap.height);
        try {
          const prepared = await prepare(bitmap, crop, file.name);
          void send({ files: prepared, original: { file, crop } }, null);
        } finally {
          bitmap.close();
        }
      } catch (error) {
        setRefused(error instanceof Error && error.message !== 'type' ? error.message : t('images.errorType', { name: file.name }));
      }
    }
  }

  function update(shotId: string, change: Partial<DraftShot>) {
    onChange(value.map((shot) => (shot.id === shotId ? { ...shot, ...change } : shot)));
  }

  function move(shotId: string, step: -1 | 1) {
    const index = value.findIndex((shot) => shot.id === shotId);
    const target = index + step;
    if (index < 0 || target < 0 || target >= value.length) {
      return;
    }
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function remove(shotId: string) {
    images.dropOriginal(originalKey(shotId));
    onChange(value.filter((shot) => shot.id !== shotId));
  }

  function discard(shot: PendingShot) {
    URL.revokeObjectURL(shot.preview);
    setPending((current) => current.filter((other) => other.id !== shot.id));
  }

  function recrop(shotId: string) {
    const original = images.originalOf(originalKey(shotId));
    if (original) {
      void cropper.start(original.file, shotId, original.crop);
    }
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    void add(imageFilesOf(event.dataTransfer.files));
  }

  const galleryError = errors.gallery ?? Object.entries(errors).find(([path]) => /^gallery\.\d+\.url$/.test(path))?.[1];

  return (
    <div
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) {
          event.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(event) => !event.currentTarget.contains(event.relatedTarget as Node | null) && setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'flex flex-col gap-3 rounded-[1.25rem] transition-shadow duration-300',
        dragging && 'shadow-[0_0_0_2px_var(--gold),0_0_0_8px_color-mix(in_srgb,var(--gold)_14%,transparent)]',
      )}
    >
      <div className="flex items-baseline gap-3">
        <span className="eyebrow">{t('gallery.label')}</span>
        <span className="font-mono text-[0.6875rem] text-faint-foreground tabular-nums">{`${value.length}/${LIMITS.gallery}`}</span>
        <span className="ms-auto hidden text-xs text-muted-foreground sm:inline">{value.length > 1 && t('gallery.reorderHint')}</span>
      </div>

      <input
        ref={picker}
        id={`${id}-input`}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          void add(imageFilesOf(event.target.files));
          event.target.value = '';
        }}
      />

      <div className="-mx-1 overflow-x-auto px-1 pt-1 pb-3 [scrollbar-width:thin]">
        <div className="flex w-max gap-3">
          <Reorder.Group as="ol" axis="x" values={value} onReorder={onChange} layoutScroll className="flex gap-3" aria-label={t('gallery.label')}>
            {value.map((shot, index) => (
              <ShotTile
                key={shot.id}
                shot={shot}
                index={index}
                count={value.length}
                preview={images.previewOf(shot.url)}
                canRecrop={images.originalOf(originalKey(shot.id)) !== undefined}
                replacing={pending.find((other) => other.replaces === shot.id && !other.error)?.progress}
                errors={errors}
                onChange={(change) => update(shot.id, change)}
                onMove={(step) => move(shot.id, step)}
                onRecrop={() => recrop(shot.id)}
                onRemove={() => remove(shot.id)}
              />
            ))}
          </Reorder.Group>

          <AnimatePresence initial={false}>
            {pending
              .filter((shot) => !shot.replaces || shot.error)
              .map((shot) => (
                <m.div
                  key={shot.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className="relative aspect-[16/10] w-48 shrink-0 overflow-hidden rounded-2xl border border-border sm:w-52"
                >
                  <img src={shot.preview} alt="" className={cn('size-full object-cover', shot.error ? 'opacity-40' : 'brightness-75')} />
                  <div className="absolute inset-0 grid place-items-center p-2">
                    {shot.error ? (
                      <div role="alert" className="flex flex-col items-center gap-2 text-center">
                        <span className="flex items-center gap-1.5 rounded-full bg-kente-night/80 px-2.5 py-1 text-[0.6875rem] text-coral">
                          <TriangleAlert aria-hidden className="size-3" />
                          <span className="line-clamp-2">{shot.error}</span>
                        </span>
                        <div className="flex gap-1.5">
                          <OverlayButton onClick={() => void send(shot.image, shot.replaces, shot)} icon={RefreshCw}>
                            {t('images.retry')}
                          </OverlayButton>
                          <OverlayButton onClick={() => discard(shot)} icon={Trash2} tone="danger">
                            {t('gallery.discard')}
                          </OverlayButton>
                        </div>
                      </div>
                    ) : (
                      <ProgressBadge progress={shot.progress} label={t('images.sending')} compact />
                    )}
                  </div>
                </m.div>
              ))}
          </AnimatePresence>

          {room > 0 && (
            <button
              id={id}
              type="button"
              onClick={() => picker.current?.click()}
              aria-describedby={`${id}-help`}
              className={cn(
                'group/add flex aspect-[16/10] w-48 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-3 text-center outline-none transition-colors sm:w-52',
                'border-border-strong text-muted-foreground hover:border-gold/60 hover:bg-gold/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70',
              )}
            >
              <ImagePlus aria-hidden className="size-5 transition-transform duration-300 group-hover/add:-translate-y-0.5" />
              <span className="text-[0.8125rem] font-semibold">{t(value.length === 0 ? 'gallery.addFirst' : 'gallery.add')}</span>
              <span className="text-[0.6875rem] text-faint-foreground">{t('gallery.addHint', { count: room })}</span>
            </button>
          )}
        </div>
      </div>

      <p id={`${id}-help`} role={refused || galleryError ? 'alert' : undefined} className={cn('text-xs leading-relaxed', refused || galleryError ? 'text-coral' : 'text-muted-foreground')}>
        {refused ?? galleryError ?? t('gallery.hint')}
      </p>

      <ImageCropDialog {...cropper.dialog} title={t('crop.shotTitle')} />
    </div>
  );
}

interface ShotTileProps {
  shot: DraftShot;
  index: number;
  count: number;
  preview: string | undefined;
  canRecrop: boolean;
  /** Un recadrage de l'image est en route : son avancement */
  replacing: number | undefined;
  errors: DraftErrors;
  onChange: (change: Partial<DraftShot>) => void;
  onMove: (step: -1 | 1) => void;
  onRecrop: () => void;
  onRemove: () => void;
}

const KINDS: ReadonlyArray<{ kind: MediaKind; icon: typeof Monitor }> = [
  { kind: 'SCREENSHOT', icon: Monitor },
  { kind: 'PHOTO', icon: Camera },
];

/** Une capture de la galerie : glissée par sa poignée, éditée dans sa bulle (légende, type, crédit, place). */
function ShotTile({ shot, index, count, preview, canRecrop, replacing, errors, onChange, onMove, onRecrop, onRemove }: ShotTileProps) {
  const { t } = useTranslation('projectForm');
  const controls = useDragControls();
  const fieldId = useId();
  const [editing, setEditing] = useState(false);
  const [lifted, setLifted] = useState(false);
  const prefix = `gallery.${index}`;
  const fieldErrors = { caption: errors[`${prefix}.caption`], credit: errors[`${prefix}.credit`], sourceUrl: errors[`${prefix}.sourceUrl`] };
  const invalid = Object.values(fieldErrors).some(Boolean);
  const label = t('gallery.item', { index: index + 1, total: count });

  function onHandleKey(event: KeyboardEvent<HTMLButtonElement>) {
    const rtl = document.documentElement.dir === 'rtl';
    if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      const forward = (event.key === 'ArrowRight') !== rtl;
      onMove(forward ? 1 : -1);
      requestAnimationFrame(() => event.currentTarget?.focus());
    }
  }

  return (
    <Reorder.Item
      as="li"
      value={shot}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setLifted(true)}
      onDragEnd={() => setLifted(false)}
      className={cn('relative w-48 shrink-0 list-none sm:w-52', lifted && 'z-10')}
    >
      <div
        className={cn(
          'group/shot relative aspect-[16/10] overflow-hidden rounded-2xl border bg-surface transition-[box-shadow,border-color,scale] duration-300',
          lifted ? 'scale-[1.04] border-gold/60 shadow-[0_24px_48px_-20px_rgb(0_0_0/0.55)]' : 'border-border',
          invalid && 'border-coral/70',
        )}
      >
        <img
          src={preview ?? shot.thumbnailUrl}
          alt={shot.caption || label}
          draggable={false}
          className={cn('size-full object-cover transition-[filter] duration-300', replacing !== undefined && 'brightness-50')}
        />
        {replacing !== undefined && (
          <span className="absolute inset-0 grid place-items-center">
            <ProgressBadge progress={replacing} label={t('images.sending')} compact />
          </span>
        )}
        <span className="absolute start-2 top-2 grid size-6 place-items-center rounded-full bg-kente-night/70 font-mono text-[0.6875rem] text-kente-paper backdrop-blur-sm saver:backdrop-blur-none">
          {index + 1}
        </span>
        {/* La poignée : glisser pour ranger, Alt + flèches au clavier */}
        <button
          type="button"
          aria-label={t('gallery.handle', { item: label })}
          aria-describedby={`${fieldId}-handle`}
          onPointerDown={(event) => controls.start(event)}
          onKeyDown={onHandleKey}
          className="absolute end-2 top-2 grid size-8 cursor-grab touch-none place-items-center rounded-full bg-kente-night/70 text-kente-paper outline-none backdrop-blur-sm transition-colors hover:bg-kente-night/90 focus-visible:ring-2 focus-visible:ring-kente-gold active:cursor-grabbing saver:backdrop-blur-none"
        >
          <GripVertical aria-hidden className="size-4" />
        </button>
        <span id={`${fieldId}-handle`} className="sr-only">
          {t('gallery.handleHint')}
        </span>
        {shot.kind === 'PHOTO' && (
          <span className="absolute start-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-kente-night/70 px-2 py-0.5 text-[0.625rem] text-kente-paper backdrop-blur-sm saver:backdrop-blur-none">
            <Camera aria-hidden className="size-3" />
            {t('gallery.kind.PHOTO')}
          </span>
        )}
      </div>

      <Popover.Root open={editing} onOpenChange={setEditing}>
        <Popover.Trigger
          className={cn(
            'mt-2 flex w-full items-center gap-1.5 rounded-lg px-1 py-0.5 text-start text-[0.8125rem] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/70',
            shot.caption ? 'text-soft-foreground hover:text-foreground' : 'text-faint-foreground hover:text-soft-foreground',
            invalid && 'text-coral',
          )}
        >
          <PenLine aria-hidden className="size-3.5 shrink-0" />
          <span dir="auto" className="min-w-0 flex-1 truncate">
            {shot.caption || t('gallery.addCaption')}
          </span>
          <span className="sr-only">{` · ${label}`}</span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={8}
            collisionPadding={12}
            className={cn(
              'z-50 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-4 rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-float outline-none',
              'origin-(--radix-popover-content-transform-origin) data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            )}
          >
            <p className="eyebrow">{label}</p>
            <FormField id={`${fieldId}-caption`} label={t('gallery.captionLabel')} error={fieldErrors.caption} count={[shot.caption.length, LIMITS.caption]}>
              <input
                id={`${fieldId}-caption`}
                value={shot.caption}
                onChange={(event) => onChange({ caption: event.target.value })}
                placeholder={t('gallery.captionPlaceholder')}
                maxLength={LIMITS.caption + 20}
                aria-invalid={fieldErrors.caption ? true : undefined}
                aria-describedby={`${fieldId}-caption-help`}
                dir="auto"
                className={inputClass(fieldErrors.caption !== undefined)}
              />
            </FormField>

            <fieldset className="flex flex-col gap-2">
              <legend className="eyebrow mb-2">{t('gallery.kindLabel')}</legend>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-foreground/5 p-1">
                {KINDS.map(({ kind, icon: Icon }) => (
                  <label
                    key={kind}
                    className={cn(
                      'relative inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[0.625rem] text-[0.8125rem] font-semibold transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring/70',
                      shot.kind === kind ? 'bg-surface text-foreground shadow-[0_1px_3px_var(--float-shadow)]' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <input type="radio" name={`${fieldId}-kind`} value={kind} checked={shot.kind === kind} onChange={() => onChange({ kind })} className="sr-only" />
                    <Icon aria-hidden className="size-4" />
                    {t(`gallery.kind.${kind}`)}
                  </label>
                ))}
              </div>
            </fieldset>

            <FormField id={`${fieldId}-credit`} label={t('gallery.creditLabel')} optional error={fieldErrors.credit} count={[shot.credit.length, LIMITS.credit]}>
              <input
                id={`${fieldId}-credit`}
                value={shot.credit}
                onChange={(event) => onChange({ credit: event.target.value })}
                placeholder={t('cover.creditPlaceholder')}
                maxLength={LIMITS.credit + 20}
                aria-invalid={fieldErrors.credit ? true : undefined}
                aria-describedby={`${fieldId}-credit-help`}
                dir="auto"
                className={inputClass(fieldErrors.credit !== undefined)}
              />
            </FormField>
            {shot.credit.trim() && (
              <FormField id={`${fieldId}-source`} label={t('cover.sourceLabel')} optional error={fieldErrors.sourceUrl}>
                <input
                  id={`${fieldId}-source`}
                  type="url"
                  inputMode="url"
                  value={shot.sourceUrl}
                  onChange={(event) => onChange({ sourceUrl: event.target.value })}
                  onBlur={() => shot.sourceUrl && onChange({ sourceUrl: withScheme(shot.sourceUrl) })}
                  placeholder="https://"
                  aria-invalid={fieldErrors.sourceUrl ? true : undefined}
                  aria-describedby={`${fieldId}-source-help`}
                  dir="ltr"
                  className={inputClass(fieldErrors.sourceUrl !== undefined)}
                />
              </FormField>
            )}

            <div className="flex flex-wrap items-center gap-1.5 border-t border-border-subtle pt-3">
              <TileAction icon={ArrowLeft} label={t('gallery.moveBefore')} disabled={index === 0} onClick={() => onMove(-1)} flip />
              <TileAction icon={ArrowRight} label={t('gallery.moveAfter')} disabled={index === count - 1} onClick={() => onMove(1)} flip />
              {canRecrop && (
                <TileAction
                  icon={Crop}
                  label={t('cover.recrop')}
                  onClick={() => {
                    setEditing(false);
                    onRecrop();
                  }}
                  wide
                />
              )}
              <TileAction
                icon={Trash2}
                label={t('gallery.remove')}
                tone="danger"
                onClick={() => {
                  setEditing(false);
                  onRemove();
                }}
                wide
                className="ms-auto"
              />
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </Reorder.Item>
  );
}

interface TileActionProps {
  icon: typeof Crop;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
  /** Le libellé s'affiche à côté de l'icône */
  wide?: boolean;
  /** L'icône se retourne en écriture de droite à gauche (flèches) */
  flip?: boolean;
  className?: string;
}

function TileAction({ icon: Icon, label, onClick, disabled = false, tone = 'default', wide = false, flip = false, className }: TileActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={wide ? undefined : label}
      title={wide ? undefined : label}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1.5 rounded-xl text-[0.8125rem] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/70 disabled:pointer-events-none disabled:opacity-35',
        wide ? 'px-3' : 'w-9',
        tone === 'danger' ? 'text-coral hover:bg-coral/10' : 'text-soft-foreground hover:bg-foreground/7 hover:text-foreground',
        className,
      )}
    >
      <Icon aria-hidden className={cn('size-4', flip && 'rtl:-scale-x-100')} />
      {wide && label}
    </button>
  );
}
