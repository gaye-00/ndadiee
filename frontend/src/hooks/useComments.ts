import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commentService } from '@/services/comment.service';
import type { ContentType } from '@/types/common.types';

export function useComments(targetType: ContentType, targetId: number | undefined) {
  return useQuery({
    queryKey: ['comments', targetType, targetId],
    queryFn: () => commentService.getByTarget(targetType, targetId!, { size: 50 }),
    enabled: targetId !== undefined,
  });
}

export function useCreateComment(targetType: ContentType, targetId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => commentService.create({ targetType, targetId, body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['comments', targetType, targetId] }),
  });
}

export function useDeleteComment(targetType: ContentType, targetId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => commentService.delete(commentId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['comments', targetType, targetId] }),
  });
}
