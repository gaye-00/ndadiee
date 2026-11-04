import { ArrowRight, Lock, SearchX } from 'lucide-react';
import { m } from 'motion/react';
import { useEffect, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useMatches, useParams } from 'react-router-dom';
import ErrorState from '@/components/feedback/ErrorState';
import { WovenThreads } from '@/components/shared/WovenMotif';
import TaskDialog from '@/components/workspace/TaskDialog';
import TeamChatPanel from '@/components/workspace/TeamChatPanel';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import WorkspaceTabs from '@/components/workspace/WorkspaceTabs';
import { WorkspaceContext } from '@/components/workspace/workspaceContext';
import { site } from '@/config/site';
import { useProject } from '@/hooks/useProjects';
import { errorStatus, useWorkspace, useWorkspacePulse } from '@/hooks/useWorkspace';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import type { RouteHandle } from '@/router/handle';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import { isolate } from '@/utils/formatters';

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Espace d'équipe d'un projet : en-tête, onglets, contenu de l'onglet et discussion d'équipe. Design 3E, 3G.
 *
 * Réservé aux membres de l'équipe : un visiteur de passage apprend comment y entrer (ses rôles ouverts, sa candidature
 * en attente). Sur grand écran, la discussion se tient à droite de chaque onglet ; ailleurs, elle s'ouvre d'un bouton.
 * Le pouls de l'espace (useWorkspacePulse) garde le tableau, l'équipe et la discussion à jour, sans tout relire. La fiche
 * d'une tâche s'ouvre par-dessus n'importe quel onglet (« ?task=38 »).
 */
export default function WorkspaceLayout() {
  const { slug = '' } = useParams();
  const workspace = useWorkspace(slug);
  useWorkspacePulse(slug, workspace.isSuccess);
  useWorkspaceTitle(workspace.data?.project.name);

  const context = useMemo(() => (workspace.data ? { slug, workspace: workspace.data } : null), [slug, workspace.data]);

  if (workspace.isPending) {
    return <WorkspaceSkeleton />;
  }
  if (!context) {
    const status = errorStatus(workspace.error);
    return status === 403 ? (
      <WorkspaceLocked slug={slug} />
    ) : status === 404 ? (
      <WorkspaceGone />
    ) : (
      <Frame>
        <WorkspaceError onRetry={() => void workspace.refetch()} />
      </Frame>
    );
  }

  return (
    <WorkspaceContext.Provider value={context}>
      {/* Dégradés des fils des motifs tissés (métiers des tâches), une fois pour l'espace */}
      <WovenThreads />
      <div className="relative isolate overflow-x-clip">
        {/* Lumière dorée derrière l'en-tête, comme l'atelier */}
        <div aria-hidden className="halo halo-gold -top-96 start-[4%] -z-10 size-[36rem] opacity-50" />
        <div className="mx-auto max-w-[112rem] px-4 pt-4 pb-16 sm:px-6 sm:pt-6 lg:px-8 xl:grid xl:grid-cols-[minmax(0,1fr)_23rem] xl:gap-x-6 2xl:grid-cols-[minmax(0,1fr)_25rem]">
          <div className="min-w-0">
            <WorkspaceHeader />
            <WorkspaceTabs />
            <div className="mt-5">
              <Outlet />
            </div>
          </div>
          <TeamChatPanel />
        </div>
      </div>
      <TaskDialog />
    </WorkspaceContext.Provider>
  );
}

/** L'onglet porte la section et le projet : « Tableau · lagos-transit · Ndadiee ». */
function useWorkspaceTitle(project: string | undefined) {
  const { t, i18n } = useTranslation();
  const page = (useMatches().findLast((match) => match.handle)?.handle as RouteHandle | undefined)?.page;
  useEffect(() => {
    if (!project || !page) {
      return undefined;
    }
    // Une image plus tard : le titre de la page (useDocumentTitle) est posé juste avant, par la racine
    const frame = requestAnimationFrame(() => {
      document.title = `${t(`pages.${page}`)} · ${project} · ${site.name}`;
    });
    return () => cancelAnimationFrame(frame);
  }, [page, project, t, i18n.language]);
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12">{children}</div>;
}

function WorkspaceError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation('workspace');
  return <ErrorState title={t('layout.errorTitle')} description={t('layout.errorText')} onRetry={onRetry} />;
}

/**
 * Hors de l'équipe : l'espace reste fermé, et dit comment y entrer. La chaîne du métier attend son fil : les rôles
 * ouverts du projet, ou la candidature déjà envoyée.
 */
