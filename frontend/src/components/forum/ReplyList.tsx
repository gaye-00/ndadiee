import { ArrowDownNarrowWide, ArrowUpNarrowWide, Sparkles } from 'lucide-react';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import ReplyCard from './ReplyCard';
import ReplyForm from './ReplyForm';
import ErrorState from '@/components/feedback/ErrorState';
import SortMenu, { type SortOption } from '@/components/shared/SortMenu';
import { useAnswers } from '@/hooks/useQuestions';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Answer, Question } from '@/types/question.types';
import { isolate } from '@/utils/formatters';

type AnswerSort = 'best' | 'newest' | 'oldest';

// Le temps qu'une réponse visée par un lien reste éclairée
const HIGHLIGHT_MS = 2600;

const time = (answer: Answer) => new Date(answer.createdAt).getTime();

/** L'ordre de l'API (la solution, puis les mieux notées), ou par date */
function sortAnswers(answers: Answer[], sort: AnswerSort): Answer[] {
  if (sort === 'best') {
    return answers;
  }
  return [...answers].sort((a, b) => (sort === 'newest' ? time(b) - time(a) : time(a) - time(b)));
}

/**
 * La discussion d'un sujet, comme « Top comments » sur dev.to : le nombre de réponses et leur ordre (les meilleures :
 * la solution acceptée, puis les mieux notées ; les plus récentes ; les plus anciennes), le champ pour répondre,
 * puis les réponses et leurs fils de commentaires.
 *
 * Arrivé par le lien d'une réponse ou d'un commentaire (#answer-12, une notification), la page y descend et la réponse
 * s'éclaire un instant ; de même pour la réponse qu'on vient de publier.
 */
export default function ReplyList({ topic }: { topic: Question }) {
  const { t } = useTranslation('forum');
  const { hash } = useLocation();
  const reduced = useReducedMotion();
  const answers = useAnswers(topic.id);
  const [sort, setSort] = useState<AnswerSort>('best');
  const [highlight, setHighlight] = useState<number | null>(null);
  const list = useMemo(() => sortAnswers(answers.data?.content ?? [], sort), [answers.data, sort]);
  const count = Math.max(topic.answerCount, answers.data?.totalElements ?? 0);

  const sorts: SortOption<AnswerSort>[] = [
    { value: 'best', label: t('answers.sortBest'), icon: Sparkles },
    { value: 'newest', label: t('answers.sortNewest'), icon: ArrowDownNarrowWide },
    { value: 'oldest', label: t('answers.sortOldest'), icon: ArrowUpNarrowWide },
  ];

  // Descend jusqu'à l'élément de l'ancre, une fois les réponses à l'écran ; une réponse visée s'éclaire
  const reveal = useEffectEvent((target: string) => {
    const element = document.getElementById(target);
    if (!element) {
      return;
    }
    element.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: target === 'answers' ? 'start' : 'center' });
    const answer = /^answer-(\d+)$/.exec(target);
    if (answer) {
      setHighlight(Number(answer[1]));
    }
  });

  const loaded = answers.data !== undefined;
  useEffect(() => {
    const target = decodeURIComponent(hash.slice(1));
    if (!loaded || !/^(answers|answer-\d+|comment-\d+)$/.test(target)) {
      return undefined;
    }
    // Une image plus tard : les réponses viennent d'être rendues
    const frame = requestAnimationFrame(() => reveal(target));
    return () => cancelAnimationFrame(frame);
  }, [loaded, hash]);

  useEffect(() => {
    if (highlight === null) {
      return undefined;
    }
    const timer = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlight]);

  function onPosted(answer: Answer) {
    setSort('best');
    setHighlight(answer.id);
    requestAnimationFrame(() =>
      document.getElementById(`answer-${answer.id}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }),
    );
  }

  return (
    <section id="answers" aria-labelledby="answers-title" className="scroll-mt-24 border-t border-border-subtle px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="answers-title" className="font-display text-h4">
          {t('answers.title', { count })}
        </h2>
        {list.length > 1 && <SortMenu value={sort} options={sorts} onChange={setSort} />}
      </div>

      <ReplyForm topic={topic} onPosted={onPosted} />

      <div className="mt-8">
        {answers.isPending ? (
          <ul aria-hidden className="flex flex-col gap-6">
            {[0, 1].map((index) => (
              <li key={index} className="flex gap-3">
                <span className="size-9 shrink-0 rounded-full skeleton-shimmer" />
                <span className="h-32 flex-1 rounded-2xl skeleton-shimmer" />
              </li>
            ))}
          </ul>
        ) : answers.isError ? (
          <ErrorState title={t('answers.errorTitle')} description={t('answers.errorText')} onRetry={() => void answers.refetch()} />
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border-strong px-6 py-10 text-center">
            <span aria-hidden className="empty-loom h-12 w-40" />
            <p className="mt-4 font-bold text-foreground">{t('answers.emptyTitle')}</p>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t('answers.emptyText', { name: isolate(topic.author.fullName.split(/\s+/)[0] ?? topic.author.fullName) })}
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-7">
            {list.map((answer) => (
              <ReplyCard key={answer.id} answer={answer} topic={topic} highlighted={highlight === answer.id} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
