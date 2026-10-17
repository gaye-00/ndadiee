import { ArrowRight, LogIn, Search } from 'lucide-react';
import { m, useScroll, useSpring, type HTMLMotionProps, type Transition, type Variants } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link, useHref, useLinkClickHandler, useLocation } from 'react-router-dom';
import Logo from './Logo';
import { PUBLIC_NAV, type NavItem } from '@/config/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages, type PageImport } from '@/router/pages';
import { paths } from '@/router/paths';
import { useCommandPaletteStore } from '@/store/useCommandPaletteStore';

// ── Couleurs : d'un lien à l'autre, l'or, le rouge et le vert se suivent comme les bandes d'un kente ──

type Accent = 'gold' | 'coral' | 'jade';

const WEAVE: readonly Accent[] = ['gold', 'coral', 'jade'];

const accentText: Record<Accent, string> = { gold: 'text-gold', coral: 'text-coral', jade: 'text-jade' };

/** Lueur ronde dans la couleur du lien */
function glow(accent: Accent): CSSProperties {
  const color = `var(--kente-${accent})`;
  return {
    backgroundImage: `radial-gradient(circle, color-mix(in srgb, ${color} 24%, transparent) 0%, color-mix(in srgb, ${color} 8%, transparent) 50%, transparent 72%)`,
  };
}

// ── Mouvements ──

// Survol ou focus d'un lien : le libellé bascule en 3D vers l'arrière, sa face cachée arrive en
// couleur, et une lueur s'étend autour
const flip: Transition = { type: 'spring', stiffness: 220, damping: 22 };

const frontFace: Variants = {
  rest: { rotateX: 0, opacity: 1 },
  hover: { rotateX: -90, opacity: 0 },
};

const backFace: Variants = {
  rest: { rotateX: 90, opacity: 0 },
  hover: { rotateX: 0, opacity: 1 },
};

const halo: Variants = {
  rest: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: 1,
    scale: 2,
    transition: {
      opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
      scale: { type: 'spring', stiffness: 300, damping: 25 },
    },
  },
};

// Pastille de la page en cours, qui glisse d'un lien à l'autre
const slide: Transition = { type: 'spring', stiffness: 380, damping: 34 };

// ── Petits outils ──

/**
 * Lien du routeur animé par Motion. Motion anime directement le <a> et le routeur s'occupe du clic :
 * avec m.create(Link), le lien change de ref à chaque rendu et Motion y perdait survol, focus et appui.
 */
function MotionLink({ to, onClick, ...props }: Omit<HTMLMotionProps<'a'>, 'href'> & { to: string }) {
  const href = useHref(to);
  const navigate = useLinkClickHandler<HTMLAnchorElement>(to, { viewTransition: true });

  return (
    <m.a
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          navigate(event);
        }
      }}
      {...props}
    />
  );
}

// Raccourci de la palette affiché sur le bouton : ⌘ K sur les appareils Apple, Ctrl K ailleurs
const isApple = /Mac|iPhone|iPad/.test(navigator.userAgent);

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