function WorkspaceLocked({ slug }: { slug: string }) {
  const { t } = useTranslation('workspace');
  const project = useProject(slug);
  const name = project.data?.name ?? slug;
  const pending = project.data?.myMembershipStatus === 'PENDING';
  const roles = project.data?.openings.length ?? 0;

  return (
    <Frame>
      <m.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease }}
        aria-labelledby="workspace-locked-title"
        className="glass relative overflow-hidden rounded-3xl p-6 sm:p-9"
      >
        {/* La chaîne tendue du métier, qui attend sa trame */}
        <span aria-hidden className="pointer-events-none absolute inset-y-0 end-0 flex w-40 justify-around opacity-60 max-sm:hidden">
          {['bg-kente-gold', 'bg-kente-jade', 'bg-kente-coral', 'bg-kente-gold', 'bg-kente-jade'].map((tint, index) => (
            <m.span
              key={index}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.9, ease, delay: 0.1 + index * 0.08 }}
              className={cn('w-px origin-top', tint)}
            />
          ))}
        </span>
        <span aria-hidden className="grid size-12 place-items-center rounded-2xl bg-foreground/6 text-soft-foreground ring-1 ring-foreground/6 ring-inset">
          <Lock className="size-5" />
        </span>
        <p className="eyebrow mt-5">{t('header.eyebrow')}</p>
        <h1 id="workspace-locked-title" className="mt-2 max-w-lg font-display text-h4 text-balance">
          {t('layout.lockedTitle')}
        </h1>
        <p className="mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-muted-foreground">
          {pending ? t('layout.lockedPending', { project: isolate(name) }) : t('layout.lockedText', { project: isolate(name) })}
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {!pending && roles > 0 && (
            <Link
              to={paths.projectRoles(slug)}
              viewTransition
              onPointerEnter={() => prefetch(pages.project)}
              className="group/cta inline-flex h-11 items-center gap-2 rounded-[0.875rem] bg-kente-warm px-4.5 text-sm font-bold text-kente-night shadow-[0_12px_28px_-14px_var(--kente-coral)] outline-none transition-[translate] duration-300 ease-out-expo hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t('layout.lockedRoles', { count: roles })}
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover/cta:translate-x-0.5 rtl:-scale-x-100" />
            </Link>
          )}
          <Link
            to={paths.project(slug)}
            viewTransition
            onPointerEnter={() => prefetch(pages.project)}
            className="inline-flex h-11 items-center rounded-[0.875rem] border border-border-strong px-4 text-sm font-bold text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            {t('layout.lockedProject')}
          </Link>
        </div>
      </m.section>
    </Frame>
  );
}

function WorkspaceGone() {
  const { t } = useTranslation('workspace');
  return (
    <Frame>
      <section className="glass flex flex-col items-start gap-2 rounded-3xl p-6 sm:p-9">
        <span aria-hidden className="mb-2 grid size-12 place-items-center rounded-2xl bg-foreground/6 text-muted-foreground">
          <SearchX className="size-5" />
        </span>
        <h1 className="font-display text-h4">{t('layout.notFoundTitle')}</h1>
        <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">{t('layout.notFoundText')}</p>
        <Link
          to={paths.showcase}
          viewTransition
          className="group/back mt-2 inline-flex items-center gap-1.5 rounded-full text-sm font-bold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          {t('layout.notFoundAction')}
          <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/back:translate-x-0.5 rtl:-scale-x-100" />
        </Link>
      </section>
    </Frame>
  );
}

/** Même encombrement que l'espace : l'en-tête, les onglets et les quatre colonnes, pendant le chargement. */
function WorkspaceSkeleton() {
  const { t } = useTranslation('workspace');
  return (
    <div role="status" aria-label={t('layout.loading')} className="mx-auto max-w-[112rem] px-4 pt-4 pb-16 sm:px-6 sm:pt-6 lg:px-8 xl:grid xl:grid-cols-[minmax(0,1fr)_23rem] xl:gap-x-6 2xl:grid-cols-[minmax(0,1fr)_25rem]">
      <div aria-hidden className="min-w-0">
        <span className="block h-3 w-32 rounded-full skeleton-shimmer" />
        <span className="mt-3 block h-8 w-64 max-w-full rounded-full skeleton-shimmer" />
        <span className="mt-5 block h-20 rounded-2xl skeleton-shimmer" />
        <div className="mt-5 flex gap-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <span key={index} className="h-10 w-24 rounded-xl skeleton-shimmer" />
          ))}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          {[0, 1, 2, 3].map((column) => (
            <div key={column} className={cn('flex flex-col gap-2.5 rounded-2xl bg-foreground/[0.025] p-3', column > 0 && 'max-md:hidden', column > 1 && 'md:max-2xl:hidden')}>
              <span className="h-4 w-24 rounded-full skeleton-shimmer" />
              {[0, 1, 2].slice(0, 3 - (column % 2)).map((card) => (
                <span key={card} className="h-24 rounded-xl skeleton-shimmer" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <span aria-hidden className="hidden h-[calc(100dvh-7rem)] rounded-3xl skeleton-shimmer xl:block" />
    </div>
  );
}
