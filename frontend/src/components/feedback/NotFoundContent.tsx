import { ArrowLeft, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { statusPrimaryAction, statusSecondaryAction } from './statusActions';
import { NOT_FOUND_MOTIFS } from './statusMotifs';
import StatusPage from './StatusPage';
import { PUBLIC_NAV } from '@/config/navigation';
import { useAuth } from '@/hooks/useAuth';
import { prefetch } from '@/lib/prefetch';
import { paths } from '@/router/paths';
import { useCommandPaletteStore } from '@/store/useCommandPaletteStore';

/**
 * Une adresse qui ne mène à rien : le « 404 » tissé, l'adresse demandée (on y voit une faute de frappe), le retour à
 * son accueil et la recherche.
 */
export default function NotFoundContent({ standalone = false }: { standalone?: boolean }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { isAuthenticated, home } = useAuth();
  const openSearch = useCommandPaletteStore((s) => s.setOpen);
  const homePath = isAuthenticated ? home : paths.landing;

  return (
    <StatusPage
      motifs={NOT_FOUND_MOTIFS}
      title={t('errorPages.notFoundTitle')}
      description={t('errors.notFound')}
      standalone={standalone}
      home={homePath}
      detail={
        <p dir="ltr" className="mt-4 max-w-full self-start truncate rounded-lg bg-foreground/5 px-2.5 py-1 font-mono text-xs text-muted-foreground">
          {pathname}
        </p>
      }
      actions={
        <>
          <Link to={homePath} viewTransition className={statusPrimaryAction}>
            <ArrowLeft aria-hidden className="size-4.5 rtl:-scale-x-100" />
            {t('errorPages.home')}
          </Link>
          {/* À la racine, la palette n'est plus là : seule la coquille la porte */}
          {!standalone && (
            <button type="button" onClick={() => openSearch(true)} className={statusSecondaryAction}>
              <Search aria-hidden className="size-4.5" />
              {t('search.placeholder')}
            </button>
          )}
        </>
      }
    >
      {/* À la racine, aucune navigation autour : sinon, ces liens répéteraient celle de la coquille */}
      {standalone && (
        <nav aria-label={t('search.groups.pages')} className="mt-9 flex flex-wrap gap-2 border-t border-border-subtle pt-6">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              viewTransition
              onPointerEnter={() => prefetch(item.preload)}
              onFocus={() => prefetch(item.preload)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3.5 text-sm font-semibold text-soft-foreground transition-colors outline-none hover:border-gold/45 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <item.icon aria-hidden className="size-4" />
              {t(`nav.${item.labelKey}`)}
            </Link>
          ))}
        </nav>
      )}
    </StatusPage>
  );
}