function isCurrent(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Code de la page téléchargé au survol ou au focus du lien : le clic qui suit est instantané */
function preloadOn(load: PageImport) {
  return { onPointerEnter: () => prefetch(load), onFocus: () => prefetch(load) };
}

/**
 * Barre de navigation flottante du visiteur. Design 3A.
 *
 * - Bureau : pilule en verre centrée, logo, sections, recherche, connexion et « Commencer ».
 * - Mobile et tablette : la pilule garde le logo et les actions ; les sections passent dans un dock
 *   d'onglets en bas de l'écran, à portée de pouce, comme la barre de l'application (design 3G).
 *   Les deux barres se rangent quand on descend dans la page et reviennent dès qu'on remonte.
 *
 * Un membre connecté qui revient sur l'accueil voit « Atelier » à la place de « Connexion » et « Commencer ».
 */
export default function PublicNavbar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const { hidden, scrolled, reveal } = useHideOnScroll();

  return (
    <>
      <header
        // La navigation reste à l'écran pendant le fondu entre deux pages
        className="pointer-events-none sticky top-0 z-40 px-3 pt-3 [view-transition-name:public-navbar] lg:px-6 lg:pt-6"
        onFocusCapture={reveal}
      >
        <div
          data-scrolled={scrolled || undefined}
          data-hidden={hidden || undefined}
          className={cn(
            'group/bar pointer-events-auto relative mx-auto flex max-w-xl items-center gap-0.5 rounded-full py-1.5 ps-3 pe-1.5 sm:gap-1 sm:ps-4',
            'border border-glass-border bg-glass backdrop-blur-lg backdrop-saturate-150 saver:bg-background',
            'transition-[translate,background-color,border-color,box-shadow] duration-500 ease-out-expo',
            'data-scrolled:border-border data-scrolled:bg-background/70 data-scrolled:shadow-float',
            'max-lg:data-hidden:-translate-y-[150%]',
            'lg:w-fit lg:max-w-none lg:gap-6 lg:py-2.5 lg:ps-6 lg:pe-2.5',
          )}
        >
          <Link
            to={paths.landing}
            viewTransition
            {...preloadOn(pages.landing)}
            className={cn('rounded-full focus-visible:ring-offset-4 focus-visible:ring-offset-background', focusRing)}
          >
            {/* Sous 360 px, la tuile seule : la place va aux actions */}
            <Logo nameClassName="max-[22.5rem]:sr-only" />
          </Link>

          <nav aria-label={t('a11y.mainNavigation')} className="hidden lg:block">
            <ul className="flex items-center gap-0.5">
              {PUBLIC_NAV.map((item, index) => (
                <li key={item.to}>
                  <FlipLink
                    item={item}
                    accent={WEAVE[index % WEAVE.length]}
                    current={isCurrent(pathname, item.to)}
                  />
                </li>
              ))}
            </ul>
          </nav>

          <div className="ms-auto flex items-center gap-0.5 sm:gap-1 lg:ms-0">
            <SearchButton />
            <span aria-hidden className="mx-1.5 hidden h-5 w-px bg-border lg:block" />
            {isAuthenticated ? (
              <PrimaryLink to={paths.dashboard} load={pages.dashboard}>
                {t('nav.dashboard')}
              </PrimaryLink>
            ) : (
              <>
                <Link
                  to={paths.login}
                  viewTransition
                  {...preloadOn(pages.login)}
                  className={cn(
                    'flex h-9 items-center rounded-full px-2 text-sm font-semibold whitespace-nowrap text-soft-foreground transition-colors hover:text-foreground max-sm:hover:bg-foreground/7 sm:px-3',
                    focusRing,
                  )}
                >
                  <LogIn aria-hidden className="size-4.5 sm:hidden rtl:-scale-x-100" />
                  <span className="sr-only sm:not-sr-only">{t('actions.login')}</span>
                </Link>
                <PrimaryLink to={paths.register} load={pages.register}>
                  {t('actions.getStarted')}
                </PrimaryLink>
              </>
            )}
          </div>

          <ReadingThread />
        </div>
      </header>

      <MobileDock pathname={pathname} hidden={hidden} onFocus={reveal} />
    </>
  );
}

/** Lien d'une section sur bureau : bascule 3D du libellé et lueur kente au survol (inspiration 21st.dev). */
function FlipLink({ item, accent, current }: { item: NavItem; accent: Accent; current: boolean }) {
  const { t } = useTranslation();
  const Icon = item.icon;
  const label = t(`nav.${item.labelKey}`);

  return (
    <MotionLink
      to={item.to}
      aria-current={current ? 'page' : undefined}
      {...preloadOn(item.preload)}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileFocus="hover"
      className={cn(
        'relative flex h-9 items-center rounded-full px-3.5 text-sm font-medium whitespace-nowrap',
        current ? 'text-foreground' : 'text-soft-foreground',
        focusRing,
      )}
    >
      {current && (
        <m.span
          layoutId="public-navbar-current"
          transition={slide}
          className="absolute inset-0 rounded-full bg-foreground/7 ring-1 ring-foreground/10 ring-inset"
        />
      )}
      <m.span
        aria-hidden
        variants={halo}
        className="pointer-events-none absolute inset-0 rounded-full opacity-0"
        style={glow(accent)}
      />

      <span className="relative perspective-normal">
        <m.span variants={frontFace} transition={flip} className="flex origin-bottom items-center gap-2">
          <Icon
            aria-hidden
            className={cn('size-4 transition-colors duration-300', current ? accentText[accent] : 'text-muted-foreground')}
          />
          {label}
        </m.span>
        {/* Face cachée : même libellé, en couleur. Ignorée des lecteurs d'écran, qui lisent la première */}
        <m.span
          aria-hidden
          variants={backFace}
          transition={flip}
          className="absolute inset-0 flex origin-top items-center gap-2 text-foreground opacity-0"
        >
          <Icon className={cn('size-4', accentText[accent])} />
          {label}
        </m.span>
      </span>
    </MotionLink>
  );
}

/** Bouton qui ouvre la palette de recherche ; sur bureau, il rappelle le raccourci clavier. */
function SearchButton() {
  const { t } = useTranslation();
  const setOpen = useCommandPaletteStore((s) => s.setOpen);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t('search.placeholder')}
      aria-keyshortcuts="Control+K Meta+K"
      className={cn(
        'flex h-9 items-center gap-2 rounded-full px-2 text-soft-foreground transition-colors hover:bg-foreground/7 hover:text-foreground sm:px-2.5',
        'lg:border lg:border-border lg:ps-3 lg:pe-1.5',
        focusRing,
      )}
    >
      <Search aria-hidden className="size-4.5 lg:size-4" />
      <kbd className="hidden h-6 items-center rounded-full bg-foreground/7 px-2 font-mono text-[0.6875rem] text-muted-foreground lg:inline-flex">
        {isApple ? '⌘ K' : t('search.shortcut')}
      </kbd>
    </button>
  );
}

