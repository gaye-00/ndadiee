import { Crop, ImagePlus, RefreshCw, Trash2, TriangleAlert, Upload } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useId, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, inputClass } from './FormSection';
import ImageCropDialog, { type CropSource } from './ImageCropDialog';
import { LIMITS, withScheme, type DraftImage } from './projectDraft';
import { imageFilesOf, type LocalImages } from './useLocalImages';
import { useProjectImageUpload } from '@/hooks/useProjectImageUpload';
import { ImagePreparationError } from '@/lib/imageUpload';
import { openImage, type CropArea, type ProjectImageFiles } from '@/lib/projectImages';
import { cn } from '@/lib/utils';

const ORIGINAL_KEY = 'cover';

/** L'original et son cadrage : de quoi recadrer l'image une fois envoyée */
interface Original {
  source: CropSource;
  crop: CropArea;
}

type Upload =
  | { status: 'idle' }
  | { status: 'sending'; preview: string; progress: number }
  | { status: 'failed'; preview: string; message: string; files: ProjectImageFiles; original: Original };

interface CoverPickerProps {
  id: string;
  value: DraftImage | null;
  credit: string;
  sourceUrl: string;
  onChange: (cover: DraftImage | null) => void;
  onCreditChange: (change: { coverCredit?: string; coverSourceUrl?: string }) => void;
  errors: { cover?: string; coverCredit?: string; coverSourceUrl?: string };
  images: LocalImages;
  /** Suit un envoi en cours : le formulaire attend la fin des envois avant de publier */
  track: <T>(promise: Promise<T>) => Promise<T>;
}

/**
 * La couverture du projet : la première image qu'on voit, sur la carte de la vitrine et dans la galerie. On la dépose,
 * la colle ou la choisit ; elle s'ouvre aussitôt dans le cadreur (16:10), puis part pendant qu'on continue d'écrire,
 * son aperçu affiché avec l'avancement. Une photo empruntée porte son crédit (auteur, licence, source).
 */
