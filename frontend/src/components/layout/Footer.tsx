import { useQuery } from '@tanstack/react-query';
import { ArrowUp, Monitor, Moon, Search, Sun, type LucideIcon } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState, type ComponentType, type MouseEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import HolographicSeparator from '@/components/shared/HolographicSeparator';
import { PUBLIC_NAV } from '@/config/navigation';
import { site } from '@/config/site';
import { useLanguage } from '@/hooks/useLanguage';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/hooks/useTheme';
import type { LanguageCode } from '@/i18n/languages';
import { prefetch } from '@/lib/prefetch';
import { revealTheme } from '@/lib/themeReveal';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import { api } from '@/services/api';
import { useCommandPaletteStore } from '@/store/useCommandPaletteStore';
import { useDataSaverStore } from '@/store/useDataSaverStore';
import type { ThemePreference } from '@/utils/storage';

// La bande tissée est toujours en bas de page : son code arrive après le reste. S'il ne vient pas, la
// place reste vide.
const FooterLoom = lazy<ComponentType>(() => import('./FooterLoom').catch(() => ({ default: () => null })));

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';
// Année du copyright, lue une fois au chargement
const YEAR = new Date().getFullYear();
// Cibles d'au moins 44 px au doigt
const coarse = 'pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center';

/**
 * Pied de page des pages du visiteur. Ses liens, les langues de la plateforme (chacune dans sa propre
 * écriture), les réglages du visiteur (thème, économie de données), et en signature, le nom de la
 * plateforme laissé en creux dans un kente qui sort du métier (FooterLoom).
 */
