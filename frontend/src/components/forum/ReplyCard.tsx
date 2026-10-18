import { ChevronDown, CircleCheck, CircleSlash, MessageSquareReply } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { wasEdited } from './forumUtils';
import { AuthorBadge, CommentForm, CommentItem, ItemMenu } from './ReplyComments';
import VoteControl from './VoteControl';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import HiddenNotice from '@/components/shared/HiddenNotice';
import MarkdownContent from '@/components/shared/MarkdownContent';
import MarkdownEditor from '@/components/shared/MarkdownEditor';
import UserAvatar from '@/components/shared/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useMemberAction } from '@/hooks/useMemberAction';
import {
  useAcceptAnswer,
  useCreateAnswerComment,
  useDeleteAnswer,
  useDeleteAnswerComment,
  useForumVote,
  useUpdateAnswer,
  useUpdateAnswerComment,
} from '@/hooks/useQuestions';
import { isApple } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Answer, Question } from '@/types/question.types';
import { getApiErrorMessage } from '@/utils/apiError';
import { countryFlag, formatDate, formatRelativeTime } from '@/utils/formatters';
import { answerSchema } from '@/utils/validators';

// Au-delà, le fil de commentaires s'ouvre replié sur ses premiers
const THREAD_PREVIEW = 3;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

const actionClass = cn(
  'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground',
  focusRing,
);

interface ReplyCardProps {
  answer: Answer;
  topic: Question;
  /** Arrivée par son lien (#answer-12), ou tout juste publiée : elle s'éclaire un instant */
  highlighted: boolean;
}

/**
 * Une réponse, comme un commentaire de dev.to : l'avatar, puis une bulle avec l'auteur (« Auteur » si c'est celui
 * du sujet), la date (un lien vers la réponse) et le texte en Markdown. Dessous, le vote, « Répondre » et, pour
 * l'auteur du sujet, « Accepter comme solution ». La réponse acceptée est cerclée de vert. Puis son fil de
 * commentaires, avec un fil vertical qui le replie au clic.
 */