export default function CoverPicker({ id, value, credit, sourceUrl, onChange, onCreditChange, errors, images, track }: CoverPickerProps) {
  const { t } = useTranslation('projectForm');
  const { prepare, upload } = useProjectImageUpload();
  const picker = useRef<HTMLInputElement>(null);
  const creditId = useId();
  const sourceId = useId();
  const [cropping, setCropping] = useState<{ source: CropSource; crop: CropArea | null } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [state, setState] = useState<Upload>({ status: 'idle' });
  const [dragging, setDragging] = useState(false);
  const [creditOpen, setCreditOpen] = useState(() => credit.trim() !== '' || sourceUrl.trim() !== '');
  const [refused, setRefused] = useState<string | null>(null);

  // L'aperçu d'un envoi pas encore abouti : libéré si l'envoi est abandonné ; une fois l'image envoyée, il appartient
  // aux images locales du formulaire
  const unsent = useRef<string | null>(null);
  useEffect(() => () => {
    if (unsent.current) {
      URL.revokeObjectURL(unsent.current);
    }
  }, []);

  // Les originaux décodés pèsent lourd (une photo de 12 Mpx : 48 Mo) : on ne garde que celui de la couverture
  const sources = useRef(new Set<CropSource>());
  useEffect(() => {
    const owned = sources.current;
    return () => owned.forEach((source) => {
      URL.revokeObjectURL(source.url);
      source.bitmap.close();
    });
  }, []);

  function releaseSpareSources() {
    const kept = images.originalOf(ORIGINAL_KEY)?.source;
    sources.current.forEach((source) => {
      if (source !== kept) {
        URL.revokeObjectURL(source.url);
        source.bitmap.close();
        sources.current.delete(source);
      }
    });
  }

  function forgetUnsent() {
    if (unsent.current) {
      URL.revokeObjectURL(unsent.current);
      unsent.current = null;
    }
  }

  async function choose(file: File | undefined) {
    if (!file || state.status === 'sending') {
      return;
    }
    setRefused(null);
    try {
      const bitmap = await openImage(file);
      releaseSpareSources();
      const source = { bitmap, url: URL.createObjectURL(file), name: file.name };
      sources.current.add(source);
      setCropping({ source, crop: null });
      setDialogOpen(true);
    } catch (error) {
      setRefused(error instanceof ImagePreparationError ? t('images.errorType', { name: file.name }) : t('images.errorUpload'));
    }
  }

  async function send(files: ProjectImageFiles, preview: string, original: Original) {
    setState({ status: 'sending', preview, progress: 0 });
    try {
      const uploaded = await track(upload(files, (progress) => setState((current) => (current.status === 'sending' ? { ...current, progress } : current))));
      unsent.current = null;
      images.keepPreview(uploaded.url, preview);
      images.keepOriginal(ORIGINAL_KEY, original);
      onChange(uploaded);
      setState({ status: 'idle' });
    } catch (error) {
      setState({ status: 'failed', preview, files, original, message: error instanceof Error ? error.message : String(error) });
    }
  }

  async function confirm(crop: CropArea) {
    if (!cropping) {
      return;
    }
    setDialogOpen(false);
    const original = { source: cropping.source, crop };
    try {
      const files = await prepare(cropping.source.bitmap, crop, cropping.source.name);
      forgetUnsent();
      unsent.current = URL.createObjectURL(files.thumbnail);
      void send(files, unsent.current, original);
    } catch (error) {
      setRefused(error instanceof Error ? error.message : String(error));
    }
  }

  function recrop() {
    const original = images.originalOf(ORIGINAL_KEY);
    if (original) {
      setCropping({ source: original.source, crop: original.crop });
      setDialogOpen(true);
    }
  }

  function remove() {
    forgetUnsent();
    images.dropOriginal(ORIGINAL_KEY);
    releaseSpareSources();
    setState({ status: 'idle' });
    onChange(null);
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    void choose(imageFilesOf(event.dataTransfer.files)[0]);
  }

  function onPaste(event: ClipboardEvent<HTMLElement>) {
    const file = imageFilesOf(event.clipboardData.files)[0];
    if (file) {
      event.preventDefault();
      void choose(file);
    }
  }

  const shown = state.status !== 'idle' ? state.preview : value ? (images.previewOf(value.url) ?? value.url) : null;
  const canRecrop = value !== null && state.status === 'idle' && images.originalOf(ORIGINAL_KEY) !== undefined;
  const error = refused ?? errors.cover;

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={picker}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          void choose(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onPaste={onPaste}
        className={cn(
          'group/cover relative aspect-[16/10] overflow-hidden rounded-[1.25rem] border transition-[border-color,box-shadow] duration-300',
          dragging ? 'border-gold shadow-[0_0_0_6px_color-mix(in_srgb,var(--gold)_16%,transparent)]' : 'border-border',
          error && !dragging && 'border-coral/60',
        )}
      >
        {shown ? (
          <>
            <img
              src={shown}
              srcSet={state.status === 'idle' && value && !images.previewOf(value.url) ? `${value.thumbnailUrl} 640w, ${value.url} 1280w` : undefined}
              sizes="(min-width: 1024px) 44rem, 100vw"
              alt={t('cover.alt')}
              className={cn('size-full object-cover transition-[filter,scale] duration-500', state.status !== 'idle' && 'scale-[1.01] brightness-75')}
            />
            {/* Actions : au survol, au focus, et toujours sur un écran tactile */}
            {state.status === 'idle' && (
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-end gap-2 bg-linear-to-t from-kente-night/80 to-transparent p-3 pt-12 opacity-100 transition-opacity duration-300 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/cover:opacity-100 [@media(hover:hover)]:group-focus-within/cover:opacity-100">
                {canRecrop && (
                  <OverlayButton onClick={recrop} icon={Crop}>
                    {t('cover.recrop')}
                  </OverlayButton>
                )}
                <OverlayButton id={id} onClick={() => picker.current?.click()} icon={RefreshCw}>
                  {t('cover.replace')}
                </OverlayButton>
                <OverlayButton onClick={remove} icon={Trash2} tone="danger">
                  {t('cover.remove')}
                </OverlayButton>
              </div>
            )}
            <AnimatePresence>
              {state.status !== 'idle' && (
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 grid place-items-center p-4"
                >
                  {state.status === 'sending' ? (
                    <ProgressBadge progress={state.progress} label={t('images.sending')} />
                  ) : (
                    <div role="alert" className="flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-kente-night/85 p-4 text-center text-sm text-kente-paper backdrop-blur-md">
                      <span className="flex items-center gap-2 text-coral">
                        <TriangleAlert aria-hidden className="size-4" />
                        {state.message}
                      </span>
                      <div className="flex gap-2">
                        <OverlayButton onClick={() => void send(state.files, state.preview, state.original)} icon={RefreshCw}>
                          {t('images.retry')}
                        </OverlayButton>
                        <OverlayButton onClick={remove} icon={Trash2} tone="danger">
                          {t('cover.remove')}
                        </OverlayButton>
                      </div>
                    </div>
                  )}
                </m.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <button
            id={id}
            type="button"
            onClick={() => picker.current?.click()}
            aria-describedby={error ? `${id}-help` : `${id}-hint`}
            className="group/drop flex size-full flex-col items-center justify-center gap-3 bg-foreground/[0.025] p-6 text-center outline-none transition-colors hatch hover:bg-foreground/[0.045] focus-visible:bg-gold/6"
          >
            <span className="grid size-14 place-items-center rounded-2xl bg-kente-conic text-kente-night shadow-[0_18px_40px_-18px_var(--kente-coral)] transition-transform duration-500 ease-out-expo group-hover/drop:-translate-y-1 group-hover/drop:rotate-3 group-focus-visible/drop:-translate-y-1">
              {dragging ? <Upload aria-hidden className="size-6" /> : <ImagePlus aria-hidden className="size-6" />}
            </span>
            <span className="font-display text-[1.0625rem] text-foreground">{t(dragging ? 'cover.drop' : 'cover.empty')}</span>
            <span id={`${id}-hint`} className="max-w-xs text-xs leading-relaxed text-muted-foreground">
              {t('cover.hint')}
            </span>
          </button>
        )}
      </div>

      {error && (
        <p id={`${id}-help`} role="alert" className="text-xs text-coral">
          {error}
        </p>
      )}

      {/* ── Photo empruntée : son crédit ── */}
      {(value || state.status !== 'idle') && (
        <div className="rounded-2xl border border-border-subtle bg-foreground/[0.02]">
          <button
            type="button"
            aria-expanded={creditOpen}
            onClick={() => setCreditOpen((open) => !open)}
            className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-start text-sm font-semibold text-soft-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <span className="flex-1">{t('cover.borrowed')}</span>
            <span aria-hidden className={cn('text-lg leading-none text-muted-foreground transition-transform duration-300', creditOpen && 'rotate-45')}>
              +
            </span>
          </button>
          <AnimatePresence initial={false}>
            {creditOpen && (
              <m.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="grid gap-4 px-4 pt-1 pb-4 sm:grid-cols-2">
                  <FormField id={creditId} label={t('cover.creditLabel')} error={errors.coverCredit} count={[credit.length, LIMITS.credit]}>
                    <input
                      id={creditId}
                      value={credit}
                      onChange={(event) => onCreditChange({ coverCredit: event.target.value })}
                      placeholder={t('cover.creditPlaceholder')}
                      maxLength={LIMITS.credit + 20}
                      aria-invalid={errors.coverCredit ? true : undefined}
                      aria-describedby={`${creditId}-help`}
                      dir="auto"
                      className={inputClass(errors.coverCredit !== undefined)}
                    />
                  </FormField>
                  <FormField id={sourceId} label={t('cover.sourceLabel')} error={errors.coverSourceUrl}>
                    <input
                      id={sourceId}
                      type="url"
                      inputMode="url"
                      value={sourceUrl}
                      onChange={(event) => onCreditChange({ coverSourceUrl: event.target.value })}
                      onBlur={() => sourceUrl && onCreditChange({ coverSourceUrl: withScheme(sourceUrl) })}
                      placeholder="https://unsplash.com/photos/…"
                      aria-invalid={errors.coverSourceUrl ? true : undefined}
                      aria-describedby={`${sourceId}-help`}
                      dir="ltr"
                      className={inputClass(errors.coverSourceUrl !== undefined)}
                    />
                  </FormField>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <ImageCropDialog
        source={cropping?.source ?? null}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={t('crop.coverTitle')}
        initialCrop={cropping?.crop}
        onConfirm={(crop) => void confirm(crop)}
      />
    </div>
  );
}

interface OverlayButtonProps {
  id?: string;
  onClick: () => void;
  icon: typeof Crop;
  tone?: 'default' | 'danger';
  children: string;
}

/** Un bouton posé sur l'image : verre sombre, lisible sur n'importe quelle photo */
export function OverlayButton({ id, onClick, icon: Icon, tone = 'default', children }: OverlayButtonProps) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full bg-kente-night/65 px-3.5 text-[0.8125rem] font-semibold text-kente-paper backdrop-blur-md outline-none transition-colors saver:backdrop-blur-none',
        'hover:bg-kente-night/85 focus-visible:ring-2 focus-visible:ring-kente-gold',
        tone === 'danger' && 'hover:text-coral',
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {children}
    </button>
  );
}

/** L'avancement d'un envoi : un anneau qui se remplit, et le pourcentage */
export function ProgressBadge({ progress, label, compact = false }: { progress: number; label: string; compact?: boolean }) {
  const percent = Math.round(progress * 100);
  const radius = 15;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn(
        'flex items-center gap-2.5 rounded-full bg-kente-night/70 text-kente-paper backdrop-blur-md saver:backdrop-blur-none',
        compact ? 'p-1.5' : 'py-2 ps-2 pe-4',
      )}
    >
      <svg viewBox="0 0 36 36" className={compact ? 'size-7' : 'size-9'} aria-hidden>
        <circle cx="18" cy="18" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="3.5" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="var(--kente-gold)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.max(0.04, progress))}
          transform="rotate(-90 18 18)"
          className="transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      {!compact && <span className="font-mono text-xs tabular-nums">{`${label} · ${percent} %`}</span>}
    </div>
  );
}
