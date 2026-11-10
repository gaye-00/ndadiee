import { useMutation, useQuery } from '@tanstack/react-query';
import { accountService } from '@/services/account.service';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Change le mot de passe. Les autres sessions se ferment ; celle-ci continue avec les nouveaux jetons reçus (les
 * anciens ne valent plus rien).
 */
export function useChangePassword() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: accountService.changePassword,
    onSuccess: (session) => setAuth(session.user, session.accessToken, session.refreshToken),
    meta: { handlesError: true },
  });
}

/** Ce que la suppression du compte ferait : chargé à l'ouverture de la fenêtre de confirmation. */
export function useDeletionPreview(enabled: boolean) {
  return useQuery({
    queryKey: ['account-deletion'],
    queryFn: accountService.deletionPreview,
    enabled,
    staleTime: 0,
  });
}

/** Un code pour confirmer la suppression d'un compte sans mot de passe. */
export function useSendDeletionCode() {
  return useMutation({
    mutationFn: accountService.sendDeletionCode,
    meta: { handlesError: true },
  });
}

/** Programme la suppression du compte (la page ferme ensuite la session). */
export function useRequestDeletion() {
  return useMutation({
    mutationFn: accountService.requestDeletion,
    meta: { handlesError: true },
  });
}
