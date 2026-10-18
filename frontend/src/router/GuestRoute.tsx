import { Navigate, Outlet, useLocation, type Location } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Pages de connexion et d'inscription. Dès que la session est ouverte, renvoie vers la page
 * protégée que l'utilisateur voulait atteindre (posée par ProtectedRoute), sinon vers son accueil :
 * le back-office pour un admin, l'atelier pour un développeur.
 */
export default function GuestRoute() {
  const { isAuthenticated, home } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const from = (location.state as { from?: Location } | null)?.from;
    // Avec son ancre : « #role-12 » ramène au rôle du projet pour lequel on voulait postuler
    return <Navigate to={from ? `${from.pathname}${from.search}${from.hash}` : home} replace />;
  }

  return <Outlet />;
}
