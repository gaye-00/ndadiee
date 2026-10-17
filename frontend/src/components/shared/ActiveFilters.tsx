import { X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const ease = [0.16, 1, 0.3, 1] as const;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/** Un filtre choisi : son nom, son motif, son logo ou son drapeau, et de quoi le retirer */
export interface ActiveFilter {
  key: string;
  label: string;
  icon?: ReactNode;
  remove: () => void;
}

interface ActiveFiltersProps {
  filters: readonly ActiveFilter[];
  /** Retire tous les filtres (« Tout effacer », dès qu'il y en a deux) */
  onClear: () => void;
  /** Le nombre de résultats : il prend le focus après un retrait, et dit le nouveau résultat */
  resultsId: string;
  className?: string;
}

/**
 * Les filtres choisis d'une page à filtrer (vitrine, annonces), en pastilles : un clic en retire un, « Tout
 * effacer » les retire tous. Le focus va ensuite au nombre de résultats, qui dit le nouveau résultat.
 */
export default function ActiveFilters({ filters, onClear, resultsId, className }: ActiveFiltersProps) {
  const { t } = useTranslation();

  const then = (action: () => void) => () => {
    action();
    document.getElementById(resultsId)?.focus({ preventScroll: true });
  };

  return (
    <ul aria-label={t('filters.activeFilters')} className={cn('flex flex-wrap items-center gap-2 empty:hidden', className)}>
      <AnimatePresence initial={false} mode="popLayout">
        {filters.map((filter) => (
          <m.li
            key={filter.key}
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.25, ease }}
          >
            <button
              type="button"
              onClick={then(filter.remove)}
              aria-label={t('filters.remove', { label: filter.label })}
              className={cn(
                'group/chip inline-flex h-8 max-w-[16rem] items-center gap-1.5 rounded-full border border-glass-border bg-glass ps-2.5 pe-1 text-[0.8125rem] font-semibold text-soft-foreground',
                'transition-[border-color,color] duration-300 hover:border-border-strong hover:text-foreground',
                focusRing,
              )}
            >
              {filter.icon && (
                <span aria-hidden className="grid shrink-0 place-items-center">
                  {filter.icon}
                </span>
              )}
              <span dir="auto" className="truncate">
                {filter.label}
              </span>
              <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full transition-colors group-hover/chip:bg-foreground/8">
                <X className="size-3.5" />
              </span>
            </button>
          </m.li>
        ))}
        {filters.length > 1 && (
          <m.li key="clear" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease }}>
            <button
              type="button"
              onClick={then(onClear)}
              className={cn('h-8 rounded-full px-2 text-[0.8125rem] font-bold text-gold underline-offset-4 hover:underline', focusRing)}
            >
              {t('filters.clear')}
            </button>
          </m.li>
        )}
      </AnimatePresence>
    </ul>
  );
}
