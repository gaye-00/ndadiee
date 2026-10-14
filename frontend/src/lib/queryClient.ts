import { MutationCache, QueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/utils/apiError';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** true : le composant affiche lui-même l'erreur (formulaire), pas de toast automatique */
      handlesError?: boolean;
    };
  }
}

export const queryClient = new QueryClient({
  // Toute mutation qui échoue affiche le message du backend, sans que chaque composant ait à le prévoir
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (!mutation.meta?.handlesError) {
        toast.error(getApiErrorMessage(error));
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      // Une seule nouvelle tentative, et seulement si elle a une chance d'aboutir : une réponse 4xx
      // (introuvable, interdit, non connecté) sera la même la fois suivante
      retry: (failureCount, error) => {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const clientError = status !== undefined && status >= 400 && status < 500;
        return !clientError && failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});
