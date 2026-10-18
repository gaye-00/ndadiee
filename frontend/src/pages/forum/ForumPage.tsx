import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ForumAside from '@/components/forum/ForumAside';
import ForumIntro from '@/components/forum/ForumIntro';
import ForumNav from '@/components/forum/ForumNav';
import SignInDialog from '@/components/forum/SignInDialog';
import TopicFilters from '@/components/forum/TopicFilters';
import TopicList from '@/components/forum/TopicList';
import { useAuth } from '@/hooks/useAuth';
import { rememberForumSearch } from '@/hooks/useForumFilters';
import { cn } from '@/lib/utils';

/**
 * Forum (anciennement « Questions »), construit comme dev.to : l'accroche et le forum en chiffres, puis trois
 * colonnes. À gauche, les vues (tous les sujets, son fil, sans réponse, résolus, ses sujets, sa liste de lecture) et
 * les tags ; au centre, les filtres et le fil ; à droite, les questions qui attendent une réponse et les tendances
 * de la semaine. Les marges restent à l'écran pendant qu'on lit le fil. Sur tablette, la marge droite disparaît ;
 * sur téléphone, les vues passent au-dessus du fil. Tout est dans l'URL : /forum?view=unanswered&tag=react se
 * partage.
 */
export default function ForumPage() {
  const { isAuthenticated } = useAuth();
  const { search } = useLocation();
  // Les marges s'arrêtent sous la barre du haut : celle de l'application (64 px), ou celle, flottante, du visiteur
  const sticky = cn(
    // Plus hautes que l'écran, elles défilent seules ; leurs blocs gardent leur hauteur
    'lg:sticky lg:self-start lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:overscroll-contain lg:px-1 lg:pb-4 lg:-mx-1 *:shrink-0',
    isAuthenticated ? 'lg:top-22' : 'lg:top-28',
  );

  // « Forum », depuis un sujet, ramène au fil tel qu'on l'a laissé
  useEffect(() => rememberForumSearch(search), [search]);

  return (
    <div className="relative isolate overflow-x-clip">
      {/* Lumières de fond : le rouge derrière l'accroche (la conversation), le vert derrière le fil */}
      <div aria-hidden className="halo halo-coral -top-72 -start-64 -z-10 size-[46rem] animate-float" />
      <div aria-hidden className="halo halo-jade top-[20rem] end-[-18rem] -z-10 size-[40rem] opacity-60" />

      <div className="mx-auto max-w-[90rem] px-4 pb-24 sm:px-6 lg:px-10 lg:pb-32 xl:px-16">
        <ForumIntro />
        <div className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_19rem] xl:gap-x-10">
          <ForumNav className={cn('hidden lg:flex', sticky)} />
          <div className="min-w-0">
            <TopicFilters />
            <TopicList />
          </div>
          <ForumAside className={cn('hidden xl:flex', sticky)} />
        </div>
      </div>
      <SignInDialog />
    </div>
  );
}
