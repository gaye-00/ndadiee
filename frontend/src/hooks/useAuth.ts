import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/useAuthStore';
import type { AuthResponse } from '@/types/auth.types';
import { useDebounce } from './useDebounce';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  return {
    user,
    isAuthenticated,
    // Seul un compte développeur participe à la communauté (publier, voter, suivre) ;
    // un compte admin modère et publie des opportunités
    isDeveloper: user?.userType === 'developer',
    isAdmin: user?.role === 'ADMIN',
    canModerate: user?.role === 'MODERATOR' || user?.role === 'ADMIN',
    logout,
  };
}

// Ouvre la session, puis fait recharger les données déjà affichées : connecté, les réponses
// de l'API portent en plus les champs propres à l'utilisateur (son vote, « suivi par moi »...)
function useSessionStarter() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  return (session: AuthResponse) => {
    setAuth(session.user, session.accessToken, session.refreshToken);
    void queryClient.invalidateQueries();
  };
}

interface SessionOptions {
  /**
   * Juste avant d'ouvrir la session, donc de quitter la page : le temps d'un accueil (le métier des pages
   * de connexion finit son étoffe). La mutation reste en cours jusqu'à ce que la promesse se tienne.
   */
  welcome?: (session: AuthResponse) => Promise<void>;
}

export function useLogin({ welcome }: SessionOptions = {}) {
  const startSession = useSessionStarter();
  return useMutation({
    mutationFn: authService.login,
    onSuccess: async (session) => {
      await welcome?.(session);
      startSession(session);
    },
    meta: { handlesError: true },
  });
}

export function useRegister({ welcome }: SessionOptions = {}) {
  const startSession = useSessionStarter();
  return useMutation({
    mutationFn: authService.register,
    onSuccess: async (session) => {
      await welcome?.(session);
      startSession(session);
    },
    meta: { handlesError: true },
  });
}

/**
 * Le nom d'utilisateur est-il libre ? Vérifié quand on marque une pause en le tapant, et seulement s'il
 * respecte la règle. Les réponses restent en cache : revenir à un nom déjà vérifié ne coûte rien.
 *
 * @returns la réponse pour le nom tel qu'il est maintenant (sinon undefined), et si une vérification
 *   est en route (pause pas encore atteinte, ou requête en cours)
 */
export function useUsernameAvailability(username: string, valid: boolean) {
  const current = username.trim().toLowerCase();
  const typed = useDebounce(current, 350);
  const settled = typed === current;
  const query = useQuery({
    queryKey: ['username-availability', typed],
    queryFn: () => authService.checkUsername(typed),
    enabled: valid && settled && typed.length > 0,
    staleTime: 1000 * 30,
  });

  return {
    availability: valid && settled ? query.data : undefined,
    checking: valid && (!settled || query.isFetching),
  };
}

/**
 * Au chargement de l'app, rafraîchit le compte gardé en local (réputation, badges, rôle
 * ont pu changer) et vérifie au passage que la session est toujours valide.
 */
export function useSessionSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);

  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: authService.me,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (data) {
      setUser(data);
    }
  }, [data, setUser]);
}
