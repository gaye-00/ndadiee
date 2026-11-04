import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import ErrorState from '@/components/feedback/ErrorState';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import ChangedFilesTree from '@/components/reviews/ChangedFilesTree';
import ChecksPanel from '@/components/reviews/ChecksPanel';
import CommunityReviewCard from '@/components/reviews/CommunityReviewCard';
import DiffViewer from '@/components/reviews/DiffViewer';
import LinkedTaskCard from '@/components/reviews/LinkedTaskCard';
import ReviewConversation from '@/components/reviews/ReviewConversation';
import ReviewHeader from '@/components/reviews/ReviewHeader';
import ReviewTabs from '@/components/reviews/ReviewTabs';
import ReviewersPanel from '@/components/reviews/ReviewersPanel';
import { site } from '@/config/site';
import { usePullRequestDetail, useReviewParams } from '@/hooks/usePullRequest';
import { useReviewPageTab } from '@/hooks/useReviewPageTab';
import { paths } from '@/router/paths';
import { getApiError } from '@/utils/apiError';

/**
 * Revue de code d'une PR, ouverte à la communauté. Design 3C.
 *
 * En tête, la PR : son état, son titre, qui veut fusionner quoi, et le geste du membre (rendre sa revue). Dessous, deux
 * onglets : les fichiers modifiés (l'arbre, puis le diff, où l'on commente une ligne et propose une suggestion), et la
 * conversation (la description, les commentaires et les verdicts). En marge, ce qui décide de la fusion : les
 * relecteurs et leur verdict, la revue communautaire, les vérifications, la tâche que la PR résout. Sur tablette et
 * téléphone, la marge passe sous le contenu.
 *
 * GitHub garde le code et la fusion ; la revue (commentaires, suggestions, verdicts, revues jugées utiles) se fait ici.
 */
export default function ReviewPage() {
  const { t, i18n } = useTranslation('reviews');
  const { slug, number } = useReviewParams();
  const tab = useReviewPageTab();
  const detail = usePullRequestDetail(slug, number);
  const title = detail.data?.pullRequest.title;

  // L'onglet porte le numéro et le titre de la PR. Une image plus tard : le titre de la page (useDocumentTitle) est
  // posé juste avant, par la racine.
  useEffect(() => {
    if (!title) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      document.title = `${t('page.documentTitle', { number, title })} · ${site.name}`;
    });
    return () => cancelAnimationFrame(frame);
  }, [title, number, t, i18n.language]);

  if (!Number.isInteger(number) || (detail.isError && getApiError(detail.error)?.status === 404)) {
    return <ReviewNotFound />;
  }

  if (detail.isError) {
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col justify-center px-4 py-16">
        <ErrorState title={t('page.errorTitle')} description={t('page.errorText')} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  if (!detail.data) {
    return <ReviewPageSkeleton label={t('page.loading')} />;
  }

  const data = detail.data;

  return (
    <article aria-labelledby="review-title" className="relative isolate overflow-x-clip">
      {/* Lumières de fond : le vert derrière la PR (on relit ensemble), l'or derrière le diff */}
      <div aria-hidden className="halo halo-jade -top-72 -start-64 -z-10 size-[46rem] animate-float" />
      <div aria-hidden className="halo halo-gold top-[26rem] end-[-18rem] -z-10 size-[40rem] opacity-50" />

      <div className="mx-auto max-w-[100rem] px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32 xl:px-12">
        <ReviewHeader detail={data} />
        <ReviewTabs detail={data} />

        <div className="mt-6 grid items-start gap-x-8 gap-y-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0">
            {tab === 'files' ? (
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                <ChangedFilesTree detail={data} />
                <DiffViewer detail={data} />
              </div>
            ) : (
              <ReviewConversation detail={data} />
            )}
          </div>
          {/* Plus haute que l'écran, la marge défile en elle-même : les relecteurs restent à portée pendant la lecture */}
          <aside
            aria-label={t('page.aside')}
            className="flex flex-col gap-4 *:shrink-0 xl:sticky xl:top-20 xl:-mx-1 xl:max-h-[calc(100dvh-6rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain xl:px-1 xl:pb-1 xl:[scrollbar-width:thin]"
          >
            <ReviewersPanel detail={data} />
            <CommunityReviewCard />
            <ChecksPanel detail={data} />
            <LinkedTaskCard detail={data} />
          </aside>
        </div>
      </div>
    </article>
  );
}

/** La PR n'existe pas dans ce projet, ou le projet n'est plus visible : le chemin du retour vers les revues. */
function ReviewNotFound() {
  const { t } = useTranslation('reviews');
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col justify-center gap-4 px-4 py-16">
      <div className="glass flex flex-col items-start gap-3 rounded-[1.375rem] p-7">
        <span aria-hidden className="size-11 rounded-xl bg-kente-conic opacity-85" />
        <h1 className="font-display text-h4">{t('page.notFoundTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('page.notFoundText')}</p>
        <Link
          to={paths.reviews}
          viewTransition
          className="group/back mt-1 inline-flex items-center gap-2 rounded-full text-sm font-bold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          <ArrowLeft aria-hidden className="size-4 transition-transform group-hover/back:-translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/back:translate-x-0.5" />
          {t('page.backToReviews')}
        </Link>
      </div>
    </div>
  );
}

/** Même encombrement que la page, pendant le chargement. Design 3H (squelette à reflet). */
function ReviewPageSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-[100rem] px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="flex flex-col gap-4 pt-6 pb-6 sm:pt-8">
        <div className="flex gap-2">
          <span className="h-6 w-24 rounded-full skeleton-shimmer" />
          <span className="h-6 w-36 rounded-full skeleton-shimmer" />
        </div>
        <span className="h-10 w-2/3 max-w-3xl rounded-2xl skeleton-shimmer" />
        <span className="h-4 w-1/2 max-w-xl rounded-full skeleton-shimmer" />
        <span className="h-4 w-1/3 max-w-md rounded-full skeleton-shimmer" />
      </div>
      <span className="block h-[3.25rem] rounded-2xl skeleton-shimmer" />
      <div className="mt-6 grid gap-8 pb-20 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex flex-col gap-5 lg:flex-row">
          <span className="hidden h-96 w-64 shrink-0 rounded-[1.375rem] skeleton-shimmer lg:block" />
          <div className="glass grid h-[28rem] flex-1 place-items-center rounded-2xl">
            <PulsatingDots label={label} />
          </div>
        </div>
        <div aria-hidden className="flex flex-col gap-4">
          <span className="h-56 rounded-[1.375rem] skeleton-shimmer" />
          <span className="h-40 rounded-[1.375rem] skeleton-shimmer" />
          <span className="h-44 rounded-[1.375rem] skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
