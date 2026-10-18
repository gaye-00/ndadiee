import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { paths } from './paths';

/**
 * Le back-office : réservé aux comptes d'administration. Un visiteur passe par /login puis revient ici ; un
 * membre connecté retrouve son atelier. L'API refuse de toute façon (403) : cette garde évite seulement
 * d'afficher une page vide.
 */
export default function AdminRoute() {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={paths.login} state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to={paths.dashboard} replace />;
  }

  return <Outlet />;
}
