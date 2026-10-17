import ReplyForm from '@/components/forum/ReplyForm';
import ReplyList from '@/components/forum/ReplyList';
import TopicBody from '@/components/forum/TopicBody';
import TopicHeader from '@/components/forum/TopicHeader';

/** Un sujet du forum et ses réponses. */
export default function TopicPage() {
  return (
    <>
      <TopicHeader />
      <TopicBody />
      <ReplyList />
      <ReplyForm />
    </>
  );
}
