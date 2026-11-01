import { Check, Languages } from 'lucide-react';
import { m } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SettingsSection from './SettingsSection';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useLanguage } from '@/hooks/useLanguage';
import type { LanguageCode } from '@/i18n/languages';
import { cn } from '@/lib/utils';

// La pastille verte glisse d'une langue à l'autre
const slide = { type: 'spring', stiffness: 420, damping: 36 } as const;

/** Langue de l'interface : sélectionnée dans la langue elle-même et mémorisée pour les prochaines visites. */
export default function LanguageSettings() {
  const { t } = useTranslation();
  const { language, languages, setLanguage } = useLanguage();
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode | null>(null);
  const [hasError, setHasError] = useState(false);

  async function chooseLanguage(code: LanguageCode) {
    if (code === language.code || pendingLanguage) {
      return;
    }

    setPendingLanguage(code);
    setHasError(false);
    try {
      await setLanguage(code);
    } catch {
      setHasError(true);
    } finally {
      setPendingLanguage(null);
    }
  }

  return (
    <SettingsSection
      id="language"
      tone="jade"
      icon={Languages}
      title={t('settingsPage.languageTitle')}
      description={t('settingsPage.languageDescription')}
    >
      <div className="p-5 sm:p-7">
        <fieldset aria-busy={pendingLanguage !== null}>
          {/* Le titre de la carte dit déjà « Langue » : la légende reste pour les lecteurs d'écran */}
          <legend className="sr-only">{t('language.label')}</legend>
          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:gap-2.5">
            {languages.map((item) => {
              const selected = language.code === item.code;
              const pending = pendingLanguage === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${item.name} (${item.englishName})`}
                  disabled={pendingLanguage !== null}
                  onClick={() => void chooseLanguage(item.code)}
                  className={cn(
                    'group/lang relative flex min-h-16 min-w-0 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 text-start outline-none',
                    'transition-[border-color,background-color,translate,opacity] duration-300 ease-out-expo focus-visible:ring-2 focus-visible:ring-ring/70',
                    'disabled:cursor-wait',
                    pendingLanguage !== null && !pending && 'opacity-55',
                    selected
                      ? 'border-transparent'
                      : 'border-border-subtle bg-background enabled:hover:-translate-y-0.5 enabled:hover:border-border-strong enabled:active:translate-y-0',
                  )}
                >
                  {selected && (
                    <m.span
                      layoutId="settings-language-choice"
                      transition={slide}
                      aria-hidden
                      className="pointer-events-none absolute -inset-px rounded-2xl bg-jade/[0.07] ring-1 ring-jade/45"
                    />
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      // Deux colonnes sur un téléphone : le code s'efface pour laisser le nom entier
                      'relative grid size-9 shrink-0 place-items-center rounded-xl font-mono text-[0.6875rem] font-bold uppercase transition-[background-color,color,rotate] duration-500 ease-out-expo min-[360px]:max-sm:hidden sm:size-10',
                      selected
                        ? 'bg-jade text-kente-night'
                        : 'bg-foreground/6 text-muted-foreground group-enabled/lang:group-hover/lang:-rotate-6 group-enabled/lang:group-hover/lang:text-foreground',
                    )}
                  >
                    {item.code}
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      <bdi lang={item.code} dir={item.dir}>
                        {item.name}
                      </bdi>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      <bdi lang="en" dir="ltr">
                        {item.englishName}
                      </bdi>
                    </span>
                  </span>
                  <span aria-hidden className="relative grid w-5 shrink-0 place-items-center">
                    {pending ? (
                      <PulsatingDots size="sm" />
                    ) : (
                      <Check
                        strokeWidth={3}
                        className={cn(
                          'size-4 text-jade transition-[opacity,scale] duration-300',
                          selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
                        )}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <p aria-live="polite" className="text-sm">
          {hasError && (
            <span role="alert" className="mt-3 block text-destructive">
              {t('settingsPage.languageError')}
            </span>
          )}
        </p>
      </div>
    </SettingsSection>
  );
}
