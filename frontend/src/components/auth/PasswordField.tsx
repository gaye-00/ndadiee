import { ArrowBigUp, Check, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import AuthField, { type AuthFieldProps } from './AuthField';

// Ce qui rend un mot de passe solide ; seule la longueur est exigée (8, comme le backend)
const RULES = [
  { key: 'length', test: (value: string) => value.length >= 8 },
  { key: 'long', test: (value: string) => value.length >= 12 },
  { key: 'cases', test: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { key: 'mixed', test: (value: string) => /\d/.test(value) && /[^A-Za-z0-9]/.test(value) },
] as const;

const LEVELS = ['auth.strength.weak', 'auth.strength.weak', 'auth.strength.fair', 'auth.strength.good', 'auth.strength.great'] as const;
const TONES = ['bg-coral', 'bg-coral', 'bg-gold', 'bg-jade', 'bg-jade'] as const;
const TEXT_TONES = ['text-coral', 'text-coral', 'text-gold', 'text-jade', 'text-jade'] as const;

interface PasswordFieldProps extends Omit<AuthFieldProps, 'type' | 'icon' | 'trailing'> {
  /** Le mot de passe saisi, à évaluer : la jauge et ses règles s'affichent (inscription) */
  meter?: string;
}

/**
 * Mot de passe : on peut l'afficher pour se relire, le champ prévient quand les majuscules sont
 * verrouillées, et à l'inscription une jauge tissée dit sa solidité, règle par règle.
 */
export default function PasswordField({ meter, hint, onKeyDown, onKeyUp, onBlur, ...props }: PasswordFieldProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  function watchCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState('CapsLock'));
  }

  const met = meter === undefined ? [] : RULES.map((rule) => rule.test(meter));
  // La longueur d'abord : trop court, le reste ne compte pas
  const score = meter ? (met[0] ? met.filter(Boolean).length : 1) : 0;

  return (
    <AuthField
      {...props}
      type={visible ? 'text' : 'password'}
      icon={LockKeyhole}
      latin
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      onKeyDown={(event) => {
        watchCapsLock(event);
        onKeyDown?.(event);
      }}
      onKeyUp={(event) => {
        watchCapsLock(event);
        onKeyUp?.(event);
      }}
      onBlur={(event) => {
        setCapsLock(false);
        onBlur?.(event);
      }}
      hint={
        capsLock ? (
          <span className="inline-flex items-center gap-1 font-semibold text-gold">
            <ArrowBigUp aria-hidden className="size-3.5" />
            {t('auth.password.capsLock')}
          </span>
        ) : (
          hint
        )
      }
      trailing={
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
      }
    >
      {meter !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">{t('auth.strength.label')}</span>
            {meter && (
              <span aria-live="polite" className={cn('font-semibold', TEXT_TONES[score])}>
                {t(LEVELS[score])}
              </span>
            )}
          </div>
          {/* La jauge : quatre fils qui se colorent */}
          <div aria-hidden className="mt-1.5 grid grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((level) => (
              <span
                key={level}
                className={cn(
                  'h-1 rounded-full transition-colors duration-500',
                  score >= level ? TONES[score] : 'bg-foreground/10',
                )}
              />
            ))}
          </div>
          <ul className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1 text-xs min-[26rem]:grid-cols-2">
            {RULES.map((rule, index) => (
              <li
                key={rule.key}
                className={cn('flex items-center gap-1.5 transition-colors duration-300', met[index] ? 'text-jade' : 'text-faint-foreground')}
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid size-3.5 shrink-0 place-items-center rounded-full border transition-colors duration-300',
                    met[index] ? 'border-jade bg-jade text-kente-night' : 'border-border-strong',
                  )}
                >
                  {met[index] && <Check className="size-2.5" strokeWidth={3.5} />}
                </span>
                {t(`auth.strength.rules.${rule.key}`)}
                <span className="sr-only">{met[index] ? t('auth.strength.met') : t('auth.strength.unmet')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AuthField>
  );
}
