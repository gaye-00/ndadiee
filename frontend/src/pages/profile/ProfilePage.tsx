import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import ErrorState from '@/components/feedback/ErrorState';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import BadgesCard from '@/components/profile/BadgesCard';
import BuilderStats from '@/components/profile/BuilderStats';
import CollaboratorsCard from '@/components/profile/CollaboratorsCard';
import ContributionHeatmap from '@/components/profile/ContributionHeatmap';
import ProfileCover from '@/components/profile/ProfileCover';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileShowcase from '@/components/profile/ProfileShowcase';
import { site } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUsers';
import { paths } from '@/router/paths';
import { getApiError } from '@/utils/apiError';

// La page s'aligne sur celle d'un projet : mêmes marges, même colonne de côté
const FRAME = 'mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10 xl:px-16';

/**
 * Profil développeur : des preuves de travail plutôt qu'un CV. Design 3F.
 *
 * En haut, son étoffe kente et sa carte d'identité ; puis ce qu'il a fait de vérifiable, ses projets et son année
 * tissée, avec en marge ceux avec qui il a fait équipe et ses badges. Sur téléphone, une seule colonne.
 */
export default function ProfilePage() {
  // Les pseudos sont en minuscules : « /u/Ada » est le profil de ada, et partage son cache
  const username = useParams().username?.trim().toLowerCase();
  const { t, i18n } = useTranslation('profile');
  const { user } = useAuth();
  const profile = useUserProfile(username);
  const fullName = profile.data?.fullName;

  // L'onglet porte son nom. Une image plus tard : le titre de la page (useDocumentTitle) est posé juste avant, par
  // la racine.
  useEffect(() => {
    if (!fullName || !username) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      document.title = `${fullName} (@${username}) · ${site.name}`;
    });
    return () => cancelAnimationFrame(frame);
  }, [fullName, username, i18n.language]);

  if (profile.isPending) {
    return <ProfilePageSkeleton label={t('loading')} />;
  }

  if (profile.isError) {
    const notFound = getApiError(profile.error)?.status === 404;
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col justify-center gap-4 px-4 py-16">
        {notFound ? (
          <div className="glass flex flex-col items-start gap-3 rounded-[1.375rem] p-7">
            <span aria-hidden className="size-11 rounded-xl bg-kente-conic opacity-85" />
            <h1 className="font-display text-h4">{t('notFoundTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('notFoundText', { username })}</p>
            <Link
              to={paths.showcase}
              viewTransition
              className="group/back mt-1 inline-flex items-center gap-2 rounded-full text-sm font-bold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <ArrowLeft aria-hidden className="size-4 transition-transform group-hover/back:-translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/back:translate-x-0.5" />
              {t('backToShowcase')}
            </Link>
          </div>
        ) : (
          <ErrorState title={t('errorTitle')} description={t('errorText')} onRetry={() => void profile.refetch()} />
        )}
      </div>
    );
  }

  const data = profile.data;
  const own = user?.id === data.id;

  return (
    <article aria-labelledby="profile-title" className="relative isolate overflow-x-clip">
      {/* Lumières de fond : or derrière l'étoffe, vert sous la vitrine */}
      <div aria-hidden className="halo halo-gold -top-64 end-[-10rem] -z-10 size-[40rem] animate-float" />
      <div aria-hidden className="halo halo-jade top-[38rem] -start-72 -z-10 size-[44rem] opacity-70" />

      <div className={`${FRAME} pt-4 sm:pt-6`}>
        <ProfileCover username={data.username} />
        <ProfileHeader profile={data} />

        <div className="mt-10 sm:mt-12">
          <BuilderStats profile={data} />
        </div>

        <div className="mt-12 grid gap-x-8 gap-y-12 pb-20 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
          <div className="flex min-w-0 flex-col gap-12">
            <ProfileShowcase profile={data} own={own} />
            <ContributionHeatmap profile={data} />
          </div>
          <aside aria-label={t('aside')} className="flex flex-col gap-4 lg:self-start">
            <CollaboratorsCard profile={data} own={own} />
            <BadgesCard profile={data} own={own} />
          </aside>
        </div>
      </div>
    </article>
  );
}

/** Même encombrement que la page, pendant le chargement. Design 3H (squelette à reflet). */
function ProfilePageSkeleton({ label }: { label: string }) {
  return (
    <div className={`${FRAME} pt-4 sm:pt-6`}>
      <div className="grid h-36 place-items-center rounded-[1.75rem] skeleton-shimmer sm:h-48 lg:h-56">
        <PulsatingDots label={label} />
      </div>
      <div aria-hidden className="flex flex-col gap-4 px-1 sm:flex-row sm:gap-6 sm:px-6 lg:px-8">
        <span className="-mt-14 size-30 shrink-0 rounded-full border-4 border-background skeleton-shimmer sm:-mt-20 sm:size-38" />
        <div className="flex flex-1 flex-col gap-3 sm:pt-4">
          <span className="h-5 w-40 rounded-full skeleton-shimmer" />
          <span className="h-10 w-2/3 max-w-md rounded-2xl skeleton-shimmer" />
          <span className="h-4 w-72 max-w-full rounded-full skeleton-shimmer" />
        </div>
      </div>
      <div aria-hidden className="mt-10 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className="h-36 rounded-[1.375rem] skeleton-shimmer" />
        ))}
      </div>
      <div aria-hidden className="mt-12 grid gap-x-8 gap-y-6 pb-20 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="grid gap-4 sm:grid-cols-2">
          <span className="h-80 rounded-2xl skeleton-shimmer" />
          <span className="h-80 rounded-2xl skeleton-shimmer" />
        </div>
        <div className="flex flex-col gap-4">
          <span className="h-56 rounded-[1.375rem] skeleton-shimmer" />
          <span className="h-44 rounded-[1.375rem] skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
