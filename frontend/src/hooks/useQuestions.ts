import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { answerService } from '@/services/answer.service';
import { questionService } from '@/services/question.service';
import type { Question, QuestionFilters, QuestionRequest } from '@/types/question.types';

// Note : GET /questions/{slug} compte une vue à chaque appel. Après une action sur la page de
// détail, on met donc le cache à jour à la main plutôt que de recharger la question.

export function useQuestions(filters?: QuestionFilters) {
  return useQuery({
    queryKey: ['questions', filters],
    queryFn: () => questionService.getAll(filters),
    placeholderData: keepPreviousData,
  });
}

export function useQuestion(slug: string | undefined) {
  return useQuery({
    queryKey: ['question', slug],
    queryFn: () => questionService.getBySlug(slug!),
    enabled: !!slug,
  });
}

export function useAnswers(questionId: number | undefined) {
  return useQuery({
    queryKey: ['answers', questionId],
    queryFn: () => questionService.getAnswers(questionId!, { size: 50 }),
    enabled: questionId !== undefined,
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: QuestionRequest) => questionService.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['questions'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
    meta: { handlesError: true },
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => questionService.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['questions'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useCreateAnswer(question: Pick<Question, 'id' | 'slug'>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => questionService.answer(question.id, { body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['answers', question.id] });
      qc.setQueryData<Question>(['question', question.slug], (current) =>
        current ? { ...current, answerCount: current.answerCount + 1 } : current,
      );
    },
    meta: { handlesError: true },
  });
}

/** Accepte une réponse comme solution, ou lui retire ce statut. Réservé à l'auteur de la question. */
export function useAcceptAnswer(question: Pick<Question, 'id' | 'slug'>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ answerId, accept }: { answerId: number; accept: boolean }) =>
      accept ? answerService.accept(answerId) : answerService.unaccept(answerId),
    onSuccess: (answer) => {
      void qc.invalidateQueries({ queryKey: ['answers', question.id] });
      qc.setQueryData<Question>(['question', question.slug], (current) =>
        current ? { ...current, acceptedAnswerId: answer.accepted ? answer.id : null } : current,
      );
    },
  });
}

export function useDeleteAnswer(question: Pick<Question, 'id' | 'slug'>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answerId: number) => answerService.delete(answerId),
    onSuccess: (_result, answerId) => {
      void qc.invalidateQueries({ queryKey: ['answers', question.id] });
      qc.setQueryData<Question>(['question', question.slug], (current) =>
        current
          ? {
              ...current,
              answerCount: Math.max(0, current.answerCount - 1),
              acceptedAnswerId: current.acceptedAnswerId === answerId ? null : current.acceptedAnswerId,
            }
          : current,
      );
    },
  });
}
