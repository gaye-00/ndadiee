import { createBrowserRouter } from 'react-router-dom';
import GuestRoute from './GuestRoute';
import type { RouteHandle } from './handle';
import { pages, type PageName } from './pages';
import { paths } from './paths';
import ProtectedRoute from './ProtectedRoute';
import PageLoader from '@/components/feedback/PageLoader';
import RouteErrorBoundary from '@/components/feedback/RouteErrorBoundary';
import AuthLayout from '@/components/layout/AuthLayout';
import PublicLayout from '@/components/layout/PublicLayout';
import RootLayout from '@/components/layout/RootLayout';
import ShellLayout from '@/components/layout/ShellLayout';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';

/**
 * Page chargée à la demande : son code n'est téléchargé qu'à la première visite, ou plus tôt au
 * survol d'un lien (voir lib/prefetch.ts). Son nom donne aussi le titre de l'onglet.
 */
function page(name: PageName) {
  return {
    lazy: async () => ({ Component: (await pages[name]()).default }),
    handle: { page: name } satisfies RouteHandle,
  };
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    // Erreur dans une coquille elle-même ; les erreurs de page s'affichent plus bas, dans la coquille
    errorElement: <RouteErrorBoundary />,
    // Premier chargement : code de la page demandée
    hydrateFallbackElement: <PageLoader />,
    children: [
      // ── Accueil du visiteur : barre flottante et pied de page (design 3A) ──
      {
        element: <PublicLayout />,
        children: [{ errorElement: <RouteErrorBoundary />, children: [{ index: true, ...page('landing') }] }],
      },

      // ── Connexion et inscription, réservées aux visiteurs ──
      {
        element: <GuestRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              {
                errorElement: <RouteErrorBoundary />,
                children: [
                  { path: paths.login, ...page('login') },
                  { path: paths.register, ...page('register') },
                ],
              },
            ],
          },
        ],
      },

      // ── Plateforme : coquille de l'application une fois connecté, du visiteur sinon ──
      {
        element: <ShellLayout />,
        children: [
          {
            errorElement: <RouteErrorBoundary />,
            children: [
              // Ouvert à tous
              { path: paths.showcase, ...page('showcase') },
              { path: paths.project(':slug'), ...page('project') },
              { path: paths.openings, ...page('openings') },
              { path: paths.hackathons, ...page('hackathons') },
              { path: paths.hackathon(':slug'), ...page('hackathon') },
              { path: paths.forum, ...page('forum') },
              { path: paths.topic(':slug'), ...page('topic') },
              { path: paths.profile(':username'), ...page('profile') },
              { path: paths.search, ...page('search') },

              // Réservé aux membres connectés : sinon, direction /login puis retour ici
              {
                element: <ProtectedRoute />,
                children: [
                  { path: paths.dashboard, ...page('dashboard') },
                  { path: paths.myProjects, ...page('myProjects') },
                  { path: paths.newProject, ...page('newProject') },
                  {
                    path: paths.workspace(':slug'),
                    element: <WorkspaceLayout />,
                    children: [
                      { index: true, ...page('workspaceBoard') },
                      { path: paths.workspaceReviews(':slug'), ...page('workspaceReviews') },
                      { path: paths.workspaceDevlog(':slug'), ...page('workspaceDevlog') },
                      { path: paths.workspaceRoles(':slug'), ...page('workspaceRoles') },
                      { path: paths.workspaceSettings(':slug'), ...page('workspaceSettings') },
                    ],
                  },
                  { path: paths.review(':slug', ':number'), ...page('review') },
                  { path: paths.reviews, ...page('reviews') },
                  { path: paths.newOpening, ...page('newOpening') },
                  { path: paths.newTopic, ...page('newTopic') },
                  { path: paths.editTopic(':slug'), ...page('editTopic') },
                  { path: paths.messages, ...page('messages') },
                  { path: paths.notifications, ...page('notifications') },
                  { path: paths.settings, ...page('settings') },
                ],
              },

              { path: '*', ...page('notFound') },
            ],
          },
        ],
      },
    ],
  },
]);

export default router;
