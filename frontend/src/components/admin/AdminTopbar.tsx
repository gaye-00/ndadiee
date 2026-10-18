import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import UserMenu from '@/components/layout/UserMenu';
import { ADMIN_SECTIONS, isCurrentSection } from '@/config/navigation';
import { site } from '@/config/site';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * Sur téléphone et tablette, à la place de la console : le nom de la plateforme et le sceau « Back-office », le
 * compte, puis les sections en pastilles qui défilent au doigt.
 */
export default function AdminTopbar() {
  const { t } = useTranslation('admin');
  const { pathname } = useLocation();
  const { scrolled } = useHideOnScroll();

  return (
    <header
      data-scrolled={scrolled || undefined}
      className={cn(
        'sticky top-0 z-30 border-b border-transparent bg-background/75 backdrop-blur-xl backdrop-saturate-150 saver:bg-background lg:hidden',
        'transition-[border-color,background-color] duration-300 data-scrolled:border-border-subtle',
      )}
    >
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Link to={paths.admin} viewTransition className={cn('flex min-w-0 items-center gap-2.5 rounded-lg', focusRing)}>
          <span aria-hidden className="size-7 shrink-0 rounded-[0.5rem] bg-kente-conic" />
          <span className="truncate font-display text-sm font-bold">{site.name}</span>
          <span className="rounded-full bg-gold/15 px-2 py-px font-mono text-[0.625rem] font-semibold tracking-wider text-gold uppercase">
            {t('shell.brand')}
          </span>
        </Link>
        <span className="flex-1" />
        <UserMenu placement="topbar" />
      </div>

      <nav aria-label={t('shell.nav')} className="overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:px-6">
        <ul className="flex w-max gap-1.5">
          {ADMIN_SECTIONS.map((section) => {
            const current = isCurrentSection(pathname, section);
            const Icon = section.icon;
            return (
              <li key={section.key}>
                <Link
                  to={section.to}
                  viewTransition
                  aria-current={current ? 'page' : undefined}
                  onPointerDown={() => prefetch(section.preload)}
                  onFocus={() => prefetch(section.preload)}
                  className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors',
                    current ? 'border-gold/40 bg-gold/12 text-foreground' : 'border-glass-border bg-glass text-soft-foreground hover:text-foreground',
                    focusRing,
                  )}
                >
                  <Icon aria-hidden className={cn('size-4', current ? 'text-gold' : 'text-muted-foreground')} />
                  {t(`shell.sections.${section.key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
