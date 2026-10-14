import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMarkNotificationAsRead } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Notification } from '@/types/notification.types';
import { formatRelativeTime } from '@/utils/formatters';

interface NotificationItemProps {
  notification: Notification;
}

// Page où mène la notification, d'après le contenu concerné
function targetPath(notification: Notification, ownUsername: string | undefined): string | null {
  const { type, targetType, targetSlug, actor } = notification;
  if (type === 'NEW_FOLLOWER') {
    return actor ? paths.profile(actor.username) : null;
  }
  if (type === 'BADGE_EARNED') {
    return ownUsername ? paths.profile(ownUsername) : null;
  }
  if (targetType === 'PROJECT') {
    return paths.projects;
  }
  // Le contenu a pu être supprimé depuis : la notification reste, sans lien
  if (!targetSlug) {
    return null;
  }
  return targetType === 'ARTICLE' ? paths.article(targetSlug) : paths.question(targetSlug);
}

function describe(notification: Notification): string {
  const actor = notification.actor?.fullName ?? "Quelqu'un";
  const title = notification.targetTitle ? `« ${notification.targetTitle} »` : 'un contenu supprimé';
  switch (notification.type) {
    case 'NEW_ANSWER':
      return `${actor} a répondu à votre question ${title}`;
    case 'ANSWER_ACCEPTED':
      return `${actor} a accepté votre réponse à ${title}`;
    case 'NEW_COMMENT':
      return `${actor} a commenté ${title}`;
    case 'NEW_VOTE':
      return notification.targetType === 'PROJECT'
        ? `${actor} a ajouté une étoile à ${title}`
        : `${actor} a voté pour ${title}`;
    case 'NEW_FOLLOWER':
      return `${actor} vous suit`;
    case 'PROJECT_REQUEST':
      return `${actor} souhaite contribuer à ${title}`;
    case 'BADGE_EARNED':
      return `Vous avez obtenu le badge ${title}`;
  }
}

export default function NotificationItem({ notification }: NotificationItemProps) {
  const { user } = useAuth();
  const markAsRead = useMarkNotificationAsRead();
  const to = targetPath(notification, user?.username);

  const onOpen = () => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
  };

  const content = (
    <>
      <p className={cn('text-sm', !notification.read && 'font-medium')}>{describe(notification)}</p>
      <p className="text-xs text-muted-foreground">{formatRelativeTime(notification.createdAt)}</p>
    </>
  );

  return (
    <li className={cn('flex items-start gap-3 rounded-lg border p-3', !notification.read && 'bg-muted/50')}>
      <span
        className={cn('mt-1.5 size-2 shrink-0 rounded-full', notification.read ? 'bg-transparent' : 'bg-primary')}
        aria-label={notification.read ? undefined : 'Non lue'}
      />
      {to ? (
        <Link to={to} onClick={onOpen} className="min-w-0 flex-1 hover:underline">
          {content}
        </Link>
      ) : (
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          {content}
        </button>
      )}
    </li>
  );
}
