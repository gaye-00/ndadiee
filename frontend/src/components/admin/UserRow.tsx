import { Ban, Copy, Ellipsis, ShieldCheck, ShieldOff, UserCheck, UserRound, type LucideIcon } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserAvatar from '@/components/shared/UserAvatar';
import { copyText } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { AdminUser } from '@/types/admin.types';
import type { Role } from '@/types/user.types';
import { countryFlag, formatDate, formatDateTime, formatNumber, formatRelativeTime } from '@/utils/formatters';

const ROLE_TONES: Record<Role, string> = {
  USER: 'bg-foreground/6 text-soft-foreground',
  MODERATOR: 'bg-gold/12 text-gold',
  ADMIN: 'bg-jade/12 text-jade',
};

const ITEM =
  'flex h-10 cursor-default items-center gap-3 rounded-xl ps-2.5 pe-2 text-sm font-medium text-soft-foreground outline-none select-none data-[highlighted]:bg-foreground/6 data-[highlighted]:text-foreground [&_svg]:size-4 [&_svg]:shrink-0';

export type UserDecision = 'block' | 'unblock' | 'makeModerator' | 'makeMember';

interface UserRowProps {
  account: AdminUser;
  /** Le compte de l'admin connecté : on ne s'y suspend pas, on n'y change pas son rôle */
  self: boolean;
  onDecide: (decision: UserDecision, account: AdminUser) => void;
}

/**
 * Un compte du back-office : qui il est, son rôle et son état, ce qu'il a publié, depuis quand il est là et sa
 * dernière connexion. Suspendu, son motif s'affiche dessous. Le menu « … » porte les décisions possibles : un
 * compte d'administration n'en a pas, sauf copier son e-mail.
 */
export default function UserRow({ account, self, onDecide }: UserRowProps) {
  const { t } = useTranslation('admin');
  const developer = account.userType === 'developer';

  return (
    <li
      className={cn(
        'glass relative grid gap-x-6 gap-y-3 rounded-2xl p-4 sm:p-5',
        'lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_auto] lg:items-center',
        account.blocked && 'border-coral/30',
      )}
    >
      {/* Qui (sur téléphone, le menu « … » est dans le coin) */}
      <div className="flex min-w-0 items-center gap-3 max-lg:pe-11">
        <UserAvatar user={account} size="lg" className={cn(account.blocked && 'grayscale')} />
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2">
            <span className="truncate font-bold">
              <bdi>{account.fullName}</bdi>
            </span>
            {account.country && <span className="shrink-0 text-xs leading-none">{countryFlag(account.country)}</span>}
            {self && <span className="shrink-0 rounded-full bg-foreground/8 px-2 py-px text-[0.6875rem] font-semibold text-muted-foreground">{t('users.you')}</span>}
          </p>
          <p dir="ltr" className="truncate font-mono text-xs text-muted-foreground rtl:text-end">
            @{account.username}
          </p>
          <p dir="ltr" className="truncate text-xs text-faint-foreground rtl:text-end">
            {account.email}
          </p>
        </div>
      </div>

      {/* Rôle et état */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', ROLE_TONES[account.role])}>{t(`roles.${account.role}`)}</span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold',
            account.blocked ? 'bg-coral/12 text-coral' : 'bg-jade/10 text-jade',
          )}
        >
          <span aria-hidden className={cn('size-1.5 rounded-full', account.blocked ? 'bg-coral' : 'bg-jade')} />
          {account.blocked ? t('users.blocked') : t('users.active')}
        </span>
      </div>

      {/* Ce qu'il a publié */}
      <p className="text-[0.8125rem] text-soft-foreground">
        {developer ? (
          <>
            <span className="lg:block">{t('users.questions', { count: account.questionCount, formatted: formatNumber(account.questionCount) })}</span>
            <span aria-hidden className="mx-1.5 text-faint-foreground lg:hidden">
              ·
            </span>
            <span className="lg:block">{t('users.answers', { count: account.answerCount, formatted: formatNumber(account.answerCount) })}</span>
            <span aria-hidden className="mx-1.5 text-faint-foreground lg:hidden">
              ·
            </span>
            <span className="lg:block">{t('users.projects', { count: account.projectCount, formatted: formatNumber(account.projectCount) })}</span>
          </>
        ) : (
          <span className="text-muted-foreground">{t('users.adminAccount')}</span>
        )}
      </p>

      {/* Depuis quand, et la dernière connexion */}
      <p className="text-[0.8125rem] text-soft-foreground">
        <span className="block">{t('users.joined', { date: formatDate(account.createdAt) })}</span>
        <span className="block text-muted-foreground">
          {account.lastLoginAt ? (
            <time dateTime={account.lastLoginAt} title={formatDateTime(account.lastLoginAt)}>
              {t('users.lastLogin', { when: formatRelativeTime(account.lastLoginAt) })}
            </time>
          ) : (
            t('users.neverLoggedIn')
          )}
        </span>
      </p>

      <UserMenu account={account} self={self} onDecide={onDecide} />

      {account.blocked && (
        <p className="rounded-xl border border-coral/20 bg-coral/6 px-3.5 py-2.5 text-[0.8125rem] text-soft-foreground lg:col-span-full">
          <strong className="font-semibold text-coral">
            {account.blockedAt ? t('users.blockedSince', { when: formatRelativeTime(account.blockedAt) }) : t('users.blocked')}
          </strong>
          {account.blockedReason && (
            <>
              {' · '}
              {t('users.reason', { reason: account.blockedReason })}
            </>
          )}
        </p>
      )}
    </li>
  );
}

