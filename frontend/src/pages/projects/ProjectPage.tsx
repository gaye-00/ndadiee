import { ArrowLeft } from 'lucide-react';
import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigationType, useParams } from 'react-router-dom';
import ErrorState from '@/components/feedback/ErrorState';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import DevlogTimeline from '@/components/projects/DevlogTimeline';
import FeedbackRequestCard from '@/components/projects/FeedbackRequestCard';
import GithubActivityCard from '@/components/projects/GithubActivityCard';
import OpenRolesList, { type RolesFocus } from '@/components/projects/OpenRolesList';
import ProjectGallery from '@/components/projects/ProjectGallery';
import ProjectHero from '@/components/projects/ProjectHero';
import { FOCUS_ROLES_EVENT } from '@/components/projects/projectEvents';
import TeamMembersCard from '@/components/projects/TeamMembersCard';
import HiddenNotice from '@/components/shared/HiddenNotice';
import { WovenThreads } from '@/components/shared/WovenMotif';
import { site } from '@/config/site';
import { useProject } from '@/hooks/useProjects';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import { getApiError } from '@/utils/apiError';

// Ce que fait le membre pour défiler lui-même : la page cesse alors de le ramener aux rôles
const USER_SCROLL = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;
// Le temps de l'arrivée sur les rôles, pendant lequel la page y revient si autre chose l'en écarte
const LANDING_MS = 2500;

/**
 * Un lien vers les rôles du projet (paths.projectRoles) : « #roles », ou « #role-12 » pour l'un d'eux (le rôle
 * d'une équipe de hackathon, le retour de la connexion). undefined pour une autre ancre, ou sans ancre.
 */
function rolesLinkOf(hash: string): { opening: number | null } | undefined {
  const match = /^#role(?:s|-(\d+))$/.exec(hash);
  return match ? { opening: match[1] ? Number(match[1]) : null } : undefined;
}

/**
 * Page projet : présentation publique et recrutement de l'équipe. Design 3D.
 *
 * En haut, le projet et sa galerie ; dessous, les rôles recherchés et le devlog, avec en marge l'équipe,
 * la demande de retours et l'activité du dépôt. Sur téléphone, une seule colonne : l'équipe et la marge
 * passent entre les rôles et le devlog.
 */
export default function ProjectPage() {
  const { slug } = useParams();
  const { hash, key } = useLocation();
  const navigationType = useNavigationType();
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

  // Les rôles se montrent quand on arrive par un lien vers eux (paths.projectRoles), ou quand on veut rejoindre
  // l'équipe (« Rejoindre l'équipe », « Ta place ? » : projects/projectEvents). Chaque demande compte : le rôle
  // visé s'éclaire à nouveau. En revenant en arrière (ou en avant), la page reprend là où on l'avait laissée
  // (ScrollRestoration) : on n'y redescend pas. Le premier chargement du site (clé « default ») est une arrivée.
  const loaded = project.data !== undefined;
  const rolesLink = rolesLinkOf(hash);
  const arriving = rolesLink !== undefined && (navigationType !== 'POP' || key === 'default');
  const [joinRequests, setJoinRequests] = useState(0);
  const focus: RolesFocus | null =
    joinRequests > 0 ? { opening: null, nonce: joinRequests + 1 } : arriving ? { opening: rolesLink.opening, nonce: 1 } : null;

  useEffect(() => {
    const onFocusRoles = () => setJoinRequests((count) => count + 1);
    window.addEventListener(FOCUS_ROLES_EVENT, onFocusRoles);
    return () => window.removeEventListener(FOCUS_ROLES_EVENT, onFocusRoles);
  }, []);

  // Le projet chargé, et la place faite sous les rôles (plus bas), la page descend jusqu'à eux : leur titre
  // s'arrête sous la barre du haut (scroll-mt-24). Pendant l'arrivée, rien d'autre ne doit l'en écarter : une
  // position rétablie après coup (ScrollRestoration, au premier chargement du site) ou une hauteur qui change
  // au-dessus. Quand le défilement s'arrête, la page revient sur les rôles, tant qu'on ne défile pas soi-même.
  const revealRoles = useEffectEvent(() => {
    const roles = document.getElementById('roles');
    if (!roles) {
      return undefined;
    }
    roles.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });

    const settle = () => {
      const offset = roles.getBoundingClientRect().top - parseFloat(getComputedStyle(roles).scrollMarginTop);
      if (Math.abs(offset) > 2) {
        roles.scrollIntoView({ block: 'start' });
      }
    };
    const release = () => {
      clearTimeout(timer);
      window.removeEventListener('scrollend', settle);
      USER_SCROLL.forEach((type) => window.removeEventListener(type, release));
    };
    const timer = setTimeout(release, LANDING_MS);
    window.addEventListener('scrollend', settle);
    USER_SCROLL.forEach((type) => window.addEventListener(type, release, { passive: true }));
    return release;
  });
  const revealing = focus !== null;
  useEffect(() => {
    if (!loaded || !revealing) {
      return undefined;
    }
    return revealRoles();
  }, [loaded, revealing, hash, joinRequests]);
  // La place sous les rôles reste faite quand l'adresse les vise, même en revenant en arrière : la page garde la
  // hauteur où sa position a été retenue
  const roomForRoles = rolesLink !== undefined || joinRequests > 0;

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
        {/* Masqué par l'équipe : son équipe et les admins le voient encore, le public non */}
        {data.hidden && <HiddenNotice kind="PROJECT" reason={data.hiddenReason} className="mt-6 max-w-3xl" />}
        <section className="grid items-center gap-8 pt-6 pb-10 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,32.5rem)] lg:gap-10 lg:pb-12">
          <ProjectHero project={data} />
          <ProjectGallery project={data} />
        </section>

        <div
          className={cn(
            // Les rôles gardent la hauteur de leur contenu, le devlog commence juste dessous : la place en trop (la
            // marge, plus haute, ou celle faite pour les rôles) va sous la page, pas entre les blocs
            'grid content-start gap-x-8 gap-y-12 pb-20 lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:grid-rows-[auto_1fr]',
            // Quand la page descend jusqu'aux rôles, il faut assez de page sous eux pour qu'ils montent jusqu'en
            // haut de l'écran : sur un projet court ou un grand écran, la fin de la page les arrêterait au milieu.
            // Les 6 rem sont la marge de leur ancre (scroll-mt-24, OpenRolesList).
            roomForRoles && 'min-h-[calc(100dvh-6rem)]',
          )}
        >
          <OpenRolesList project={data} focus={focus} className="lg:col-start-1 lg:row-start-1" />
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