export default function Footer() {
  const { t } = useTranslation();
  const openSearch = useCommandPaletteStore((s) => s.setOpen);

  return (
    <footer id="site-footer" className="mt-8 bg-background text-foreground">
      {/* La couture : le pied de page est cousu à la page, comme deux bandes de kente */}
      <HolographicSeparator />

      <div className="mx-auto grid max-w-page grid-cols-2 gap-x-6 gap-y-12 px-4 pt-14 pb-14 sm:px-6 lg:grid-cols-[minmax(0,1.45fr)_repeat(3,minmax(0,1fr))] lg:gap-x-10">
        {/* ── La plateforme et ses langues ── */}
        <div className="col-span-2 lg:col-span-1">
          <Link to={paths.landing} viewTransition className={cn('inline-flex rounded-lg', focusRing)} aria-label={site.name}>
            <Logo />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">{t('app.description')}</p>
          <Languages />
        </div>

        <FooterColumn title={t('footer.explore')}>
          {PUBLIC_NAV.map((item) => (
            <FooterLink key={item.to} to={item.to} preload={item.preload}>
              {t(`nav.${item.labelKey}`)}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title={t('footer.contribute')}>
          <FooterLink to={paths.newProject} preload={pages.newProject}>
            {t('actions.publishProject')}
          </FooterLink>
          <FooterLink to={paths.newOpening} preload={pages.newOpening}>
            {t('actions.publishRole')}
          </FooterLink>
          <FooterLink to={paths.newTopic} preload={pages.newTopic}>
            {t('actions.newTopic')}
          </FooterLink>
          <li>
            <button
              type="button"
              onClick={() => openSearch(true)}
              className={cn(
                'group/search inline-flex items-center gap-2 rounded-sm text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground',
                focusRing,
                coarse,
              )}
            >
              <Search aria-hidden className="size-3.5" />
              {t('search.placeholder')}
              {/* Raccourci clavier : inutile au doigt */}
              <kbd className="rounded border border-border px-1 font-mono text-[0.625rem] text-faint-foreground pointer-coarse:hidden">
                {t('search.shortcut')}
              </kbd>
            </button>
          </li>
        </FooterColumn>

        <div className="col-span-2 sm:col-span-1">
          <p className="text-sm font-semibold text-foreground">{t('footer.settings')}</p>
          <div className="mt-4 flex flex-col gap-5">
            <ThemeSwitch />
            <DataSaverSwitch />
          </div>
        </div>
      </div>

      <Suspense fallback={<div aria-hidden className="h-36 sm:h-48 lg:h-60" />}>
        <FooterLoom />
      </Suspense>

      {/* ── Dernière ligne (le bouton flottant « remonter » s'efface quand elle est à l'écran) ── */}
      <div id="site-footer-end" className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p>{t('footer.copyright', { year: YEAR, name: site.name })}</p>
            <p className="text-faint-foreground">{t('footer.woven')}</p>
            <Link to={paths.privacy} viewTransition className={cn('rounded-sm transition-colors hover:text-foreground', focusRing, coarse)}>
              {t('pages.privacy')}
            </Link>
            <Link to={paths.terms} viewTransition className={cn('rounded-sm transition-colors hover:text-foreground', focusRing, coarse)}>
              {t('pages.terms')}
            </Link>
            <ApiStatus />
          </div>
          <BackToTop />
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title}>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <ul className="mt-4 space-y-3 pointer-coarse:space-y-0">{children}</ul>
    </nav>
  );
}

function FooterLink({ to, preload, children }: { to: string; preload?: () => Promise<unknown>; children: ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        viewTransition
        onPointerEnter={() => preload && prefetch(preload)}
        onFocus={() => preload && prefetch(preload)}
        className={cn(
          'group/link relative inline-flex rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground',
          focusRing,
          coarse,
        )}
      >
        {children}
        {/* Un fil d'or se tisse sous le lien survolé */}
        <span
          aria-hidden
          className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-kente-warm transition-transform duration-300 ease-out-expo group-hover/link:scale-x-100 rtl:origin-right"
        />
      </Link>
    </li>
  );
}

/** Les dix langues, chacune écrite dans sa langue : un clic, et toute la plateforme la parle. */
function Languages() {
  const { t } = useTranslation();
  const { language, languages, setLanguage } = useLanguage();

  return (
    <div className="mt-8">
      <p className="eyebrow">{t('footer.languages')}</p>
      <ul className="mt-3 flex max-w-sm flex-wrap gap-x-3.5 gap-y-1.5">
        {languages.map((option) => {
          const current = option.code === language.code;
          return (
            <li key={option.code}>
              <button
                type="button"
                lang={option.code}
                dir={option.dir}
                aria-pressed={current}
                onClick={() => void setLanguage(option.code as LanguageCode)}
                className={cn(
                  'relative rounded-sm py-0.5 text-sm transition-colors',
                  current ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground',
                  focusRing,
                  coarse,
                )}
              >
                {option.name}
                {current && (
                  <span aria-hidden className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-kente" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; icon: LucideIcon }> = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
];

/** Clair, sombre ou comme l'appareil. La nouvelle palette s'ouvre en cercle depuis le bouton, comme avec la corde. */
function ThemeSwitch() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const index = THEME_OPTIONS.findIndex((option) => option.value === theme);

  function choose(value: ThemePreference, event: MouseEvent<HTMLButtonElement>) {
    if (value === 'system') {
      setTheme('system');
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    revealTheme(value, { x: box.left + box.width / 2, y: box.top + box.height / 2 }, !reducedMotion);
  }

  return (
    <div role="group" aria-label={t('theme.label')}>
      <p className="mb-2 text-xs text-faint-foreground">{t('theme.label')}</p>
      <div className="relative inline-grid grid-cols-3 rounded-full border border-border p-0.5">
        {/* La pastille glisse sous le choix ; en arabe, de droite à gauche */}
        <span
          aria-hidden
          className="absolute inset-y-0.5 start-0.5 w-[calc((100%-0.25rem)/3)] rounded-full bg-foreground transition-[translate] duration-500 ease-out-expo"
          style={{ translate: `${Math.max(0, index) * (i18n.dir() === 'rtl' ? -100 : 100)}% 0` }}
        />
        {THEME_OPTIONS.map(({ value, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={theme === value}
            onClick={(event) => choose(value, event)}
            className={cn(
              'relative z-10 inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold whitespace-nowrap transition-colors duration-300',
              theme === value ? 'text-background' : 'text-muted-foreground hover:text-foreground',
              focusRing,
            )}
          >
            <Icon aria-hidden className="size-3.5" />
            {t(`theme.${value}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Mode économie de données : moins d'animations, pas de préchargement, images à la demande. */
function DataSaverSwitch() {
  const { t } = useTranslation();
  const enabled = useDataSaverStore((s) => s.enabled);
  const setEnabled = useDataSaverStore((s) => s.setEnabled);

  return (
    <div className="flex max-w-xs items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-labelledby="footer-saver-label"
        aria-describedby="footer-saver-description"
        onClick={() => setEnabled(!enabled)}
        className={cn(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors duration-300',
          enabled ? 'border-jade/50 bg-jade' : 'border-border-strong bg-foreground/10',
          focusRing,
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-0.5 start-0.5 size-3.5 rounded-full bg-background shadow-sm transition-transform duration-300 ease-out-expo',
            enabled && 'translate-x-4 rtl:-translate-x-4',
          )}
        />
      </button>
      <div>
        <p id="footer-saver-label" className="text-sm text-foreground">
          {t('dataSaver.label')}
        </p>
        <p id="footer-saver-description" className="mt-0.5 text-xs leading-relaxed text-faint-foreground">
          {t('dataSaver.description')}
        </p>
      </div>
    </div>
  );
}

/**
 * Un vrai témoin, pas une décoration : l'API répond-elle ? Vérifié une fois quand le pied de page
 * arrive à l'écran, puis gardé une minute.
 */
function ApiStatus() {
  const { t } = useTranslation();
  const anchor = useRef<HTMLParagraphElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const element = anchor.current;
    if (!element || seen) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setSeen(true), { rootMargin: '200px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [seen]);

  const { status } = useQuery({
    queryKey: ['api-status'],
    queryFn: () => api.get('/v1/tags', { params: { size: 1 } }).then(() => true),
    enabled: seen,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const state = !seen || status === 'pending' ? 'checking' : status === 'success' ? 'online' : 'offline';

  return (
    <p ref={anchor} role="status" className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full transition-colors',
          state === 'online' ? 'bg-jade' : state === 'offline' ? 'bg-coral' : 'bg-faint-foreground',
        )}
      />
      {t(`footer.status.${state}`)}
    </p>
  );
}

function BackToTop() {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })}
      className={cn(
        'group/top inline-flex items-center gap-1.5 self-start rounded-sm transition-colors hover:text-foreground sm:self-auto',
        focusRing,
        coarse,
      )}
    >
      {t('footer.backToTop')}
      <ArrowUp aria-hidden className="size-3.5 transition-transform duration-300 group-hover/top:-translate-y-0.5" />
    </button>
  );
}
