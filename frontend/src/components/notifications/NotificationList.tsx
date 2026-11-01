import { CheckCheck, Mail } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import NotificationItem from './NotificationItem';
import EmptyState from '@/components/feedback/EmptyState';
import ErrorState from '@/components/feedback/ErrorState';
import LoadMore from '@/components/feedback/LoadMore';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import {
  useMarkAllNotificationsAsRead,
  useNotificationFeed,
  useOpenNotification,
  useUnreadNotificationCount,
} from '@/hooks/useNotifications';
import { useNow } from '@/hooks/useNow';
import { paths } from '@/router/paths';
import { useDataSaverStore } from '@/store/useDataSaverStore';
import type { Notification } from '@/types/notification.types';
import { formatDay } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

interface Day {
  key: string;
  /** Une date de ce jour : son libellé en découle */
  date: Date;
  items: Notification[];
}

/** Les notifications, déjà des plus récentes aux plus anciennes, jour par jour (dans le fuseau du membre). */
function groupByDay(notifications: readonly Notification[]): Day[] {
  const days: Day[] = [];
  notifications.forEach((notification) => {
    const date = new Date(notification.createdAt);
    const key = date.toDateString();
    const last = days.at(-1);
    if (last?.key === key) {
      last.items.push(notification);
    } else {
      days.push({ key, date, items: [notification] });
    }
  });
  return days;
}

/**
 * Notifications, groupées par jour, avec la suite qui arrive au fil du défilement. Les non lues ressortent et se
 * comptent en tête ; chacune mène à ce qu'elle concerne, et passe à « lue ».
 */
export default function NotificationList() {
  const { t } = useTranslation();
  const feed = useNotificationFeed();
  const { data: unread = 0 } = useUnreadNotificationCount();
  const markAll = useMarkAllNotificationsAsRead();
  const open = useOpenNotification();
  const dataSaver = useDataSaverStore((s) => s.enabled);
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = feed;

  const days = useMemo(() => {
    // Une notification arrivée pendant la lecture décale les pages : la même peut revenir dans la suivante
    const unique = new Map((data?.pages ?? []).flatMap((page) => page.content).map((item) => [item.id, item]));
    return groupByDay([...unique.values()]);
  }, [data]);

  const sentinel = useInfiniteScroll<HTMLDivElement>(() => void fetchNextPage(), hasNextPage && !isFetchingNextPage && !isFetchNextPageError && !dataSaver);

  // L'heure, à la minute près : « Aujourd'hui » devient « Hier » de lui-même à minuit
  const now = useNow(60_000);

  function dayLabel(date: Date) {
    const today = new Date(now);
    if (date.toDateString() === today.toDateString()) {
      return t('shell.notifications.today');
    }
    today.setDate(today.getDate() - 1);
    return date.toDateString() === today.toDateString() ? t('shell.notifications.yesterday') : formatDay(date);
  }

  return (
    <div className="relative isolate overflow-x-clip">
      <div aria-hidden className="halo halo-gold -top-72 -start-64 -z-10 size-[44rem] animate-float" />

      <div className="mx-auto max-w-3xl px-4 pt-8 pb-24 sm:px-6 sm:pt-10 lg:pb-32">
        <header className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div className="min-w-0 flex-1 basis-56">
            <h1 className="font-display text-h2">{t('shell.notifications.title')}</h1>
            <p aria-live="polite" className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              {unread > 0 ? (
                <>
                  <span aria-hidden className="live-dot size-1.5" />
                  {t('shell.notifications.unreadCount', { count: unread })}
                </>
              ) : (
                data && t('shell.notifications.allRead')
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`${paths.settings}#review-emails`}
              viewTransition
              className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground ${focusRing}`}
            >
              <Mail aria-hidden className="size-4" />
              {t('shell.notifications.manageEmails')}
            </Link>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className={`inline-flex h-10 items-center gap-2 rounded-xl border border-border-strong px-3.5 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-60 ${focusRing}`}
              >
                <CheckCheck aria-hidden className="size-4" />
                {t('shell.notifications.markAll')}
              </button>
            )}
          </div>
        </header>

        <div className="mt-8 flex flex-col gap-8">
          {feed.isPending ? (
            <ListPlaceholder label={t('states.loading')} />
          ) : feed.isError ? (
            <ErrorState title={t('shell.notifications.failed')} onRetry={() => void feed.refetch()} />
          ) : days.length === 0 ? (
            <EmptyState
              title={t('shell.notifications.empty')}
              description={t('shell.notifications.emptyText')}
              action={{ to: paths.forum, label: t('nav.forum') }}
            />
          ) : (
            days.map((day) => (
              <section key={day.key} aria-labelledby={`notifications-${day.key}`}>
                <h2 id={`notifications-${day.key}`} className="eyebrow">
                  {dayLabel(day.date)}
                </h2>
                <ul className="glass mt-2.5 flex flex-col gap-0.5 rounded-2xl p-1.5">
                  {day.items.map((notification) => (
                    <li key={notification.id}>
                      <NotificationItem notification={notification} onSelect={() => open(notification)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        {hasNextPage && (
          <LoadMore
            sentinel={sentinel}
            loading={isFetchingNextPage}
            failed={isFetchNextPageError}
            manual={dataSaver}
            onMore={() => void fetchNextPage()}
            moreLabel={t('shell.notifications.more')}
            loadingLabel={t('shell.notifications.loadingMore')}
            errorLabel={t('shell.notifications.moreFailed')}
          />
        )}
      </div>
    </div>
  );
}

/** Le temps du premier chargement : des lignes de la forme de celles qui arrivent. */
function ListPlaceholder({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label}>
      <span aria-hidden className="skeleton-shimmer block h-3 w-24 rounded-full" />
      <div aria-hidden className="glass mt-2.5 flex flex-col gap-0.5 rounded-2xl p-1.5">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-start gap-3.5 px-3.5 py-3.5">
            <span className="skeleton-shimmer size-9 shrink-0 rounded-full" />
            <span className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
              <span className="skeleton-shimmer h-3 w-4/5 rounded-full" />
              <span className="skeleton-shimmer h-2.5 w-20 rounded-full" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
