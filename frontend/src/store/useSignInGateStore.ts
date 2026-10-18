import { create } from 'zustand';

/** Ce que le visiteur voulait faire : la fenêtre de connexion le lui dit (components/forum/SignInDialog.tsx) */
export type SignInReason = 'vote' | 'save' | 'answer' | 'comment' | 'ask' | 'follow' | 'feed';

interface SignInGateState {
  reason: SignInReason | null;
  /** L'ancre où revenir après la connexion (« #answers ») */
  hash: string | undefined;
  ask: (reason: SignInReason, hash?: string) => void;
  close: () => void;
}

/** Un geste réservé aux membres, tenté par un visiteur : la fenêtre « Connecte-toi pour continuer ». */
export const useSignInGateStore = create<SignInGateState>()((set) => ({
  reason: null,
  hash: undefined,
  ask: (reason, hash) => set({ reason, hash }),
  close: () => set({ reason: null }),
}));
