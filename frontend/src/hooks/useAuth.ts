import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/useAuthStore';
import type { AuthResponse } from '@/types/auth.types';

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

export function useLogin() {
  const startSession = useSessionStarter();
  return useMutation({
    mutationFn: authService.login,
    onSuccess: startSession,
    meta: { handlesError: true },
  });
}

export function useRegister() {
  const startSession = useSessionStarter();
  return useMutation({
    mutationFn: authService.register,
    onSuccess: startSession,
    meta: { handlesError: true },
  });
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
