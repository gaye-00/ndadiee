import { Plus } from 'lucide-react';
import { m, useScroll, useSpring } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Breadcrumbs from './Breadcrumbs';
import NotificationBell from './NotificationBell';
import SearchTrigger from './SearchTrigger';
import UserMenu from './UserMenu';
import { site } from '@/config/site';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';

/**
 * Barre du haut de l'application : fil d'Ariane, recherche Ctrl K, notifications, « Nouveau projet ».
 * Design 3C, 3D.
 *
 * Sur téléphone, elle porte aussi le logo et l'avatar du compte (le rail est caché). Un fil kente,
 * sous la barre, avance avec la lecture de la page.
 */
export default function Topbar() {
  const { t } = useTranslation();
  const { scrolled } = useHideOnScroll();

  return (
    <header
      data-scrolled={scrolled || undefined}
      className={cn(
        'group/topbar sticky top-0 z-30 border-b border-transparent bg-background/70 backdrop-blur-xl backdrop-saturate-150 saver:bg-background',
        'transition-[border-color,background-color] duration-300 data-scrolled:border-border-subtle data-scrolled:bg-background/80',
        '[view-transition-name:app-topbar]',
      )}
    >
      <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <Link
          to={paths.dashboard}
          viewTransition
          onPointerEnter={() => prefetch(pages.dashboard)}
          className="group/logo shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/70 md:hidden"
        >
          <span aria-hidden className="block size-7 rounded-[0.5rem] bg-kente-conic transition-transform duration-700 ease-out-expo group-hover/logo:rotate-180" />
          <span className="sr-only">{site.name}</span>
        </Link>

        <Breadcrumbs className="min-w-0 flex-1" />

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <SearchTrigger />
          <NotificationBell />
          <Link
            to={paths.newProject}
            viewTransition
            aria-label={t('actions.newProject')}
            onPointerEnter={() => prefetch(pages.newProject)}
            onFocus={() => prefetch(pages.newProject)}
            className={cn(
              'group/new relative isolate hidden h-10 items-center gap-1.5 overflow-hidden rounded-[0.875rem] bg-kente-warm px-3 text-sm font-bold whitespace-nowrap text-kente-night md:inline-flex lg:ps-3.5 lg:pe-4',
              'shadow-[0_10px_24px_-14px_var(--kente-coral)] transition-[translate,box-shadow] duration-300 ease-out-expo hover:-translate-y-px hover:shadow-[0_14px_30px_-12px_var(--kente-coral)] active:translate-y-0',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            <Plus aria-hidden className="size-4.5 transition-transform duration-500 ease-out-expo group-hover/new:rotate-90" strokeWidth={2.5} />
            <span className="hidden lg:inline">{t('actions.newProject')}</span>
            {/* Reflet qui traverse le bouton au survol */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 start-0 -z-10 w-1/3 -translate-x-full skew-x-[-20deg] bg-linear-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 ease-out-expo group-hover/new:translate-x-[400%] rtl:translate-x-full rtl:group-hover/new:-translate-x-[400%]"
            />
          </Link>
          <UserMenu placement="topbar" className="md:hidden" />
        </div>
      </div>
      <ReadingThread />
    </header>
  );
}

/** Fil kente sous la barre, qui avance avec la lecture de la page. */
function ReadingThread() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 32, restDelta: 0.001 });

  return (
    <m.span
      aria-hidden
      style={{ scaleX: progress }}
      className="pointer-events-none absolute inset-x-0 -bottom-px h-px origin-left bg-kente opacity-0 transition-opacity duration-500 group-data-scrolled/topbar:opacity-100 rtl:origin-right"
    />
  );
}
