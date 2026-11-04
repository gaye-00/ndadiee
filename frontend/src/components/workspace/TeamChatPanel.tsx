import { ArrowDown, MessagesSquare, X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { Dialog } from 'radix-ui';
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChatComposer from './ChatComposer';
import ChatEventCard from './ChatEventCard';
import ChatMessage from './ChatMessage';
import { useWorkspaceContext } from './workspaceContext';
import { ease, focusRing, iconButton } from './workspaceStyles';
import ErrorState from '@/components/feedback/ErrorState';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import UserAvatar from '@/components/shared/UserAvatar';
import { currentLanguage } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useNow } from '@/hooks/useNow';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { chatMessages, useTeamChat } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';

// La discussion se tient à côté de l'onglet à partir de cette largeur ; en dessous, elle s'ouvre d'un bouton
const WIDE = '(min-width: 1280px)';
// Deux messages d'une même personne à moins de cinq minutes se suivent sans répéter son nom
const GROUP_WINDOW = 5 * 60_000;
// Assez près du bas pour y rester quand un message arrive
const NEAR_BOTTOM = 96;

/**
 * Discussion d'équipe « # équipe », à côté du tableau. Design 3E.
 *
 * Sur grand écran, elle se tient à droite de chaque onglet ; ailleurs, un bouton l'ouvre en feuille et compte les
 * messages arrivés depuis. Le prochain rendez-vous est épinglé en haut. Les messages arrivent par le pouls de l'espace ;
 * on remonte le temps page après page, sans que la lecture saute.
 */
export default function TeamChatPanel() {
  const { slug } = useWorkspaceContext();
  const { user } = useAuth();
  const wide = useMediaQuery(WIDE);
  const [open, setOpen] = useState(false);
  const chat = useTeamChat(slug);
  const messages = useMemo(() => chatMessages(chat.data), [chat.data]);
  const lastId = messages.at(-1)?.id ?? 0;
  // Lu jusqu'ici : au chargement, tout ce qui est déjà là ; ensuite, tout ce qui s'est montré (mis à jour pendant le
  // rendu, d'après le précédent : pas d'effet ni de rendu de plus)
  const [readUpTo, setReadUpTo] = useState<number | null>(null);
  const visible = wide || open;
  if (chat.isSuccess && (readUpTo === null || visible) && readUpTo !== lastId) {
    setReadUpTo(lastId);
  }

  const unread = readUpTo === null ? 0 : messages.filter((message) => message.id > readUpTo && message.author.id !== user?.id).length;

  if (wide) {
    return (
      <aside className="sticky top-20 h-[calc(100dvh-6rem)] min-h-[32rem]">
        <ChatPanel />
      </aside>
    );
  }
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <ChatLauncher unread={unread} />
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-kente-night/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 saver:backdrop-blur-none" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 h-[92dvh] rounded-t-[1.75rem] border border-border bg-popover shadow-float outline-none',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-10',
            'md:inset-y-3 md:end-3 md:start-auto md:bottom-3 md:h-auto md:w-[26rem] md:rounded-[1.75rem] md:data-[state=open]:slide-in-from-end-8 md:data-[state=closed]:slide-out-to-end-8',
          )}
        >
          <ChatPanel sheet />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Le bouton de la discussion, sous le pouce, au-dessus des onglets du téléphone ; il compte les messages arrivés */
