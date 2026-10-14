import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';

interface LogoProps {
  className?: string;
}

/** Nom de la plateforme. Mène au fil une fois connecté, à la page d'accueil sinon. */
export default function Logo({ className }: LogoProps) {
  const { isAuthenticated } = useAuth();

  return (
    <Link
      to={isAuthenticated ? paths.feed : paths.landing}
      className={cn('flex items-center gap-2 text-lg font-bold tracking-tight', className)}
    >
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
        L
      </span>
      Ndadiee
    </Link>
  );
}
