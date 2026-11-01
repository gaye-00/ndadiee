import { Languages, Leaf, Monitor, Moon, Palette, Sun, UserRound, type LucideIcon } from 'lucide-react';
import { AnimatePresence, m, type Variants } from 'motion/react';
import { Tabs } from 'radix-ui';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import AccountSettings from '@/components/settings/AccountSettings';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import LanguageSettings from '@/components/settings/LanguageSettings';
import { useLanguage } from '@/hooks/useLanguage';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { useDataSaverStore } from '@/store/useDataSaverStore';

const SECTIONS = [
  { id: 'account', label: 'settingsPage.accountTitle', hint: 'settingsPage.accountDescription', icon: UserRound, tone: 'text-gold lg:bg-gold/12' },
  { id: 'appearance', label: 'settingsPage.appearanceTitle', hint: 'settingsPage.appearanceDescription', icon: Palette, tone: 'text-coral lg:bg-coral/12' },
  { id: 'language', label: 'settingsPage.languageTitle', hint: 'settingsPage.languageDescription', icon: Languages, tone: 'text-jade lg:bg-jade/12' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

// Les champs qu'un lien peut viser (/settings#skills, depuis l'atelier), et l'onglet qui les contient
const ANCHORS: Record<string, SectionId> = { skills: 'account' };

/** L'onglet demandé par l'adresse (?tab=appearance, ou un champ visé : #skills) ; « Mon compte » par défaut */
const tabOf = ({ search, hash }: { search: string; hash: string }): SectionId => {
  const anchored = ANCHORS[hash.slice(1)];
  const requested = new URLSearchParams(search).get('tab');
  return anchored ?? SECTIONS.find((section) => section.id === requested)?.id ?? 'account';
};

const coarsePointer = window.matchMedia('(pointer: coarse)');

const THEME_ICONS: Record<string, LucideIcon> = { light: Sun, dark: Moon, system: Monitor };
const ease = [0.16, 1, 0.3, 1] as const;

// L'en-tête arrive ligne après ligne
const stagger: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

// La pastille de l'onglet ouvert glisse d'un onglet à l'autre
const slide = { type: 'spring', stiffness: 400, damping: 36 } as const;

// Sur grand écran, les onglets sont une colonne : les flèches haut et bas passent de l'un à l'autre
const wideScreen = window.matchMedia('(min-width: 64rem)');
const subscribeWide = (onChange: () => void) => {
  wideScreen.addEventListener('change', onChange);
  return () => wideScreen.removeEventListener('change', onChange);
};

/**
 * Le contenu d'un onglet. Les trois restent montés (un profil en cours de saisie survit au passage par un autre
 * onglet) ; celui qu'on ouvre glisse depuis le côté de l'onglet choisi, à gauche ou à droite (inversé en arabe).
 * À l'arrivée sur la page, il monte simplement.
 *
 * Animation posée avant que le navigateur ne peigne (useLayoutEffect, Web Animations) : le panneau n'apparaît
 * jamais une image en place avant de partir de côté.
 */
function Panel({
  value,
  active,
  direction,
  arrival,
  children,
}: {
  value: SectionId;
  active: boolean;
  direction: number;
  arrival: boolean;
  children: ReactNode;
}) {
  const { i18n } = useTranslation();
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // Ouvert en ce moment : on n'anime qu'en ouvrant, pas quand un réglage change (économie de données, langue)
  const shown = useRef(false);

  useLayoutEffect(() => {
    const panel = ref.current;
    if (!active) {
      shown.current = false;
      return;
    }
    if (shown.current || !panel) {
      return;
    }
    shown.current = true;
    if (reducedMotion) {
      return;
    }
    const x = 32 * direction * (i18n.dir() === 'rtl' ? -1 : 1);
    const from = arrival ? 'translateY(18px)' : `translateX(${x}px)`;
    panel.getAnimations().forEach((animation) => animation.cancel());
    panel.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], {
      duration: arrival ? 600 : 450,
      delay: arrival ? 200 : 0,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'backwards',
    });
  }, [active, arrival, direction, i18n, reducedMotion]);

  return (
    <Tabs.Content value={value} forceMount className="outline-none data-[state=inactive]:hidden">
      <div ref={ref}>{children}</div>
    </Tabs.Content>
  );
}