/** Bouton principal en pilule : blanc sur la nuit, il prend l'or au survol, traversé d'un reflet. */
function PrimaryLink({ to, load, children }: { to: string; load: PageImport; children: ReactNode }) {
  return (
    <Link
      to={to}
      viewTransition
      {...preloadOn(load)}
      className={cn(
        'group/cta relative isolate inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-full bg-inverse px-3.5 text-sm font-bold whitespace-nowrap text-inverse-foreground',
        'transition-[background-color,color,box-shadow,scale] duration-300 ease-out-expo',
        'hover:bg-kente-gold hover:text-kente-night hover:shadow-[0_0_28px_-6px_var(--kente-gold)] active:scale-[0.97]',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'sm:ps-4 sm:pe-3.5 lg:h-10 lg:ps-5 lg:pe-4',
        focusRing,
      )}
    >
      {children}
      <ArrowRight
        aria-hidden
        className="size-4 transition-transform duration-300 ease-out-expo group-hover/cta:translate-x-0.5 max-sm:hidden rtl:-scale-x-100 rtl:group-hover/cta:-translate-x-0.5"
      />
      {/* Reflet qui traverse le bouton au survol */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-0 -z-10 w-1/3 -translate-x-full skew-x-[-20deg] bg-linear-to-r from-transparent via-kente-paper/70 to-transparent transition-transform duration-700 ease-out-expo group-hover/cta:translate-x-[400%] rtl:translate-x-full rtl:group-hover/cta:-translate-x-[400%]"
      />
    </Link>
  );
}

/** Fil kente sous la pilule, qui avance avec la lecture de la page. */
function ReadingThread() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 32, restDelta: 0.001 });

  return (
    <m.span
      aria-hidden
      style={{ scaleX: progress }}
      className="pointer-events-none absolute inset-x-8 -bottom-px h-px origin-left bg-kente opacity-0 transition-opacity duration-500 group-data-scrolled/bar:opacity-100 rtl:origin-right"
    />
  );
}

/**
 * Dock d'onglets du mobile et de la tablette : les sections à portée de pouce. Toujours sombre,
 * comme la barre de l'application (design 3G), dans les deux thèmes.
 */
function MobileDock({ pathname, hidden, onFocus }: { pathname: string; hidden: boolean; onFocus: () => void }) {
  const { t } = useTranslation();

  return (
    <>
      <nav
        aria-label={t('a11y.mainNavigation')}
        data-hidden={hidden || undefined}
        onFocusCapture={onFocus}
        className={cn(
          // `dark` : les couleurs du thème sombre s'appliquent à l'intérieur du dock, quel que soit le thème
          'dark fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-md lg:hidden',
          'rounded-3xl border border-glass-border bg-surface/90 p-1.5 text-muted-foreground shadow-float backdrop-blur-xl saver:bg-surface',
          // Thème sombre de la page : un cran plus clair que la nuit, pour se détacher du fond
          '[.dark_&]:bg-surface-raised/90 [.dark_&]:saver:bg-surface-raised',
          'transition-[translate] duration-500 ease-out-expo data-hidden:translate-y-[calc(100%+2rem)]',
          '[view-transition-name:public-dock]',
        )}
      >
        <ul className="grid grid-cols-4 gap-1">
          {PUBLIC_NAV.map((item, index) => {
            const current = isCurrent(pathname, item.to);
            const accent = WEAVE[index % WEAVE.length];
            const Icon = item.icon;

            return (
              <li key={item.to}>
                <MotionLink
                  to={item.to}
                  aria-current={current ? 'page' : undefined}
                  {...preloadOn(item.preload)}
                  whileTap={{ scale: 0.92 }}
                  className={cn(
                    'relative flex h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.6875rem] font-semibold transition-colors',
                    current ? 'text-foreground' : 'active:text-foreground',
                    focusRing,
                  )}
                >
                  {current && (
                    <m.span
                      layoutId="public-dock-current"
                      transition={slide}
                      className="absolute inset-0 overflow-hidden rounded-2xl bg-foreground/8"
                    >
                      <span className="absolute inset-0" style={glow(accent)} />
                    </m.span>
                  )}
                  <Icon aria-hidden className={cn('relative size-5', current && accentText[accent])} />
                  <span className="relative max-w-full truncate">{t(`nav.${item.labelKey}`)}</span>
                </MotionLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Place réservée en bas de page, sous le pied de page, pour que le dock ne le cache jamais */}
      {createPortal(<div aria-hidden className="h-[calc(5.5rem+env(safe-area-inset-bottom))] lg:hidden" />, document.body)}
    </>
  );
}
