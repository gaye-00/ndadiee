import { useParams } from 'react-router-dom';
import CommentSection from '@/components/comment/CommentSection';
import AnswerCard from '@/components/question/AnswerCard';
import AnswerForm from '@/components/question/AnswerForm';
import ErrorState from '@/components/shared/ErrorState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import MarkdownContent from '@/components/shared/MarkdownContent';
import TagList from '@/components/shared/TagList';
import UserCard from '@/components/shared/UserCard';
import VoteButtons from '@/components/shared/VoteButtons';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAnswers, useQuestion } from '@/hooks/useQuestions';
import { countLabel, formatRelativeTime } from '@/utils/formatters';

export default function QuestionDetailPage() {
  const { slug } = useParams();
  const question = useQuestion(slug);
  const answers = useAnswers(question.data?.id);

  if (question.isPending) {
    return <ListSkeleton count={2} />;
  }
  if (question.isError) {
    return <ErrorState error={question.error} onRetry={() => void question.refetch()} />;
  }

  const data = question.data;

  return (
    <div className="space-y-8">
      <article>
        <header className="mb-4 space-y-2">
          <div className="flex items-start gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
            {data.status === 'CLOSED' && <Badge variant="outline">Fermée</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Posée {formatRelativeTime(data.createdAt)} · {countLabel(data.viewCount, 'vue')}
            {data.updatedAt !== data.createdAt && ` · modifiée ${formatRelativeTime(data.updatedAt)}`}
          </p>
        </header>

        <div className="flex gap-4">
          <VoteButtons
            targetType="QUESTION"
            targetId={data.id}
            score={data.score}
            currentUserVote={data.currentUserVote}
            authorId={data.author.id}
          />
          <div className="min-w-0 flex-1 space-y-4">
            <MarkdownContent content={data.body} />
            <TagList tags={data.tags} />
            <UserCard user={data.author} />
          </div>
        </div>
      </article>

      <CommentSection targetType="QUESTION" targetId={data.id} />

      <Separator />

      <section className="space-y-4" aria-labelledby="answers-title">
        <h2 id="answers-title" className="text-lg font-semibold">
          {countLabel(data.answerCount, 'réponse')}
        </h2>
        {answers.isPending ? (
          <ListSkeleton count={2} />
        ) : answers.isError ? (
          <ErrorState error={answers.error} onRetry={() => void answers.refetch()} />
        ) : (
          answers.data.content.map((answer) => <AnswerCard key={answer.id} answer={answer} question={data} />)
        )}
      </section>

      <AnswerForm question={data} />
    </div>
  );
}