function ChatLauncher({ unread }: { unread: number }) {
  const { t } = useTranslation('workspace');
  return (
    <Dialog.Trigger
      aria-label={unread > 0 ? t('chat.openUnread', { count: unread }) : t('chat.open')}
      className={cn(
        'group/launch fixed end-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-40 flex size-13 items-center justify-center gap-2 rounded-full bg-inverse text-sm font-bold text-inverse-foreground shadow-float sm:w-auto sm:ps-4 sm:pe-5 md:end-6 md:bottom-6',
        'transition-[translate,box-shadow] duration-300 ease-out-expo hover:-translate-y-0.5',
        focusRing,
        'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      <MessagesSquare aria-hidden className="size-5 transition-transform duration-300 group-hover/launch:-rotate-6" />
      <span aria-hidden className="max-sm:hidden">
        {t('chat.launcher')}
      </span>
      <AnimatePresence>
        {unread > 0 && (
          <m.span
            aria-hidden
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            className="absolute -end-1 -top-1 grid h-5.5 min-w-5.5 place-items-center rounded-full bg-kente-coral px-1.5 font-mono text-[0.6875rem] text-white ring-2 ring-background tabular-nums"
          >
            {unread > 99 ? '99+' : unread}
          </m.span>
        )}
      </AnimatePresence>
    </Dialog.Trigger>
  );
}

/** La discussion elle-même : son en-tête, le rendez-vous épinglé, les messages et le champ pour écrire. */
function ChatPanel({ sheet = false }: { sheet?: boolean }) {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const chat = useTeamChat(slug);
  const online = workspace.members.filter((member) => member.online);
  const nextEvent = chat.data?.pages[0]?.nextEvent ?? null;
  const Title = sheet ? Dialog.Title : 'h2';

  return (
    <section aria-labelledby="team-chat-title" className={cn('flex h-full min-h-0 flex-col overflow-hidden', !sheet && 'glass rounded-3xl')}>
      <header className="flex shrink-0 items-center gap-3 border-b border-border-subtle px-4 py-3.5 sm:px-5">
        <div className="min-w-0 flex-1">
          <Title id="team-chat-title" className="flex items-center gap-1.5 font-mono text-[0.9375rem] font-bold">
            <span aria-hidden className="text-gold">
              #
            </span>
            {t('chat.title')}
          </Title>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {online.length > 0 && <span aria-hidden className="live-dot size-1.5" />}
            {t('chat.presence', { count: workspace.members.length, online: online.length })}
          </p>
        </div>
        <span aria-hidden className="flex -space-x-1.5">
          {online.slice(0, 4).map((member) => (
            <UserAvatar key={member.user.id} user={member.user} size="sm" className="size-6 text-[0.5625rem] ring-2 ring-surface" />
          ))}
        </span>
        {sheet && (
          <Dialog.Close aria-label={t('chat.close')} className={cn(iconButton, '-me-1.5')}>
            <X aria-hidden className="size-4.5" />
          </Dialog.Close>
        )}
      </header>

      <AnimatePresence initial={false}>
        {nextEvent && (
          <m.div
            key={nextEvent.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease }}
            className="shrink-0 overflow-hidden border-b border-border-subtle"
          >
            <div className="px-3 py-3 sm:px-4">
              <ChatEventCard message={nextEvent} variant="pinned" />
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {chat.isPending ? (
        <ChatSkeleton />
      ) : chat.isError && !chat.data ? (
        <div className="flex-1 p-4">
          <ErrorState title={t('chat.errorTitle')} description={t('chat.errorText')} onRetry={() => void chat.refetch()} />
        </div>
      ) : (
        <MessageList />
      )}

      <ChatComposer />
    </section>
  );
}

/**
 * Les messages, du plus ancien au plus récent. On arrive en bas ; un message qui arrive y fait descendre si l'on y est
 * (ou si on vient de l'écrire), sinon une pastille le signale. Remonter charge la page d'avant, sans que la lecture saute.
 */
function MessageList() {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const chat = useTeamChat(slug);
  const messages = useMemo(() => chatMessages(chat.data), [chat.data]);
  const scroller = useRef<HTMLDivElement>(null);
  // Assez près du bas pour y rester : suivi par le défilement
  const [atBottom, setAtBottom] = useState(true);
  const anchor = useRef<number | null>(null);
  const seenLast = useRef<number | undefined>(undefined);
  const [missed, setMissed] = useState(0);
  const lastId = messages.at(-1)?.id;
  const lastIsMine = messages.at(-1)?.author.id === user?.id;
  const pages = chat.data?.pages.length ?? 0;
  const people = useMemo(() => workspace.members.map((member) => member.user), [workspace.members]);

  // En haut de la liste : la page d'avant. L'observateur naît après le premier affichage, quand la liste est déjà
  // descendue en bas : il ne charge pas la page d'avant pour rien.
  const sentinel = useInfiniteScroll<HTMLDivElement>(() => {
    const element = scroller.current;
    if (element) {
      // La distance au bas : la même une fois les anciens messages ajoutés au-dessus
      anchor.current = element.scrollHeight - element.scrollTop;
    }
    void chat.fetchNextPage();
  }, chat.hasNextPage && !chat.isFetchingNextPage);

  // Les anciens messages arrivés au-dessus : la lecture reste où elle était
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element && anchor.current !== null) {
      element.scrollTop = element.scrollHeight - anchor.current;
      anchor.current = null;
    }
  }, [pages]);

  // On arrive en bas de la discussion ; puis on y suit les nouveaux messages (seulement quand le dernier change)
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element || lastId === undefined || lastId === seenLast.current) {
      return;
    }
    const first = seenLast.current === undefined;
    seenLast.current = lastId;
    if (first || atBottom || lastIsMine) {
      element.scrollTo({ top: element.scrollHeight, behavior: first || reduced ? 'auto' : 'smooth' });
    }
  }, [atBottom, lastId, lastIsMine, reduced]);

  // Les messages arrivés pendant qu'on lisait plus haut : comptés pendant le rendu, d'après le dernier vu
  const [counted, setCounted] = useState(lastId);
  if (lastId !== counted) {
    setCounted(lastId);
    if (counted !== undefined && lastId !== undefined && !atBottom && !lastIsMine) {
      setMissed((count) => count + 1);
    }
  }

  function onScroll() {
    const element = scroller.current;
    if (!element) {
      return;
    }
    const bottom = element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM;
    if (bottom !== atBottom) {
      setAtBottom(bottom);
    }
    if (bottom && missed > 0) {
      setMissed(0);
    }
  }

  function toBottom() {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
    setMissed(0);
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scroller}
        onScroll={onScroll}
        role="log"
        aria-label={t('chat.log')}
        aria-live="polite"
        aria-relevant="additions"
        className="h-full overflow-y-auto overscroll-contain px-2 py-3 sm:px-3 [scrollbar-width:thin]"
      >
        {chat.hasNextPage ? (
          <div ref={sentinel} className="grid h-10 place-items-center">
            {chat.isFetchingNextPage && <PulsatingDots size="sm" label={t('chat.loadingOlder')} />}
          </div>
        ) : (
          messages.length > 0 && <ChatBeginning />
        )}

        {messages.length === 0 ? (
          <EmptyChat />
        ) : (
          <ol className="flex flex-col">
            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const newDay = !previous || dayOf(previous.createdAt) !== dayOf(message.createdAt);
              const grouped =
                !newDay &&
                previous !== undefined &&
                previous.kind === 'MESSAGE' &&
                message.kind === 'MESSAGE' &&
                previous.author.id === message.author.id &&
                Date.parse(message.createdAt) - Date.parse(previous.createdAt) < GROUP_WINDOW;
              return (
                <Fragment key={message.id}>
                  {newDay && <DaySeparator iso={message.createdAt} />}
                  <ChatMessage message={message} grouped={grouped} people={people} />
                </Fragment>
              );
            })}
          </ol>
        )}
      </div>

      <AnimatePresence>
        {missed > 0 && (
          <m.button
            type="button"
            onClick={toBottom}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease }}
            className={cn(
              'absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-inverse px-3.5 py-2 text-xs font-bold text-inverse-foreground shadow-float',
              focusRing,
            )}
          >
            <ArrowDown aria-hidden className="size-3.5" />
            {t('chat.newMessages', { count: missed })}
          </m.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// Le jour d'un message, dans le fuseau du lecteur : « 2026-11-01 »
