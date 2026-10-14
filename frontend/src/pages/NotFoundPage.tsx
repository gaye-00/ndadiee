import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { paths } from '@/router/paths';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <p className="text-5xl font-bold tracking-tight">404</p>
      <h1 className="mt-3 text-xl font-semibold">Page introuvable</h1>
      <p className="mt-1 text-sm text-muted-foreground">Cette page n'existe pas, ou a été déplacée.</p>
      <Button asChild className="mt-6">
        <Link to={paths.feed}>Retour au fil</Link>
      </Button>
    </div>
  );
}
