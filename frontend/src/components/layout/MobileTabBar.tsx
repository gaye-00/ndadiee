import { FolderPlus, MessageSquarePlus, Plus, Sparkles, type LucideIcon } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useCallback, useEffect, useId, useRef, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { ADMIN_MOBILE_TABS, isCurrentPath, MOBILE_TABS, type NavItem } from '@/config/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages, type PageImport } from '@/router/pages';
import { paths } from '@/router/paths';

// La pastille de l'onglet ouvert glisse d'un onglet à l'autre
const slide = { type: 'spring', stiffness: 420, damping: 36 } as const;

interface CreateAction {
  label: 'actions.newProject' | 'actions.publishRole' | 'actions.newTopic';
  to: string;
  icon: LucideIcon;
  load: PageImport;
  tone: string;
}

// Ce qu'on crée depuis le bouton central
const CREATE_ACTIONS: readonly CreateAction[] = [
  { label: 'actions.newProject', to: paths.newProject, icon: FolderPlus, load: pages.newProject, tone: 'bg-kente-gold' },
  { label: 'actions.publishRole', to: paths.newOpening, icon: Sparkles, load: pages.newOpening, tone: 'bg-kente-coral' },
  { label: 'actions.newTopic', to: paths.newTopic, icon: MessageSquarePlus, load: pages.newTopic, tone: 'bg-kente-jade' },
];

/**
 * Barre d'onglets fixée en bas sur téléphone, avec le bouton central de création. Design 3G.
 *
 * Toujours sombre, dans les deux thèmes. Elle se range quand on descend dans la page et revient dès qu'on
 * remonte. Le bouton central ouvre un éventail : nouveau projet, rôle à publier, sujet du forum.
 */
