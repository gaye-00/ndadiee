import { Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react';
import { forwardRef, useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import SettingsField, { settingsInputClass } from './SettingsField';

interface PasswordInputProps extends Omit<ComponentProps<'input'>, 'type' | 'id'> {
  label: string;
  error?: string;
  hint?: string;
  /** Un code reçu par e-mail plutôt qu'un mot de passe : chiffres, en clair */
  code?: boolean;
}

/**
 * Un mot de passe (ou un code reçu par e-mail) dans les réglages : on peut l'afficher pour se relire. L'erreur
 * s'affiche sous le cadre, reliée au champ pour les lecteurs d'écran.
 */
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { label, error, hint, code = false, className, ...input },
  ref,
) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <SettingsField label={label} icon={code ? KeyRound : LockKeyhole} latin hint={hint}>
        {(control) => (
          <>
            <input
              ref={ref}
              {...control}
              {...input}
              type={code || visible ? 'text' : 'password'}
              aria-invalid={error ? true : undefined}
              aria-describedby={[control['aria-describedby'], error && `${control.id}-error`].filter(Boolean).join(' ') || undefined}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={cn(settingsInputClass, code && 'font-mono text-lg tracking-[0.4em]')}
            />
            {!code && (
              <button
                type="button"
                aria-pressed={visible}
                aria-label={t('auth.password.show')}
                title={t('auth.password.show')}
                onClick={() => setVisible((value) => !value)}
                className="me-1.5 grid size-9 shrink-0 place-items-center rounded-lg text-faint-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
              >
                {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
              </button>
            )}
            {error && (
              <span id={`${control.id}-error`} className="sr-only">
                {error}
              </span>
            )}
          </>
        )}
      </SettingsField>
      {error && (
        <p aria-hidden className="mt-2 text-xs font-medium text-coral">
          {error}
        </p>
      )}
    </div>
  );
});

export default PasswordInput;
