import { Navigate, Outlet, useLocation, type Location } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { paths } from './paths';

/**
 * Pages de connexion et d'inscription. Dès que la session est ouverte, renvoie vers la page
 * protégée que l'utilisateur voulait atteindre (posée par ProtectedRoute), ou vers son atelier.
 */
export default function GuestRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const from = (location.state as { from?: Location } | null)?.from;
    // Avec son ancre : « #role-12 » ramène au rôle du projet pour lequel on voulait postuler
    return <Navigate to={from ? `${from.pathname}${from.search}${from.hash}` : paths.dashboard} replace />;
  }

  return <Outlet />;
}
