import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import PageLoader from '@/components/feedback/PageLoader';
import AppProviders from '@/providers/AppProviders';
import router from '@/router';

export default function App() {
  return (
    // Le temps que les traductions de la langue choisie arrivent (le français est déjà dans le bundle)
    <Suspense fallback={<PageLoader />}>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </Suspense>
  );
}
