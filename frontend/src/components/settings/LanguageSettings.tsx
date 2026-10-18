import { Check, Globe2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import type { LanguageCode } from '@/i18n/languages';

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
    <section
      id="language"
      aria-labelledby="settings-language-title"
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-sm"
    >
      <div className="flex items-center gap-3.5 border-b border-border-subtle px-5 py-5 sm:px-7">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-jade/10 text-jade">
          <Globe2 aria-hidden className="size-5" />
        </span>
        <div>
          <h2 id="settings-language-title" className="font-display text-base font-semibold tracking-tight">
            {t('settingsPage.languageTitle')}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t('settingsPage.languageDescription')}
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <fieldset aria-busy={pendingLanguage !== null}>
          <legend className="mb-3 text-sm font-semibold">{t('language.label')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
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
                  className={`relative flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-start outline-none transition focus-visible:ring-2 focus-visible:ring-ring/70 disabled:cursor-wait disabled:opacity-65 ${
                    selected
                      ? 'border-jade/40 bg-jade/5'
                      : 'border-border-subtle bg-background hover:border-border-strong hover:bg-muted/60'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid size-10 shrink-0 place-items-center rounded-lg font-mono text-xs font-bold uppercase ${
                      selected ? 'bg-jade/15 text-jade' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.code}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold" lang={item.code} dir={item.dir}>
                      {item.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground" lang="en" dir="ltr">
                      {item.englishName}
                    </span>
                  </span>
                  {pending ? (
                    <span aria-hidden className="size-4 shrink-0 animate-spin rounded-full border-2 border-jade/30 border-t-jade" />
                  ) : selected ? (
                    <Check aria-hidden className="size-4 shrink-0 text-jade" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </fieldset>
        <p aria-live="polite" className="mt-3 min-h-5 text-sm">
          {hasError && (
            <span role="alert" className="text-destructive">
              {t('settingsPage.languageError')}
            </span>
          )}
        </p>
      </div>
    </section>
  );
}
