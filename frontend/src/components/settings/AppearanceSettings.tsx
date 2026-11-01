import { Check, Leaf, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { m } from 'motion/react';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import SettingsSection from './SettingsSection';
import SettingsSwitch from './SettingsSwitch';
import ThemePreview from './ThemePreview';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/hooks/useTheme';
import { revealTheme } from '@/lib/themeReveal';
import { cn } from '@/lib/utils';
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

// Le cadre d'or glisse d'une carte à l'autre
const slide = { type: 'spring', stiffness: 420, damping: 34 } as const;

/**
 * Thème et économie de données : les choix sont appliqués et mémorisés sans bouton Enregistrer. Chaque thème a
 * son aperçu en miniature ; la nouvelle palette s'ouvre en cercle depuis la carte choisie, comme avec la corde.
 */
export default function AppearanceSettings() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const dataSaver = useDataSaverStore((state) => state.enabled);
  const setDataSaver = useDataSaverStore((state) => state.setEnabled);

  function choose(value: ThemePreference, event: MouseEvent<HTMLButtonElement>) {
    if (value === theme) {
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    revealTheme(value, { x: box.left + box.width / 2, y: box.top + box.height / 2 }, !reducedMotion);
  }

  return (
    <SettingsSection
      id="appearance"
      tone="coral"
      icon={Palette}
      title={t('settingsPage.appearanceTitle')}
      description={t('settingsPage.appearanceDescription')}
    >
      <div className="space-y-6 p-5 sm:p-7">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">{t('theme.label')}</legend>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {MODES.map(({ value, label, description, icon: Icon }) => {
              const selected = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={(event) => choose(value, event)}
                  className={cn(
                    'group/theme relative flex min-w-0 flex-col rounded-2xl border p-1.5 text-start outline-none sm:p-2',
                    'transition-[border-color,background-color,translate] duration-300 ease-out-expo focus-visible:ring-2 focus-visible:ring-ring/70',
                    selected
                      ? 'border-transparent bg-gold/[0.06]'
                      : 'border-border-subtle bg-background hover:-translate-y-0.5 hover:border-border-strong active:translate-y-0',
                  )}
                >
                  {selected && (
                    <m.span
                      layoutId="settings-theme-choice"
                      transition={slide}
                      aria-hidden
                      className="pointer-events-none absolute -inset-px rounded-2xl shadow-[0_10px_30px_-18px_var(--gold)] ring-2 ring-gold/70"
                    />
                  )}
                  <ThemePreview theme={value} />
                  <span className="flex items-center gap-2 px-1 pt-2.5 pb-1 sm:px-1.5">
                    <Icon
                      aria-hidden
                      className={cn(
                        'size-4 shrink-0 transition-[color,rotate] duration-500 ease-out-expo max-[359px]:hidden',
                        selected ? 'text-gold' : 'text-muted-foreground group-hover/theme:-rotate-12 group-hover/theme:text-foreground',
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm">{t(label)}</span>
                    <span
                      aria-hidden
                      className={cn(
                        'hidden size-5 shrink-0 place-items-center rounded-full transition-[background-color,scale,opacity] duration-300 sm:grid',
                        selected ? 'scale-100 bg-gold text-kente-night opacity-100' : 'scale-50 opacity-0',
                      )}
                    >
                      <Check strokeWidth={3} className="size-3" />
                    </span>
                  </span>
                  <span className="hidden px-1.5 pb-1 text-xs leading-relaxed text-muted-foreground sm:block">{t(description)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div
          className={cn(
            'flex items-center gap-4 rounded-2xl border p-4 transition-[background-color,border-color] duration-500',
            dataSaver ? 'border-jade/30 bg-jade/[0.06]' : 'border-border-subtle',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'hidden size-10 shrink-0 place-items-center rounded-xl text-jade transition-colors duration-500 sm:grid',
              dataSaver ? 'bg-jade/15' : 'bg-jade/8',
            )}
          >
            <Leaf className={cn('size-4 transition-transform duration-700 ease-out-expo', dataSaver && '-rotate-[25deg] scale-110')} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t('dataSaver.label')}</p>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">{t('dataSaver.description')}</p>
          </div>
          <SettingsSwitch checked={dataSaver} label={t('dataSaver.label')} onCheckedChange={setDataSaver} />
        </div>
      </div>
    </SettingsSection>
  );
}
