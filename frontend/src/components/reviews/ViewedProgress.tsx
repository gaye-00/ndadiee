import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/** Les fichiers vus d'une revue, en un fil tissé or → rouge → vert (l'arbre des fichiers, la barre du diff) */
export default function ViewedProgress({ seen, total, className }: { seen: number; total: number; className?: string }) {
  const { t } = useTranslation('reviews');
  const ratio = total === 0 ? 0 : seen / total;
  return (
    <span
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={seen}
      aria-label={t('files.viewedLabel', { seen, total })}
      className={cn('block h-1 overflow-hidden rounded-full bg-foreground/8', className)}
    >
      <span
        className="block h-full rounded-full bg-linear-to-r from-kente-gold via-kente-coral to-kente-jade transition-[width] duration-500 ease-out-expo"
        style={{ width: `${ratio * 100}%` }}
      />
    </span>
  );
}
