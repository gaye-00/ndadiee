import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import UserMenu from './UserMenu';
import UnreadMessagesBadge from '@/components/messages/UnreadMessagesBadge';
import { ADMIN_APP_NAV, APP_NAV, isCurrentPath, type NavItem } from '@/config/navigation';
import { site } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';

// La pastille de la section ouverte glisse d'une icône à l'autre
const slide = { type: 'spring', stiffness: 420, damping: 36 } as const;

/**
 * Rail de navigation de l'application, sur tablette et ordinateur. Design 3B, 3E.
 *
 * Une colonne de verre : le logo en haut, une icône par section, l'avatar du compte en bas. La section
 * ouverte porte une pastille et un fil kente sur le bord du rail, qui glissent d'une section à l'autre.
 * Au survol ou au focus, le nom de la section sort du rail. La page d'une section se télécharge dès
 * qu'on la survole.
 */
export default function Sidebar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { isAdmin, home } = useAuth();
  // Un admin qui parcourt le site : le back-office, puis les sections publiques
  const nav = isAdmin ? ADMIN_APP_NAV : APP_NAV;

  return (
    <aside className="sticky top-0 z-30 hidden h-dvh py-5 ps-4 md:block [view-transition-name:app-rail]">
      <div className="glass relative flex h-full w-[4.5rem] flex-col items-center gap-2 rounded-[1.375rem] py-4 backdrop-blur-xl saver:bg-background">
        <Link
          to={home}
          viewTransition
          onPointerEnter={() => prefetch(isAdmin ? pages.admin : pages.dashboard)}
          onFocus={() => prefetch(isAdmin ? pages.admin : pages.dashboard)}
          className="group/logo mb-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span
            aria-hidden
            className="block size-9 rounded-[0.6875rem] bg-kente-conic shadow-[0_8px_24px_-10px_var(--kente-coral)] transition-transform duration-700 ease-out-expo group-hover/logo:rotate-180 group-focus-visible/logo:rotate-180"
          />
          <span className="sr-only">{site.name}</span>
        </Link>

        <nav aria-label={t('shell.rail')}>
          <ul className="flex flex-col items-center gap-2">
            {nav.map((item) => (
              <li key={item.to}>
                <RailLink item={item} current={isCurrentPath(pathname, item.to)} />
              </li>
            ))}
          </ul>
        </nav>

        <span className="flex-1" />
        <UserMenu placement="rail" />
      </div>
    </aside>
  );
}

/** Une section du rail : l'icône, et son nom qui sort du rail au survol ou au focus. */
function RailLink({ item, current }: { item: NavItem; current: boolean }) {
  const { t } = useTranslation();
  const Icon = item.icon;
  const label = t(`nav.${item.labelKey}`);
  const preload = () => prefetch(item.preload);

  return (
    <Link
      to={item.to}
      viewTransition
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      onPointerEnter={preload}
      onFocus={preload}
      className={cn(
        'group/rail relative grid size-11 place-items-center rounded-[0.875rem] outline-none transition-colors duration-200',
        'focus-visible:ring-2 focus-visible:ring-ring/70',
        current ? 'text-foreground' : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
      )}
    >
      {current && (
        <>
          <m.span layoutId="rail-current" transition={slide} className="absolute inset-0 rounded-[0.875rem] bg-foreground/10 ring-1 ring-foreground/8 ring-inset" />
          {/* Le fil kente, sur le bord du rail */}
          <m.span
            layoutId="rail-thread"
            transition={slide}
            aria-hidden
            className="absolute -start-[0.875rem] top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-linear-to-b from-kente-gold via-kente-coral to-kente-jade"
          />
        </>
      )}
      <Icon
        aria-hidden
        strokeWidth={current ? 2.25 : 2}
        className="relative size-5 transition-transform duration-300 ease-out-expo group-hover/rail:scale-110 group-active/rail:scale-95"
      />
      {item.labelKey === 'messages' && <UnreadMessagesBadge className="-end-0.5 -top-0.5" />}

      {/* Le nom de la section, hors du rail */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute start-[calc(100%+0.875rem)] top-1/2 z-10 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap',
          'bg-inverse text-inverse-foreground shadow-float',
          'translate-x-[-0.25rem] opacity-0 transition-[translate,opacity] duration-200 ease-out-expo rtl:translate-x-[0.25rem]',
          'group-hover/rail:translate-x-0 group-hover/rail:opacity-100 group-focus-visible/rail:translate-x-0 group-focus-visible/rail:opacity-100',
        )}
      >
        {label}
      </span>
    </Link>
  );
}
