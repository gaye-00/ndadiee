import { MessageCircleQuestion } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CommentForm, CommentItem } from './ReplyComments';
import MarkdownContent from '@/components/shared/MarkdownContent';
import { useAuth } from '@/hooks/useAuth';
import { useComments, useCreateComment, useDeleteComment, useUpdateComment } from '@/hooks/useComments';
import { useMemberAction } from '@/hooks/useMemberAction';
import { cn } from '@/lib/utils';
import type { Question } from '@/types/question.types';

/**
 * Le contenu d'un sujet, en Markdown (le code coloré, avec son bouton « copier »), puis ses précisions : les
 * commentaires sur la question elle-même, pour demander un détail sans répondre (une version, un message
 * d'erreur). Ils se lisent avant les réponses.
 */
export default function TopicBody({ topic }: { topic: Question }) {
  return (
    <div className="px-5 py-7 sm:px-8 lg:px-12 lg:py-8">
      <MarkdownContent className="text-[1.0625rem] leading-[1.75]">{topic.body}</MarkdownContent>
      <Clarifications topic={topic} />
    </div>
  );
}

function Clarifications({ topic }: { topic: Question }) {
  const { t } = useTranslation('forum');
  const { user, canModerate } = useAuth();
  const memberAction = useMemberAction();
  const comments = useComments('QUESTION', topic.id);
  const create = useCreateComment('QUESTION', topic.id);
  const update = useUpdateComment('QUESTION', topic.id);
  const remove = useDeleteComment('QUESTION', topic.id);
  const [writing, setWriting] = useState<string | null>(null);
  const list = comments.data?.content ?? [];
  const open = topic.status === 'OPEN';

  return (
    <section aria-labelledby="clarifications-title" className={cn('mt-8', list.length > 0 && 'border-t border-border-subtle pt-5')}>
      {list.length > 0 && (
        <>
          <h2 id="clarifications-title" className="eyebrow">
            {t('clarify.title', { count: list.length })}
          </h2>
          <ol className="mt-2">
            {list.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                topicSlug={topic.slug}
                topicAuthorId={topic.author.id}
                own={comment.author.id === user?.id}
                removable={comment.author.id === user?.id || canModerate}
                onUpdate={(body) => update.mutateAsync({ commentId: comment.id, body })}
                onDelete={() => remove.mutateAsync(comment.id)}
                onReply={open ? () => setWriting(comment.author.username === user?.username ? '' : `@${comment.author.username} `) : undefined}
              />
            ))}
          </ol>
        </>
      )}
      {list.length === 0 && (
        <h2 id="clarifications-title" className="sr-only">
          {t('clarify.title', { count: 0 })}
        </h2>
      )}

      {writing !== null ? (
        <div className="mt-2">
          <CommentForm
            key={writing}
            initial={writing}
            onSubmit={async (body) => {
              await create.mutateAsync(body);
              setWriting(null);
            }}
            onCancel={() => setWriting(null)}
            submitLabel={t('clarify.submit')}
            placeholder={t('clarify.placeholder')}
            label={t('clarify.label')}
          />
        </div>
      ) : (
        open && (
          <button
            type="button"
            onClick={() => memberAction('comment', () => setWriting(''))}
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] font-semibold text-muted-foreground transition-colors outline-none hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <MessageCircleQuestion aria-hidden className="size-4" />
            {t('clarify.ask')}
          </button>
        )
      )}
    </section>
  );
}
