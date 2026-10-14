import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import UserCard from '@/components/shared/UserCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/useComments';
import type { ContentType } from '@/types/common.types';
import { countLabel, formatRelativeTime } from '@/utils/formatters';
import { commentSchema, type CommentFormValues } from '@/utils/validators';

interface CommentSectionProps {
  targetType: ContentType;
  targetId: number;
}

/** Commentaires d'un contenu (question, réponse, article ou projet) et formulaire pour en ajouter. */
export default function CommentSection({ targetType, targetId }: CommentSectionProps) {
  const { user, isDeveloper, canModerate } = useAuth();
  const { data: comments } = useComments(targetType, targetId);
  const createComment = useCreateComment(targetType, targetId);
  const deleteComment = useDeleteComment(targetType, targetId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormValues>({ resolver: zodResolver(commentSchema), defaultValues: { body: '' } });

  const onSubmit = handleSubmit((values) => createComment.mutate(values.body, { onSuccess: () => reset() }));

  return (
    <section className="space-y-3" aria-label="Commentaires">
      <h2 className="text-sm font-semibold">
        {comments ? countLabel(comments.totalElements, 'commentaire') : 'Commentaires'}
      </h2>

      {comments && comments.content.length > 0 && (
        <ul className="space-y-3">
          {comments.content.map((comment) => (
            <li key={comment.id} className="flex items-start justify-between gap-3 border-l-2 pl-3">
              <div className="min-w-0 space-y-1">
                <UserCard user={comment.author} meta={formatRelativeTime(comment.createdAt)} size="sm" />
                <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
              </div>
              {(user?.id === comment.author.id || canModerate) && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={deleteComment.isPending}
                  onClick={() => deleteComment.mutate(comment.id)}
                  aria-label="Supprimer le commentaire"
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isDeveloper && (
        <form onSubmit={onSubmit} className="space-y-2" noValidate>
          <Textarea
            {...register('body')}
            rows={2}
            placeholder="Ajouter un commentaire…"
            aria-label="Votre commentaire"
            aria-invalid={!!errors.body}
          />
          {errors.body && (
            <p role="alert" className="text-xs text-destructive">
              {errors.body.message}
            </p>
          )}
          <Button type="submit" size="sm" variant="outline" disabled={createComment.isPending}>
            Commenter
          </Button>
        </form>
      )}
    </section>
  );
}
