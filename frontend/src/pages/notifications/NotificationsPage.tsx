import { Bell } from 'lucide-react';
import NotificationItem from '@/components/notification/NotificationItem';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import PageHeader from '@/components/shared/PageHeader';
import Pagination from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import {
  useMarkAllNotificationsAsRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/hooks/useNotifications';
import { useUrlFilters } from '@/hooks/useUrlFilters';

export default function NotificationsPage() {
  const { page, update } = useUrlFilters();
  const notifications = useNotifications({ page });
  const { data: unread = 0 } = useUnreadNotificationCount();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est lu.'}
        action={
          unread > 0 && (
            <Button variant="outline" onClick={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending}>
              Tout marquer comme lu
            </Button>
          )
        }
      />

      {notifications.isPending ? (
        <ListSkeleton />
      ) : notifications.isError ? (
        <ErrorState error={notifications.error} onRetry={() => void notifications.refetch()} />
      ) : notifications.data.content.length === 0 ? (
        <EmptyState
          icon={<Bell />}
          title="Aucune notification"
          description="Vous serez prévenu ici des réponses, votes, commentaires et nouveaux abonnés."
        />
      ) : (
        <div className="space-y-4">
          <ul className="space-y-2">
            {notifications.data.content.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </ul>
          <Pagination page={notifications.data} onPageChange={(next) => update({ page: String(next) })} />
        </div>
      )}
    </>
  );
}
