import { Search, SquarePen, X } from 'lucide-react';
import { LayoutGroup, m } from 'motion/react';
import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConnectionStatus from './ConnectionStatus';
import ConversationItem from './ConversationItem';
import ErrorState from '@/components/feedback/ErrorState';
import { useConversations } from '@/hooks/useMessages';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/message.types';

type Filter = 'all' | 'unread';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

// « Aïssatou » se trouve en tapant « aissatou »
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function matches(conversation: Conversation, query: string): boolean {
  const participant = conversation.participant;
  if (!query) {
    return true;
  }
  if (!participant) {
    return false;
  }
  return normalize(participant.fullName).includes(query) || participant.username.includes(query);
}

interface ConversationListProps {
  activeId: number | null;
  onNewMessage: () => void;
  className?: string;
}

/**
 * La liste des conversations, la plus récemment active en tête. Elle se réordonne en direct quand un message arrive.
 * En haut : le titre et l'état du temps réel, « Nouveau message », la recherche parmi ses conversations, et le filtre
 * des non lues.
 */
export default function ConversationList({ activeId, onNewMessage, className }: ConversationListProps) {
  const { t } = useTranslation('messages');
  const searchId = useId();
  const { data, isPending, isError, refetch } = useConversations();
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const query = normalize(text.trim());

  const conversations = useMemo(() => data?.content ?? [], [data]);
  const unreadTotal = conversations.filter((conversation) => conversation.unreadCount > 0).length;
  const visible = conversations.filter(
    (conversation) => matches(conversation, query) && (filter === 'all' || conversation.unreadCount > 0 || conversation.id === activeId),
  );

  return (
    <aside aria-labelledby="conversations-title" className={cn('min-h-0 flex-col md:border-e md:border-border-subtle', className)}>
      <header className="sticky top-16 z-10 bg-background/85 px-4 pt-6 pb-3 backdrop-blur-xl saver:bg-background md:static md:bg-transparent md:pt-5 md:backdrop-blur-none">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 id="conversations-title" className="font-display text-h4 leading-none md:text-h5">
              {t('list.title')}
            </h1>
            <ConnectionStatus className="mt-2" />
          </div>
          <button
            type="button"
            onClick={onNewMessage}
            aria-label={t('newConversation.title')}
            title={t('newConversation.title')}
            className={cn(
              'group/new grid size-11 shrink-0 place-items-center rounded-[0.875rem] bg-kente-warm text-kente-night shadow-[0_10px_24px_-14px_var(--kente-coral)]',
              'transition-[translate,box-shadow] duration-300 ease-out-expo hover:-translate-y-px hover:shadow-[0_14px_30px_-12px_var(--kente-coral)] active:translate-y-0',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              focusRing,
            )}
          >
            <SquarePen aria-hidden className="size-[1.125rem] transition-transform duration-300 ease-out-expo group-hover/new:-rotate-6" strokeWidth={2.25} />
          </button>
        </div>

        <div className="relative mt-4 flex h-10 items-center gap-2 rounded-xl border border-border bg-surface/70 px-3 transition-colors focus-within:border-border-strong focus-within:bg-surface">
          <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <label htmlFor={searchId} className="sr-only">
            {t('list.search')}
          </label>
          <input
            id={searchId}
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => event.key === 'Escape' && text !== '' && (event.preventDefault(), setText(''))}
            placeholder={t('list.searchPlaceholder')}
            autoComplete="off"
            spellCheck={false}
            dir="auto"
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint-foreground sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
          />
          {text !== '' && (
            <button
              type="button"
              onClick={() => setText('')}
              aria-label={t('list.clearSearch')}
              className={cn('grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-foreground/7 hover:text-foreground', focusRing)}
            >
              <X aria-hidden className="size-3.5" />
            </button>
          )}
        </div>

        <div role="group" aria-label={t('list.filter')} className="mt-3 flex gap-1.5">
          {(['all', 'unread'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                'relative inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors',
                filter === value ? 'text-background' : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
                focusRing,
              )}
            >
              {filter === value && (
                <m.span layoutId="conversation-filter" transition={{ type: 'spring', stiffness: 460, damping: 36 }} className="absolute inset-0 rounded-full bg-foreground" />
              )}
              <span className="relative">{t(`list.${value}`)}</span>
              {value === 'unread' && unreadTotal > 0 && (
                <span className="relative grid h-4.5 min-w-4.5 place-items-center rounded-full bg-kente-coral px-1 font-mono text-[0.625rem] leading-none text-white">
                  {unreadTotal}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 px-2 pb-3 md:overflow-y-auto md:overscroll-contain">
        {isPending ? (
          <ListSkeleton />
        ) : isError ? (
          <div className="p-2">
            <ErrorState title={t('list.error')} onRetry={() => void refetch()} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span aria-hidden className="size-12 rounded-2xl bg-kente-conic opacity-80" />
            <p className="font-bold">{t('list.emptyTitle')}</p>
            <p className="max-w-xs text-[0.8125rem] leading-relaxed text-muted-foreground">{t('list.emptyDescription')}</p>
            <button
              type="button"
              onClick={onNewMessage}
              className={cn('mt-1 inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-bold text-background hover:opacity-85', focusRing)}
            >
              <SquarePen aria-hidden className="size-4" />
              {t('newConversation.title')}
            </button>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {query ? t('list.noMatch', { query: text.trim() }) : t('list.allRead')}
          </p>
        ) : (
          <LayoutGroup id="conversations">
            <ul className="flex flex-col gap-0.5">
              {visible.map((conversation) => (
                <m.li key={conversation.id} layout="position" transition={{ type: 'spring', stiffness: 520, damping: 42 }}>
                  <ConversationItem conversation={conversation} active={conversation.id === activeId} />
                </m.li>
              ))}
            </ul>
          </LayoutGroup>
        )}
      </div>
    </aside>
  );
}

/** La liste pendant son chargement. */
function ListSkeleton() {
  return (
    <ul aria-hidden className="flex flex-col gap-0.5">
      {[0.62, 0.48, 0.7, 0.4, 0.56, 0.66].map((width, index) => (
        <li key={index} className="flex items-center gap-3 px-3 py-3">
          <span className="skeleton-shimmer size-12 shrink-0 rounded-full" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="skeleton-shimmer h-3.5 rounded-full" style={{ width: `${width * 70}%` }} />
            <span className="skeleton-shimmer h-3 rounded-full" style={{ width: `${width * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