function dayOf(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** « Aujourd'hui », « Hier », « jeudi 30 octobre » : la date au-dessus des messages d'un jour */
function DaySeparator({ iso }: { iso: string }) {
  const { t } = useTranslation('workspace');
  const now = useNow(60_000);
  const date = new Date(iso);
  const today = new Date(now);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const label =
    dayOf(iso) === dayOf(today.toISOString())
      ? t('chat.today')
      : dayOf(iso) === dayOf(yesterday.toISOString())
        ? t('chat.yesterday')
        : new Intl.DateTimeFormat([...currentLanguage().intl], {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
          }).format(date);

  return (
    <li role="separator" aria-label={label} className="flex items-center gap-3 px-2 py-3">
      <span aria-hidden className="h-px flex-1 bg-border-subtle" />
      <span aria-hidden className="font-mono text-[0.6875rem] font-semibold tracking-wide text-faint-foreground first-letter:uppercase">
        {label}
      </span>
      <span aria-hidden className="h-px flex-1 bg-border-subtle" />
    </li>
  );
}

/** Le tout début de la discussion */
function ChatBeginning() {
  const { t } = useTranslation('workspace');
  const { workspace } = useWorkspaceContext();
  return (
    <div className="px-3 pt-3 pb-1">
      <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-gold/12 font-mono text-lg font-bold text-gold">
        #
      </span>
      <p className="mt-2 text-sm font-bold text-foreground">{t('chat.beginningTitle')}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('chat.beginningText', { project: workspace.project.name })}</p>
    </div>
  );
}

/** Personne n'a encore écrit */
function EmptyChat() {
  const { t } = useTranslation('workspace');
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span aria-hidden className="relative grid size-14 place-items-center">
        <span className="absolute inset-0 rounded-2xl bg-kente-conic opacity-20" />
        <MessagesSquare className="relative size-6 text-gold" />
      </span>
      <p className="mt-1 text-sm font-bold text-foreground">{t('chat.emptyTitle')}</p>
      <p className="max-w-60 text-xs leading-relaxed text-muted-foreground">{t('chat.emptyText')}</p>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div aria-hidden className="flex flex-1 flex-col justify-end gap-4 px-4 py-4">
      {[0.7, 0.5, 0.85, 0.6].map((width, index) => (
        <div key={index} className="flex gap-2.5">
          <span className="size-8 shrink-0 rounded-full skeleton-shimmer" />
          <span className="flex flex-1 flex-col gap-1.5">
            <span className="h-3 w-24 rounded-full skeleton-shimmer" />
            <span className="h-3 rounded-full skeleton-shimmer" style={{ width: `${width * 100}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}
