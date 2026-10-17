import TopicFilters from '@/components/forum/TopicFilters';
import TopicList from '@/components/forum/TopicList';

/** Forum (anciennement « Questions ») : les sujets de la communauté. */
export default function ForumPage() {
  return (
    <>
      <TopicFilters />
      <TopicList />
    </>
  );
}
