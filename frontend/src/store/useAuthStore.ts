import { create } from 'zustand';
import type { UserResponse } from '@/types/auth.types';
import { queryClient } from '@/lib/queryClient';
import { storage } from '@/utils/storage';

interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  setAuth: (user: UserResponse, accessToken: string, refreshToken: string) => void;
  setUser: (user: UserResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  // Initialisation depuis le storage au démarrage de l'app
  user: storage.getUser(),
  accessToken: storage.getAccessToken(),
  isAuthenticated: !!(storage.getAccessToken() && storage.getUser()),

  setAuth: (user, accessToken, refreshToken) => {
    storage.setTokens(accessToken, refreshToken);
    storage.setUser(user);
    set({ user, accessToken, isAuthenticated: true });
  },

  setUser: (user) => {
    storage.setUser(user);
    set({ user });
  },

  logout: () => {
    storage.clearAll();
    // Les réponses en cache portent des champs propres à l'utilisateur (son vote, « suivi par moi »...) :
    // on vide tout pour que le suivant ne voie pas les données du précédent
    queryClient.clear();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
