import ChangedFilesTree from '@/components/reviews/ChangedFilesTree';
import ChecksPanel from '@/components/reviews/ChecksPanel';
import CommunityReviewCard from '@/components/reviews/CommunityReviewCard';
import DiffViewer from '@/components/reviews/DiffViewer';
import LinkedTaskCard from '@/components/reviews/LinkedTaskCard';
import ReviewHeader from '@/components/reviews/ReviewHeader';
import ReviewTabs from '@/components/reviews/ReviewTabs';
import ReviewersPanel from '@/components/reviews/ReviewersPanel';

/** Revue de code d'une PR, ouverte à la communauté. Design 3C. */
export default function ReviewPage() {
  return (
    <>
      <ReviewHeader />
      <ReviewTabs />
      <ChangedFilesTree />
      <DiffViewer />
      <aside>
        <ReviewersPanel />
        <CommunityReviewCard />
        <ChecksPanel />
        <LinkedTaskCard />
      </aside>
    </>
  );
}
