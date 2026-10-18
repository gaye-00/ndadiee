import { useTranslation } from 'react-i18next';
import ActionList from '@/components/admin/ActionList';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ChoiceChips from '@/components/admin/ChoiceChips';
import Pager from '@/components/admin/Pager';
import ErrorState from '@/components/feedback/ErrorState';
import { useAdminActions } from '@/hooks/useAdmin';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { cn } from '@/lib/utils';
import type { AdminTargetType } from '@/types/admin.types';
import { formatNumber } from '@/utils/formatters';

const TARGETS = ['all', 'USER', 'QUESTION', 'ANSWER', 'PROJECT'] as const satisfies ReadonlyArray<'all' | AdminTargetType>;

/**
 * Le journal de l'administration : chaque décision de l'équipe, avec son motif, les plus récentes d'abord. Il ne
 * s'efface pas. Filtrable par cible (comptes, sujets, réponses, projets), dans l'URL.
 */
export default function AdminJournalPage() {
  const { t } = useTranslation('admin');
  const { get, page, update } = useUrlFilters();
  const target = TARGETS.find((value) => value === get('target')) ?? 'all';
  const actions = useAdminActions({ targetType: target === 'all' ? undefined : target, page });

  return (
    <div className="mx-auto max-w-[60rem] px-4 pb-20 sm:px-6 lg:px-10">
      <AdminPageHeader eyebrow={t('shell.brand')} title={t('journal.title')} lead={t('journal.lead')}>
        {actions.data && (
          <p className="font-mono text-xs text-muted-foreground lg:pb-1">
            {t('journal.count', { count: actions.data.totalElements, formatted: formatNumber(actions.data.totalElements) })}
          </p>
        )}
      </AdminPageHeader>

      <ChoiceChips
        label={t('journal.filter')}
        options={TARGETS.map((value) => ({ value, label: t(`journal.targets.${value}`) }))}
        value={target}
        onChange={(value) => update({ target: value === 'all' ? null : value, page: null })}
        layoutId="admin-journal-target"
      />

      <div className="mt-6">
        {actions.isPending && <span role="status" aria-label={t('journal.loading')} className="block h-96 rounded-[1.375rem] skeleton-shimmer" />}
        {actions.isError && <ErrorState title={t('journal.errorTitle')} description={t('shared.errorText')} onRetry={() => void actions.refetch()} />}
        {actions.data &&
          (actions.data.content.length === 0 ? (
            <div className="glass flex flex-col items-start gap-2 rounded-2xl p-6">
              <span aria-hidden className="mb-1 size-10 rounded-xl bg-kente-conic opacity-80" />
              <p className="font-bold">{t('journal.empty.title')}</p>
              <p className="text-[0.8125rem] text-muted-foreground">{t('journal.empty.text')}</p>
            </div>
          ) : (
            <>
              <div className={cn('glass rounded-[1.375rem] px-5 py-1.5 transition-opacity sm:px-6', actions.isPlaceholderData && 'opacity-60')}>
                <ActionList actions={actions.data.content} />
              </div>
              <Pager
                page={actions.data.page}
                totalPages={actions.data.totalPages}
                onChange={(next) => {
                  update({ page: next === 0 ? null : String(next) });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="mt-6"
              />
            </>
          ))}
      </div>
    </div>
  );
}
