import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  /** Petit libellé en tête (« Erreur 503 ») */
  code?: string;
  title: string;
  description?: string;
  onRetry?: () => void;
  /** Par défaut : « Réessayer » */
  retryLabel?: string;
  className?: string;
}

/** Erreur d'un bloc et action pour réessayer (« Erreur 409 · Recharger la carte »). Design 3H. */
export default function ErrorState({ code, title, description, onRetry, retryLabel, className }: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <div role="alert" className={cn('flex flex-col items-start gap-2 rounded-2xl border border-coral/25 bg-coral/8 p-5', className)}>
      {code && <p className="font-mono text-[0.6875rem] tracking-wide text-coral uppercase">{code}</p>}
      <p className="font-bold text-foreground">{title}</p>
      {description && <p className="max-w-prose text-[0.8125rem] leading-relaxed text-soft-foreground">{description}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-[0.8125rem] font-bold text-background transition-opacity hover:opacity-85 outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <RotateCcw aria-hidden className="size-3.5" />
          {retryLabel ?? t('actions.retry')}
        </button>
      )}
    </div>
  );
}
