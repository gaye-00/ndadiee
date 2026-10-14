import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/utils/apiError';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

/** Échec du chargement d'une liste ou d'une page : message du backend et bouton pour réessayer. */
export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-lg border border-destructive/30 px-4 py-10 text-center">
      <p className="text-sm">{getApiErrorMessage(error, 'Le chargement a échoué')}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
          Réessayer
        </Button>
      )}
    </div>
  );
}
