import { Check } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  /** Ancre de la section : la liste « prêt à x % » y mène */
  id: string;
  /** Rang dans le formulaire : « 01 » */
  index: number;
  title: string;
  description: string;
  /** Tout l'essentiel de la section est rempli : son numéro devient une coche */
  complete?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Une étape du formulaire : son numéro tissé d'or, son titre et ce qu'on y attend. Quand l'essentiel est rempli, le
 * numéro laisse place à une coche verte.
 */
export function FormSection({ id, index, title, description, complete = false, children, className }: FormSectionProps) {
  const { t } = useTranslation('projectForm');
  const number = String(index).padStart(2, '0');

  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn('glass scroll-mt-24 rounded-[1.75rem]', className)}>
      <header className="flex items-start gap-4 px-5 pt-6 sm:px-8 sm:pt-8">
        <span
          aria-hidden
          className={cn(
            'relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl font-mono text-xs font-semibold tabular-nums transition-colors duration-500',
            complete ? 'bg-jade/14 text-jade' : 'bg-gold/10 text-gold',
          )}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {complete ? (
              <m.span key="done" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
                <Check className="size-4" strokeWidth={2.75} />
              </m.span>
            ) : (
              <m.span key="number" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}>
                {number}
              </m.span>
            )}
          </AnimatePresence>
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-title`} className="font-display text-h5">
            {title}
            {complete && <span className="sr-only"> · {t('section.complete')}</span>}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="flex flex-col gap-7 px-5 pt-6 pb-7 sm:px-8 sm:pb-9">{children}</div>
    </section>
  );
}

interface FormFieldProps {
  id: string;
  label: string;
  /** « facultatif » à côté du libellé */
  optional?: boolean;
  error?: string;
  hint?: ReactNode;
  /** Longueur et maximum : le compteur s'affiche à l'approche de la limite */
  count?: [number, number];
  children: ReactNode;
  className?: string;
}

/** Un champ : son libellé, et sous lui l'erreur (en rouge) ou l'aide, reliées au champ par `${id}-help`. */
export function FormField({ id, label, optional = false, error, hint, count, children, className }: FormFieldProps) {
  const { t } = useTranslation('projectForm');
  const near = count && count[0] > count[1] * 0.8;

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <label htmlFor={id} className="flex items-baseline gap-2">
        <span className="eyebrow">{label}</span>
        {optional && <span className="text-[0.6875rem] text-faint-foreground">{t('field.optional')}</span>}
      </label>
      {children}
      {(error || hint || near) && (
        <p id={`${id}-help`} role={error ? 'alert' : undefined} className={cn('flex gap-3 text-xs leading-relaxed', error ? 'text-coral' : 'text-muted-foreground')}>
          <span className="min-w-0 flex-1">{error ?? hint}</span>
          {near && <span className={cn('font-mono tabular-nums', count[0] > count[1] ? 'text-coral' : 'text-gold')}>{`${count[0]}/${count[1]}`}</span>}
        </p>
      )}
    </div>
  );
}