function UserMenu({ account, self, onDecide }: UserRowProps) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const developer = account.userType === 'developer';
  // Ni soi-même, ni un autre compte d'administration
  const decidable = developer && !self;

  async function copyEmail() {
    if (await copyText(account.email)) {
      toast.success(t('users.toast.emailCopied'));
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t('users.actions.label', { name: account.fullName })}
          className="grid size-10 place-items-center justify-self-end rounded-xl text-muted-foreground transition-colors outline-none hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 data-[state=open]:bg-foreground/8 data-[state=open]:text-foreground max-lg:absolute max-lg:end-2.5 max-lg:top-2.5"
        >
          <Ellipsis aria-hidden className="size-5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-64 rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-float outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {developer && (
            <MenuItem icon={UserRound} onSelect={() => void navigate(paths.profile(account.username), { viewTransition: true })}>
              {t('users.actions.profile')}
            </MenuItem>
          )}
          <MenuItem icon={Copy} onSelect={() => void copyEmail()}>
            {t('users.actions.copyEmail')}
          </MenuItem>

          {decidable && (
            <>
              <DropdownMenu.Separator className="mx-1 my-1.5 h-px bg-border-subtle" />
              {account.role === 'MODERATOR' ? (
                <MenuItem icon={ShieldOff} onSelect={() => onDecide('makeMember', account)}>
                  {t('users.actions.makeMember')}
                </MenuItem>
              ) : (
                <MenuItem icon={ShieldCheck} onSelect={() => onDecide('makeModerator', account)}>
                  {t('users.actions.makeModerator')}
                </MenuItem>
              )}
              {account.blocked ? (
                <MenuItem icon={UserCheck} onSelect={() => onDecide('unblock', account)} className="text-jade data-[highlighted]:bg-jade/10 data-[highlighted]:text-jade">
                  {t('users.actions.unblock')}
                </MenuItem>
              ) : (
                <MenuItem icon={Ban} onSelect={() => onDecide('block', account)} className="text-coral data-[highlighted]:bg-coral/10 data-[highlighted]:text-coral">
                  {t('users.actions.block')}
                </MenuItem>
              )}
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MenuItem({ icon: Icon, onSelect, className, children }: { icon: LucideIcon; onSelect: () => void; className?: string; children: ReactNode }) {
  return (
    <DropdownMenu.Item onSelect={onSelect} className={cn(ITEM, className)}>
      <Icon aria-hidden />
      <span className="flex-1 truncate">{children}</span>
    </DropdownMenu.Item>
  );
}
