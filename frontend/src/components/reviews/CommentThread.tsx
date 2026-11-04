import { CornerDownRight, Lightbulb, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { MAX_REVIEW_TEXT, STATE_BADGES } from '@/components/reviews/reviewVisuals';
import SuggestionBlock from '@/components/reviews/SuggestionBlock';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import MarkdownContent from '@/components/shared/MarkdownContent';
import MarkdownEditor, { type MarkdownEditorHandle } from '@/components/shared/MarkdownEditor';
import UserAvatar from '@/components/shared/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useAddReviewComment, useDeleteReviewComment, useUpdateReviewComment } from '@/hooks/usePullRequest';
import { isApple } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { PullRequestDetail, ReviewComment } from '@/types/review.types';
import { getApiErrorMessage } from '@/utils/apiError';
import { formatDate, formatRelativeTime } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';
// Modifié plus d'une minute après sa publication : « modifié »
const EDIT_GRACE_MS = 60_000;

interface CommentThreadProps {
  detail: PullRequestDetail;
  /** Les commentaires de la ligne, les plus anciens d'abord */
  comments: ReviewComment[];
  path: string;
  line: number;
  /** La ligne commentée telle qu'elle est dans la PR, pour montrer une suggestion en regard */
  original: string | null;
  language: string | null;
  className?: string;
}

/**
 * La discussion sur une ligne du diff. Design 3C (Chinedu propose une suggestion ligne 24, Ama répond, Wanjiru
 * ajoute un conseil de Nairobi).
 *
 * Chaque commentaire avec son auteur, son rôle dans la PR, sa suggestion de code ; dessous, « Répondre » ouvre un
 * champ. Qui ne peut pas commenter la PR lit sans répondre.
 */
export default function CommentThread({ detail, comments, path, line, original, language, className }: CommentThreadProps) {
  const { t } = useTranslation('reviews');
  const [replying, setReplying] = useState(false);
  const { pullRequest } = detail;
  const add = useAddReviewComment(pullRequest.project.slug, pullRequest.number);

  return (
    <div className={cn('rounded-2xl border border-border bg-surface shadow-[0_18px_40px_-34px_var(--kente-night)]', className)}>
      <ol className="divide-y divide-border-subtle">
        {comments.map((comment) => (
          <li key={comment.id} className="px-4 py-3.5">
            <ReviewCommentItem detail={detail} comment={comment} original={original} language={language} />
          </li>
        ))}
      </ol>
      {detail.viewer.canComment && (
        <div className="border-t border-border-subtle bg-foreground/[0.02] px-4 py-3">
          {replying ? (
            <ReviewCommentForm
              suggestable
              original={original}
              submitLabel={t('thread.reply')}
              placeholder={t('thread.replyPlaceholder')}
              label={t('thread.replyLabel', { path, line })}
              onCancel={() => setReplying(false)}
              onSubmit={async ({ body, suggestion }) => {
                await add.mutateAsync({ body, path, line, suggestion: suggestion ?? undefined });
                setReplying(false);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setReplying(true)}
              className={cn(
                'flex h-9 w-full items-center gap-2 rounded-xl border border-border bg-surface/70 px-3 text-start text-[0.8125rem] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground',
                focusRing,
              )}
            >
              <CornerDownRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
              {t('thread.replyPlaceholder')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface ReviewCommentItemProps {
  detail: PullRequestDetail;
  comment: ReviewComment;
  original?: string | null;
  language?: string | null;
  /** Au-dessus du texte : la ligne visée, dans la conversation */
  context?: ReactNode;
  /** Dans la conversation, l'avatar est déjà sur le fil, à côté */
  hideAvatar?: boolean;
}

/**
 * Un commentaire de revue : l'avatar, le nom et son rôle dans la PR (auteur, relecteur requis, communauté), la
 * date ; le texte en Markdown, et la suggestion de code. Son auteur peut le modifier ou le supprimer (une revue
 * rendue ne se supprime pas : son verdict compte pour la fusion).
 */
export function ReviewCommentItem({ detail, comment, original = null, language = null, context, hideAvatar = false }: ReviewCommentItemProps) {
  const { t } = useTranslation('reviews');
  const { user } = useAuth();
  const { pullRequest } = detail;
  const update = useUpdateReviewComment(pullRequest.project.slug, pullRequest.number);
  const remove = useDeleteReviewComment(pullRequest.project.slug, pullRequest.number);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const own = user?.id === comment.author.id;
  const edited = Date.parse(comment.updatedAt) - Date.parse(comment.createdAt) > EDIT_GRACE_MS;

  return (
    <article className="flex gap-3">
      {!hideAvatar && (
        <Link to={paths.profile(comment.author.username)} viewTransition tabIndex={-1} aria-hidden className="mt-0.5 shrink-0 rounded-full">
          <UserAvatar user={comment.author} size="sm" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <header className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
          <Link
            to={paths.profile(comment.author.username)}
            viewTransition
            dir="auto"
            className={cn('truncate rounded-sm font-bold text-foreground hover:underline', focusRing)}
          >
            {comment.author.fullName}
          </Link>
          <RoleBadge detail={detail} authorId={comment.author.id} />
          <span aria-hidden className="text-faint-foreground">
            ·
          </span>
          <time dateTime={comment.createdAt} title={formatDate(comment.createdAt)} className="text-muted-foreground">
            {formatRelativeTime(comment.createdAt)}
          </time>
          {edited && <span className="text-faint-foreground">· {t('thread.edited')}</span>}
          {own && !editing && (
            <CommentMenu
              onEdit={() => setEditing(true)}
              // Une revue rendue reste : on peut effacer son message, pas son verdict
              onDelete={comment.verdict === null ? () => setConfirming(true) : undefined}
            />
          )}
        </header>
        {context}
        {editing ? (
          <div className="mt-2">
            <ReviewCommentForm
              initialBody={comment.body ?? ''}
              initialSuggestion={comment.suggestion}
              suggestable={comment.line !== null}
              optional={comment.verdict !== null}
              original={original}
              submitLabel={t('thread.save')}
              placeholder={t('thread.placeholder')}
              label={t('thread.editLabel')}
              onCancel={() => setEditing(false)}
              onSubmit={async ({ body, suggestion }) => {
                await update.mutateAsync({ id: comment.id, update: { body, suggestion } });
                setEditing(false);
              }}
            />
          </div>
        ) : (
          <>
            {comment.body && (
              <MarkdownContent size="sm" className="mt-1 text-[0.875rem]">
                {comment.body}
              </MarkdownContent>
            )}
            {comment.suggestion !== null && (
              <SuggestionBlock suggestion={comment.suggestion} original={original} language={language} className="mt-2.5" />
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('thread.deleteTitle')}
        description={t('thread.deleteText')}
        confirmLabel={t('thread.delete')}
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(comment.id, {
            onSuccess: () => {
              setConfirming(false);
              toast.success(t('thread.deleted'));
            },
          })
        }
      />
    </article>
  );
}

/** Le rôle de quelqu'un dans la PR : son auteur, un relecteur requis, un relecteur de la communauté */
function RoleBadge({ detail, authorId }: { detail: PullRequestDetail; authorId: number }) {
  const { t } = useTranslation('reviews');
  const { pullRequest } = detail;
  const reviewer = pullRequest.reviewers.find((candidate) => candidate.user.id === authorId);
  const badge = (() => {
    if (pullRequest.author?.id === authorId) {
      return { label: t('thread.roles.author'), tone: 'bg-gold/14 text-gold' };
    }
    if (reviewer?.community) {
      return { label: t('thread.roles.community'), tone: 'bg-jade/12 text-jade' };
    }
    if (reviewer?.required) {
      return { label: t('thread.roles.required'), tone: 'bg-foreground/7 text-soft-foreground' };
    }
    return reviewer ? { label: t('thread.roles.reviewer'), tone: 'bg-foreground/7 text-soft-foreground' } : null;
  })();
  if (!badge) {
    return null;
  }
  return <span className={cn('shrink-0 rounded-md px-1.5 py-px text-[0.625rem] font-bold tracking-wide uppercase', badge.tone)}>{badge.label}</span>;
}

/** Le menu « … » de son commentaire : le modifier, le supprimer */
function CommentMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete?: () => void }) {
  const { t } = useTranslation('reviews');
  const itemClass =
    'flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-soft-foreground outline-none select-none focus:bg-accent focus:text-foreground';
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t('thread.menu')}
        className={cn(
          'ms-auto grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/7 hover:text-foreground data-[state=open]:bg-foreground/7',
          focusRing,
        )}
      >
        <MoreHorizontal aria-hidden className="size-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-48 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-float outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Item className={itemClass} onSelect={onEdit}>
            <Pencil aria-hidden className="size-4 text-muted-foreground" />
            {t('thread.edit')}
          </DropdownMenu.Item>
          {onDelete && (
            <>
              <DropdownMenu.Separator className="mx-1 my-1 h-px bg-border-subtle" />
              <DropdownMenu.Item className={cn(itemClass, 'text-coral focus:text-coral')} onSelect={onDelete}>
                <Trash2 aria-hidden className="size-4" />
                {t('thread.delete')}
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Le verdict d'une revue rendue, en pastille : « a approuvé » */
export function VerdictBadge({ verdict }: { verdict: NonNullable<ReviewComment['verdict']> }) {
  const { t } = useTranslation('reviews');
  const { icon: Icon, tone } = STATE_BADGES[verdict];
  return (
    <span aria-hidden className={cn('grid size-7 shrink-0 place-items-center rounded-full ring-4 ring-background', tone)}>
      <Icon className="size-3.5" strokeWidth={2.75} />
      <span className="sr-only">{t(`state.${verdict}`)}</span>
    </span>
  );
}

interface ReviewCommentFormProps {
  initialBody?: string;
  initialSuggestion?: string | null;
  /** Un commentaire de ligne peut proposer du code à la place de la ligne */
  suggestable?: boolean;
  /** Le texte peut rester vide : le message d'une revue rendue */
  optional?: boolean;
  /** La ligne visée : le point de départ d'une suggestion */
  original?: string | null;
  submitLabel: string;
  placeholder: string;
  label: string;
  onSubmit: (value: { body: string; suggestion: string | null }) => Promise<unknown>;
  onCancel: () => void;
  autoFocus?: boolean;
}

/**
 * Écrire ou modifier un commentaire de revue : un éditeur sans barre d'outils (le Markdown marche, l'aperçu aussi),
 * et pour une ligne du diff, « Suggérer du code » qui part de la ligne telle qu'elle est. Ctrl + Entrée pour publier,
 * Échap pour abandonner. L'erreur de l'API s'affiche sous le champ ; le texte reste.
 */
export function ReviewCommentForm({
  initialBody = '',
  initialSuggestion = null,
  suggestable = false,
  optional = false,
  original = null,
  submitLabel,
  placeholder,
  label,
  onSubmit,
  onCancel,
  autoFocus = true,
}: ReviewCommentFormProps) {
  const { t } = useTranslation('reviews');
  const errorId = useId();
  const suggestionId = useId();
  const editor = useRef<MarkdownEditorHandle>(null);
  const [body, setBody] = useState(initialBody);
  const [suggestion, setSuggestion] = useState<string | null>(initialSuggestion);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (pending) {
      return;
    }
    const text = body.trim();
    if (!text && !optional) {
      setError(t(suggestion !== null ? 'thread.explainSuggestion' : 'thread.empty'));
      editor.current?.focus();
      return;
    }
    setError(null);
    setPending(true);
    try {
      await onSubmit({ body: text, suggestion });
    } catch (failure) {
      setError(getApiErrorMessage(failure));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-2">
      <MarkdownEditor
        ref={editor}
        variant="compact"
        value={body}
        onChange={(value) => {
          setBody(value);
          if (error) {
            setError(null);
          }
        }}
        label={label}
        placeholder={placeholder}
        minRows={2}
        maxLength={MAX_REVIEW_TEXT}
        onSubmit={() => void submit()}
        onCancel={onCancel}
        invalid={error !== null}
        describedBy={error ? errorId : undefined}
        autoFocus={autoFocus}
        hint={t('thread.hint', { mod: isApple ? '⌘' : 'Ctrl' })}
      />
      {suggestable && suggestion !== null && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={suggestionId} className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] font-semibold tracking-[0.08em] text-gold uppercase">
            <Lightbulb aria-hidden className="size-3.5" />
            {t('suggestion.title')}
          </label>
          <textarea
            id={suggestionId}
            dir="ltr"
            value={suggestion}
            onChange={(event) => setSuggestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void submit();
              }
            }}
            spellCheck={false}
            rows={Math.min(8, Math.max(2, suggestion.split('\n').length + 1))}
            maxLength={MAX_REVIEW_TEXT}
            className={cn(
              'w-full resize-y rounded-xl border border-gold/30 bg-code px-3 py-2 font-mono text-[0.78rem] leading-[1.35rem] text-foreground [tab-size:4]',
              focusRing,
            )}
          />
        </div>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-coral">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {suggestable && (
          <button
            type="button"
            aria-pressed={suggestion !== null}
            onClick={() => setSuggestion((current) => (current === null ? (original ?? '') : null))}
            className={cn(
              'me-auto inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold transition-colors',
              suggestion !== null ? 'bg-gold/12 text-gold' : 'text-soft-foreground hover:bg-foreground/6 hover:text-foreground',
              focusRing,
            )}
          >
            <Lightbulb aria-hidden className="size-3.5" />
            {suggestion !== null ? t('thread.removeSuggestion') : t('thread.addSuggestion')}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className={cn('h-9 rounded-xl px-3.5 text-sm font-semibold text-soft-foreground transition-colors hover:bg-foreground/6 hover:text-foreground', focusRing)}
        >
          {t('thread.cancel')}
        </button>
        <button
          type="submit"
          disabled={pending}
          className={cn(
            'inline-flex h-9 min-w-24 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-60',
            focusRing,
            'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          {pending ? <PulsatingDots size="sm" tone="current" /> : submitLabel}
        </button>
      </div>
    </form>
  );
}