/** Le décor de l'en-tête : une bande de kente tissée qui se déroule de haut en bas, un reflet la traverse */
function KenteSwatch() {
  return (
    <m.div
      aria-hidden
      initial={{ clipPath: 'inset(0 0 100% 0)' }}
      animate={{ clipPath: 'inset(0 0 0% 0)' }}
      transition={{ duration: 1.4, ease, delay: 0.25 }}
      className="pointer-events-none absolute inset-y-0 end-0 hidden w-[42%] max-w-80 overflow-hidden opacity-[0.22] [mask-image:linear-gradient(to_left,black_30%,transparent)] sm:block rtl:[mask-image:linear-gradient(to_right,black_30%,transparent)] dark:opacity-[0.16]"
      style={{
        backgroundImage: [
          'repeating-linear-gradient(90deg, rgb(7 8 13 / 0.35) 0 1px, transparent 1px 4px)',
          'repeating-linear-gradient(180deg, transparent 0 18px, rgb(7 8 13 / 0.55) 18px 23px, transparent 23px 34px, rgb(245 245 242 / 0.35) 34px 36px, transparent 36px 52px)',
          'linear-gradient(90deg, var(--kente-gold) 0 20%, var(--kente-coral) 20% 27%, var(--kente-jade) 27% 46%, var(--kente-gold) 46% 53%, var(--kente-coral) 53% 74%, var(--kente-jade) 74% 81%, var(--kente-gold) 81%)',
        ].join(', '),
      }}
    >
      <span className="profile-sheen" />
    </m.div>
  );
}

