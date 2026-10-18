import { ArrowUpRight } from 'lucide-react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import UserMenu from '@/components/layout/UserMenu';
import { ADMIN_SECTIONS, PUBLIC_NAV, isCurrentSection, type AdminSection } from '@/config/navigation';
import { site } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';

// La pastille de la section ouverte glisse d'une section à l'autre
const slide = { type: 'spring', stiffness: 420, damping: 36 } as const;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * La console du back-office, sur grand écran. Toujours sombre, dans les deux thèmes : on sait d'un coup d'œil
 * qu'on n'est plus dans l'atelier d'un membre. Le nom de la plateforme et le sceau « Back-office », les sections
 * (la pastille et le fil kente de la section ouverte glissent de l'une à l'autre), des raccourcis vers les pages
 * publiques, et le compte connecté avec son menu.
 */
export default function AdminConsole() {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation();
  const { user } = useAuth();
  const { pathname } = useLocation();

  return (
    <aside className="sticky top-0 z-30 hidden h-dvh py-4 ps-4 lg:block [view-transition-name:admin-console]">
      {/* `dark` : les couleurs du thème sombre s'appliquent dans la console, quel que soit le thème */}
      <div className="dark relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-glass-border bg-surface text-foreground shadow-float">
        {/* Le fil kente, en tête de la console */}
        <span aria-hidden className="h-1 shrink-0 bg-kente" />

        <Link to={paths.admin} viewTransition className={cn('group/brand mx-4 mt-5 flex items-center gap-3 rounded-xl p-1', focusRing)}>
          <span
            aria-hidden
            className="size-9 shrink-0 rounded-[0.6875rem] bg-kente-conic shadow-[0_8px_24px_-10px_var(--kente-coral)] transition-transform duration-700 ease-out-expo group-hover/brand:rotate-180"
          />
          <span className="min-w-0">
            <span className="block font-display text-[0.9375rem] font-bold tracking-tight">{site.name}</span>
            <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2 py-px font-mono text-[0.625rem] font-semibold tracking-wider text-gold uppercase">
              {t('shell.brand')}
            </span>
          </span>
        </Link>

        <nav aria-label={t('shell.nav')} className="mt-8 px-3">
          <ul className="flex flex-col gap-1">
            {ADMIN_SECTIONS.map((section) => (
              <li key={section.key}>
                <SectionLink section={section} current={isCurrentSection(pathname, section)} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="mx-6 my-6 h-px bg-border-subtle" />

        <nav aria-label={t('shell.site')} className="px-3">
          <p className="eyebrow px-3 pb-2">{t('shell.site')}</p>
          <ul className="flex flex-col">
            {PUBLIC_NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  viewTransition
                  onPointerEnter={() => prefetch(item.preload)}
                  onFocus={() => prefetch(item.preload)}
                  className={cn(
                    'group/site flex h-9 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground',
                    focusRing,
                  )}
                >
                  <item.icon aria-hidden className="size-4" />
                  <span className="flex-1">{tCommon(`nav.${item.labelKey}`)}</span>
                  <ArrowUpRight aria-hidden className="size-3.5 opacity-0 transition-opacity group-hover/site:opacity-100 rtl:-scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <span className="flex-1" />

        {user && (
          <div className="m-3 flex items-center gap-3 rounded-2xl border border-border-subtle bg-foreground/[0.03] p-2.5">
            {/* L'avatar à anneau kente ouvre le menu du compte (thème, langue, déconnexion) */}
            <UserMenu placement="rail" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">
                <bdi>{user.fullName}</bdi>
              </span>
              <span className="block truncate text-xs text-muted-foreground">{t('shell.role')}</span>
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

function SectionLink({ section, current }: { section: AdminSection; current: boolean }) {
  const { t } = useTranslation('admin');
  const Icon = section.icon;
  const preload = () => prefetch(section.preload);

  return (
    <Link
      to={section.to}
      viewTransition
      aria-current={current ? 'page' : undefined}
      onPointerEnter={preload}
      onFocus={preload}
      className={cn(
        'relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors',
        current ? 'text-foreground' : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
        focusRing,
      )}
    >
      {current && (
        <>
          <m.span layoutId="admin-section" transition={slide} className="absolute inset-0 rounded-xl bg-foreground/10 ring-1 ring-foreground/8 ring-inset" />
          <m.span
            layoutId="admin-thread"
            transition={slide}
            aria-hidden
            className="absolute -start-3 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-linear-to-b from-kente-gold via-kente-coral to-kente-jade"
          />
        </>
      )}
      <Icon aria-hidden strokeWidth={current ? 2.25 : 2} className={cn('relative size-[1.125rem]', current && 'text-gold')} />
      <span className="relative">{t(`shell.sections.${section.key}`)}</span>
    </Link>
  );
}
