import { CircleCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import TagList from '@/components/shared/TagList';
import UserCard from '@/components/shared/UserCard';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { QuestionSummary } from '@/types/question.types';
import { countLabel, formatRelativeTime } from '@/utils/formatters';

interface QuestionCardProps {
  question: QuestionSummary;
}

export default function QuestionCard({ question }: QuestionCardProps) {
  return (
    <article className="space-y-2 rounded-lg border p-4">
      <h3 className="font-semibold">
        <Link to={paths.question(question.slug)} className="hover:underline">
          {question.title}
        </Link>
      </h3>
      <p className="line-clamp-2 text-sm text-muted-foreground">{question.excerpt}</p>
      <TagList tags={question.tags} />
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <UserCard user={question.author} meta={formatRelativeTime(question.createdAt)} size="sm" />
        <p className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{countLabel(question.score, 'vote')}</span>
          <span className={cn('flex items-center gap-1', question.hasAcceptedAnswer && 'font-medium text-foreground')}>
            {question.hasAcceptedAnswer && <CircleCheck className="size-3.5" aria-label="Résolue" />}
            {countLabel(question.answerCount, 'réponse')}
          </span>
          <span>{countLabel(question.viewCount, 'vue')}</span>
        </p>
      </div>
    </article>
  );
}
