import { CornerDownRight, Link2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MAX_COMMENT, wasEdited } from './forumUtils';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import MarkdownContent from '@/components/shared/MarkdownContent';
import MarkdownEditor, { type MarkdownEditorHandle } from '@/components/shared/MarkdownEditor';
import UserAvatar from '@/components/shared/UserAvatar';
import { useImageUpload } from '@/hooks/useImageUpload';
import { copyText } from '@/lib/clipboard';
import { isApple } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Comment } from '@/types/interaction.types';
import { getApiErrorMessage } from '@/utils/apiError';
import { formatDate, formatRelativeTime } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

interface CommentFormProps {
  /** Le texte de départ : la modification d'un commentaire, ou « @nom » pour répondre à quelqu'un */
  initial?: string;
  onSubmit: (body: string) => Promise<unknown>;
  onCancel: () => void;
  submitLabel: string;
  placeholder: string;
  label: string;
}

/**
 * Écrire ou modifier un commentaire : un éditeur sans barre d'outils (le Markdown marche, l'aperçu aussi), Ctrl +
 * Entrée pour publier, Échap pour abandonner. L'erreur de l'API s'affiche sous le champ ; le texte reste.
 */
export function CommentForm({ initial = '', onSubmit, onCancel, submitLabel, placeholder, label }: CommentFormProps) {
  const { t } = useTranslation('forum');
  const errorId = useId();
  const [body, setBody] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const editor = useRef<MarkdownEditorHandle>(null);
  const images = useImageUpload();

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = body.trim();
    if (pending) {
      return;
    }
    if (images.pending > 0) {
      toast(t('form.imagesPending'));
      return;
    }
    if (!text) {
      setError(t('form.commentEmpty'));
      editor.current?.focus();
      return;
    }
    setError(null);
    setPending(true);
    try {
      await onSubmit(text);
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
        maxLength={MAX_COMMENT}
        onSubmit={() => void submit()}
        onCancel={onCancel}
        onUploadImage={images.upload}
        invalid={error !== null}
        describedBy={error ? errorId : undefined}
        autoFocus
        hint={t('form.submitHint', { mod: isApple ? '⌘' : 'Ctrl' })}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-coral">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={cn('h-9 rounded-xl px-3.5 text-sm font-semibold text-soft-foreground transition-colors hover:bg-foreground/6 hover:text-foreground', focusRing)}
        >
          {t('form.cancel')}
        </button>
        <button
          type="submit"
          disabled={pending || images.pending > 0}
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

interface CommentItemProps {
  comment: Comment;
  /** L'ancre du commentaire (« comment-12 ») et l'adresse de la page, pour « Copier le lien » */
  topicSlug: string;
  /** Le membre connecté l'a écrit : il peut le modifier */
  own: boolean;
  /** Il peut le supprimer : son auteur, ou un modérateur */
  removable: boolean;
  /** L'auteur du sujet : son nom porte « Auteur » */
  topicAuthorId: number;
  onUpdate: (body: string) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  /** Répondre à ce commentaire (« @nom ») ; absent quand on ne peut pas répondre (sujet fermé) */
  onReply?: () => void;
}

/**
 * Un commentaire : l'avatar, le nom, la date (un lien vers le commentaire), son texte en Markdown, et selon qui
 * regarde : répondre, modifier, supprimer, copier le lien.
 */
export function CommentItem({ comment, topicSlug, own, removable, topicAuthorId, onUpdate, onDelete, onReply }: CommentItemProps) {
  const { t } = useTranslation('forum');
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const anchor = `comment-${comment.id}`;
  const author = comment.author;

  async function remove() {
    setDeleting(true);
    try {
      await onDelete();
      setConfirming(false);
      toast.success(t('comment.deleted'));
    } catch {
      // L'erreur de l'API s'affiche déjà (lib/queryClient.ts) : la fenêtre reste, on peut réessayer
    } finally {
      setDeleting(false);
    }
  }

  return (
    <li id={anchor} className="flex scroll-mt-28 gap-2.5 py-1.5 target:[&>div>div]:ring-2 target:[&>div>div]:ring-gold/50">
      <Link to={paths.profile(author.username)} viewTransition tabIndex={-1} aria-hidden className="mt-1 shrink-0 rounded-full">
        <UserAvatar user={author} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-foreground/[0.035] px-3.5 py-2.5 transition-shadow">
          <div className="flex min-w-0 items-center gap-1.5 text-xs">
            <Link
              to={paths.profile(author.username)}
              viewTransition
              dir="auto"
              className={cn('truncate rounded-sm font-semibold text-foreground hover:underline', focusRing)}
            >
              {author.fullName}
            </Link>
            {author.id === topicAuthorId && <AuthorBadge />}
            <span aria-hidden className="text-faint-foreground">
              ·
            </span>
            <a href={`#${anchor}`} className={cn('shrink-0 rounded-sm text-muted-foreground hover:underline', focusRing)}>
              <time dateTime={comment.createdAt} title={formatDate(comment.createdAt)}>
                {formatRelativeTime(comment.createdAt)}
              </time>
            </a>
            {wasEdited(comment) && <span className="shrink-0 text-faint-foreground">· {t('comment.edited')}</span>}
            <ItemMenu
              label={t('comment.menu')}
              className="ms-auto"
              permalink={`${window.location.origin}${paths.topic(topicSlug)}#${anchor}`}
              onEdit={own ? () => setEditing(true) : undefined}
              onDelete={removable ? () => setConfirming(true) : undefined}
            />
          </div>
          {editing ? (
            <div className="mt-2">
              <CommentForm
                initial={comment.body}
                onSubmit={async (body) => {
                  await onUpdate(body);
                  setEditing(false);
                }}
                onCancel={() => setEditing(false)}
                submitLabel={t('form.save')}
                placeholder={t('comment.placeholder')}
                label={t('comment.editLabel')}
              />
            </div>
          ) : (
            <MarkdownContent size="sm" className="mt-1 text-[0.875rem]">
              {comment.body}
            </MarkdownContent>
          )}
        </div>
        {onReply && !editing && (
          <button
            type="button"
            onClick={onReply}
            className={cn('mt-0.5 ms-1 inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground', focusRing)}
          >
            <CornerDownRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
            {t('comment.reply')}
          </button>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('comment.deleteTitle')}
        description={t('comment.deleteText')}
        confirmLabel={t('comment.delete')}
        destructive
        pending={deleting}
        onConfirm={() => void remove()}
      />
    </li>
  );
}

/** « Auteur » : le nom de l'auteur du sujet, dans les réponses et les commentaires, comme sur dev.to. */
export function AuthorBadge() {
  const { t } = useTranslation('forum');
  return <span className="shrink-0 rounded-md bg-gold/14 px-1.5 py-px text-[0.625rem] font-bold tracking-wide text-gold uppercase">{t('comment.author')}</span>;
}

interface ItemMenuProps {
  label: string;
  permalink: string;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Avant la suppression : une raison de ne pas pouvoir supprimer (le bouton reste visible, grisé) */
  deleteBlocked?: string;
  extra?: ReactNode;
  className?: string;
}

/** Le menu « … » d'une réponse ou d'un commentaire : copier le lien, et pour son auteur, modifier ou supprimer. */
export function ItemMenu({ label, permalink, onEdit, onDelete, deleteBlocked, extra, className }: ItemMenuProps) {
  const { t } = useTranslation('forum');
  const itemClass =
    'flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-soft-foreground outline-none select-none focus:bg-accent focus:text-foreground data-disabled:cursor-not-allowed data-disabled:opacity-50';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={label}
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/7 hover:text-foreground data-[state=open]:bg-foreground/7',
          focusRing,
          className,
        )}
      >
        <MoreHorizontal aria-hidden className="size-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-float outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Item
            className={itemClass}
            onSelect={() => void copyText(permalink).then((copied) => (copied ? toast.success(t('share.copied')) : toast.error(t('share.copyFailed'))))}
          >
            <Link2 aria-hidden className="size-4 text-muted-foreground" />
            {t('share.copy')}
          </DropdownMenu.Item>
          {extra}
          {onEdit && (
            <DropdownMenu.Item className={itemClass} onSelect={onEdit}>
              <Pencil aria-hidden className="size-4 text-muted-foreground" />
              {t('menu.edit')}
            </DropdownMenu.Item>
          )}
          {onDelete && (
            <>
              <DropdownMenu.Separator className="mx-1 my-1 h-px bg-border-subtle" />
              <DropdownMenu.Item
                className={cn(itemClass, 'text-coral focus:text-coral')}
                disabled={deleteBlocked !== undefined}
                onSelect={onDelete}
              >
                <Trash2 aria-hidden className="size-4" />
                <span className="min-w-0">
                  <span className="block">{t('menu.delete')}</span>
                  {deleteBlocked && <span className="block text-xs text-muted-foreground">{deleteBlocked}</span>}
                </span>
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
