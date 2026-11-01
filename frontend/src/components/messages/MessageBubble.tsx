import { AlertCircle, Ban, Check, CheckCheck, Clock3, Copy, Ellipsis, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import { m } from 'motion/react';
import { DropdownMenu } from 'radix-ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { emojiOnlyCount, formatClock } from './chatFormat';
import MessageText from './MessageText';
import { copyText } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import type { ThreadMessage } from '@/types/message.types';
import { formatDateTime } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

interface MessageBubbleProps {
  message: ThreadMessage;
  mine: boolean;
  /** Le nom de l'auteur, lu par les lecteurs d'écran (« Toi » pour ses propres messages) */
  author: string;
  /** Premier, dernier message d'une suite du même auteur : les coins se resserrent entre eux */
  groupStart: boolean;
  groupEnd: boolean;
  /** L'autre membre l'a lu */
  seen: boolean;
  /** Arrivé pendant qu'on regarde : il entre en glissant */
  fresh: boolean;
  /** Le message est en cours de modification dans le champ du bas */
  editing: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onRetry?: () => void;
  onDiscard?: () => void;
}

/**
 * Une bulle du fil. Les siennes à droite (à gauche en arabe), en or ; celles de l'autre en face. L'heure, « modifié »
 * et l'état d'envoi (horloge, envoyé, vu) se logent dans le coin de la bulle, sur la dernière ligne. Que des émojis :
 * en grand, sans bulle. Le menu (copier, modifier, supprimer) apparaît au survol, au focus, ou toujours au doigt.
 */
export default function MessageBubble({
  message,
  mine,
  author,
  groupStart,
  groupEnd,
  seen,
  fresh,
  editing,
  onEdit,
  onDelete,
  onRetry,
  onDiscard,
}: MessageBubbleProps) {
  const { t } = useTranslation('messages');
  const pending = message.status === 'sending';
  const failed = message.status === 'failed';
  const emojis = message.deleted ? 0 : emojiOnlyCount(message.body);

  const meta = (
    <>
      {message.editedAt && !message.deleted && <span>{t('message.edited')}</span>}
      <time dateTime={message.createdAt} title={formatDateTime(message.createdAt)}>
        {formatClock(message.createdAt)}
      </time>
      {mine && !message.deleted && <Receipt pending={pending} failed={failed} seen={seen} />}
    </>
  );

  // Les coins qui se touchent dans une suite du même auteur se resserrent
  const corners = mine
    ? cn(!groupStart && 'rounded-se-md', !groupEnd && 'rounded-ee-md')
    : cn(!groupStart && 'rounded-ss-md', !groupEnd && 'rounded-es-md');

  let content: ReactNode;
  if (message.deleted) {
    content = (
      <div className={cn('inline-flex items-center gap-2 rounded-[1.25rem] border border-dashed border-border-strong px-3.5 py-2 text-sm text-muted-foreground italic', corners)}>
        <Ban aria-hidden className="size-3.5 shrink-0" />
        {t('message.deleted')}
        <span className="inline-flex items-center gap-1 font-mono text-[0.625rem] not-italic opacity-70">{meta}</span>
      </div>
    );
  } else if (emojis > 0) {
    content = (
      <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
        <p className={cn('leading-tight', emojis === 1 ? 'text-5xl' : 'text-4xl')}>{message.body}</p>
        <span className="mt-0.5 inline-flex items-center gap-1 px-1 font-mono text-[0.625rem] text-faint-foreground">{meta}</span>
      </div>
    );
  } else {
    content = (
      <div
        dir="auto"
        className={cn(
          'relative rounded-[1.25rem] px-3.5 py-2 text-start text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap [overflow-wrap:anywhere]',
          mine
            ? 'bg-kente-gold text-kente-night shadow-[0_8px_20px_-16px_var(--kente-coral)] selection:bg-kente-night/20'
            : 'bg-surface-raised text-foreground shadow-[0_8px_20px_-18px_var(--float-shadow)] ring-1 ring-border-subtle',
          pending && 'opacity-75',
          failed && 'ring-2 ring-coral/70',
          editing && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
          corners,
        )}
      >
        <MessageText text={message.body ?? ''} />
        {/* Une copie invisible de l'heure réserve sa place au bout de la dernière ligne ; la vraie s'y pose */}
        <span aria-hidden className="invisible ms-2 inline-flex items-center gap-1 align-baseline font-mono text-[0.625rem] select-none">
          {meta}
        </span>
        <span className={cn('absolute end-3 bottom-1.5 inline-flex items-center gap-1 font-mono text-[0.625rem] leading-none', mine ? 'opacity-70' : 'text-faint-foreground')}>
          {meta}
        </span>
      </div>
    );
  }

  const canAct = !pending && !failed && !message.deleted;

  return (
    <m.li
      initial={fresh ? { opacity: 0, y: 12, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
      style={{ transformOrigin: mine ? 'bottom right' : 'bottom left' }}
      className={cn('group/bubble flex items-center gap-1', mine ? 'flex-row-reverse' : 'flex-row', groupStart ? 'mt-3' : 'mt-0.5')}
    >
      <div className={cn('flex min-w-0 max-w-[min(36rem,85%)] flex-col sm:max-w-[min(36rem,75%)]', mine ? 'items-end' : 'items-start')}>
        <span className="sr-only">{author} :</span>
        {content}
        {failed && (
          <div role="alert" className="mt-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 px-1 text-xs font-semibold text-coral">
            <span className="inline-flex items-center gap-1">
              <AlertCircle aria-hidden className="size-3.5" />
              {t('message.failed')}
            </span>
            <button type="button" onClick={onRetry} className={cn('inline-flex items-center gap-1 rounded-sm underline-offset-2 hover:underline', focusRing)}>
              <RotateCcw aria-hidden className="size-3" />
              {t('message.retry')}
            </button>
            <button type="button" onClick={onDiscard} className={cn('inline-flex items-center gap-1 rounded-sm text-muted-foreground underline-offset-2 hover:underline', focusRing)}>
              <X aria-hidden className="size-3" />
              {t('message.discard')}
            </button>
          </div>
        )}
      </div>
      {canAct && <MessageMenu message={message} mine={mine} onEdit={onEdit} onDelete={onDelete} />}
    </m.li>
  );
}

/** L'état d'un de ses messages : en route, non envoyé, envoyé (une coche), vu (deux coches). */
function Receipt({ pending, failed, seen }: { pending: boolean; failed: boolean; seen: boolean }) {
  const { t } = useTranslation('messages');
  if (failed) {
    return <AlertCircle aria-label={t('message.failed')} className="size-3 text-coral" />;
  }
  if (pending) {
    return <Clock3 aria-label={t('message.sending')} className="size-3" />;
  }
  return seen ? (
    <CheckCheck aria-label={t('message.seen')} strokeWidth={2.5} className="size-3.5" />
  ) : (
    <Check aria-label={t('message.sent')} className="size-3.5" />
  );
}

function MessageMenu({ message, mine, onEdit, onDelete }: { message: ThreadMessage; mine: boolean; onEdit?: () => void; onDelete?: () => void }) {
  const { t } = useTranslation('messages');

  async function copy() {
    if (await copyText(message.body ?? '')) {
      toast.success(t('message.copied'));
    }
  }

  const item = cn(
    'flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium outline-none select-none',
    'data-highlighted:bg-foreground/7 [&_svg]:size-4 [&_svg]:text-muted-foreground',
  );

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t('message.actions')}
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-full text-faint-foreground transition-[opacity,background-color,color]',
            'opacity-0 group-hover/bubble:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-60',
            'hover:bg-foreground/7 hover:text-foreground data-[state=open]:bg-foreground/7 data-[state=open]:text-foreground',
            focusRing,
          )}
        >
          <Ellipsis aria-hidden className="size-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={mine ? 'end' : 'start'}
          sideOffset={4}
          collisionPadding={12}
          className={cn(
            'z-[80] min-w-48 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-float outline-none',
            'origin-(--radix-dropdown-menu-content-transform-origin) data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        >
          <DropdownMenu.Item className={item} onSelect={() => void copy()}>
            <Copy aria-hidden />
            {t('message.copy')}
          </DropdownMenu.Item>
          {mine && (
            <>
              <DropdownMenu.Item className={item} onSelect={onEdit}>
                <Pencil aria-hidden />
                {t('message.edit')}
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="mx-1 my-1 h-px bg-border-subtle" />
              <DropdownMenu.Item className={cn(item, 'text-coral data-highlighted:bg-coral/10 [&_svg]:text-coral')} onSelect={onDelete}>
                <Trash2 aria-hidden />
                {t('message.delete')}
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
