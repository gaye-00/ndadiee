import { ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOpeningFacets } from '@/hooks/useOpenings';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';

/**
 * L'accroche des annonces, et les annonces en chiffres : annonces, projets et pays qui recrutent, places à prendre,
 * annonces encore sans candidature. Les chiffres ne suivent pas les filtres : ce sont toutes les annonces. Un
 * visiteur apprend qu'une fois connecté, il verra sa compatibilité avec chaque rôle. Même construction que
 * l'accroche de la vitrine.
 */
export default function OpeningsIntro() {
  const { t } = useTranslation('openings');
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  // Sans filtre : la même requête que les filtres quand aucun n'est choisi
  const { data } = useOpeningFacets();

  return (
    <header className="grid gap-x-16 gap-y-7 pt-8 pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-end lg:pt-14 lg:pb-12">
      <div>
        <p className="eyebrow">{t('intro.eyebrow')}</p>
        <h1 className="mt-4 font-display text-h1">
          <span className="block">{t('intro.titleTeams')}</span>
          {/* Les lettres sont taillées dans le kente (styles/effects.css) */}
          <span className="block w-fit text-kente-woven">{t('intro.titleCode')}</span>
        </h1>
      </div>

      <div className="flex flex-col gap-5 lg:pb-1.5">
        <p className="text-lead text-muted-foreground">{t('intro.lead')}</p>
        {/* Place gardée tant que les chiffres ne sont pas là : rien ne bouge à leur arrivée */}
        <p className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-xs text-soft-foreground">
          {data && (
            <>
              <span>{t('intro.openings', { count: data.total })}</span>
              {data.projects > 0 && (
                <>
                  <Dot />
                  <span>{t('intro.projects', { count: data.projects })}</span>
                </>
              )}
              {data.countries.length > 0 && (
                <>
                  <Dot />
                  <span>{t('intro.countries', { count: data.countries.length })}</span>
                </>
              )}
              {data.seats > 0 && (
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="size-1.5 rounded-full bg-gold" />
                  {t('intro.seats', { count: data.seats })}
                </span>
              )}
              {data.unclaimed > 0 && (
                <span className="inline-flex items-center gap-2 text-jade">
                  <span aria-hidden className="live-dot size-1.5" />
                  {t('intro.unclaimed', { count: data.unclaimed })}
                </span>
              )}
            </>
          )}
        </p>
        {!isAuthenticated && (
          <Link
            to={paths.login}
            state={{ from: location }}
            viewTransition
            onPointerEnter={() => prefetch(pages.login)}
            onFocus={() => prefetch(pages.login)}
            className={cn(
              'group/sign-in inline-flex w-fit items-center gap-2 rounded-full text-sm font-semibold text-foreground underline-offset-4 hover:underline',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
            )}
          >
            <Sparkles aria-hidden className="size-4 text-jade" />
            {t('intro.signIn')}
            <ArrowRight
              aria-hidden
              className="size-4 text-muted-foreground transition-transform duration-300 group-hover/sign-in:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/sign-in:-translate-x-0.5"
            />
          </Link>
        )}
      </div>
    </header>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-faint-foreground">
      ·
    </span>
  );
}
