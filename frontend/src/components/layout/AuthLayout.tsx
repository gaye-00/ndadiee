import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { site } from '@/config/site';
import { paths } from '@/router/paths';
import { useAuthLoomStore } from '@/store/useAuthLoomStore';
import LanguageSwitcher from './LanguageSwitcher';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

// Le métier à tisser, sur grand écran seulement : son code n'est téléchargé que là
const AuthLoom = lazy(() => import('@/components/auth/AuthLoom'));

const YEAR = new Date().getFullYear();
const wide = window.matchMedia('(min-width: 1024px)');
const subscribeWidth = (onChange: () => void) => {
  wide.addEventListener('change', onChange);
  return () => wide.removeEventListener('change', onChange);
};

/**
 * Connexion et inscription : le formulaire d'un côté, sans navigation ; de l'autre, sur grand écran, le
 * métier à tisser qui tisse une étoffe kente à mesure qu'on remplit le formulaire. Sur téléphone, une
 * bande tissée sous l'en-tête suit le même avancement.
 */
export default function AuthLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const reset = useAuthLoomStore((s) => s.reset);
  const large = useSyncExternalStore(subscribeWidth, () => wide.matches);

  // Une page, une étoffe neuve : de la connexion à l'inscription, le métier repart du début
  useEffect(() => {
    reset();
  }, [pathname, reset]);

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-h-dvh min-w-0 flex-col px-5 sm:px-10 xl:px-16">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 sm:h-20">
          <Link
            to={paths.landing}
            viewTransition
            aria-label={site.name}
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <AuthBand className="lg:hidden" />

        <main id="main" tabIndex={-1} className="flex flex-1 flex-col justify-center py-10 outline-none sm:py-14">
          <div className="mx-auto w-full max-w-[26rem]">
            <Outlet />
          </div>
        </main>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-1 py-6 text-xs text-faint-foreground">
          <span>{t('footer.woven')}</span>
          <span>{t('footer.copyright', { year: YEAR, name: site.name })}</span>
        </footer>
      </div>

      {large && (
        <Suspense fallback={<div aria-hidden className="sticky top-0 h-dvh bg-kente-night" />}>
          <AuthLoom />
        </Suspense>
      )}
    </div>
  );
}

/**
 * Sur téléphone et tablette, le métier tient dans une bande : l'étoffe avance de la gauche (de la droite en
 * arabe) à mesure que le formulaire se remplit, une navette au bout.
 */
function AuthBand({ className }: { className?: string }) {
  const progress = useAuthLoomStore((s) => s.progress);
  const welcome = useAuthLoomStore((s) => s.welcome);
  const done = welcome ? 1 : 0.08 + 0.72 * progress;

  return (
    <div aria-hidden className={className}>
      <div className="auth-band relative h-2 rounded-full">
        <span className="auth-band-cloth absolute inset-y-0 start-0 rounded-full" style={{ width: `${done * 100}%` }} />
      </div>
    </div>
  );
}
