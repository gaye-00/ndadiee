import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import HeroLoom from './HeroLoom';
import AvatarStack from '@/components/shared/AvatarStack';
import GithubMark from '@/components/shared/GithubMark';
import { useAuth } from '@/hooks/useAuth';
import { useRecruitingProjects } from '@/hooks/useProjects';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { UserSummary } from '@/types/user.types';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Accroche de l'accueil. Design 3A : le titre, le texte et les deux actions de la maquette, posés à
 * gauche, sans halo ni badge. En dessous, le « métier » (HeroLoom) : l'année GitHub du visiteur tissée
 * comme un kente, qui se lève en ville.
 */
export default function HeroSection() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const publishTo = isAuthenticated ? paths.newProject : paths.register;
  const publishPage = isAuthenticated ? pages.newProject : pages.register;

  return (
    <section aria-labelledby="hero-title" className="relative pb-12 lg:pb-16">
      <div className="mx-auto max-w-page px-4 pt-8 sm:px-6 lg:pt-14">
        <h1 id="hero-title" className="font-display text-display">
          <span className="block">{t('hero.titleTeam')}</span>
          {/* Les lettres sont taillées dans le kente (styles/effects.css) */}
          <span className="block w-fit text-kente-woven">{t('hero.titleShip')}</span>
        </h1>

        <div className="mt-8 grid gap-x-16 gap-y-8 lg:mt-10 lg:grid-cols-[minmax(0,34rem)_auto] lg:items-end lg:justify-between">
          <p className="text-lead text-muted-foreground">{t('hero.lead')}</p>

          <div className="flex flex-col gap-5 lg:items-end">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to={publishTo}
                viewTransition
                onPointerEnter={() => prefetch(publishPage)}
                onFocus={() => prefetch(publishPage)}
                className={cn(
                  'group/publish inline-flex h-14 items-center justify-between gap-5 rounded-full bg-kente-warm ps-7 pe-2 text-base font-bold text-kente-night transition-[scale,filter] duration-300 hover:brightness-105 active:scale-[0.98]',
                  focusRing,
                )}
              >
                {t('actions.publishProject')}
                {/* La flèche part en diagonale, une autre arrive à sa place */}
                <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-kente-night text-kente-gold rtl:-scale-x-100">
                  <ArrowUpRight
                    aria-hidden
                    className="size-5 transition-transform duration-500 ease-out-expo group-hover/publish:translate-x-6 group-hover/publish:-translate-y-6"
                  />
                  <ArrowUpRight
                    aria-hidden
                    className="absolute size-5 -translate-x-6 translate-y-6 transition-transform duration-500 ease-out-expo group-hover/publish:translate-0"
                  />
                </span>
              </Link>

              {!isAuthenticated && (
                <Link
                  to={paths.register}
                  viewTransition
                  onPointerEnter={() => prefetch(pages.register)}
                  onFocus={() => prefetch(pages.register)}
                  className={cn(
                    'inline-flex h-14 items-center justify-center gap-3 rounded-full border border-border-strong px-7 text-base font-semibold text-foreground transition-colors hover:bg-foreground/5',
                    focusRing,
                  )}
                >
                  <GithubMark className="size-5" />
                  {t('actions.joinWithGithub')}
                </Link>
              )}
            </div>
            <RecruitingNow publishTo={publishTo} />
          </div>
        </div>
      </div>

      <HeroLoom className="mt-14 lg:mt-20" />
    </section>
  );
}

/**
 * Les projets qui recrutent, en vrai (API) : leurs porteurs et leur nombre. Aucun pour l'instant :
 * une invitation à lancer le premier. Rien tant que la réponse n'est pas là (place gardée).
 */
function RecruitingNow({ publishTo }: { publishTo: string }) {
  const { t } = useTranslation();
  const { data, isSuccess } = useRecruitingProjects();

  if (!isSuccess) {
    return <span aria-hidden className="h-7" />;
  }

  const owners = [...new Map(data.content.map((project) => [project.owner.id, project.owner])).values()] as UserSummary[];
  const count = data.totalElements;

  return (
    <Link
      to={count > 0 ? paths.openings : publishTo}
      viewTransition
      className={cn('inline-flex items-center gap-3 rounded-full text-sm text-muted-foreground transition-colors hover:text-foreground', focusRing)}
    >
      {owners.length > 0 && <AvatarStack users={owners} max={4} />}
      <span className="inline-flex items-center gap-2">
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-jade" />
        {count > 0 ? t('hero.recruiting', { count }) : t('hero.firstTeams')}
      </span>
    </Link>
  );
}
