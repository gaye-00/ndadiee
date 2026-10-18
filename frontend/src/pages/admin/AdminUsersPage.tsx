import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ChoiceChips from '@/components/admin/ChoiceChips';
import Pager from '@/components/admin/Pager';
import ReasonDialog from '@/components/admin/ReasonDialog';
import UserRow, { type UserDecision } from '@/components/admin/UserRow';
import ErrorState from '@/components/feedback/ErrorState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import FilterSearch from '@/components/shared/FilterSearch';
import { useAdminUsers, useBlockUser, useChangeRole, useUnblockUser } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { cn } from '@/lib/utils';
import type { AccountStatus, AdminUser } from '@/types/admin.types';
import type { Role } from '@/types/user.types';
import { formatNumber } from '@/utils/formatters';

const STATUSES = ['all', 'ACTIVE', 'BLOCKED'] as const satisfies ReadonlyArray<'all' | AccountStatus>;
const ROLES = ['all', 'USER', 'MODERATOR', 'ADMIN'] as const satisfies ReadonlyArray<'all' | Role>;

// Une valeur de l'URL, si elle fait partie des choix ; « all » sinon
function choice<T extends string>(value: string | undefined, options: readonly T[]): T {
  return options.find((option) => option === value) ?? options[0];
}

/**
 * Les comptes de la plateforme : les chercher (nom, @utilisateur, e-mail), les filtrer par état et par rôle, et
 * décider (suspendre avec un motif, réactiver, nommer ou retirer un modérateur). Les filtres vivent dans l'URL :
 * « les comptes suspendus » se partage.
 */
