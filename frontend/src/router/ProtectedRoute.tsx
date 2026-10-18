import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { paths } from './paths';

interface ProtectedRouteProps {
  /**
   * Page ouverte aussi aux admins (modifier un sujet, comme un modérateur). Sans cela, les pages des membres
   * (atelier, projets, messages…) renvoient un admin vers le back-office : il ne participe pas à la communauté.
   */
  allowAdmin?: boolean;
}

/** Pages réservées aux utilisateurs connectés : sinon, direction /login puis retour ici. */
export default function ProtectedRoute({ allowAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={paths.login} state={{ from: location }} replace />;
  }

  if (isAdmin && !allowAdmin) {
    return <Navigate to={paths.admin} replace />;
  }

  return <Outlet />;
}
