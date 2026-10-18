import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { useSignInGateStore, type SignInReason } from '@/store/useSignInGateStore';

/**
 * Un geste réservé aux membres (voter, enregistrer, répondre, suivre) : fait tout de suite pour un membre connecté ;
 * pour un visiteur, la fenêtre « Connecte-toi pour continuer » s'ouvre à la place, qui dit ce que la connexion
 * permettra.
 *
 * @returns `(reason, action, hash?)` ; `hash` : l'ancre où revenir après la connexion (« #answers »)
 */
export function useMemberAction() {
  const { isAuthenticated } = useAuth();
  const ask = useSignInGateStore((s) => s.ask);
  return useCallback(
    (reason: SignInReason, action: () => void, hash?: string) => {
      if (isAuthenticated) {
        action();
      } else {
        ask(reason, hash);
      }
    },
    [isAuthenticated, ask],
  );
}
