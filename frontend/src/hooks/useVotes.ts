import { useMutation, useQueryClient } from '@tanstack/react-query';
import { voteService } from '@/services/vote.service';
import type { Article } from '@/types/article.types';
import type { ContentType, PageResponse } from '@/types/common.types';
import type { VoteResponse } from '@/types/interaction.types';
import type { Project } from '@/types/project.types';
import type { Answer, Question } from '@/types/question.types';

interface VoteVariables {
  targetType: ContentType;
  targetId: number;
  /** +1, -1, ou 0 pour retirer son vote */
  value: 1 | -1 | 0;
}

/**
 * Vote sur un contenu. Le nouveau score renvoyé par le backend est écrit directement dans le
 * cache : pas de rechargement de la page de détail, qui compterait une vue de plus.
 */
export function useVote() {
  const qc = useQueryClient();

  const applyToCache = ({ targetType, targetId, value, score }: VoteResponse) => {
    const currentUserVote = value === 0 ? null : value;

    switch (targetType) {
      case 'QUESTION':
        qc.setQueriesData<Question>({ queryKey: ['question'] }, (question) =>
          question?.id === targetId ? { ...question, score, currentUserVote } : question,
        );
        void qc.invalidateQueries({ queryKey: ['questions'] });
        break;
      case 'ANSWER':
        qc.setQueriesData<PageResponse<Answer>>({ queryKey: ['answers'] }, (page) =>
          page
            ? {
                ...page,
                content: page.content.map((answer) =>
                  answer.id === targetId ? { ...answer, score, currentUserVote } : answer,
                ),
              }
            : page,
        );
        break;
      case 'ARTICLE':
        qc.setQueriesData<Article>({ queryKey: ['article'] }, (article) =>
          article?.id === targetId ? { ...article, score, currentUserVote } : article,
        );
        void qc.invalidateQueries({ queryKey: ['articles'] });
        break;
      case 'PROJECT':
        // Pour un projet, le score est son nombre d'étoiles
        void qc.invalidateQueries({ queryKey: ['projects'] });
        qc.setQueriesData<Project>({ queryKey: ['project'] }, (project) =>
          project?.id === targetId ? { ...project, starsCount: score, starredByMe: value === 1 } : project,
        );
        break;
    }
  };

  return useMutation({
    mutationFn: ({ targetType, targetId, value }: VoteVariables) =>
      value === 0 ? voteService.remove(targetType, targetId) : voteService.vote({ targetType, targetId, value }),
    onSuccess: applyToCache,
  });
}
