import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router-dom';
import ErrorState from '@/components/feedback/ErrorState';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import DevlogTimeline from '@/components/projects/DevlogTimeline';
import FeedbackRequestCard from '@/components/projects/FeedbackRequestCard';
import GithubActivityCard from '@/components/projects/GithubActivityCard';
import OpenRolesList from '@/components/projects/OpenRolesList';
import ProjectGallery from '@/components/projects/ProjectGallery';
import ProjectHero from '@/components/projects/ProjectHero';
import TeamMembersCard from '@/components/projects/TeamMembersCard';
import { WovenThreads } from '@/components/shared/WovenMotif';
import { site } from '@/config/site';
import { useProject } from '@/hooks/useProjects';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { paths } from '@/router/paths';
import { getApiError } from '@/utils/apiError';

/**
 * Page projet : présentation publique et recrutement de l'équipe. Design 3D.
 *
 * En haut, le projet et sa galerie ; dessous, les rôles recherchés et le devlog, avec en marge l'équipe,
 * la demande de retours et l'activité du dépôt. Sur téléphone, une seule colonne : l'équipe et la marge
 * passent entre les rôles et le devlog.
 */
export default function ProjectPage() {
  const { slug } = useParams();
  const { hash } = useLocation();
  const { t, i18n } = useTranslation();
  const reduced = useReducedMotion();
  const project = useProject(slug);
  const name = project.data?.name;

  // L'onglet porte le nom du projet. Une image plus tard : le titre de la page (useDocumentTitle) est posé
  // juste avant, par la racine.
  useEffect(() => {
    if (!name) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      document.title = `${name} · ${site.name}`;
    });
    return () => cancelAnimationFrame(frame);
  }, [name, i18n.language]);

  // Arrivée par « Voir les rôles » (#roles) : le projet chargé, on y descend
  const loaded = project.data !== undefined;
  useEffect(() => {
    if (loaded && hash === '#roles') {
      document.getElementById('roles')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }
  }, [loaded, hash, reduced]);

  if (project.isPending) {
    return <ProjectPageSkeleton label={t('project.loading')} />;
  }

  if (project.isError) {
    const notFound = getApiError(project.error)?.status === 404;
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col justify-center gap-4 px-4 py-16">
        {notFound ? (
          <div className="glass flex flex-col items-start gap-3 rounded-[1.375rem] p-7">
            <span aria-hidden className="size-11 rounded-xl bg-kente-conic opacity-85" />
            <h1 className="font-display text-h4">{t('project.notFoundTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('project.notFoundText')}</p>
            <Link
              to={paths.showcase}
              viewTransition
              className="group/back mt-1 inline-flex items-center gap-2 rounded-full text-sm font-bold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <ArrowLeft aria-hidden className="size-4 transition-transform group-hover/back:-translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/back:translate-x-0.5" />
              {t('project.backToShowcase')}
            </Link>
          </div>
        ) : (
          <ErrorState title={t('project.errorTitle')} description={t('project.errorText')} onRetry={() => void project.refetch()} />
        )}
      </div>
    );
  }

  const data = project.data;

  return (
    <article aria-labelledby="project-title" className="relative isolate overflow-x-clip">
      {/* Les dégradés des fils des motifs tissés (rôles recherchés) */}
      <WovenThreads />
      {/* Lumières de fond : vert à l'ouest, or derrière la galerie */}
      <div aria-hidden className="halo halo-jade -top-72 -start-56 -z-10 size-[44rem] animate-float" />
      <div aria-hidden className="halo halo-gold -top-40 end-[-12rem] -z-10 size-[36rem] opacity-70" />

      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10 xl:px-16">
        <section className="grid items-center gap-8 pt-6 pb-10 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,32.5rem)] lg:gap-10 lg:pb-12">
          <ProjectHero project={data} />
          <ProjectGallery project={data} />
        </section>

        <div className="grid gap-x-8 gap-y-12 pb-20 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
          <OpenRolesList project={data} className="lg:col-start-1 lg:row-start-1" />
          <aside className="flex flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <TeamMembersCard project={data} />
            <FeedbackRequestCard project={data} />
            <GithubActivityCard project={data} />
          </aside>
          <DevlogTimeline project={data} className="lg:col-start-1 lg:row-start-2" />
        </div>
      </div>
    </article>
  );
}

/** Même encombrement que la page, pendant le chargement. Design 3H (squelette à reflet). */
function ProjectPageSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10 xl:px-16">
      <div className="grid items-center gap-8 pt-6 pb-10 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,32.5rem)] lg:gap-10">
        <div className="flex flex-col gap-5">
          <div className="flex gap-2">
            <span className="h-6 w-32 rounded-full skeleton-shimmer" />
            <span className="h-6 w-28 rounded-full skeleton-shimmer" />
          </div>
          <span className="h-12 w-3/4 rounded-2xl skeleton-shimmer sm:h-14" />
          <span className="h-4 w-full max-w-xl rounded-full skeleton-shimmer" />
          <span className="h-4 w-2/3 max-w-md rounded-full skeleton-shimmer" />
          <div className="flex gap-1.5">
            {[14, 18, 12, 24].map((width) => (
              <span key={width} className="h-6 rounded-full skeleton-shimmer" style={{ width: `${width * 0.25}rem` }} />
            ))}
          </div>
          <div className="mt-1 flex gap-2.5">
            <span className="h-11 w-44 rounded-[0.875rem] skeleton-shimmer" />
            <span className="h-11 w-32 rounded-[0.875rem] skeleton-shimmer" />
          </div>
        </div>
        <div className="glass overflow-hidden rounded-[1.375rem]">
          {/* Le loader de l'application, dans le cadre de la capture principale */}
          <div className="grid aspect-[16/10] place-items-center skeleton-shimmer">
            <PulsatingDots label={label} />
          </div>
          <div className="grid grid-cols-4 gap-px">
            {[0, 1, 2, 3].map((index) => (
              <span key={index} className="h-18 skeleton-shimmer" />
            ))}
          </div>
        </div>
      </div>
      <div aria-hidden className="grid gap-x-8 gap-y-6 pb-20 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="flex flex-col gap-3.5">
          <span className="h-7 w-40 rounded-full skeleton-shimmer" />
          {[0, 1, 2].map((index) => (
            <span key={index} className="h-28 rounded-[1.375rem] skeleton-shimmer" />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <span className="h-64 rounded-[1.375rem] skeleton-shimmer" />
          <span className="h-40 rounded-[1.375rem] skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
