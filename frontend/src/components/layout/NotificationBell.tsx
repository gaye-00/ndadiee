import { ArrowRight, Award, Bell, BellOff } from 'lucide-react';
import { AnimatePresence, m, useAnimate } from 'motion/react';
import { Popover } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import UserAvatar from '@/components/shared/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/hooks/useNotifications';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Notification } from '@/types/notification.types';
import { formatRelativeTime, isolate } from '@/utils/formatters';

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

/** Où mène une notification : le projet, le sujet du forum, le profil… */
function linkOf(notification: Notification, me: string | undefined): string | null {
  const { type, targetType, targetSlug, actor } = notification;
  if (type === 'NEW_FOLLOWER') {
    return actor ? paths.profile(actor.username) : null;
  }
  if (type === 'BADGE_EARNED') {
    return me ? paths.profile(me) : null;
  }
  if (targetType === 'PROJECT' && targetSlug) {
    // Une candidature se lit près des rôles du projet
    return type === 'PROJECT_REQUEST' ? paths.projectRoles(targetSlug) : paths.project(targetSlug);
  }
  // Une réponse (nouvelle, acceptée, votée, commentée) : la page du sujet descend jusqu'à elle
  if (targetType === 'ANSWER' && targetSlug && notification.targetId !== null) {
    return paths.topicAnswer(targetSlug, notification.targetId);
  }
  if (targetType === 'QUESTION' && targetSlug) {
    return paths.topic(targetSlug);
  }
  return null;
}

function NotificationPanel({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isPending } = useNotifications({ size: SHOWN }, { enabled: open });
  const markOne = useMarkNotificationAsRead();
  const markAll = useMarkAllNotificationsAsRead();
  const items = data?.content ?? [];
  const hasUnread = items.some((notification) => !notification.read);

  function select(notification: Notification) {
    if (!notification.read) {
      markOne.mutate(notification.id);
    }
    const to = linkOf(notification, user?.username);
    onNavigate();
    if (to) {
      void navigate(to, { viewTransition: true });
    }
  }

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
              <NotificationRow notification={notification} onSelect={() => select(notification)} />
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

function NotificationRow({ notification, onSelect }: { notification: Notification; onSelect: () => void }) {
  const { t } = useTranslation();
  const { actor, read } = notification;
  // Un vote sur un projet est une étoile
  const type = notification.type === 'NEW_VOTE' && notification.targetType === 'PROJECT' ? 'NEW_STAR' : notification.type;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-start outline-none transition-colors',
        'hover:bg-foreground/5 focus-visible:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/70',
        !read && 'bg-gold/[0.06]',
      )}
    >
      {actor ? (
        <UserAvatar user={actor} size="md" />
      ) : (
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
          <Award className="size-4.5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[0.8125rem] leading-snug text-soft-foreground">
          <Trans
            i18nKey={`shell.notifications.types.${type}`}
            values={{ actor: isolate(actor?.fullName ?? ''), target: isolate(notification.targetTitle ?? '') }}
            components={{ b: <strong className="font-semibold text-foreground" /> }}
          />
        </span>
        <span className="mt-0.5 block font-mono text-[0.6875rem] text-faint-foreground">{formatRelativeTime(notification.createdAt)}</span>
      </span>
      {!read && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-kente-gold shadow-[0_0_0_3px_color-mix(in_srgb,var(--kente-gold)_20%,transparent)]">
          <span className="sr-only">{t('shell.notifications.unread')}</span>
        </span>
      )}
    </button>
  );
}
