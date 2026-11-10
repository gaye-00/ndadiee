import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import ErrorState from '@/components/feedback/ErrorState';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import ProjectForm from '@/components/projects/ProjectForm';
import { useAuth } from '@/hooks/useAuth';
import { useProject } from '@/hooks/useProjects';
import { paths } from '@/router/paths';
import { getApiError } from '@/utils/apiError';

/**
 * Modifier un projet : son porteur, ou un modérateur. Le formulaire de publication, rempli de ce que le projet montre.
 * Un autre membre lit pourquoi il ne peut pas, avec le chemin du retour vers le projet.
 */
export default function EditProjectPage() {
  const { slug } = useParams();
  const { t } = useTranslation('projectForm');
  const { t: tc } = useTranslation();
  const { user, canModerate } = useAuth();
  const project = useProject(slug);

  if (project.isPending) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <PulsatingDots label={tc('states.loading')} />
      </div>
    );
  }

  if (project.isError) {
    const notFound = getApiError(project.error)?.status === 404;
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col justify-center px-4 py-16">
        <ErrorState
          title={notFound ? tc('project.notFoundTitle') : tc('project.errorTitle')}
          description={notFound ? tc('project.notFoundText') : tc('project.errorText')}
          onRetry={notFound ? undefined : () => void project.refetch()}
        />
      </div>
    );
  }

  const data = project.data;
  if (user?.id !== data.owner.id && !canModerate) {
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col justify-center px-4 py-16">
        <div className="glass flex flex-col items-start gap-3 rounded-[1.375rem] p-7">
          <span aria-hidden className="size-11 rounded-xl bg-kente-conic opacity-85" />
          <h1 className="font-display text-h4">{t('form.notOwnerTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('form.notOwnerText', { owner: data.owner.fullName })}</p>
          <Link
            to={paths.project(data.slug)}
            viewTransition
            className="group/back mt-1 inline-flex items-center gap-2 rounded-full text-sm font-bold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <ArrowLeft aria-hidden className="size-4 transition-transform group-hover/back:-translate-x-0.5 rtl:-scale-x-100" />
            {t('form.backToProject')}
          </Link>
        </div>
      </div>
    );
  }

  // Une autre page de projet repart d'un formulaire neuf
  return <ProjectForm key={data.id} project={data} />;
}
