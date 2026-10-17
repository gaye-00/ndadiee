import { create } from 'zustand';

interface AuthLoomState {
  /** Avancement du formulaire, de 0 à 1 : le métier tisse d'autant (components/auth/AuthLoom.tsx) */
  progress: number;
  /** Prénom accueilli une fois la session ouverte : l'étoffe s'achève, son nom y apparaît */
  welcome: string | null;
  setProgress: (progress: number) => void;
  setWelcome: (name: string | null) => void;
  reset: () => void;
}

/**
 * Le lien entre les formulaires de connexion et d'inscription et le métier à tisser de leur mise en page
 * (layout/AuthLayout.tsx) : le formulaire dit où il en est, le métier tisse.
 */
export const useAuthLoomStore = create<AuthLoomState>()((set) => ({
  progress: 0,
  welcome: null,
  setProgress: (progress) => set({ progress: Math.min(1, Math.max(0, progress)) }),
  setWelcome: (welcome) => set({ welcome }),
  reset: () => set({ progress: 0, welcome: null }),
}));
