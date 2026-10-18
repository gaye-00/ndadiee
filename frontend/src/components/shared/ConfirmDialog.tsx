import { AlertDialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { cn } from '@/lib/utils';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-popover';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** « Supprimer », « Quitter sans enregistrer » */
  confirmLabel: string;
  /** Par défaut : « Annuler » */
  cancelLabel?: string;
  /** Une action qu'on ne peut pas défaire : le bouton est rouge */
  destructive?: boolean;
  /** L'action est en route : le bouton attend, la fenêtre reste ouverte */
  pending?: boolean;
  onConfirm: () => void;
}

/**
 * Demande de confirmation avant une action qu'on ne peut pas défaire (supprimer un sujet, une réponse). Le focus va
 * d'abord sur « Annuler » : Entrée par réflexe ne détruit rien. Feuille en bas de l'écran sur téléphone.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-kente-night/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 saver:backdrop-blur-none" />
        <AlertDialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 rounded-t-[1.75rem] border border-border bg-popover p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-popover-foreground shadow-float outline-none',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(28rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:pb-6',
            'sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95',
          )}
        >
          <AlertDialog.Title className="font-display text-h5">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</div>
          </AlertDialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel
              disabled={pending}
              className={cn(
                'inline-flex h-11 items-center justify-center rounded-[0.875rem] border border-border-strong px-4 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50',
                focusRing,
              )}
            >
              {cancelLabel ?? t('actions.cancel')}
            </AlertDialog.Cancel>
            <button
              type="button"
              onClick={onConfirm}
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
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
