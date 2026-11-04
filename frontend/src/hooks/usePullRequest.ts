import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useAuth } from './useAuth';
import { reviewService } from '@/services/review.service';
import type { PullRequestDetail, ReviewComment, ReviewCommentInput, ReviewCommentUpdate, ReviewSubmission } from '@/types/review.types';

/**
 * La PR de la page (/projects/:slug/reviews/:number). Sous la clé des revues : se proposer comme relecteur ou se
 * retirer (useReviewClaim) recharge aussi la page.
 */
export const pullRequestKey = (slug: string, number: number) => ['reviews', 'pull-request', slug, number] as const;

// Ce que le dépôt sait de la PR (diff, vérifications, issues) : à part, pour qu'un geste de revue ne relise pas GitHub
const contentKey = (slug: string, number: number, part: 'files' | 'checks' | 'issues') =>
  ['pull-request-content', slug, number, part] as const;

/** Le projet et le numéro de la PR, tels que l'adresse les donne ; number vaut NaN si l'adresse est invalide. */
export function useReviewParams() {
  const { slug = '', number = '' } = useParams();
  return { slug, number: /^\d+$/.test(number) ? Number(number) : Number.NaN };
}

/** La page d'une revue : la PR, sa description, sa conversation, et ce que le membre connecté peut y faire. */
export function usePullRequestDetail(slug: string, number: number) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: pullRequestKey(slug, number),
    queryFn: () => reviewService.getPullRequest(slug, number),
    enabled: isAuthenticated && !!slug && Number.isInteger(number),
  });
}

/** Ses fichiers modifiés et leur diff. Au dernier commit, le diff ne change plus : il reste en mémoire. */
export function usePullRequestFiles(slug: string, number: number) {
  return useQuery({
    queryKey: contentKey(slug, number, 'files'),
    queryFn: () => reviewService.getFiles(slug, number),
    staleTime: 5 * 60_000,
  });
}

/** Ses vérifications : tant que l'une tourne, on revient voir toutes les 20 secondes. */
export function usePullRequestChecks(slug: string, number: number) {
  return useQuery({
    queryKey: contentKey(slug, number, 'checks'),
    queryFn: () => reviewService.getChecks(slug, number),
    refetchInterval: (query) => (query.state.data?.checks.some((check) => check.state === 'PENDING') ? 20_000 : false),
  });
}

/** Les issues qu'elle fermera en fusionnant. */
export function usePullRequestIssues(slug: string, number: number) {
  return useQuery({
    queryKey: contentKey(slug, number, 'issues'),
    queryFn: () => reviewService.getIssues(slug, number),
    staleTime: 5 * 60_000,
  });
}

// La liste des revues, ses totaux et l'atelier comptent les commentaires et les verdicts : ils se rechargent
function refreshLists(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['reviews', 'list'] });
  void qc.invalidateQueries({ queryKey: ['reviews', 'overview'] });
  void qc.invalidateQueries({ queryKey: ['dashboard'] });
}

// Applique un changement aux commentaires de la page, sans la recharger
function updateComments(qc: QueryClient, slug: string, number: number, change: (comments: ReviewComment[]) => ReviewComment[]) {
  qc.setQueryData<PullRequestDetail>(pullRequestKey(slug, number), (detail) => {
    if (!detail) {
      return detail;
    }
    const comments = change(detail.comments);
    const counted = comments.filter((comment) => comment.body !== null).length;
    return { ...detail, comments, pullRequest: { ...detail.pullRequest, commentCount: counted } };
  });
}

/** Commente la conversation ou une ligne du diff ; le commentaire rejoint la page aussitôt. */
export function useAddReviewComment(slug: string, number: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewCommentInput) => reviewService.comment(slug, number, input),
    onSuccess: (comment) => {
      updateComments(qc, slug, number, (comments) => [...comments, comment]);
      refreshLists(qc);
    },
    // Le formulaire affiche l'erreur sous le champ, et garde le texte
    meta: { handlesError: true },
  });
}

export function useUpdateReviewComment(slug: string, number: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: number; update: ReviewCommentUpdate }) => reviewService.updateComment(slug, number, id, update),
    onSuccess: (updated) => updateComments(qc, slug, number, (comments) => comments.map((comment) => (comment.id === updated.id ? updated : comment))),
    meta: { handlesError: true },
  });
}

export function useDeleteReviewComment(slug: string, number: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reviewService.deleteComment(slug, number, id),
    onSuccess: (_, id) => {
      updateComments(qc, slug, number, (comments) => comments.filter((comment) => comment.id !== id));
      refreshLists(qc);
    },
  });
}

/** Rend sa revue ; la page revient à jour (relecteurs, verdict, conversation), les listes se rechargent. */
export function useSubmitReview(slug: string, number: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (submission: ReviewSubmission) => reviewService.submitReview(slug, number, submission),
    onSuccess: (detail) => {
      qc.setQueryData(pullRequestKey(slug, number), detail);
      refreshLists(qc);
    },
    meta: { handlesError: true },
  });
}

/** Juge utile (ou plus) la revue d'un relecteur de la communauté : +10 de réputation pour lui. */
export function useJudgeReview(slug: string, number: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewerId, helpful }: { reviewerId: number; helpful: boolean }) =>
      reviewService.judgeHelpful(slug, number, reviewerId, helpful),
    onSuccess: (detail) => qc.setQueryData(pullRequestKey(slug, number), detail),
  });
}
