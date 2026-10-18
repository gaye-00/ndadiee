import {
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { answerService } from '@/services/answer.service';
import { commentService } from '@/services/comment.service';
import { questionService } from '@/services/question.service';
import { voteService } from '@/services/vote.service';
import type { PageResponse } from '@/types/common.types';
import type { Comment } from '@/types/interaction.types';
import type { Answer, Question, QuestionFilters, QuestionRequest, QuestionStatus, QuestionSummary } from '@/types/question.types';

// Note : GET /questions/{slug} compte une vue à chaque appel. Après une action sur la page de
// détail, on met donc le cache à jour à la main plutôt que de recharger la question.
//
// Les sujets en liste vivent sous la clé ['questions', …] : le fil (['questions', 'board', filtres]), la liste de
// lecture (['questions', 'saved']), les listes courtes des marges (['questions', filtres]) et la vue d'ensemble
// (['questions', 'overview']). Un vote ou un enregistrement les met toutes à jour d'un coup (patchSummaries).

type TopicRef = Pick<Question, 'id' | 'slug'>;

export function useQuestions(filters?: QuestionFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['questions', filters],
    queryFn: () => questionService.getAll(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

/** Le fil du forum se déroule quinze sujets à la fois. */
export const TOPICS_PAGE_SIZE = 15;

/**
 * Les sujets du forum, page après page, avec leurs filtres ; ou la liste de lecture du membre (`saved`), les derniers
 * enregistrés d'abord. Pendant qu'un nouveau filtre charge, les sujets d'avant restent affichés.
 */
export function useTopicBoard(filters: QuestionFilters, { saved, enabled }: { saved: boolean; enabled: boolean }) {
  return useInfiniteQuery({
    queryKey: saved ? ['questions', 'saved'] : ['questions', 'board', filters],
    queryFn: ({ pageParam }) =>
      saved
        ? questionService.getSaved({ page: pageParam, size: TOPICS_PAGE_SIZE })
        : questionService.getAll({ ...filters, page: pageParam, size: TOPICS_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Requête de la vue d'ensemble : partagée par l'accroche, la navigation du forum et le préchargement. */
export const forumOverviewQuery = queryOptions({
  queryKey: ['questions', 'overview'],
  queryFn: questionService.getOverview,
});

/** Le forum en chiffres (sujets, résolus, sans réponse, réponses, contributeurs) et ses tags les plus utilisés. */
export function useForumOverview() {
  return useQuery(forumOverviewQuery);
}

export function useQuestion(slug: string | undefined) {
  return useQuery({
    queryKey: ['question', slug],
    queryFn: () => questionService.getBySlug(slug!),
    enabled: !!slug,
  });
}

/** Les réponses d'un sujet, chacune avec son fil de commentaires : la réponse acceptée d'abord, puis les mieux notées. */
export function useAnswers(questionId: number | undefined) {
  return useQuery({
    queryKey: ['answers', questionId],
    queryFn: () => questionService.getAnswers(questionId!, { size: 50 }),
    enabled: questionId !== undefined,
  });
}

// ── Mises à jour du cache ──

type SummaryCache = PageResponse<QuestionSummary> | InfiniteData<PageResponse<QuestionSummary>> | undefined;

/** Applique un changement à un sujet partout où il est en liste (fil, liste de lecture, marges). */
function patchSummaries(qc: QueryClient, id: number, patch: (summary: QuestionSummary) => QuestionSummary) {
  const patchPage = (page: PageResponse<QuestionSummary>) => ({
    ...page,
    content: page.content.map((summary) => (summary.id === id ? patch(summary) : summary)),
  });
  qc.setQueriesData<SummaryCache>({ queryKey: ['questions'] }, (data) => {
    if (!data || typeof data !== 'object') {
      return data;
    }
    if ('pages' in data) {
      return { ...data, pages: data.pages.map(patchPage) };
    }
    return 'content' in data ? patchPage(data) : data;
  });
}

/** Photographie des caches touchés par un geste, pour revenir en arrière s'il échoue. */
function snapshot(qc: QueryClient, keys: QueryKey[]) {
  const saved = keys.flatMap((queryKey) => qc.getQueriesData({ queryKey }));
  return () => saved.forEach(([key, data]) => qc.setQueryData(key, data));
}

function patchAnswer(qc: QueryClient, questionId: number, answerId: number, patch: (answer: Answer) => Answer) {
  qc.setQueryData<PageResponse<Answer>>(['answers', questionId], (page) =>
    page ? { ...page, content: page.content.map((answer) => (answer.id === answerId ? patch(answer) : answer)) } : page,
  );
}

// ── Sujets ──

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: QuestionRequest) => questionService.create(body),
    onSuccess: (question) => {
      // La page du sujet s'ouvre aussitôt, sans le redemander (ni compter une vue)
      qc.setQueryData(['question', question.slug], question);
      void qc.invalidateQueries({ queryKey: ['questions'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
    meta: { handlesError: true },
  });
}

export function useUpdateQuestion(question: TopicRef) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: QuestionRequest) => questionService.update(question.id, body),
    onSuccess: (updated) => {
      qc.setQueryData(['question', question.slug], updated);
      void qc.invalidateQueries({ queryKey: ['questions'] });
    },
    meta: { handlesError: true },
  });
}

/** Ferme un sujet (il n'accepte plus de réponses) ou le rouvre. Auteur ou modérateur. */
export function useChangeQuestionStatus(question: TopicRef) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: QuestionStatus) => questionService.changeStatus(question.id, status),
    onSuccess: (updated) => {
      qc.setQueryData<Question>(['question', question.slug], (current) => (current ? { ...current, status: updated.status } : updated));
      patchSummaries(qc, question.id, (summary) => ({ ...summary, status: updated.status }));
    },
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (question: TopicRef) => questionService.delete(question.id),
    onSuccess: (_result, question) => {
      qc.removeQueries({ queryKey: ['question', question.slug] });
      void qc.invalidateQueries({ queryKey: ['questions'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

/**
 * Enregistre un sujet dans la liste de lecture, ou l'en retire. Le marque-page change tout de suite, partout où le
 * sujet est affiché ; il revient en arrière si l'API refuse.
 */
export function useBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bookmarked }: { id: number; slug?: string; bookmarked: boolean }) =>
      bookmarked ? questionService.bookmark(id) : questionService.unbookmark(id),
    onMutate: ({ id, slug, bookmarked }) => {
      const restore = snapshot(qc, slug ? [['questions'], ['question', slug]] : [['questions']]);
      patchSummaries(qc, id, (summary) => ({ ...summary, bookmarkedByMe: bookmarked }));
      if (slug) {
        qc.setQueryData<Question>(['question', slug], (question) => (question ? { ...question, bookmarkedByMe: bookmarked } : question));
      }
      return { restore };
    },
    onError: (_error, _variables, context) => context?.restore(),
    onSuccess: (_response, { bookmarked }) => {
      // La liste de lecture suit au prochain affichage ; celle à l'écran garde le sujet, le temps d'un « Annuler »
      void qc.invalidateQueries({ queryKey: ['questions', 'saved'], refetchType: bookmarked ? 'active' : 'none' });
    },
  });
}

interface VoteVariables {
  targetType: 'QUESTION' | 'ANSWER';
  targetId: number;
  /** +1, -1, ou 0 pour retirer son vote */
  value: 1 | -1 | 0;
}

const rescore = <T extends { score: number; currentUserVote: number | null }>(item: T, value: number): T => ({
  ...item,
  score: item.score - (item.currentUserVote ?? 0) + value,
  currentUserVote: value === 0 ? null : value,
});

/**
 * Vote sur un sujet ou une de ses réponses. Le score change tout de suite ; celui que renvoie l'API le confirme
 * (d'autres ont pu voter entre-temps), ou le vote revient en arrière si l'API refuse.
 */
export function useForumVote(question: TopicRef) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ targetType, targetId, value }: VoteVariables) =>
      value === 0 ? voteService.remove(targetType, targetId) : voteService.vote({ targetType, targetId, value }),
    onMutate: ({ targetType, targetId, value }) => {
      const restore = snapshot(qc, [['question', question.slug], ['answers', question.id]]);
      if (targetType === 'QUESTION') {
        qc.setQueryData<Question>(['question', question.slug], (current) => (current ? rescore(current, value) : current));
      } else {
        patchAnswer(qc, question.id, targetId, (answer) => rescore(answer, value));
      }
      return { restore };
    },
    onError: (_error, _variables, context) => context?.restore(),
    onSuccess: ({ targetType, targetId, value, score }) => {
      const currentUserVote = value === 0 ? null : value;
      if (targetType === 'QUESTION') {
        qc.setQueryData<Question>(['question', question.slug], (current) => (current ? { ...current, score, currentUserVote } : current));
        patchSummaries(qc, targetId, (summary) => ({ ...summary, score }));
      } else {
        patchAnswer(qc, question.id, targetId, (answer) => ({ ...answer, score, currentUserVote }));
      }
    },
  });
}

