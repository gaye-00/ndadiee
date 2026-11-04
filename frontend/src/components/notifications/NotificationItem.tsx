import { ArrowBigUp, Award, CircleCheck, MessageCircle, MessageSquare, Send, Star, UserPlus, type LucideIcon } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import UserAvatar from '@/components/shared/UserAvatar';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/types/notification.types';
import { formatDateTime, formatRelativeTime, isolate } from '@/utils/formatters';

// Un vote sur un projet est une étoile
type Kind = NotificationType | 'NEW_STAR';

// Ce qui s'est passé, d'un coup d'œil : l'icône et le fil du kente. Vert : ça avance ; or : on te remarque ; rouge : à traiter
const KINDS: Record<Kind, { icon: LucideIcon; tone: string }> = {
  NEW_ANSWER: { icon: MessageCircle, tone: 'bg-kente-jade' },
  ANSWER_ACCEPTED: { icon: CircleCheck, tone: 'bg-kente-jade' },
  NEW_COMMENT: { icon: MessageSquare, tone: 'bg-kente-jade' },
  NEW_VOTE: { icon: ArrowBigUp, tone: 'bg-kente-gold' },
  NEW_STAR: { icon: Star, tone: 'bg-kente-gold' },
  NEW_FOLLOWER: { icon: UserPlus, tone: 'bg-kente-gold' },
  PROJECT_REQUEST: { icon: Send, tone: 'bg-kente-coral' },
  BADGE_EARNED: { icon: Award, tone: 'bg-kente-gold' },
};

interface NotificationItemProps {
  notification: Notification;
  onSelect: () => void;
  /** Sous la cloche : plus serré, et deux lignes au plus */
  compact?: boolean;
}

/** Notification : qui, quoi, sur quel contenu, quand. Toute la ligne mène à ce qu'elle concerne. */
export default function NotificationItem({ notification, onSelect, compact = false }: NotificationItemProps) {
  const { t } = useTranslation();
  const { actor, read } = notification;
  const kind: Kind = notification.type === 'NEW_VOTE' && notification.targetType === 'PROJECT' ? 'NEW_STAR' : notification.type;
  const { icon: Icon, tone } = KINDS[kind];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl text-start outline-none transition-colors',
        'hover:bg-foreground/5 focus-visible:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/70',
        compact ? 'px-2.5 py-2.5' : 'px-3 py-3.5 sm:gap-3.5 sm:px-3.5',
        !read && 'bg-gold/[0.06]',
      )}
    >
      <span className="relative shrink-0">
        {actor ? (
          <UserAvatar user={actor} size="md" />
        ) : (
          <span aria-hidden className="grid size-9 place-items-center rounded-full bg-gold/15 text-gold">
            <Award className="size-4.5" />
          </span>
        )}
        {actor && (
          <span
            aria-hidden
            className={cn('absolute -end-1 -bottom-1 grid size-[1.125rem] place-items-center rounded-full text-kente-night ring-2', tone, compact ? 'ring-popover' : 'ring-background')}
          >
            <Icon className="size-2.5" strokeWidth={2.75} />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('leading-snug text-soft-foreground', compact ? 'line-clamp-2 text-[0.8125rem]' : 'block text-sm')}>
          <Trans
            i18nKey={`shell.notifications.types.${kind}`}
            values={{ actor: isolate(actor?.fullName ?? ''), target: isolate(notification.targetTitle ?? '') }}
            components={{ b: <strong className="font-semibold text-foreground" /> }}
          />
        </span>
        <time dateTime={notification.createdAt} title={formatDateTime(notification.createdAt)} className="mt-0.5 block font-mono text-[0.6875rem] text-faint-foreground">
          {formatRelativeTime(notification.createdAt)}
        </time>
      </span>
      {!read && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-kente-gold shadow-[0_0_0_3px_color-mix(in_srgb,var(--kente-gold)_20%,transparent)]">
          <span className="sr-only">{t('shell.notifications.unread')}</span>
        </span>
      )}
    </button>
  );
}
