import { AlertDialog } from 'radix-ui';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { cn } from '@/lib/utils';

// Longueur de la colonne en base (ModerationReasonRequest.java)
const MAX_LENGTH = 500;

// Les motifs les plus courants, à compléter
const PRESETS = ['spam', 'fraud', 'abuse', 'offTopic', 'duplicate'] as const;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-popover';

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** « Motif (montré au titulaire du compte) » */
  reasonLabel: string;
  confirmLabel: string;
  /** Sans motif, le bouton attend (suspendre, masquer) ; facultatif pour une suppression */
  required?: boolean;
  /** Une action qu'on ne peut pas défaire : le bouton est rouge */
  destructive?: boolean;
  /** L'action est en route : le bouton attend, la fenêtre reste ouverte */
  pending?: boolean;
  onConfirm: (reason: string) => void;
}

/**
 * Une décision du back-office et son motif : il va au journal, et la personne concernée le lit (le titulaire d'un
 * compte suspendu, l'auteur d'un contenu masqué). Des motifs courants s'ajoutent d'un geste. Le focus va d'abord
 * au champ ; Échap ou « Annuler » referment sans rien décider. Feuille en bas de l'écran sur téléphone.
 */
export default function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  reasonLabel,
  confirmLabel,
  required = true,
  destructive = false,
  pending = false,
  onConfirm,
}: ReasonDialogProps) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation();
  const fieldId = useId();
  const hintId = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const [reason, setReason] = useState('');
  // Une validation a été tentée : le motif manquant se signale alors, pas avant
  const [touched, setTouched] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  const trimmed = reason.trim();
  const missing = required && trimmed.length === 0;

  // Chaque ouverture repart d'un motif vide
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason('');
      setTouched(false);
    }
  }

  function changeOpen(next: boolean) {
    if (!pending) {
      onOpenChange(next);
    }
  }

  function addPreset(text: string) {
    setReason((current) => (current.trim() ? `${current.trim()} ${text}` : text).slice(0, MAX_LENGTH));
    field.current?.focus();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!missing && !pending) {
      onConfirm(trimmed);
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={changeOpen}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-kente-night/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 saver:backdrop-blur-none" />
        <AlertDialog.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            field.current?.focus();
          }}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[1.75rem] border border-border bg-popover p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-popover-foreground shadow-float outline-none',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:pb-6',
            'sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95',
          )}
        >
          <form noValidate onSubmit={submit}>
            <AlertDialog.Title className="font-display text-h5">{title}</AlertDialog.Title>
            <AlertDialog.Description asChild>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</div>
            </AlertDialog.Description>

            <label htmlFor={fieldId} className="mt-5 block text-sm font-semibold">
              {reasonLabel}
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => addPreset(t(`reason.presets.${preset}`))}
                  className={cn(
                    'h-7 rounded-full border border-border px-2.5 text-xs font-semibold text-soft-foreground transition-colors hover:border-gold/40 hover:bg-gold/10 hover:text-foreground',
                    focusRing,
                  )}
                >
                  {t(`reason.presets.${preset}`)}
                </button>
              ))}
            </div>
            <textarea
              ref={field}
              id={fieldId}
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, MAX_LENGTH))}
              rows={3}
              maxLength={MAX_LENGTH}
              required={required}
              aria-invalid={touched && missing ? true : undefined}
              aria-describedby={hintId}
              placeholder={t('reason.placeholder')}
              className={cn(
                'mt-2.5 block w-full resize-y rounded-xl border bg-background/60 px-3.5 py-2.5 text-sm leading-relaxed outline-none transition-[border-color,box-shadow]',
                'placeholder:text-faint-foreground focus:border-gold/60 focus:ring-3 focus:ring-gold/15',
                touched && missing ? 'border-coral/60' : 'border-input',
              )}
            />
            <p id={hintId} className="mt-1.5 flex justify-between gap-3 text-xs">
              <span className={touched && missing ? 'font-semibold text-coral' : 'text-muted-foreground'}>
                {touched && missing ? t('reason.required') : required ? t('reason.shown') : t('reason.optional')}
              </span>
              <span className="shrink-0 font-mono text-faint-foreground">{t('reason.counter', { length: reason.length, max: MAX_LENGTH })}</span>
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel
                type="button"
                disabled={pending}
                className={cn(
                  'inline-flex h-11 items-center justify-center rounded-[0.875rem] border border-border-strong px-4 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50',
                  focusRing,
                )}
              >
                {tCommon('actions.cancel')}
              </AlertDialog.Cancel>
              <button
                type="submit"
                disabled={pending}
                aria-busy={pending || undefined}
                className={cn(
                  'inline-flex h-11 min-w-28 items-center justify-center gap-2 rounded-[0.875rem] px-4 text-sm font-bold transition-[translate,filter,opacity] hover:-translate-y-px disabled:translate-y-0 disabled:opacity-70',
                  destructive ? 'bg-coral text-white hover:brightness-110' : 'bg-kente-warm text-kente-night hover:brightness-105',
                  focusRing,
                )}
              >
                {pending ? <PulsatingDots size="sm" tone="current" /> : confirmLabel}
              </button>
            </div>
          </form>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
