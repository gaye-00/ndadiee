import { QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig } from 'motion/react';
import { Direction } from 'radix-ui';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { useSessionSync } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { loadMotionFeatures } from '@/lib/motion';
import { queryClient } from '@/lib/queryClient';

// Composant à part : useSessionSync a besoin du QueryClientProvider au-dessus de lui
function SessionSync() {
  useSessionSync();
  return null;
}

/**
 * Contextes partagés par toute l'application : cache des données, sens d'écriture, animations,
 * notifications.
 */
export default function AppProviders({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const reducedMotion = useReducedMotion();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Sens d'écriture des composants Radix (menus, onglets…) : de droite à gauche en arabe */}
      <Direction.Provider dir={language.dir}>
        {/* Animations Motion : coupées comme en CSS (réglage du système, mode économie de données) */}
        <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
          <LazyMotion features={loadMotionFeatures}>
            <SessionSync />
            {children}
            <Toaster position={language.dir === 'rtl' ? 'top-left' : 'top-right'} dir={language.dir} />
          </LazyMotion>
        </MotionConfig>
      </Direction.Provider>
    </QueryClientProvider>
  );
}
