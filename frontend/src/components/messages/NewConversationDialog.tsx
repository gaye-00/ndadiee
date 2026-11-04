import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Command } from 'cmdk';
import { ArrowRight, Search, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import UserAvatar from '@/components/shared/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useStartConversation } from '@/hooks/useMessages';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import { userService } from '@/services/user.service';
import type { UserSummary } from '@/types/user.types';
import { countryFlag } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * « Nouveau message » : chercher un membre par son nom ou son pseudo, puis ouvrir la conversation avec lui (celle qui
 * existe déjà, sinon une nouvelle). Les flèches parcourent les membres, Entrée ouvre. Feuille en bas sur téléphone.
 */
export default function NewConversationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('messages');
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const query = useDebounce(text.trim(), 250);
  const start = useStartConversation();

  const { data, isFetching, isError } = useQuery({
    queryKey: ['chat', 'people', query],
    queryFn: () => userService.search({ q: query || undefined, size: 8 }),
    enabled: open,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const people = (data?.content ?? []).filter((person) => person.id !== user?.id);

  function close(next: boolean) {
    if (!next) {
      setText('');
    }
    onOpenChange(next);
  }

  function choose(person: UserSummary) {
    if (start.isPending) {
      return;
    }
    start.mutate(person.username, {
      onSuccess: (conversation) => {
        close(false);
        void navigate(paths.conversation(conversation.id), { viewTransition: true });
      },
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-kente-night/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 saver:backdrop-blur-none" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-[70] flex max-h-[85dvh] flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-popover pb-[env(safe-area-inset-bottom)] text-popover-foreground shadow-float outline-none',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'sm:inset-x-auto sm:top-[12dvh] sm:bottom-auto sm:left-1/2 sm:w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-[1.75rem] sm:pb-0',
            'sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95',
          )}
        >
          <Command shouldFilter={false} loop label={t('newConversation.title')} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3 px-5 pt-5">
              <div>
                <Dialog.Title className="font-display text-h5">{t('newConversation.title')}</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">{t('newConversation.description')}</Dialog.Description>
              </div>
              <Dialog.Close
                aria-label={tc('actions.close')}
                className={cn('-me-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-foreground/7 hover:text-foreground', focusRing)}
              >
                <X aria-hidden className="size-4.5" />
              </Dialog.Close>
            </div>

            <div className="mx-5 mt-4 flex h-11 items-center gap-2.5 rounded-xl border border-border bg-surface/70 px-3.5 transition-colors focus-within:border-border-strong focus-within:bg-surface">
              <span aria-hidden className="grid size-4 shrink-0 place-items-center text-muted-foreground">
                {isFetching ? <PulsatingDots size="sm" /> : <Search className="size-4" />}
              </span>
              <Command.Input
                value={text}
                onValueChange={setText}
                placeholder={t('newConversation.search')}
                autoFocus
                dir="auto"
                className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint-foreground sm:text-[0.9375rem]"
              />
            </div>

            <Command.List className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 sm:max-h-[min(26rem,60dvh)]">
              {isError ? (
                <p className="px-3 py-8 text-center text-sm text-coral">{t('newConversation.error')}</p>
              ) : data && people.length === 0 && !isFetching ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t('newConversation.empty', { query: text.trim() })}</p>
              ) : (
                <Command.Group
                  heading={query ? t('newConversation.results') : t('newConversation.suggestions')}
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[0.6875rem] [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-faint-foreground [&_[cmdk-group-heading]]:uppercase"
                >
                  {people.map((person) => {
                    const opening = start.isPending && start.variables === person.username;
                    return (
                      <Command.Item
                        key={person.id}
                        value={person.username}
                        onSelect={() => choose(person)}
                        className="group/person flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 outline-none select-none data-[selected=true]:bg-foreground/6"
                      >
                        <UserAvatar user={person} size="md" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 truncate text-sm font-bold">
                            <bdi className="truncate">{person.fullName}</bdi>
                            {person.country && <span aria-hidden>{countryFlag(person.country)}</span>}
                          </span>
                          <span dir="ltr" className="block truncate font-mono text-xs text-muted-foreground">
                            @{person.username}
                          </span>
                        </span>
                        {opening ? (
                          <PulsatingDots size="sm" />
                        ) : (
                          <ArrowRight
                            aria-hidden
                            className="size-4 text-faint-foreground opacity-0 transition-[opacity,translate] group-data-[selected=true]/person:translate-x-0.5 group-data-[selected=true]/person:opacity-100 rtl:-scale-x-100"
                          />
                        )}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
