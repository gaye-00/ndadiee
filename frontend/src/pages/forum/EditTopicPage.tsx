import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import ErrorState from '@/components/feedback/ErrorState';
import PageLoader from '@/components/feedback/PageLoader';
import TopicForm from '@/components/forum/TopicForm';
import { useAuth } from '@/hooks/useAuth';
import { useQuestion } from '@/hooks/useQuestions';
import { paths } from '@/router/paths';
import { getApiError } from '@/utils/apiError';

/**
 * Modifier un sujet : le formulaire de création, rempli. Réservé à son auteur et aux modérateurs ; un autre membre
 * revient sur le sujet. Le sujet vient en général du cache (on arrive de sa page).
 */
export default function EditTopicPage() {
  const { slug } = useParams();
  const { t } = useTranslation('forum');
  const { user, canModerate } = useAuth();
  const topic = useQuestion(slug);

  if (topic.isPending) {
    return <PageLoader />;
  }
  if (topic.isError) {
    const notFound = getApiError(topic.error)?.status === 404;
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col justify-center gap-4 px-4 py-16">
        <ErrorState
          title={t(notFound ? 'topic.notFoundTitle' : 'topic.errorTitle')}
          description={t(notFound ? 'topic.notFoundText' : 'topic.errorText')}
          onRetry={notFound ? undefined : () => void topic.refetch()}
        />
        <Link to={paths.forum} viewTransition className="inline-flex items-center gap-2 text-sm font-semibold text-gold">
          <ArrowLeft aria-hidden className="size-4 rtl:-scale-x-100" />
          {t('topic.back')}
        </Link>
      </div>
    );
  }
  if (topic.data.author.id !== user?.id && !canModerate) {
    return <Navigate to={paths.topic(topic.data.slug)} replace />;
  }
  return <TopicForm key={topic.data.id} topic={topic.data} />;
}