// ── Réponses ──

export function useCreateAnswer(question: TopicRef) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => questionService.answer(question.id, { body }),
    onSuccess: (answer) => {
      // La nouvelle réponse se montre tout de suite, à la fin : l'ordre de l'API la placera au prochain chargement
      qc.setQueryData<PageResponse<Answer>>(['answers', question.id], (page) =>
        page ? { ...page, content: [...page.content, { ...answer, comments: [] }], totalElements: page.totalElements + 1 } : page,
      );
      qc.setQueryData<Question>(['question', question.slug], (current) =>
        current ? { ...current, answerCount: current.answerCount + 1 } : current,
      );
      patchSummaries(qc, question.id, (summary) => ({ ...summary, answerCount: summary.answerCount + 1 }));
      void qc.invalidateQueries({ queryKey: ['questions', 'overview'] });
    },
    meta: { handlesError: true },
  });
}

export function useUpdateAnswer(question: TopicRef) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ answerId, body }: { answerId: number; body: string }) => answerService.update(answerId, { body }),
    // Le fil de commentaires et le vote du membre restent : la réponse de l'API ne les porte pas
    onSuccess: (updated) => patchAnswer(qc, question.id, updated.id, (answer) => ({ ...answer, body: updated.body, updatedAt: updated.updatedAt })),
    meta: { handlesError: true },
  });
}

