import { LoaderCircle } from 'lucide-react';

/** Affiché le temps que le code de la première page soit téléchargé. */
export default function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Chargement">
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
