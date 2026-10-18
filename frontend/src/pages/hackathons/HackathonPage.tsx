import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router-dom';
import ErrorState from '@/components/feedback/ErrorState';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import HackathonAbout from '@/components/hackathons/HackathonAbout';
import HackathonHeader, { HackathonHeaderSkeleton } from '@/components/hackathons/HackathonHeader';
import HackathonTeams from '@/components/hackathons/HackathonTeams';
import { WovenThreads } from '@/components/shared/WovenMotif';
import { site } from '@/config/site';
import { useHackathon } from '@/hooks/useHackathons';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { paths } from '@/router/paths';
import { getApiError } from '@/utils/apiError';

/**
 * Un hackathon : où il en est et l'action du moment, le programme, puis ses équipes et les rôles qu'elles
 * cherchent encore, avec en marge les prix et la description. Sur téléphone, une seule colonne : les prix et
 * la description passent après les équipes.
 */
export default function HackathonPage() {
  const { slug } = useParams();
  const { hash } = useLocation();
  const { t, i18n } = useTranslation('hackathons');
  const reduced = useReducedMotion();
  const hackathon = useHackathon(slug);
  const title = hackathon.data?.title;

  // L'onglet porte le nom du hackathon. Une image plus tard : le titre de la page (useDocumentTitle) est
  // posé juste avant, par la racine.
  useEffect(() => {
    if (!title) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      document.title = `${title} · ${site.name}`;
    });
    return () => cancelAnimationFrame(frame);
  }, [title, i18n.language]);

  // Arrivée par « Rejoindre une équipe » (#equipes) : le hackathon chargé, on y descend
  const loaded = hackathon.data !== undefined;
  useEffect(() => {
    if (loaded && hash === '#equipes') {
      document.getElementById('equipes')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }
  }, [loaded, hash, reduced]);

  if (hackathon.isPending) {
    return (
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10 xl:px-16">
        <span className="sr-only">
          <PulsatingDots label={t('detail.loading')} />
        </span>
        <HackathonHeaderSkeleton />
      </div>
    );
  }

  if (hackathon.isError) {
    const notFound = getApiError(hackathon.error)?.status === 404;
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col justify-center gap-4 px-4 py-16">
        {notFound ? (
          <div className="glass flex flex-col items-start gap-3 rounded-[1.375rem] p-7">
            <span aria-hidden className="size-11 rounded-xl bg-kente-conic opacity-85" />
            <h1 className="font-display text-h4">{t('detail.notFoundTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('detail.notFoundText')}</p>
            <Link
              to={paths.hackathons}
              viewTransition
              className="group/back mt-1 inline-flex items-center gap-2 rounded-full text-sm font-bold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <ArrowLeft aria-hidden className="size-4 transition-transform group-hover/back:-translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/back:translate-x-0.5" />
              {t('detail.back')}
            </Link>
          </div>
        ) : (
          <ErrorState title={t('detail.errorTitle')} description={t('list.errorText')} onRetry={() => void hackathon.refetch()} />
        )}
      </div>
    );
  }

  const data = hackathon.data;

  return (
    <article aria-labelledby="hackathon-title" className="relative isolate overflow-x-clip">
      {/* Dégradés des fils des motifs tissés (rôles recherchés), une fois pour la page */}
      <WovenThreads />
      {/* Lumières de fond : l'or derrière le titre, le vert derrière le compte à rebours */}
      <div aria-hidden className="halo halo-gold -top-72 -start-64 -z-10 size-[44rem] animate-float" />
      <div aria-hidden className="halo halo-jade -top-40 end-[-14rem] -z-10 size-[36rem] opacity-70" />

      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10 xl:px-16">
        <HackathonHeader hackathon={data} />
        <div className="grid gap-x-10 gap-y-12 pb-24 lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:pb-32">
          <HackathonTeams hackathon={data} />
          <HackathonAbout hackathon={data} />
        </div>
      </div>
    </article>
  );
}
