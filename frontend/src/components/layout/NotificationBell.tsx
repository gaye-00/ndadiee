import { ArrowRight, Bell, BellOff } from 'lucide-react';
import { AnimatePresence, m, useAnimate } from 'motion/react';
import { Popover } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import NotificationItem from '@/components/notifications/NotificationItem';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useMarkAllNotificationsAsRead,
  useNotifications,
  useOpenNotification,
  useUnreadNotificationCount,
} from '@/hooks/useNotifications';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';

// Dernières notifications montrées sous la cloche ; les autres sur la page des notifications
const SHOWN = 6;

/**
 * Cloche des notifications, avec le nombre de non lues. Elle sonne quand une notification arrive
 * (le nombre est revérifié chaque minute). Un clic ouvre les dernières : chacune mène à ce qu'elle
 * concerne, et passe à « lue ».
 */
export default function NotificationBell() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const { data: unread = 0 } = useUnreadNotificationCount();
  const [bell, animate] = useAnimate<HTMLSpanElement>();
  const previous = useRef(unread);

  // Une notification arrive : la cloche sonne
  useEffect(() => {
    if (unread > previous.current && !reduced && bell.current) {
      void animate(bell.current, { rotate: [0, -20, 16, -11, 7, -3, 0] }, { duration: 0.9, ease: 'easeOut' });
    }
    previous.current = unread;
  }, [unread, reduced, animate, bell]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? t('shell.notifications.label', { count: unread }) : t('shell.notifications.title')}
          className={cn(
            'relative grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors outline-none',
            'hover:bg-foreground/7 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70',
            'data-[state=open]:bg-foreground/7 data-[state=open]:text-foreground',
          )}
        >
          <span ref={bell} className="grid origin-[50%_15%] place-items-center">
            <Bell aria-hidden className="size-[1.1875rem]" />
          </span>
          <AnimatePresence initial={false}>
            {unread > 0 && (
              <m.span
                key={unread}
                aria-hidden
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 22 }}
                className="absolute end-1 top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-kente-coral px-1 font-mono text-[0.625rem] leading-none font-bold text-white ring-2 ring-background"
              >
                {unread > 9 ? '9+' : unread}
              </m.span>
            )}
          </AnimatePresence>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={language.dir === 'rtl' ? 'start' : 'end'}
          sideOffset={10}
          collisionPadding={12}
          className={cn(
            'z-50 w-[23rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-float outline-none',
            'origin-(--radix-popover-content-transform-origin) data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}
        >
          <NotificationPanel open={open} onNavigate={() => setOpen(false)} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function NotificationPanel({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { t } = useTranslation();
  const { data, isPending } = useNotifications({ size: SHOWN }, { enabled: open });
  const select = useOpenNotification(onNavigate);
  const markAll = useMarkAllNotificationsAsRead();
  const items = data?.content ?? [];
  const hasUnread = items.some((notification) => !notification.read);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-3">
        <h2 className="font-display text-[0.9375rem] font-bold">{t('shell.notifications.title')}</h2>
        {hasUnread && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            className="rounded-md text-xs font-semibold text-gold outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            {t('shell.notifications.markAll')}
          </button>
        )}
      </div>

      <ul className="max-h-[min(26rem,65dvh)] overflow-y-auto border-y border-border-subtle p-1.5">
        {isPending ? (
          <li className="grid h-36 place-items-center">
            <PulsatingDots label={t('states.loading')} />
          </li>
        ) : items.length === 0 ? (
          <li className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
            <BellOff aria-hidden className="size-6 text-faint-foreground" />
            {t('shell.notifications.empty')}
          </li>
        ) : (
          items.map((notification, index) => (
            <m.li
              key={notification.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <NotificationItem compact notification={notification} onSelect={() => select(notification)} />
            </m.li>
          ))
        )}
      </ul>

      <Link
        to={paths.notifications}
        viewTransition
        onClick={onNavigate}
        className="group/all m-1.5 flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-muted-foreground outline-none transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
      >
        {t('shell.notifications.seeAll')}
        <ArrowRight aria-hidden className="size-4 transition-transform group-hover/all:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/all:-translate-x-0.5" />
      </Link>
    </div>
  );
}