export default function AdminUsersPage() {
  const { t } = useTranslation('admin');
  const { user } = useAuth();
  const { get, page, update } = useUrlFilters();
  const q = get('q') ?? '';
  const status = choice(get('status'), STATUSES);
  const role = choice(get('role'), ROLES);
  const users = useAdminUsers({
    q: q || undefined,
    status: status === 'all' ? undefined : status,
    role: role === 'all' ? undefined : role,
    page,
  });

  // La décision en cours : elle reste là pendant que sa fenêtre se referme
  const [decision, setDecision] = useState<{ type: UserDecision; account: AdminUser } | null>(null);
  const [open, setOpen] = useState(false);
  const block = useBlockUser();
  const unblock = useUnblockUser();
  const changeRole = useChangeRole();
  const name = decision?.account.fullName ?? '';

  function decide(type: UserDecision, account: AdminUser) {
    setDecision({ type, account });
    setOpen(true);
  }

  function done(message: string) {
    toast.success(message);
    setOpen(false);
  }

  function confirm(reason?: string) {
    if (!decision) {
      return;
    }
    const { type, account } = decision;
    if (type === 'block' && reason) {
      block.mutate({ id: account.id, reason }, { onSuccess: () => done(t('users.toast.blocked', { name: account.fullName })) });
    } else if (type === 'unblock') {
      unblock.mutate(account.id, { onSuccess: () => done(t('users.toast.unblocked', { name: account.fullName })) });
    } else if (type === 'makeModerator' || type === 'makeMember') {
      const next: Role = type === 'makeModerator' ? 'MODERATOR' : 'USER';
      changeRole.mutate(
        { id: account.id, role: next },
        { onSuccess: () => done(t(type === 'makeModerator' ? 'users.toast.moderator' : 'users.toast.member', { name: account.fullName })) },
      );
    }
  }

  return (
    <div className="mx-auto max-w-[82rem] px-4 pb-20 sm:px-6 lg:px-10">
      <AdminPageHeader eyebrow={t('shell.brand')} title={t('users.title')} lead={t('users.lead')}>
        {users.data && (
          <p className="font-mono text-xs text-muted-foreground lg:pb-1">
            {t('users.count', { count: users.data.totalElements, formatted: formatNumber(users.data.totalElements) })}
          </p>
        )}
      </AdminPageHeader>

      <section aria-label={t('users.filters')} className="flex flex-col gap-3">
        <div className="glass flex rounded-[1.375rem] p-1.5 backdrop-blur-xl saver:bg-background">
          <FilterSearch
            query={q}
            onSearch={(next, replace) => update({ q: next || null, page: null }, { replace })}
            fetchingKey={['admin', 'users']}
            label={t('users.search')}
            placeholder={t('users.searchPlaceholder')}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ChoiceChips
            label={t('users.status.label')}
            options={STATUSES.map((value) => ({ value, label: t(`users.status.${value}`) }))}
            value={status}
            onChange={(value) => update({ status: value === 'all' ? null : value, page: null })}
            layoutId="admin-users-status"
          />
          <ChoiceChips
            label={t('users.role.label')}
            options={ROLES.map((value) => ({ value, label: value === 'all' ? t('users.role.all') : t(`roles.${value}`) }))}
            value={role}
            onChange={(value) => update({ role: value === 'all' ? null : value, page: null })}
            layoutId="admin-users-role"
          />
        </div>
      </section>

      <div className="mt-6">
        {users.isPending && <RowsSkeleton label={t('users.loading')} />}
        {users.isError && <ErrorState title={t('users.errorTitle')} description={t('shared.errorText')} onRetry={() => void users.refetch()} />}
        {users.data &&
          (users.data.content.length === 0 ? (
            <div className="glass flex flex-col items-start gap-2 rounded-2xl p-6">
              <span aria-hidden className="mb-1 size-10 rounded-xl bg-kente-conic opacity-80" />
              <p className="font-bold">{t('users.empty.title')}</p>
              <p className="text-[0.8125rem] text-muted-foreground">{t('users.empty.text')}</p>
            </div>
          ) : (
            <>
              <ul className={cn('flex flex-col gap-2.5 transition-opacity', users.isPlaceholderData && 'opacity-60')}>
                {users.data.content.map((account) => (
                  <UserRow key={account.id} account={account} self={account.id === user?.id} onDecide={decide} />
                ))}
              </ul>
              <Pager
                page={users.data.page}
                totalPages={users.data.totalPages}
                onChange={(next) => {
                  update({ page: next === 0 ? null : String(next) });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="mt-6"
              />
            </>
          ))}
      </div>

      <ReasonDialog
        open={open && decision?.type === 'block'}
        onOpenChange={setOpen}
        title={t('users.blockDialog.title', { name })}
        description={t('users.blockDialog.description')}
        reasonLabel={t('users.blockDialog.reasonLabel')}
        confirmLabel={t('users.blockDialog.confirm')}
        destructive
        pending={block.isPending}
        onConfirm={confirm}
      />
      <ConfirmDialog
        open={open && decision?.type === 'unblock'}
        onOpenChange={setOpen}
        title={t('users.unblockDialog.title', { name })}
        description={t('users.unblockDialog.description')}
        confirmLabel={t('users.unblockDialog.confirm')}
        pending={unblock.isPending}
        onConfirm={() => confirm()}
      />
      <ConfirmDialog
        open={open && (decision?.type === 'makeModerator' || decision?.type === 'makeMember')}
        onOpenChange={setOpen}
        title={t(decision?.type === 'makeMember' ? 'users.roleDialog.memberTitle' : 'users.roleDialog.moderatorTitle', { name })}
        description={t(decision?.type === 'makeMember' ? 'users.roleDialog.memberText' : 'users.roleDialog.moderatorText')}
        confirmLabel={t(decision?.type === 'makeMember' ? 'users.roleDialog.memberConfirm' : 'users.roleDialog.moderatorConfirm')}
        pending={changeRole.isPending}
        onConfirm={() => confirm()}
      />
    </div>
  );
}

/** Même encombrement que la liste, pendant le chargement. */
function RowsSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-2.5">
      {[0, 1, 2, 3, 4].map((row) => (
        <span key={row} className="h-[5.5rem] rounded-2xl skeleton-shimmer" />
      ))}
    </div>
  );
}
