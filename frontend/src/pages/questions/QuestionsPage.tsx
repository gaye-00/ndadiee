import { MessagesSquare, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import QuestionCard from '@/components/question/QuestionCard';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import PageHeader from '@/components/shared/PageHeader';
import Pagination from '@/components/shared/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuestions } from '@/hooks/useQuestions';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { paths } from '@/router/paths';
import type { QuestionFilters } from '@/types/question.types';
import { countLabel } from '@/utils/formatters';

type SortTab = 'recent' | 'top' | 'unanswered';

const TAB_FILTERS: Record<SortTab, QuestionFilters> = {
  recent: { sort: 'createdAt,desc' },
  top: { sort: 'score,desc' },
  unanswered: { sort: 'createdAt,desc', unanswered: true },
};

export default function QuestionsPage() {
  const { get, page, update } = useUrlFilters();
  const tag = get('tag');
  const tab = (get('tab') as SortTab | undefined) ?? 'recent';

  const questions = useQuestions({ ...(TAB_FILTERS[tab] ?? TAB_FILTERS.recent), tag, page });

  return (
    <>
      <PageHeader
        title="Questions"
        description={questions.data ? countLabel(questions.data.totalElements, 'question') : undefined}
        action={
          <Button asChild>
            <Link to={paths.askQuestion}>
              <Plus /> Poser une question
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={(value) => update({ tab: value, page: null })}>
          <TabsList aria-label="Tri des questions">
            <TabsTrigger value="recent">Récentes</TabsTrigger>
            <TabsTrigger value="top">Mieux notées</TabsTrigger>
            <TabsTrigger value="unanswered">Sans réponse</TabsTrigger>
          </TabsList>
        </Tabs>
        {tag && (
          <Badge variant="secondary" className="gap-1">
            Tag : {tag}
            <button type="button" onClick={() => update({ tag: null, page: null })} aria-label="Retirer le filtre par tag">
              <X className="size-3" />
            </button>
          </Badge>
        )}
      </div>

      {questions.isPending ? (
        <ListSkeleton />
      ) : questions.isError ? (
        <ErrorState error={questions.error} onRetry={() => void questions.refetch()} />
      ) : questions.data.content.length === 0 ? (
        <EmptyState
          icon={<MessagesSquare />}
          title="Aucune question"
          description="Aucune question ne correspond à ces filtres."
        />
      ) : (
        <div className="space-y-3">
          {questions.data.content.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
          <Pagination page={questions.data} onPageChange={(next) => update({ page: String(next) })} />
        </div>
      )}
    </>
  );
}
