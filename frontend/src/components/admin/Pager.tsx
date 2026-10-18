import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const button =
  'inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3.5 text-sm font-semibold transition-colors hover:bg-foreground/5 disabled:pointer-events-none disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

interface PagerProps {
  /** Page affichée, à partir de 0 */
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

/** Précédent, « Page 2 sur 5 », Suivant. Rien quand tout tient sur une page. */
export default function Pager({ page, totalPages, onChange, className }: PagerProps) {
  const { t } = useTranslation('admin');

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label={t('pager.label')} className={cn('flex items-center justify-between gap-3', className)}>
      <button type="button" className={button} disabled={page <= 0} onClick={() => onChange(page - 1)}>
        <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
        {t('pager.previous')}
      </button>
      <span className="font-mono text-xs text-muted-foreground" aria-live="polite">
        {t('pager.page', { page: page + 1, total: totalPages })}
      </span>
      <button type="button" className={button} disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>
        {t('pager.next')}
        <ChevronRight aria-hidden className="size-4 rtl:-scale-x-100" />
      </button>
    </nav>
  );
}
