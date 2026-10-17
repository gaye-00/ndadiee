import { Check, X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { cn } from '@/lib/utils';
import type { UsernameAvailability } from '@/types/auth.types';
import { isolate } from '@/utils/formatters';
import AuthField, { type AuthFieldProps } from './AuthField';

interface UsernameFieldProps extends Omit<AuthFieldProps, 'prefix' | 'trailing' | 'hint'> {
  /** Le nom tel qu'il est saisi */
  value: string;
  /** Réponse du backend pour ce nom, quand il respecte la règle */
  availability?: UsernameAvailability;
  checking: boolean;
  /** Choisir une variante libre proposée */
  onPick: (username: string) => void;
}

/**
 * Nom d'utilisateur : « @ » devant, l'adresse du profil dessous, et la réponse du backend pendant qu'on
 * tape. S'il est pris ou réservé, des variantes libres se choisissent d'un clic.
 */
export default function UsernameField({ value, availability, checking, onPick, error, ...props }: UsernameFieldProps) {
  const { t } = useTranslation();
  const taken = availability && !availability.available && availability.reason !== 'INVALID';
  const free = availability?.available === true;
  // « @awa » d'un bloc : en arabe, l'arobase reste devant le nom
  const name = isolate(`@${availability?.username ?? value}`);

  const status = checking ? (
    <PulsatingDots key="checking" size="sm" className="flex" />
  ) : free && !error ? (
    <span key="free" aria-hidden className="grid size-5 place-items-center rounded-full bg-jade/15 text-jade">
      <Check className="size-3" strokeWidth={3} />
    </span>
  ) : taken ? (
    <span key="taken" aria-hidden className="grid size-5 place-items-center rounded-full bg-coral/15 text-coral">
      <X className="size-3" strokeWidth={3} />
    </span>
  ) : null;

  return (
    <AuthField
      {...props}
      prefix="@"
      latin
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      error={
        error ?? (taken ? t(availability.reason === 'RESERVED' ? 'auth.username.reserved' : 'auth.username.taken', { username: name }) : undefined)
      }
      hint={
        free ? (
          <span className="text-jade">{t('auth.username.free', { username: name })}</span>
        ) : (
          <span dir="ltr" className="font-mono">
            {window.location.host}/u/<span className="text-foreground">{value || '…'}</span>
          </span>
        )
      }
      trailing={
        <span className="me-3 grid size-5 shrink-0 place-items-center">
          <AnimatePresence mode="wait" initial={false}>
            {status && (
              <m.span
                key={status.key}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.18 }}
              >
                {status}
              </m.span>
            )}
          </AnimatePresence>
        </span>
      }
    >
      {/* Les variantes libres : un clic, et c'est le nom */}
      {taken && availability.suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t('auth.username.suggestions')}</span>
          {availability.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onPick(suggestion)}
              className={cn(
                'rounded-full border border-jade/30 bg-jade/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-jade transition-colors',
                'outline-none hover:border-jade/60 hover:bg-jade/15 focus-visible:ring-2 focus-visible:ring-ring/70',
              )}
            >
              @{suggestion}
            </button>
          ))}
        </div>
      )}
    </AuthField>
  );
}