/** Accepte une réponse comme solution, ou lui retire ce statut. Réservé à l'auteur de la question. */
export function useAcceptAnswer(question: TopicRef) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ answerId, accept }: { answerId: number; accept: boolean }) =>
      accept ? answerService.accept(answerId) : answerService.unaccept(answerId),
    onSuccess: (answer) => {
      qc.setQueryData<PageResponse<Answer>>(['answers', question.id], (page) =>
        page
          ? { ...page, content: page.content.map((item) => ({ ...item, accepted: answer.accepted && item.id === answer.id })) }
          : page,
      );
      qc.setQueryData<Question>(['question', question.slug], (current) =>
        current ? { ...current, acceptedAnswerId: answer.accepted ? answer.id : null } : current,
      );
      patchSummaries(qc, question.id, (summary) => ({ ...summary, hasAcceptedAnswer: answer.accepted }));
      void qc.invalidateQueries({ queryKey: ['questions', 'overview'] });
    },
  });
}

export function useDeleteAnswer(question: TopicRef) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answerId: number) => answerService.delete(answerId),
    onSuccess: (_result, answerId) => {
      qc.setQueryData<PageResponse<Answer>>(['answers', question.id], (page) =>
        page ? { ...page, content: page.content.filter((answer) => answer.id !== answerId), totalElements: page.totalElements - 1 } : page,
      );
      qc.setQueryData<Question>(['question', question.slug], (current) =>
        current
          ? {
              ...current,
              answerCount: Math.max(0, current.answerCount - 1),
              acceptedAnswerId: current.acceptedAnswerId === answerId ? null : current.acceptedAnswerId,
            }
          : current,
      );
      void qc.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

// ── Commentaires sous une réponse ──

/** Ajoute un commentaire au fil d'une réponse ; il s'y montre dès que l'API l'a enregistré. */
export function useCreateAnswerComment(question: TopicRef) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ answerId, body }: { answerId: number; body: string }) =>
      commentService.create({ targetType: 'ANSWER', targetId: answerId, body }),
    onSuccess: (comment, { answerId }) =>
      patchAnswer(qc, question.id, answerId, (answer) => ({ ...answer, comments: [...(answer.comments ?? []), comment] })),
    meta: { handlesError: true },
  });
}

const replaceComment = (comments: Comment[] | undefined, updated: Comment) =>
  (comments ?? []).map((comment) => (comment.id === updated.id ? updated : comment));

export function useUpdateAnswerComment(question: TopicRef) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, body }: { answerId: number; commentId: number; body: string }) => commentService.update(commentId, body),
    onSuccess: (comment, { answerId }) =>
      patchAnswer(qc, question.id, answerId, (answer) => ({ ...answer, comments: replaceComment(answer.comments, comment) })),
    meta: { handlesError: true },
  });
}

export function useDeleteAnswerComment(question: TopicRef) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId }: { answerId: number; commentId: number }) => commentService.delete(commentId),
    onSuccess: (_result, { answerId, commentId }) =>
      patchAnswer(qc, question.id, answerId, (answer) => ({
        ...answer,
        comments: (answer.comments ?? []).filter((comment) => comment.id !== commentId),
      })),
  });
}
