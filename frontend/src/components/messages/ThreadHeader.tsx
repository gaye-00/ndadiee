import { ArrowLeft, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import ConnectionStatus from './ConnectionStatus';
import PresenceAvatar from './PresenceAvatar';
import { TypingText } from './TypingIndicator';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import { useIsOnline, useIsTyping } from '@/store/useChatStore';
import type { Conversation } from '@/types/message.types';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * L'en-tête du fil : l'autre membre, et ce qu'il fait (« écrit… », en ligne, ou son pseudo). Sur téléphone, la flèche
 * ramène à la liste.
 */
export default function ThreadHeader({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation('messages');
  const participant = conversation.participant;
  const online = useIsOnline(participant?.id, conversation.online);
  const typing = useIsTyping(conversation.id);

  return (
    <header className="flex h-[calc(4rem+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-b border-border-subtle bg-background/85 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-xl saver:bg-background sm:gap-3 sm:px-4 md:h-16 md:bg-transparent md:pt-0 md:backdrop-blur-none">
      <Link
        to={paths.messages}
        viewTransition
        aria-label={t('thread.back')}
        className={cn('grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-foreground/7 hover:text-foreground md:hidden', focusRing)}
      >
        <ArrowLeft aria-hidden className="size-5 rtl:-scale-x-100" />
      </Link>

      {participant && (
        <Link
          to={paths.profile(participant.username)}
          viewTransition
          className={cn('group/who -ms-1 flex min-w-0 items-center gap-3 rounded-2xl py-1.5 ps-1 pe-3 transition-colors hover:bg-foreground/5', focusRing)}
        >
          <PresenceAvatar user={participant} online={online} size="md" />
          <span className="min-w-0">
            <span className="block truncate text-[0.9375rem] leading-tight font-bold">
              <bdi>{participant.fullName}</bdi>
            </span>
            <span aria-live="polite" className="mt-0.5 block truncate text-xs leading-tight">
              {typing ? (
                <TypingText />
              ) : online ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-jade">{t('thread.online')}</span>
              ) : (
                <span dir="ltr" className="font-mono text-muted-foreground">
                  @{participant.username}
                </span>
              )}
            </span>
          </span>
        </Link>
      )}

      <div className="ms-auto flex shrink-0 items-center gap-1">
        <ConnectionStatus quiet className="me-1 hidden sm:inline-flex" />
        {participant && (
          <Link
            to={paths.profile(participant.username)}
            viewTransition
            aria-label={t('thread.profile')}
            title={t('thread.profile')}
            className={cn('grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-foreground/7 hover:text-foreground', focusRing)}
          >
            <UserRound aria-hidden className="size-[1.125rem]" />
          </Link>
        )}
      </div>
    </header>
  );
}