export default function MobileTabBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { hidden, reveal } = useHideOnScroll();
  const { isAdmin } = useAuth();
  const [creating, setCreating] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);
  const left = MOBILE_TABS.slice(0, 2);
  const right = MOBILE_TABS.slice(2);

  // Fermé par Échap ou un appui à côté, l'éventail rend le focus au bouton central
  const close = useCallback((restoreFocus: boolean) => {
    setCreating(false);
    if (restoreFocus) {
      createButton.current?.focus();
    }
  }, []);

  // Un admin ne crée rien dans la communauté : quatre onglets (le back-office, puis le site), sans bouton central
  if (isAdmin) {
    return (
      <nav
        aria-label={t('a11y.mainNavigation')}
        data-hidden={hidden || undefined}
        onFocusCapture={reveal}
        className={cn(
          'dark fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md md:hidden',
          'rounded-3xl border border-glass-border bg-surface/90 p-1.5 text-muted-foreground shadow-float backdrop-blur-xl saver:bg-surface',
          '[.dark_&]:bg-surface-raised/90 [.dark_&]:saver:bg-surface-raised',
          'transition-[translate] duration-500 ease-out-expo data-hidden:translate-y-[calc(100%+2rem)]',
          '[view-transition-name:app-tabbar]',
        )}
      >
        <ul className="grid h-14 grid-cols-4 items-center">
          {ADMIN_MOBILE_TABS.map((item) => (
            <li key={item.to}>
              <TabLink item={item} current={isCurrentPath(pathname, item.to)} />
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <>
      <CreateFan open={creating} onClose={close} />
      <nav
        aria-label={t('a11y.mainNavigation')}
        data-hidden={(hidden && !creating) || undefined}
        onFocusCapture={reveal}
        className={cn(
          // `dark` : les couleurs du thème sombre s'appliquent dans la barre, quel que soit le thème
          'dark fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md md:hidden',
          'rounded-3xl border border-glass-border bg-surface/90 p-1.5 text-muted-foreground shadow-float backdrop-blur-xl saver:bg-surface',
          '[.dark_&]:bg-surface-raised/90 [.dark_&]:saver:bg-surface-raised',
          'transition-[translate] duration-500 ease-out-expo data-hidden:translate-y-[calc(100%+2rem)]',
          '[view-transition-name:app-tabbar]',
        )}
      >
        <ul className="grid h-14 grid-cols-5 items-center">
          {left.map((item) => (
            <li key={item.to}>
              <TabLink item={item} current={isCurrentPath(pathname, item.to)} />
            </li>
          ))}
          <li className="grid place-items-center">
            <CreateButton ref={createButton} open={creating} onToggle={() => setCreating((value) => !value)} />
          </li>
          {right.map((item) => (
            <li key={item.to}>
              <TabLink item={item} current={isCurrentPath(pathname, item.to)} />
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function TabLink({ item, current }: { item: NavItem; current: boolean }) {
  const { t } = useTranslation();
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      viewTransition
      aria-current={current ? 'page' : undefined}
      onPointerDown={() => prefetch(item.preload)}
      onFocus={() => prefetch(item.preload)}
      className={cn(
        'relative mx-auto flex h-14 w-full max-w-18 flex-col items-center justify-center gap-1 rounded-2xl text-[0.6875rem] font-semibold outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring/70 active:scale-95',
        current ? 'text-foreground' : 'active:text-foreground',
      )}
    >
      {current && (
        <m.span layoutId="tabbar-current" transition={slide} className="absolute inset-0 overflow-hidden rounded-2xl bg-foreground/8">
          <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-kente-warm" />
        </m.span>
      )}
      <Icon aria-hidden className={cn('relative size-5.5', current && 'text-kente-gold')} strokeWidth={current ? 2.3 : 2} />
      <span className="relative max-w-full truncate">{t(`nav.${item.labelKey}`)}</span>
    </Link>
  );
}

/** Le bouton central : un carré or et rouge ; ouvert, son « + » tourne en « × ». */
function CreateButton({ open, onToggle, ref }: { open: boolean; onToggle: () => void; ref: Ref<HTMLButtonElement> }) {
  const { t } = useTranslation();

  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      aria-controls="create-fan"
      aria-label={t('nav.create')}
      onClick={onToggle}
      className={cn(
        'grid size-12 place-items-center rounded-2xl bg-kente-warm text-kente-night shadow-[0_10px_24px_-10px_var(--kente-coral)] outline-none',
        'transition-[scale,box-shadow] duration-300 ease-out-expo active:scale-90 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
      )}
    >
      <Plus aria-hidden strokeWidth={2.75} className={cn('size-6 transition-transform duration-500 ease-out-expo', open && 'rotate-[135deg]')} />
    </button>
  );
}

/**
 * L'éventail de création, au-dessus de la barre : un voile sur la page, et trois actions qui montent l'une
 * après l'autre. Échap ou un appui à côté le referment ; le focus va à la première action.
 */
function CreateFan({ open, onClose }: { open: boolean; onClose: (restoreFocus: boolean) => void }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const titleId = useId();
  const first = useRef<HTMLAnchorElement>(null);
  const opened = useRef(pathname);

  // À l'ouverture, le focus va à la première action
  useEffect(() => {
    if (open) {
      first.current?.focus();
    }
  }, [open]);

  // Échap ferme
  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Changer de page aussi : le focus va alors à la nouvelle page
  useEffect(() => {
    if (opened.current !== pathname) {
      opened.current = pathname;
      onClose(false);
    }
  }, [pathname, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            key="veil"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => onClose(true)}
            className="fixed inset-0 z-40 bg-kente-night/45 backdrop-blur-[3px] saver:backdrop-blur-none md:hidden"
          />
          <m.div
            key="fan"
            id="create-fan"
            role="dialog"
            aria-labelledby={titleId}
            className="fixed inset-x-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+5.25rem)] z-50 mx-auto flex max-w-md flex-col items-center gap-2.5 md:hidden"
          >
            <h2 id={titleId} className="sr-only">
              {t('nav.create')}
            </h2>
            {CREATE_ACTIONS.map((action, index) => {
              const Icon = action.icon;
              const rank = CREATE_ACTIONS.length - 1 - index;
              return (
                <m.div
                  key={action.to}
                  initial={{ opacity: 0, y: 24, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 460, damping: 30, delay: rank * 0.05 } }}
                  exit={{ opacity: 0, y: 16, scale: 0.95, transition: { duration: 0.15, delay: index * 0.03 } }}
                >
                  <Link
                    ref={index === 0 ? first : undefined}
                    to={action.to}
                    viewTransition
                    onClick={() => onClose(false)}
                    onPointerEnter={() => prefetch(action.load)}
                    onFocus={() => prefetch(action.load)}
                    className="dark flex h-12 items-center gap-3 rounded-full border border-glass-border bg-surface-raised ps-2 pe-5 text-sm font-bold text-foreground shadow-float outline-none focus-visible:ring-2 focus-visible:ring-ring/70 active:scale-95"
                  >
                    <span className={cn('grid size-8 place-items-center rounded-full text-kente-night', action.tone)}>
                      <Icon aria-hidden className="size-4" strokeWidth={2.4} />
                    </span>
                    {t(action.label)}
                  </Link>
                </m.div>
              );
            })}
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
