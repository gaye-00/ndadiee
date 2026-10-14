import { Check, CircleCheck, Trash2 } from 'lucide-react';
import MarkdownContent from '@/components/shared/MarkdownContent';
import UserCard from '@/components/shared/UserCard';
import VoteButtons from '@/components/shared/VoteButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAcceptAnswer, useDeleteAnswer } from '@/hooks/useQuestions';
import { cn } from '@/lib/utils';
import type { Answer, Question } from '@/types/question.types';
import { formatRelativeTime } from '@/utils/formatters';

interface AnswerCardProps {
  answer: Answer;
  question: Question;
}

export default function AnswerCard({ answer, question }: AnswerCardProps) {
  const { user, canModerate } = useAuth();
  const acceptAnswer = useAcceptAnswer(question);
  const deleteAnswer = useDeleteAnswer(question);

  // Seul l'auteur de la question choisit la solution
  const canAccept = user?.id === question.author.id;
  const canDelete = user?.id === answer.author.id || canModerate;

  return (
    <article
      id={`answer-${answer.id}`}
      className={cn('flex gap-4 rounded-lg border p-4', answer.accepted && 'border-foreground/40')}
    >
      <VoteButtons
        targetType="ANSWER"
        targetId={answer.id}
        score={answer.score}
        currentUserVote={answer.currentUserVote}
        authorId={answer.author.id}
      />
      <div className="min-w-0 flex-1 space-y-3">
        {answer.accepted && (
          <Badge>
            <CircleCheck /> Solution acceptée
          </Badge>
        )}
        <MarkdownContent content={answer.body} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <UserCard user={answer.author} meta={formatRelativeTime(answer.createdAt)} size="sm" />
          <div className="flex gap-2">
            {canAccept && (
              <Button
                variant="outline"
                size="sm"
                disabled={acceptAnswer.isPending}
                onClick={() => acceptAnswer.mutate({ answerId: answer.id, accept: !answer.accepted })}
              >
                <Check /> {answer.accepted ? 'Retirer la solution' : 'Accepter comme solution'}
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={deleteAnswer.isPending}
                onClick={() => deleteAnswer.mutate(answer.id)}
                aria-label="Supprimer la réponse"
              >
                <Trash2 />
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
