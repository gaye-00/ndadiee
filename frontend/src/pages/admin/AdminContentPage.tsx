import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ChoiceChips from '@/components/admin/ChoiceChips';
import ContentRow, { type ContentDecision } from '@/components/admin/ContentRow';
import Pager from '@/components/admin/Pager';
import ReasonDialog from '@/components/admin/ReasonDialog';
import ErrorState from '@/components/feedback/ErrorState';
import FilterSearch from '@/components/shared/FilterSearch';
import { useAdminContent, useDeleteContent, useHideContent, useUnhideContent } from '@/hooks/useAdmin';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { cn } from '@/lib/utils';
import type { AdminContent, ModeratedContent, Visibility } from '@/types/admin.types';
import { formatNumber } from '@/utils/formatters';

const TYPES = ['QUESTION', 'ANSWER', 'PROJECT'] as const satisfies readonly ModeratedContent[];
const VISIBILITIES = ['all', 'VISIBLE', 'HIDDEN'] as const satisfies ReadonlyArray<'all' | Visibility>;

// Une valeur de l'URL, si elle fait partie des choix ; le premier sinon
function choice<T extends string>(value: string | undefined, options: readonly T[]): T {
  return options.find((option) => option === value) ?? options[0];
}

/**
 * Les contenus de la plateforme : sujets du forum, réponses, projets, masqués compris. Masquer (avec un motif) les
 * retire des pages publiques sans rien perdre ; rétablir les remet tels quels ; supprimer est définitif. Les
 * filtres vivent dans l'URL : « les réponses masquées » se partage.
 */
export default function AdminContentPage() {
  const { t } = useTranslation('admin');
  const { get, page, update } = useUrlFilters();
  const type = choice(get('type'), TYPES);
  const visibility = choice(get('visibility'), VISIBILITIES);
  const q = get('q') ?? '';
  const content = useAdminContent({ type, q: q || undefined, visibility: visibility === 'all' ? undefined : visibility, page });

  const [decision, setDecision] = useState<{ type: 'hide' | 'delete'; content: AdminContent } | null>(null);
  const [open, setOpen] = useState(false);
  const hide = useHideContent();
  const unhide = useUnhideContent();
  const remove = useDeleteContent();
  // Le contenu dont une décision est en route
  const busyId = unhide.isPending ? unhide.variables?.id : undefined;

  function decide(next: ContentDecision, item: AdminContent) {
    if (next === 'unhide') {
      unhide.mutate({ type: item.type, id: item.id }, { onSuccess: () => toast.success(t('content.toast.unhidden')) });
      return;
    }
    setDecision({ type: next, content: item });
    setOpen(true);
  }

  function confirm(reason: string) {
    if (!decision) {
      return;
    }
    const { type: action, content: item } = decision;
    const onSuccess = () => {
      toast.success(t(action === 'hide' ? 'content.toast.hidden' : 'content.toast.deleted'));
      setOpen(false);
    };
    if (action === 'hide') {
      hide.mutate({ type: item.type, id: item.id, reason }, { onSuccess });
    } else {
      remove.mutate({ type: item.type, id: item.id, reason: reason || undefined }, { onSuccess });
    }
  }

  const title = decision ? (decision.content.type === 'ANSWER' ? t('content.answerTo', { title: decision.content.title }) : decision.content.title) : '';

  return (
    <div className="mx-auto max-w-[82rem] px-4 pb-20 sm:px-6 lg:px-10">
      <AdminPageHeader eyebrow={t('shell.brand')} title={t('content.title')} lead={t('content.lead')}>
        {content.data && (
          <p className="font-mono text-xs text-muted-foreground lg:pb-1">
            {t('content.count', { count: content.data.totalElements, formatted: formatNumber(content.data.totalElements) })}
          </p>
        )}
      </AdminPageHeader>

      <section aria-label={t('content.filters')} className="flex flex-col gap-3">
        <ChoiceChips
          label={t('content.typeLabel')}
          options={TYPES.map((value) => ({ value, label: t(`content.types.${value}`) }))}
          value={type}
          onChange={(value) => update({ type: value === 'QUESTION' ? null : value, page: null })}
          layoutId="admin-content-type"
        />
        <div className="glass flex rounded-[1.375rem] p-1.5 backdrop-blur-xl saver:bg-background">
          <FilterSearch
            query={q}
            onSearch={(next, replace) => update({ q: next || null, page: null }, { replace })}
            fetchingKey={['admin', 'content']}
            label={t('content.search')}
            placeholder={t('content.searchPlaceholder')}
          />
        </div>
        <ChoiceChips
          label={t('content.visibility.label')}
          options={VISIBILITIES.map((value) => ({ value, label: t(`content.visibility.${value}`) }))}
          value={visibility}
          onChange={(value) => update({ visibility: value === 'all' ? null : value, page: null })}
          layoutId="admin-content-visibility"
        />
      </section>

      <div className="mt-6">
        {content.isPending && (
          <div role="status" aria-label={t('content.loading')} className="flex flex-col gap-2.5">
            {[0, 1, 2, 3].map((row) => (
              <span key={row} className="h-40 rounded-2xl skeleton-shimmer" />
            ))}
          </div>
        )}
        {content.isError && (
          <ErrorState title={t('content.errorTitle')} description={t('shared.errorText')} onRetry={() => void content.refetch()} />
        )}
        {content.data &&
          (content.data.content.length === 0 ? (
            <div className="glass flex flex-col items-start gap-2 rounded-2xl p-6">
              <span aria-hidden className="mb-1 size-10 rounded-xl bg-kente-conic opacity-80" />
              <p className="font-bold">{t('content.empty.title')}</p>
              <p className="text-[0.8125rem] text-muted-foreground">{t('content.empty.text')}</p>
            </div>
          ) : (
            <>
              <ul className={cn('flex flex-col gap-2.5 transition-opacity', content.isPlaceholderData && 'opacity-60')}>
                {content.data.content.map((item) => (
                  <ContentRow key={`${item.type}-${item.id}`} content={item} busy={busyId === item.id} onDecide={decide} />
                ))}
              </ul>
              <Pager
                page={content.data.page}
                totalPages={content.data.totalPages}
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
        open={open && decision?.type === 'hide'}
        onOpenChange={setOpen}
        title={t('content.hideDialog.title')}
        description={
          <>
            <span className="mb-2 block font-semibold text-foreground">« {title} »</span>
            {t('content.hideDialog.description')}
          </>
        }
        reasonLabel={t('content.hideDialog.reasonLabel')}
        confirmLabel={t('content.hideDialog.confirm')}
        pending={hide.isPending}
        onConfirm={confirm}
      />
      <ReasonDialog
        open={open && decision?.type === 'delete'}
        onOpenChange={setOpen}
        title={t('content.deleteDialog.title')}
        description={
          <>
            <span className="mb-2 block font-semibold text-foreground">« {title} »</span>
            {t(`content.deleteDialog.description.${decision?.content.type ?? 'QUESTION'}`)}
          </>
        }
        reasonLabel={t('content.deleteDialog.reasonLabel')}
        confirmLabel={t('content.deleteDialog.confirm')}
        required={false}
        destructive
        pending={remove.isPending}
        onConfirm={confirm}
      />
    </div>
  );
}