/** Réglages du compte, de l'apparence et de la langue de l'interface, en onglets (?tab=appearance). */
export default function SettingsPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const dataSaver = useDataSaverStore((state) => state.enabled);
  const reducedMotion = useReducedMotion();
  const wide = useSyncExternalStore(subscribeWide, () => wideScreen.matches);
  const location = useLocation();
  const [tab, setTab] = useState<SectionId>(() => tabOf(location));
  const [direction, setDirection] = useState(1);
  // Encore aucun onglet changé : le premier panneau monte avec l'en-tête
  const [arrival, setArrival] = useState(true);
  const [accountDirty, setAccountDirty] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Arrivée par un lien vers un onglet (/settings?tab=language), y compris depuis la page elle-même
  const [visit, setVisit] = useState(location.key);
  if (visit !== location.key) {
    setVisit(location.key);
    setTab(tabOf(location));
  }

  // Un champ visé par le lien (#skills) : on y descend, il s'allume d'un halo d'or ; à la souris, le curseur y est
  const reached = useRef<string | null>(null);
  useEffect(() => {
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (!target || reached.current === location.key) {
      return;
    }
    // Compté comme atteint une fois fait : un nouveau rendu qui annule l'attente la reprogramme
    const timer = window.setTimeout(() => {
      reached.current = location.key;
      target.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
      if (!coarsePointer.matches) {
        target.querySelector('input')?.focus({ preventScroll: true });
      }
      const gold = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim();
      if (!reducedMotion && gold) {
        target.querySelector('[data-settings-frame]')?.animate(
          [{ boxShadow: `0 0 0 0 color-mix(in srgb, ${gold} 50%, transparent)` }, { boxShadow: `0 0 0 14px color-mix(in srgb, ${gold} 0%, transparent)` }],
          { duration: 1100, iterations: 2, delay: 350, easing: 'ease-out' },
        );
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [location.hash, location.key, reducedMotion]);

  const openTab = useCallback(
    (value: string) => {
      const next = tabOf({ search: `?tab=${value}`, hash: '' });
      if (next === tab) {
        return;
      }
      const index = (id: SectionId) => SECTIONS.findIndex((section) => section.id === id);
      setDirection(index(next) > index(tab) ? 1 : -1);
      setArrival(false);
      setTab(next);

      // L'adresse suit, pour partager ou recharger l'onglet. Sans passer par le routeur : une navigation
      // ferait attendre le changement d'onglet le temps de son rendu de fond (un quart de seconde)
      const url = new URL(window.location.href);
      url.hash = '';
      if (next === 'account') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', next);
      }
      window.history.replaceState(window.history.state, '', url);

      // Descendu dans un long panneau : on remonte au début du suivant, les onglets en vue
      const root = tabsRef.current;
      if (root) {
        const top = root.getBoundingClientRect().top + window.scrollY - (wideScreen.matches ? 96 : 80);
        if (window.scrollY > top) {
          window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
        }
      }
    },
    [tab, reducedMotion],
  );

  // Les panneaux ne dépendent pas de l'onglet ouvert : changer d'onglet ne les refait pas
  const panels = useMemo(
    () => ({
      account: <AccountSettings onDirtyChange={setAccountDirty} />,
      appearance: <AppearanceSettings />,
      language: <LanguageSettings />,
    }),
    [],
  );

  const ThemeIcon = THEME_ICONS[theme] ?? Monitor;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-9 lg:px-10">
      <header className="relative isolate mb-6 overflow-hidden rounded-[1.75rem] border border-border-subtle bg-card px-6 py-8 shadow-sm sm:mb-8 sm:px-9 sm:py-10">
        <m.div
          aria-hidden
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, ease }}
          className="absolute inset-x-0 top-0 h-1 origin-left bg-kente rtl:origin-right"
        />
        <div aria-hidden className="absolute -start-20 -bottom-28 -z-10 size-72 rounded-full bg-kente-conic opacity-[0.07] blur-3xl saver:hidden" />
        <KenteSwatch />

        <m.div variants={stagger} initial="hidden" animate="shown" className="relative">
          <m.p variants={rise} className="eyebrow mb-3 flex items-center gap-2 text-gold">
            <span aria-hidden className="flex h-2.5 gap-px overflow-hidden rounded-[2px]">
              <span className="w-1.5 bg-kente-gold" />
              <span className="w-0.5 bg-kente-jade" />
              <span className="w-1 bg-kente-coral" />
            </span>
            {t('settingsPage.eyebrow')}
          </m.p>
          <m.h1
            variants={rise}
            className="max-w-3xl font-display text-[1.65rem] leading-tight font-bold tracking-[-0.035em] text-balance sm:text-3xl"
          >
            {t('settingsPage.pageTitle')}
          </m.h1>
          <m.p variants={rise} className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('settingsPage.pageDescription')}
          </m.p>

          {/* Les choix du moment : ils changent en direct, et mènent à leur onglet */}
          <m.div variants={rise} className="mt-6 flex flex-wrap gap-2">
            <SummaryChip
              label={`${t('theme.label')} — ${t(`theme.${theme}`)}`}
              icon={ThemeIcon}
              onClick={() => openTab('appearance')}
              swapKey={theme}
            >
              {t(`theme.${theme}`)}
            </SummaryChip>
            <SummaryChip
              label={`${t('language.label')} — ${language.name}`}
              icon={Languages}
              onClick={() => openTab('language')}
              swapKey={language.code}
            >
              <bdi lang={language.code} dir={language.dir}>
                {language.name}
              </bdi>
            </SummaryChip>
            <AnimatePresence initial={false}>
              {dataSaver && (
                <m.span
                  key="saver"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.3, ease }}
                >
                  <SummaryChip label={t('dataSaver.label')} icon={Leaf} onClick={() => openTab('appearance')} tone="jade">
                    {t('dataSaver.label')}
                  </SummaryChip>
                </m.span>
              )}
            </AnimatePresence>
          </m.div>
        </m.div>
      </header>

      <Tabs.Root
        ref={tabsRef}
        value={tab}
        onValueChange={openTab}
        orientation={wide ? 'vertical' : 'horizontal'}
        className="grid items-start gap-5 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-9"
      >
        <div className="sticky top-[4.5rem] z-20 lg:top-24">
          <Tabs.List
            aria-label={t('settingsPage.sectionNavigation')}
            className="glass grid grid-cols-3 gap-1 rounded-[1.25rem] p-1.5 shadow-sm backdrop-blur-xl saver:bg-card saver:backdrop-blur-none lg:grid-cols-1 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none"
          >
            {SECTIONS.map(({ id, label, hint, icon: Icon, tone }) => {
              const current = tab === id;
              return (
                <Tabs.Trigger
                  key={id}
                  value={id}
                  // Radix donne le focus par script au clic, ce qui allumerait l'anneau du clavier : on le prend avant lui
                  onMouseDown={(event) => event.currentTarget.focus({ focusVisible: false })}
                  className={cn(
                    'group/tab relative flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-[0.875rem] px-1.5 text-[0.8125rem] outline-none max-[359px]:px-1 max-[359px]:text-xs sm:px-2 sm:text-sm',
                    'transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring/70',
                    'lg:min-h-16 lg:justify-start lg:gap-3 lg:rounded-2xl lg:px-3 lg:py-2.5 lg:text-start',
                    current ? 'font-semibold text-foreground' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
                  )}
                >
                  {current && (
                    <>
                      <m.span
                        layoutId="settings-tab"
                        transition={slide}
                        aria-hidden
                        className="absolute inset-0 rounded-[0.875rem] bg-card shadow-sm ring-1 ring-border-subtle lg:rounded-2xl"
                      />
                      <m.span
                        layoutId="settings-tab-thread"
                        transition={slide}
                        aria-hidden
                        className="absolute rounded-full from-kente-gold via-kente-coral to-kente-jade max-lg:inset-x-5 max-lg:-bottom-1.5 max-lg:h-[3px] max-lg:bg-linear-to-r lg:inset-y-3 lg:-start-3 lg:w-[3px] lg:bg-linear-to-b"
                      />
                    </>
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      'relative grid shrink-0 place-items-center transition-[background-color,color,rotate] duration-500 ease-out-expo max-[419px]:hidden lg:size-10 lg:rounded-xl',
                      current ? tone : 'group-hover/tab:-rotate-6 lg:bg-foreground/5',
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="relative min-w-0 lg:flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">{t(label)}</span>
                      {id === 'account' && accountDirty && !current && (
                        <span className="relative flex size-2 shrink-0">
                          <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-gold/60" />
                          <span aria-hidden className="relative size-2 rounded-full bg-gold" />
                          <span className="sr-only">{t('settingsPage.profileDirty')}</span>
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 hidden text-xs leading-snug font-normal text-muted-foreground lg:line-clamp-2">{t(hint)}</span>
                  </span>
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>
          <p className="mt-5 hidden px-3 text-xs leading-relaxed text-faint-foreground lg:block">{t('settingsPage.profileNote')}</p>
        </div>

        <div className="min-w-0">
          <Panel value="account" active={tab === 'account'} direction={direction} arrival={arrival}>
            {panels.account}
          </Panel>
          <Panel value="appearance" active={tab === 'appearance'} direction={direction} arrival={arrival}>
            {panels.appearance}
          </Panel>
          <Panel value="language" active={tab === 'language'} direction={direction} arrival={arrival}>
            {panels.language}
          </Panel>
        </div>
      </Tabs.Root>
    </div>
  );
}

interface SummaryChipProps {
  /** Ce que lit un lecteur d'écran : « Thème — Sombre » */
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  /** Change avec la valeur : l'icône et le texte se remplacent en fondu */
  swapKey?: string;
  tone?: 'neutral' | 'jade';
  children: ReactNode;
}

/** Une pastille de l'en-tête : un choix en cours (thème, langue), qui ouvre l'onglet où il se change */
function SummaryChip({ label, icon: Icon, onClick, swapKey, tone = 'neutral', children }: SummaryChipProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'group/chip inline-flex h-9 items-center gap-2 overflow-hidden rounded-full border px-3.5 text-xs font-semibold outline-none',
        'transition-[background-color,border-color,translate] duration-300 ease-out-expo hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring/70',
        tone === 'jade'
          ? 'border-jade/25 bg-jade/10 text-jade hover:bg-jade/15'
          : 'border-border-subtle bg-background/60 text-soft-foreground hover:border-border-strong hover:text-foreground',
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <m.span
          key={swapKey}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease }}
          className="inline-flex items-center gap-2"
        >
          <Icon aria-hidden className="size-3.5 shrink-0 transition-transform duration-500 ease-out-expo group-hover/chip:-rotate-12" />
          {children}
        </m.span>
      </AnimatePresence>
    </button>
  );
}
