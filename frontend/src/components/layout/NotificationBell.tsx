import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { paths } from '@/router/paths';

/** Cloche de la barre de navigation, avec le nombre de notifications non lues. */
export default function NotificationBell() {
  const { data: unread = 0 } = useUnreadNotificationCount();

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link
        to={paths.notifications}
        aria-label={unread > 0 ? `Notifications (${unread} non lues)` : 'Notifications'}
      >
        <Bell />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] leading-4 font-semibold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}