export default function ReplyCard({ answer, topic, highlighted }: ReplyCardProps) {
  const { t } = useTranslation('forum');
  const { user, canModerate } = useAuth();
  const memberAction = useMemberAction();
  const vote = useForumVote(topic);
  const accept = useAcceptAnswer(topic);
  const update = useUpdateAnswer(topic);
  const remove = useDeleteAnswer(topic);
  const createComment = useCreateAnswerComment(topic);
  const updateComment = useUpdateAnswerComment(topic);
  const deleteComment = useDeleteAnswerComment(topic);

  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Le formulaire de commentaire, et le texte de départ (« @nom » pour répondre à quelqu'un)
  const [reply, setReply] = useState<string | null>(null);
  const comments = answer.comments ?? [];
  const [expanded, setExpanded] = useState(comments.length <= THREAD_PREVIEW);
  const [collapsed, setCollapsed] = useState(false);

  const author = answer.author;
  const own = author.id === user?.id;
  const asker = topic.author.id === user?.id;
  const open = topic.status === 'OPEN';
  const anchor = `answer-${answer.id}`;
  const shown = expanded ? comments : comments.slice(0, THREAD_PREVIEW);

  function startReply(mention?: string) {
    memberAction(
      'comment',
      () => {
        setCollapsed(false);
        setExpanded(true);
        setReply(mention && mention !== user?.username ? `@${mention} ` : '');
      },
      `#${anchor}`,
    );
  }

  function toggleAccepted() {
    accept.mutate(
      { answerId: answer.id, accept: !answer.accepted },
      { onSuccess: (result) => toast.success(t(result.accepted ? 'answers.acceptedToast' : 'answers.unacceptedToast')) },
    );
  }

  return (
    <li id={anchor} className="scroll-mt-28">
      <article aria-labelledby={`${anchor}-author`} className="flex gap-2.5 sm:gap-3">
        <Link to={paths.profile(author.username)} viewTransition tabIndex={-1} aria-hidden className="mt-1 shrink-0 rounded-full">
          <UserAvatar user={author} size="md" />
        </Link>

        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'rounded-2xl border p-3.5 transition-[border-color,background-color,box-shadow] duration-700 sm:p-4',
              answer.accepted ? 'border-jade/40 bg-jade/[0.045]' : 'border-border bg-surface/70',
              highlighted && 'answer-flash',
            )}
          >
            {answer.hidden && <HiddenNotice kind="ANSWER" reason={answer.hiddenReason} className="mb-3" />}
            {answer.accepted && (
              <p className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-jade/12 px-2.5 py-0.5 text-xs font-bold text-jade">
                <CircleCheck aria-hidden className="size-3.5" />
                {t('answers.acceptedBy', { name: topic.author.fullName })}
              </p>
            )}
            <div className="flex min-w-0 items-center gap-1.5 text-[0.8125rem]">
              <Link
                id={`${anchor}-author`}
                to={paths.profile(author.username)}
                viewTransition
                dir="auto"
                className={cn('truncate rounded-sm font-semibold text-foreground hover:underline', focusRing)}
              >
                {author.fullName}
              </Link>
              {author.country && <span className="shrink-0 text-xs leading-none">{countryFlag(author.country)}</span>}
              {author.id === topic.author.id && <AuthorBadge />}
              <span aria-hidden className="text-faint-foreground">
                ·
              </span>
              <a href={`#${anchor}`} className={cn('shrink-0 rounded-sm text-muted-foreground hover:underline', focusRing)}>
                <time dateTime={answer.createdAt} title={formatDate(answer.createdAt)}>
                  {formatRelativeTime(answer.createdAt)}
                </time>
              </a>
              {wasEdited(answer) && <span className="shrink-0 text-xs text-faint-foreground">· {t('comment.edited')}</span>}
              <ItemMenu
                label={t('answers.menu')}
                className="ms-auto"
                permalink={`${window.location.origin}${paths.topic(topic.slug)}#${anchor}`}
                onEdit={own || canModerate ? () => setEditing(true) : undefined}
                onDelete={own || canModerate ? () => setConfirming(true) : undefined}
                extra={
                  asker && (
                    <DropdownMenu.Item
                      onSelect={toggleAccepted}
                      className="flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-soft-foreground outline-none select-none focus:bg-accent focus:text-foreground"
                    >
                      {answer.accepted ? <CircleSlash aria-hidden className="size-4 text-muted-foreground" /> : <CircleCheck aria-hidden className="size-4 text-jade" />}
                      {t(answer.accepted ? 'answers.unaccept' : 'answers.accept')}
                    </DropdownMenu.Item>
                  )
                }
              />
            </div>

            {editing ? (
              <AnswerEditor
                initial={answer.body}
                onCancel={() => setEditing(false)}
                onSave={async (body) => {
                  await update.mutateAsync({ answerId: answer.id, body });
                  setEditing(false);
                  toast.success(t('answers.updated'));
                }}
              />
            ) : (
              <MarkdownContent size="sm" className="mt-2 text-[0.9375rem]">
                {answer.body}
              </MarkdownContent>
            )}
          </div>

          {/* ── Agir sur la réponse ── (masquée par l'équipe, elle ne se vote ni ne se commente plus) */}
          {!answer.hidden && (
            <div className="mt-1 flex flex-wrap items-center gap-0.5">
              <VoteControl
                score={answer.score}
                vote={answer.currentUserVote}
                own={own}
                onVote={(value) => vote.mutate({ targetType: 'ANSWER', targetId: answer.id, value })}
                orientation="horizontal"
                target="answer"
              />
              {/* Un sujet fermé n'accepte plus rien de nouveau : ni réponse, ni commentaire */}
              {open && (
                <button type="button" onClick={() => startReply()} className={actionClass}>
                  <MessageSquareReply aria-hidden className="size-4" />
                  {t('answers.reply')}
                </button>
              )}
              {asker && (
                <button
                  type="button"
                  onClick={toggleAccepted}
                  disabled={accept.isPending}
                  aria-pressed={answer.accepted}
                  className={cn(actionClass, answer.accepted ? 'text-jade hover:text-jade' : 'hover:text-jade')}
                >
                  <CircleCheck aria-hidden className={cn('size-4', answer.accepted && 'fill-jade/15')} />
                  {t(answer.accepted ? 'answers.acceptedShort' : 'answers.accept')}
                </button>
              )}
            </div>
          )}

          {/* ── Son fil de commentaires ── */}
          {(comments.length > 0 || reply !== null) && (
            <div className="relative mt-1 ps-5 sm:ps-6">
              {/* Le fil vertical : un clic replie la discussion, comme sur dev.to */}
              <button
                type="button"
                onClick={() => setCollapsed((value) => !value)}
                aria-expanded={!collapsed}
                aria-label={t(collapsed ? 'thread.expand' : 'thread.collapse', { count: comments.length })}
                title={t(collapsed ? 'thread.expand' : 'thread.collapse', { count: comments.length })}
                className={cn('group/thread absolute inset-y-0 start-0 flex w-5 justify-center rounded-md sm:w-6', focusRing)}
              >
                <span aria-hidden className="h-full w-0.5 rounded-full bg-border-strong transition-colors group-hover/thread:bg-gold" />
              </button>

              {collapsed ? (
                <button type="button" onClick={() => setCollapsed(false)} className={cn(actionClass, 'my-1')}>
                  <ChevronDown aria-hidden className="size-4 rtl:-scale-x-100" />
                  {t('thread.show', { count: comments.length })}
                </button>
              ) : (
                <>
                  <ol>
                    {shown.map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        topicSlug={topic.slug}
                        topicAuthorId={topic.author.id}
                        own={comment.author.id === user?.id}
                        removable={comment.author.id === user?.id || canModerate}
                        onUpdate={(body) => updateComment.mutateAsync({ answerId: answer.id, commentId: comment.id, body })}
                        onDelete={() => deleteComment.mutateAsync({ answerId: answer.id, commentId: comment.id })}
                        onReply={open ? () => startReply(comment.author.username) : undefined}
                      />
                    ))}
                  </ol>
                  {!expanded && (
                    <button type="button" onClick={() => setExpanded(true)} className={cn(actionClass, 'my-1')}>
                      <ChevronDown aria-hidden className="size-4" />
                      {t('thread.more', { count: comments.length - THREAD_PREVIEW })}
                    </button>
                  )}
                  {reply !== null && (
                    <div className="py-2">
                      <CommentForm
                        key={reply}
                        initial={reply}
                        onSubmit={async (body) => {
                          await createComment.mutateAsync({ answerId: answer.id, body });
                          setReply(null);
                        }}
                        onCancel={() => setReply(null)}
                        submitLabel={t('comment.submit')}
                        placeholder={t('comment.placeholder')}
                        label={t('comment.label', { name: author.fullName })}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </article>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('answers.deleteTitle')}
        description={answer.accepted ? t('answers.deleteAcceptedText') : t('answers.deleteText')}
        confirmLabel={t('menu.delete')}
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(answer.id, {
            onSuccess: () => {
              setConfirming(false);
              toast.success(t('answers.deleted'));
            },
          })
        }
      />
    </li>
  );
}

/** Modifier une réponse sur place : l'éditeur complet, avec son texte. Échap abandonne. */
function AnswerEditor({ initial, onSave, onCancel }: { initial: string; onSave: (body: string) => Promise<void>; onCancel: () => void }) {
  const { t } = useTranslation('forum');
  const [body, setBody] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const images = useImageUpload();

  async function save() {
    if (images.pending > 0) {
      toast(t('form.imagesPending'));
      return;
    }
    const parsed = answerSchema.safeParse({ body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? null);
      return;
    }
    setPending(true);
    try {
      await onSave(parsed.data.body);
    } catch (failure) {
      setError(getApiErrorMessage(failure));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <MarkdownEditor
        value={body}
        onChange={(value) => {
          setBody(value);
          setError(null);
        }}
        label={t('answers.editLabel')}
        minRows={4}
        maxLength={30000}
        onSubmit={() => void save()}
        onCancel={onCancel}
        onUploadImage={images.upload}
        invalid={error !== null}
        autoFocus
        hint={t('form.submitHint', { mod: isApple ? '⌘' : 'Ctrl' })}
      />
      {error && (
        <p role="alert" className="text-sm text-coral">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={cn('h-9 rounded-xl px-3.5 text-sm font-semibold text-soft-foreground hover:bg-foreground/6', focusRing)}>
          {t('form.cancel')}
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={pending || images.pending > 0 || body.trim() === initial.trim()}
          className={cn('h-9 min-w-24 rounded-xl bg-foreground px-4 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50', focusRing)}
        >
          {t('form.save')}
        </button>
      </div>
    </div>
  );
}
