import { Leaf, Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import SettingsSwitch from '@/components/settings/SettingsSwitch';
import { useDataSaverStore } from '@/store/useDataSaverStore';
import type { ThemePreference } from '@/utils/storage';

const MODES = [
  { value: 'light', label: 'theme.light', description: 'settingsPage.modeLight', icon: Sun },
  { value: 'dark', label: 'theme.dark', description: 'settingsPage.modeDark', icon: Moon },
  { value: 'system', label: 'theme.system', description: 'settingsPage.modeSystem', icon: Monitor },
] as const satisfies readonly {
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}[];

/** Thème et économie de données : les choix sont appliqués et mémorisés sans bouton Enregistrer. */
export default function AppearanceSettings() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const dataSaver = useDataSaverStore((state) => state.enabled);
  const setDataSaver = useDataSaverStore((state) => state.setEnabled);

  return (
    <section
      id="appearance"
      aria-labelledby="settings-appearance-title"
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-sm"
    >
      <div className="flex items-center gap-3.5 border-b border-border-subtle px-5 py-5 sm:px-7">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-coral/10 text-coral">
          <Sun aria-hidden className="size-5" />
        </span>
        <div>
          <h2 id="settings-appearance-title" className="font-display text-base font-semibold tracking-tight">
            {t('settingsPage.appearanceTitle')}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t('settingsPage.appearanceDescription')}
          </p>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">{t('theme.label')}</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {MODES.map(({ value, label, description, icon: Icon }) => {
              const selected = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTheme(value)}
                  className={`group relative flex min-h-28 flex-col items-start rounded-xl border p-4 text-start outline-none transition focus-visible:ring-2 focus-visible:ring-ring/70 ${
                    selected
                      ? 'border-gold/50 bg-gold/5 ring-1 ring-gold/25'
                      : 'border-border-subtle bg-background hover:border-border-strong hover:bg-muted/60'
                  }`}
                >
                  <span
                    className={`mb-3 grid size-9 place-items-center rounded-lg transition-colors ${
                      selected ? 'bg-gold/15 text-gold' : 'bg-muted text-muted-foreground group-hover:text-foreground'
                    }`}
                  >
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <span className="text-sm font-semibold">{t(label)}</span>
                  <span className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(description)}</span>
                  <span aria-hidden className="absolute inset-e-3 top-3 grid size-4 place-items-center rounded-full border border-border">
                    {selected && <span className="size-2 rounded-full bg-gold" />}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-4 rounded-xl border border-border-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-jade/10 text-jade">
              <Leaf aria-hidden className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">{t('dataSaver.label')}</p>
              <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">{t('dataSaver.description')}</p>
            </div>
          </div>
          <SettingsSwitch checked={dataSaver} label={t('dataSaver.label')} onCheckedChange={setDataSaver} />
        </div>
      </div>
    </section>
  );
}
