import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { paths } from './paths';

/** Pages réservées aux utilisateurs connectés : sinon, direction /login puis retour ici. */
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={paths.login} state={{ from: location }} replace />;
  }

  return <Outlet />;
}
