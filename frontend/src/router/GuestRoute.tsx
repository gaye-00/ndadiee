import { Navigate, Outlet, useLocation, type Location } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { paths } from './paths';

/**
 * Pages de connexion et d'inscription. Dès que la session est ouverte, renvoie vers la page
 * protégée que l'utilisateur voulait atteindre (posée par ProtectedRoute), ou vers le fil.
 */
export default function GuestRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const from = (location.state as { from?: Location } | null)?.from;
    return <Navigate to={from ? `${from.pathname}${from.search}` : paths.feed} replace />;
  }

  return <Outlet />;
}
