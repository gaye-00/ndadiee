import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { paths } from '@/router/paths';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/useAuthStore';
import type { AuthResponse } from '@/types/auth.types';
import { useDebounce } from './useDebounce';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = user?.role === 'ADMIN';

  return {
    user,
    isAuthenticated,
    // Seul un compte développeur participe à la communauté (publier, voter, suivre) ;
    // un compte admin administre la plateforme depuis le back-office
    isDeveloper: user?.userType === 'developer',
    isAdmin,
    canModerate: user?.role === 'MODERATOR' || isAdmin,
    /** L'accueil du compte : le back-office pour un admin, l'atelier pour un développeur */
    home: isAdmin ? paths.admin : paths.dashboard,
    logout,
  };
}

// Ouvre la session, puis fait recharger les données déjà affichées : connecté, les réponses
// de l'API portent en plus les champs propres à l'utilisateur (son vote, « suivi par moi »...). Un compte dont la
// suppression était programmée revient : la connexion l'a annulée, on le lui dit.
function useSessionStarter() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  return (session: AuthResponse) => {
    setAuth(session.user, session.accessToken, session.refreshToken);
    void queryClient.invalidateQueries();
    if (session.deletionCancelled) {
      toast.success(t('auth.deletionCancelled'), { duration: 8000 });
    }
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

/** Inscription : le compte attend le code envoyé par e-mail, pas encore de session (voir useVerifyEmail). */
export function useRegister() {
  return useMutation({
    mutationFn: authService.register,
    meta: { handlesError: true },
  });
}

/** Le code reçu par e-mail : l'adresse est confirmée, la session s'ouvre (avec l'accueil du métier). */
export function useVerifyEmail({ welcome }: SessionOptions = {}) {
  const startSession = useSessionStarter();
  return useMutation({
    mutationFn: authService.verifyEmail,
    onSuccess: async (session) => {
      await welcome?.(session);
      startSession(session);
    },
    meta: { handlesError: true },
  });
}

/** Un nouveau code pour une inscription en attente. */
export function useResendVerification() {
  return useMutation({
    mutationFn: authService.resendVerification,
    meta: { handlesError: true },
  });
}

/** Mot de passe oublié : un code part à l'adresse (la réponse est la même pour une adresse inconnue). */
export function useForgotPassword() {
  return useMutation({
    mutationFn: authService.forgotPassword,
    meta: { handlesError: true },
  });
}

/** Le code reçu et le nouveau mot de passe : la session s'ouvre (avec l'accueil du métier). */
export function useResetPassword({ welcome }: SessionOptions = {}) {
  const startSession = useSessionStarter();
  return useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: async (session) => {
      await welcome?.(session);
      startSession(session);
    },
    meta: { handlesError: true },
  });
}

/** De retour de GitHub ou Google : leur code contre une session, ouverte aussitôt. */
export function useOAuthLogin() {
  const startSession = useSessionStarter();
  return useMutation({
    mutationFn: authService.oauthLogin,
    onSuccess: startSession,
    meta: { handlesError: true },
  });
}

/** Les fournisseurs de connexion configurés sur le serveur : leurs boutons sont actifs, les autres disent « bientôt ». */
export function useOAuthProviders() {
  return useQuery({
    queryKey: ['oauth-providers'],
    queryFn: authService.oauthProviders,
    staleTime: Infinity,
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
