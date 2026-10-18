import { Globe2, MonitorCog, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AccountSettings from '@/components/settings/AccountSettings';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import LanguageSettings from '@/components/settings/LanguageSettings';

const SECTIONS = [
  { id: 'account', label: 'settingsPage.accountTitle', icon: UserRound },
  { id: 'appearance', label: 'settingsPage.appearanceTitle', icon: MonitorCog },
  { id: 'language', label: 'settingsPage.languageTitle', icon: Globe2 },
] as const;

/** Réglages du compte, de l'apparence et de la langue de l'interface. */
export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-9 lg:px-10">
      <header className="relative isolate mb-8 overflow-hidden rounded-3xl border border-border-subtle bg-card px-6 py-8 shadow-sm sm:px-9 sm:py-10">
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-kente" />
        <div aria-hidden className="absolute -inset-e-12 -top-20 -z-10 size-64 rounded-full bg-kente-conic opacity-[0.08] blur-3xl" />
        <p className="eyebrow mb-3 flex items-center gap-2 text-gold">
          <span aria-hidden className="flex h-2.5 gap-px overflow-hidden rounded-[2px]">
            <span className="w-1.5 bg-kente-gold" />
            <span className="w-0.5 bg-kente-jade" />
            <span className="w-1 bg-kente-coral" />
          </span>
          {t('settingsPage.eyebrow')}
        </p>
        <h1 className="max-w-3xl font-display text-[1.65rem] leading-tight font-bold tracking-[-0.035em] text-balance sm:text-3xl">
          {t('settingsPage.pageTitle')}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t('settingsPage.pageDescription')}
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-9">
        <nav
          aria-label={t('settingsPage.sectionNavigation')}
          className="sticky top-3 z-20 -mx-4 flex gap-2 overflow-x-auto overscroll-x-contain bg-background/90 px-4 py-2 [scrollbar-width:none] backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-8 lg:mx-0 lg:flex-col lg:gap-1.5 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
        >
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="group inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl border border-transparent px-3 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:border-border-subtle hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 lg:w-full"
            >
              <Icon aria-hidden className="size-4 shrink-0 transition-colors group-hover:text-gold" />
              {t(label)}
            </a>
          ))}
          <p className="mt-3 hidden px-3 text-xs leading-relaxed text-faint-foreground lg:block">
            {t('settingsPage.profileNote')}
          </p>
        </nav>

        <div className="min-w-0 space-y-6">
          <AccountSettings />
          <AppearanceSettings />
          <LanguageSettings />
        </div>
      </div>
    </div>
  );
}
