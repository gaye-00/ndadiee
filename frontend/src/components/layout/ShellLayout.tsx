import AppLayout from './AppLayout';
import PublicLayout from './PublicLayout';
import { useAuth } from '@/hooks/useAuth';

/**
 * Pages de la plateforme : coquille de l'application pour un membre connecté, du visiteur sinon.
 * Un membre garde ainsi la même coquille d'une page à l'autre : seul le contenu change.
 */
export default function ShellLayout() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppLayout /> : <PublicLayout />;
}
