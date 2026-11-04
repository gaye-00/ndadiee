import CommunityReviewCard from '@/components/reviews/CommunityReviewCard';
import ReviewGuide from '@/components/reviews/ReviewGuide';
import ReviewList from '@/components/reviews/ReviewList';
import ReviewListFilters from '@/components/reviews/ReviewListFilters';
import ReviewListTabs from '@/components/reviews/ReviewListTabs';
import ReviewerStatsCard from '@/components/reviews/ReviewerStatsCard';
import ReviewsIntro from '@/components/reviews/ReviewsIntro';

/**
 * Revues : celles qui attendent le membre, et les siennes. Design 3B, 3C.
 *
 * L'accroche dit ce qui attend ; dessous, les onglets (à relire, communauté, mes PR, mes équipes, terminées), la
 * recherche et les projets, puis les PR. En marge, la revue communautaire et la réputation qu'elle rapporte, le bilan
 * de relecteur, et comment bien relire ; elle reste à l'écran pendant qu'on parcourt la liste. Sur tablette et
 * téléphone, elle passe sous la liste. Tout est dans l'URL : /reviews?tab=community&q=react se partage.
 */
export default function ReviewsPage() {
  return (
    <div className="relative isolate overflow-x-clip">
      {/* Lumières de fond : le vert derrière l'accroche (on relit ensemble), l'or derrière la liste */}
      <div aria-hidden className="halo halo-jade -top-72 -start-64 -z-10 size-[46rem] animate-float" />
      <div aria-hidden className="halo halo-gold top-[22rem] end-[-18rem] -z-10 size-[40rem] opacity-50" />

      <div className="mx-auto max-w-[90rem] px-4 pb-24 sm:px-6 lg:px-10 lg:pb-32 xl:px-16">
        <ReviewsIntro />
        <div className="grid items-start gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0">
            <ReviewListTabs />
            <ReviewListFilters />
            <ReviewList />
          </div>
          <aside className="flex flex-col gap-4 xl:sticky xl:top-22 xl:self-start">
            <CommunityReviewCard />
            <ReviewerStatsCard />
            <ReviewGuide />
          </aside>
        </div>
      </div>
    </div>
  );
}
