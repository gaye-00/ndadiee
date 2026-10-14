import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import GuestRoute from './GuestRoute';
import { paths } from './paths';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import AuthLayout from '@/components/layout/AuthLayout';
import PageLoader from '@/components/shared/PageLoader';

/**
 * Charge une page à la demande : son code n'est téléchargé qu'à la première visite.
 * Le rendu Markdown et la coloration syntaxique, par exemple, ne pèsent ainsi que sur
 * les pages qui affichent du contenu.
 */
function page(load: () => Promise<{ default: ComponentType }>) {
  return async () => ({ Component: (await load()).default });
}

const router = createBrowserRouter([
  {
    path: paths.landing,
    lazy: page(() => import('@/pages/home/LandingPage')),
    hydrateFallbackElement: <PageLoader />,
  },

  // ── Application : barre de navigation + panneaux latéraux ──
  {
    element: <AppLayout />,
    hydrateFallbackElement: <PageLoader />,
    children: [
      { path: paths.feed, lazy: page(() => import('@/pages/home/FeedPage')) },
      { path: paths.questions, lazy: page(() => import('@/pages/questions/QuestionsPage')) },
      { path: paths.question(':slug'), lazy: page(() => import('@/pages/questions/QuestionDetailPage')) },
      { path: paths.articles, lazy: page(() => import('@/pages/articles/ArticlesPage')) },
      { path: paths.article(':slug'), lazy: page(() => import('@/pages/articles/ArticleDetailPage')) },
      { path: paths.projects, lazy: page(() => import('@/pages/projects/ProjectsPage')) },
      { path: paths.opportunities, lazy: page(() => import('@/pages/opportunities/OpportunitiesPage')) },
      { path: paths.profile(':username'), lazy: page(() => import('@/pages/profile/ProfilePage')) },
      { path: paths.search, lazy: page(() => import('@/pages/search/SearchPage')) },

      // Réservé aux utilisateurs connectés
      {
        element: <ProtectedRoute />,
        children: [
          { path: paths.askQuestion, lazy: page(() => import('@/pages/questions/AskQuestionPage')) },
          { path: paths.notifications, lazy: page(() => import('@/pages/notifications/NotificationsPage')) },
        ],
      },

      { path: '*', lazy: page(() => import('@/pages/NotFoundPage')) },
    ],
  },

  // ── Connexion / inscription ──
  {
    element: <GuestRoute />,
    hydrateFallbackElement: <PageLoader />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: paths.login, lazy: page(() => import('@/pages/auth/LoginPage')) },
          { path: paths.register, lazy: page(() => import('@/pages/auth/RegisterPage')) },
        ],
      },
    ],
  },
]);

export default router;
