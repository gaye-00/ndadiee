import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { articleService } from '@/services/article.service';
import type { ArticleFilters, ArticleRequest, ArticleStatus } from '@/types/article.types';

export function useArticles(filters?: ArticleFilters) {
  return useQuery({
    queryKey: ['articles', filters],
    queryFn: () => articleService.getAll(filters),
    placeholderData: keepPreviousData,
  });
}

/** Mes articles, brouillons compris. */
export function useMyArticles(status?: ArticleStatus) {
  return useQuery({
    queryKey: ['articles', 'mine', status],
    queryFn: () => articleService.getMine({ status }),
  });
}

export function useArticle(slug: string | undefined) {
  return useQuery({
    queryKey: ['article', slug],
    queryFn: () => articleService.getBySlug(slug!),
    enabled: !!slug,
  });
}

export function useCreateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ArticleRequest) => articleService.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['articles'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
    meta: { handlesError: true },
  });
}

export function usePublishArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => articleService.publish(id),
    onSuccess: (article) => {
      qc.setQueryData(['article', article.slug], article);
      void qc.invalidateQueries({ queryKey: ['articles'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => articleService.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['articles'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
