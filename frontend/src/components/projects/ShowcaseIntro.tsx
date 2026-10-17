import { useTranslation } from 'react-i18next';
import { useProjectFacets } from '@/hooks/useProjects';

/**
 * L'accroche de la vitrine, et la vitrine en chiffres : projets, pays d'où ils viennent, projets qui
 * recrutent et places à prendre dans leurs équipes. Les chiffres ne suivent pas les filtres : c'est toute la
 * vitrine. Même construction que l'accroche des hackathons.
 */
export default function ShowcaseIntro() {
  const { t } = useTranslation('showcase');
  // Sans filtre : la même requête que les filtres quand aucun n'est choisi
  const { data } = useProjectFacets();

  return (
    <header className="grid gap-x-16 gap-y-7 pt-8 pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-end lg:pt-14 lg:pb-12">
      <div>
        <p className="eyebrow">{t('intro.eyebrow')}</p>
        <h1 className="mt-4 font-display text-h1">
          <span className="block">{t('intro.titleProjects')}</span>
          {/* Les lettres sont taillées dans le kente (styles/effects.css) */}
          <span className="block w-fit text-kente-woven">{t('intro.titlePlace')}</span>
        </h1>
      </div>

      <div className="flex flex-col gap-5 lg:pb-1.5">
        <p className="text-lead text-muted-foreground">{t('intro.lead')}</p>
        {/* Place gardée tant que les chiffres ne sont pas là : rien ne bouge à leur arrivée */}
        <p className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-xs text-soft-foreground">
          {data && (
            <>
              <span>{t('intro.projects', { count: data.total })}</span>
              {data.countries.length > 0 && (
                <span className="inline-flex items-center gap-3">
                  <span aria-hidden className="text-faint-foreground">
                    ·
                  </span>
                  {t('intro.countries', { count: data.countries.length })}
                </span>
              )}
              {data.recruiting > 0 && (
                <span className="inline-flex items-center gap-2 text-jade">
                  <span aria-hidden className="live-dot size-1.5" />
                  {t('intro.recruiting', { count: data.recruiting })}
                </span>
              )}
              {data.seats > 0 && (
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="size-1.5 rounded-full bg-gold" />
                  {t('intro.seats', { count: data.seats })}
                </span>
              )}
            </>
          )}
        </p>
      </div>
    </header>
  );
}
