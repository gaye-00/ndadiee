import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { useSessionSync } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';
import router from '@/router';

// Composant à part : useSessionSync a besoin du QueryClientProvider au-dessus de lui
function SessionSync() {
  useSessionSync();
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionSync />
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
