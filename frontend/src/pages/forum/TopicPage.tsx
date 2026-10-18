import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import ErrorState from '@/components/feedback/ErrorState';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import ReplyList from '@/components/forum/ReplyList';
import SignInDialog from '@/components/forum/SignInDialog';
import TopicActions from '@/components/forum/TopicActions';
import TopicBody from '@/components/forum/TopicBody';
import TopicHeader from '@/components/forum/TopicHeader';
import TopicSidebar from '@/components/forum/TopicSidebar';
import HiddenNotice from '@/components/shared/HiddenNotice';
import { site } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { forumHome } from '@/hooks/useForumFilters';
import { useQuestion } from '@/hooks/useQuestions';
import { cn } from '@/lib/utils';
import { getApiError } from '@/utils/apiError';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * Un sujet du forum, construit comme un article de dev.to. Sur grand écran, trois colonnes : le rail des actions
 * (voter, aller aux réponses, enregistrer, partager), qui suit la lecture ; le sujet et sa discussion, dans une même
 * carte ; la carte de l'auteur et d'autres sujets. Sur tablette, la marge passe sous la discussion ; sur téléphone,
 * les actions sont une rangée sous le sujet.
 */
export default function TopicPage() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation('forum');
  const { isAuthenticated } = useAuth();
  const topic = useQuestion(slug);
  const title = topic.data?.title;

  // L'onglet porte le titre du sujet. Une image plus tard : le titre de la page (useDocumentTitle) est posé juste
  // avant, par la racine.
  useEffect(() => {
    if (!title) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      document.title = `${title} · ${site.name}`;
    });
    return () => cancelAnimationFrame(frame);
  }, [title, i18n.language]);

  const back = (
    <Link
      to={forumHome()}
      viewTransition
      className={cn('group/back inline-flex items-center gap-2 rounded-full text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground', focusRing)}
    >
      <ArrowLeft aria-hidden className="size-4 transition-transform group-hover/back:-translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/back:translate-x-0.5" />
      {t('topic.back')}
    </Link>
  );

  if (topic.isPending) {
    return <TopicPageSkeleton label={t('topic.loading')} />;
  }

  if (topic.isError) {
    const notFound = getApiError(topic.error)?.status === 404;
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col justify-center gap-4 px-4 py-16">
        {notFound ? (
          <div className="glass flex flex-col items-start gap-3 rounded-[1.375rem] p-7">
            <span aria-hidden className="size-11 rounded-xl bg-kente-conic opacity-85" />
            <h1 className="font-display text-h4">{t('topic.notFoundTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('topic.notFoundText')}</p>
            <div className="mt-1">{back}</div>
          </div>
        ) : (
          <ErrorState title={t('topic.errorTitle')} description={t('topic.errorText')} onRetry={() => void topic.refetch()} />
        )}
      </div>
    );
  }

  const data = topic.data;
  // Le rail et la marge s'arrêtent sous la barre du haut : celle de l'application, ou celle, flottante, du visiteur
  const stickyTop = isAuthenticated ? 'top-22' : 'top-28';

  return (
    <div className="relative isolate overflow-x-clip">
      <div aria-hidden className="halo halo-gold -top-72 -start-56 -z-10 size-[44rem] animate-float" />
      <div aria-hidden className="halo halo-coral top-[28rem] end-[-16rem] -z-10 size-[36rem] opacity-50" />

      <div className="mx-auto max-w-[90rem] px-4 pt-6 pb-24 sm:px-6 sm:pt-8 lg:px-10 xl:px-16">
        {back}
        {/* Masqué par l'équipe : son auteur et les admins le voient encore, le public non */}
        {data.hidden && <HiddenNotice kind="QUESTION" reason={data.hiddenReason} className="mt-5 max-w-3xl" />}
        <div className="mt-5 grid items-start gap-x-6 gap-y-6 lg:grid-cols-[3.75rem_minmax(0,1fr)] xl:grid-cols-[3.75rem_minmax(0,1fr)_20rem] xl:gap-x-8">
          <TopicActions topic={data} variant="rail" className={cn('sticky hidden lg:flex', stickyTop)} />

          <article aria-labelledby="topic-title" className="glass min-w-0 overflow-hidden rounded-[1.75rem]">
            {/* La lisière du sujet : un fil kente, à la place de la couverture d'un article */}
            <span aria-hidden className="block h-1.5 bg-kente" />
            <TopicHeader topic={data} />
            <TopicBody topic={data} />
            <TopicActions topic={data} variant="bar" className="border-t border-border-subtle px-3 py-2 sm:px-6 lg:hidden" />
            <ReplyList topic={data} />
          </article>

          <TopicSidebar
            topic={data}
            className={cn(
              'lg:col-start-2 xl:sticky xl:col-start-3 xl:row-start-1 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto xl:overscroll-contain xl:pb-4 *:shrink-0',
              isAuthenticated ? 'xl:top-22' : 'xl:top-28',
            )}
          />
        </div>
      </div>
      <SignInDialog />
    </div>
  );
}

/** Même encombrement que la page, pendant le chargement. Design 3H (squelette à reflet). */
function TopicPageSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-[90rem] px-4 pt-6 pb-24 sm:px-6 sm:pt-8 lg:px-10 xl:px-16">
      <span className="block h-4 w-20 rounded-full skeleton-shimmer" />
      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[3.75rem_minmax(0,1fr)] xl:grid-cols-[3.75rem_minmax(0,1fr)_20rem] xl:gap-x-8">
        <div aria-hidden className="hidden flex-col items-center gap-3 lg:flex">
          {[0, 1, 2, 3].map((index) => (
            <span key={index} className="size-11 rounded-2xl skeleton-shimmer" />
          ))}
        </div>
        <div className="glass overflow-hidden rounded-[1.75rem]">
          <span aria-hidden className="block h-1.5 bg-kente opacity-40" />
          <div className="flex flex-col gap-5 px-5 py-8 sm:px-8 lg:px-12">
            <div aria-hidden className="flex items-center gap-3">
              <span className="size-12 rounded-full skeleton-shimmer" />
              <span className="flex flex-col gap-2">
                <span className="h-3.5 w-36 rounded-full skeleton-shimmer" />
                <span className="h-3 w-24 rounded-full skeleton-shimmer" />
              </span>
            </div>
            <span aria-hidden className="h-10 w-4/5 rounded-2xl skeleton-shimmer" />
            <span aria-hidden className="h-6 w-1/3 rounded-full skeleton-shimmer" />
            <div className="grid min-h-48 place-items-center">
              <PulsatingDots label={label} />
            </div>
          </div>
        </div>
        <div aria-hidden className="hidden flex-col gap-4 xl:flex">
          <span className="h-72 rounded-2xl skeleton-shimmer" />
          <span className="h-40 rounded-2xl skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
