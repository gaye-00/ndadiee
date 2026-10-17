import { ChevronDown, RotateCcw } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface LoadMoreProps {
  /** La sentinelle de hooks/useInfiniteScroll : la suite arrive quand elle approche de l'écran */
  sentinel: Ref<HTMLDivElement>;
  /** La page suivante est en route : les cartes en attente se voient déjà au bout de la liste */
  loading: boolean;
  /** La page suivante n'a pas pu se charger */
  failed: boolean;
  /** Économie de données : chaque page attend qu'on la demande */
  manual: boolean;
  onMore: () => void;
  /** « Voir plus de projets », « Chargement de la suite », « La suite n'a pas pu se charger. » */
  moreLabel: string;
  loadingLabel: string;
  errorLabel: string;
}

/**
 * La suite d'une liste qui se déroule (vitrine, annonces) : elle arrive d'elle-même à l'approche du bas, ou à la
 * demande en économie de données. Un échec se dit, et se réessaie.
 */
export default function LoadMore({ sentinel, loading, failed, manual, onMore, moreLabel, loadingLabel, errorLabel }: LoadMoreProps) {
  const { t } = useTranslation();

  return (
    <div ref={sentinel} className="mt-10 flex min-h-11 flex-col items-center justify-center gap-3">
      {failed ? (
        <>
          <p role="alert" className="text-sm text-soft-foreground">
            {errorLabel}
          </p>
          <MoreButton onClick={onMore} icon={<RotateCcw aria-hidden className="size-4" />}>
            {t('actions.retry')}
          </MoreButton>
        </>
      ) : loading ? (
        <span role="status" className="sr-only">
          {loadingLabel}
        </span>
      ) : (
        manual && (
          <MoreButton onClick={onMore} icon={<ChevronDown aria-hidden className="size-4" />}>
            {moreLabel}
          </MoreButton>
        )
      )}
    </div>
  );
}

function MoreButton({ onClick, icon, children }: { onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-11 items-center gap-2.5 rounded-full border border-border-strong px-5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
