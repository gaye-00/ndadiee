import { AlertCircle, Check, type LucideIcon } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AuthFieldProps extends Omit<ComponentProps<'input'>, 'prefix'> {
  label: string;
  /** À droite du libellé : « facultatif » */
  aside?: ReactNode;
  /** Sous le champ, quand il n'y a pas d'erreur */
  hint?: ReactNode;
  error?: string;
  icon?: LucideIcon;
  /** Dans le champ, avant la saisie : « @ » */
  prefix?: string;
  /** Dans le champ, après la saisie : un bouton, un statut */
  trailing?: ReactNode;
  /** Rempli comme il faut : une coche verte au bout */
  valid?: boolean;
  /**
   * Ce qu'on y tape s'écrit en caractères latins (e-mail, nom d'utilisateur, mot de passe) : le champ va de
   * gauche à droite, même en arabe, « @ » collé au nom
   */
  latin?: boolean;
  /** Sous l'aide : une jauge, des suggestions */
  children?: ReactNode;
}

/**
 * Champ des formulaires de connexion et d'inscription : libellé, icône, aide ou erreur reliées au champ
 * pour les lecteurs d'écran. Au focus, un fil d'or se tisse sous le champ, d'un bord à l'autre.
 */
export default function AuthField({
  label,
  aside,
  hint,
  error,
  icon: Icon,
  prefix,
  trailing,
  valid,
  latin,
  children,
  className,
  id,
  ...input
}: AuthFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const messageId = `${fieldId}-message`;
  const message = error ?? hint;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={fieldId} className="text-sm font-semibold">
          {label}
        </label>
        {aside && <span className="text-xs text-faint-foreground">{aside}</span>}
      </div>

      <div
        data-invalid={error ? '' : undefined}
        dir={latin ? 'ltr' : undefined}
        className={cn(
          'auth-input group/field relative mt-2 flex h-12 items-center rounded-xl border bg-surface transition-[border-color,box-shadow] duration-300',
          'focus-within:border-gold/55 focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--kente-gold)_14%,transparent)]',
          error ? 'border-coral/60 focus-within:border-coral/70' : 'border-input hover:border-border-strong',
        )}
      >
        {Icon && (
          <Icon
            aria-hidden
            className={cn(
              'ms-3.5 size-4 shrink-0 transition-colors duration-300',
              error ? 'text-coral' : 'text-faint-foreground group-focus-within/field:text-gold',
            )}
          />
        )}
        {prefix && (
          <span aria-hidden className={cn('shrink-0 font-semibold text-faint-foreground', Icon ? 'ms-2' : 'ms-3.5')}>
            {prefix}
          </span>
        )}
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            'h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint-foreground/80 sm:text-[0.9375rem]',
            prefix ? 'ps-0.5' : Icon ? 'ps-2.5' : 'ps-3.5',
            trailing || valid ? 'pe-1' : 'pe-3.5',
          )}
          {...input}
        />
        <AnimatePresence initial={false}>
          {valid && !error && !trailing && (
            <m.span
              key="valid"
              aria-hidden
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              className="me-3 grid size-5 shrink-0 place-items-center rounded-full bg-jade/15 text-jade"
            >
              <Check className="size-3" strokeWidth={3} />
            </m.span>
          )}
        </AnimatePresence>
        {trailing}
        {/* Le fil qui se tisse sous le champ au focus */}
        <span aria-hidden className="auth-input-thread pointer-events-none absolute inset-x-3 -bottom-px h-0.5 rounded-full" />
      </div>

      <AnimatePresence initial={false} mode="wait">
        {message && (
          <m.p
            key={error ? `error-${error}` : 'hint'}
            id={messageId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn('mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed', error ? 'text-coral' : 'text-muted-foreground')}
          >
            {error && <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />}
            <span className="min-w-0">{message}</span>
          </m.p>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}
