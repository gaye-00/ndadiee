import { ArrowUpRight, Scale } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { inputClass } from './formStyles';
import { LIMITS } from './projectDraft';
import { cn } from '@/lib/utils';

/** Les licences les plus courantes, identifiants SPDX : des plus permissives aux plus protectrices */
const COMMON_LICENSES = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'MPL-2.0', 'GPL-3.0', 'AGPL-3.0'] as const;
type CommonLicense = (typeof COMMON_LICENSES)[number];

const isCommon = (license: string): license is CommonLicense => (COMMON_LICENSES as readonly string[]).includes(license);

interface LicensePickerProps {
  id: string;
  value: string;
  onChange: (license: string) => void;
  error?: string;
}

/**
 * La licence du code : les plus courantes d'un clic, avec ce qu'elles permettent en une phrase, « Autre » pour en
 * saisir une, ou « Pas encore ». Un groupe de boutons radio : les flèches passent de l'une à l'autre.
 */
export default function LicensePicker({ id, value, onChange, error }: LicensePickerProps) {
  const { t } = useTranslation('projectForm');
  const otherId = useId();
  // « Autre » choisi : son champ reste ouvert, même si l'on y tape une licence courante. Le formulaire remonte le
  // composant quand un import change la licence
  const [other, setOther] = useState(() => value !== '' && !isCommon(value));
  const choice = other ? 'other' : isCommon(value) ? value : value !== '' ? 'other' : 'none';
  const options = ['none', ...COMMON_LICENSES, 'other'] as const;

  function pick(option: (typeof options)[number]) {
    if (option === 'other') {
      setOther(true);
      onChange(isCommon(value) ? '' : value);
      requestAnimationFrame(() => document.getElementById(otherId)?.focus());
      return;
    }
    setOther(false);
    onChange(option === 'none' ? '' : option);
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = choice === option;
          return (
            <label
              key={option}
              className={cn(
                'relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[0.8125rem] font-semibold transition-[background-color,border-color,color] duration-200 has-focus-visible:ring-2 has-focus-visible:ring-ring/70',
                selected
                  ? 'border-gold/45 bg-gold/12 text-foreground'
                  : 'border-border text-soft-foreground hover:border-border-strong hover:bg-foreground/4 hover:text-foreground',
              )}
            >
              <input
                type="radio"
                name={id}
                id={option === 'none' ? id : undefined}
                value={option}
                checked={selected}
                onChange={() => pick(option)}
                className="sr-only"
              />
              {selected && option !== 'none' && option !== 'other' && <Scale aria-hidden className="size-3.5 text-gold" />}
              <span className={cn(option !== 'none' && option !== 'other' && 'font-mono text-xs')}>
                {option === 'none' ? t('license.none') : option === 'other' ? t('license.other') : option}
              </span>
            </label>
          );
        })}
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {choice === 'other' && (
          <m.div key="other" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            <label htmlFor={otherId} className="sr-only">
              {t('license.otherLabel')}
            </label>
            <input
              id={otherId}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={t('license.otherPlaceholder')}
              maxLength={LIMITS.license}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${id}-help`}
              dir="ltr"
              spellCheck={false}
              className={cn(inputClass(error !== undefined), 'max-w-xs font-mono text-sm')}
            />
          </m.div>
        )}
      </AnimatePresence>

      <p id={`${id}-help`} role={error ? 'alert' : undefined} aria-live="polite" className={cn('text-xs leading-relaxed', error ? 'text-coral' : 'text-muted-foreground')}>
        {error ?? (isCommon(choice) ? t(`license.about.${choice}`) : choice === 'none' ? t('license.aboutNone') : t('license.aboutOther'))}{' '}
        {!error && (
          <a
            href="https://choosealicense.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 rounded-sm font-semibold text-gold underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            {t('license.help')}
            <ArrowUpRight aria-hidden className="size-3 rtl:-scale-x-100" />
          </a>
        )}
      </p>
    </div>
  );
}
