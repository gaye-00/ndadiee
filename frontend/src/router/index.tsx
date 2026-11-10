import { createBrowserRouter } from 'react-router-dom';
import AdminRoute from './AdminRoute';
import GuestRoute from './GuestRoute';
import type { RouteHandle } from './handle';
import { layouts, pages, type PageName } from './pages';
import { paths } from './paths';
import ProtectedRoute from './ProtectedRoute';
import PageLoader from '@/components/feedback/PageLoader';
import RouteErrorBoundary from '@/components/feedback/RouteErrorBoundary';
import AdminLayout from '@/components/layout/AdminLayout';
import AuthLayout from '@/components/layout/AuthLayout';
import PublicLayout from '@/components/layout/PublicLayout';
import RootLayout from '@/components/layout/RootLayout';
import ShellLayout from '@/components/layout/ShellLayout';

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
    errorElement: <RouteErrorBoundary standalone />,
    // Premier chargement : code de la page demandée
    hydrateFallbackElement: <PageLoader />,
    children: [
      // ── Accueil du visiteur : barre flottante et pied de page (design 3A) ──
      {
        element: <PublicLayout />,
        children: [
          {
            errorElement: <RouteErrorBoundary />,
            children: [
              { index: true, ...page('landing') },
              { path: paths.privacy, ...page('privacy') },
              { path: paths.terms, ...page('terms') },
            ],
          },
        ],
      },

      // ── Retour de GitHub ou Google : hors des pages de visiteurs, la session s'y ouvre puis la page s'en va ──
      { errorElement: <RouteErrorBoundary standalone />, children: [{ path: paths.oauthCallback(':provider'), ...page('oauthCallback') }] },

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
                  { path: paths.verifyEmail, ...page('verifyEmail') },
                ],
              },
            ],
          },
        ],
      },

      // ── Back-office : comptes d'administration seulement, dans leur propre coquille ──
      {
        element: <AdminRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              {
                errorElement: <RouteErrorBoundary />,
                children: [
                  { path: paths.admin, ...page('admin') },
                  { path: paths.adminUsers, ...page('adminUsers') },
                  { path: paths.adminContent, ...page('adminContent') },
                  { path: paths.adminJournal, ...page('adminJournal') },
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
              { path: paths.projectCode(':slug'), ...page('projectCode') },
              { path: paths.projectDemo(':slug'), ...page('projectDemo') },
              { path: paths.openings, ...page('openings') },
              { path: paths.hackathons, ...page('hackathons') },
              { path: paths.hackathon(':slug'), ...page('hackathon') },
              { path: paths.forum, ...page('forum') },
              { path: paths.topic(':slug'), ...page('topic') },
              { path: paths.profile(':username'), ...page('profile') },
              { path: paths.search, ...page('search') },

              // Ouvert aux membres connectés et aux admins (modération d'un sujet)
              {
                element: <ProtectedRoute allowAdmin />,
                children: [{ path: paths.editTopic(':slug'), ...page('editTopic') }],
              },

              // Réservé aux membres connectés : sinon, direction /login puis retour ici ; un admin, lui, retourne
              // au back-office
              {
                element: <ProtectedRoute />,
                children: [
                  { path: paths.dashboard, ...page('dashboard') },
                  { path: paths.myProjects, ...page('myProjects') },
                  { path: paths.newProject, ...page('newProject') },
                  {
                    path: paths.workspace(':slug'),
                    // Sa coquille aussi est chargée à la demande, avec ses textes
                    lazy: async () => ({ Component: (await layouts.workspace()).default }),
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
                  // /messages et /messages/12 : la même page, qui garde sa liste en ouvrant une conversation
                  { path: paths.conversation(':conversationId?'), ...page('messages') },
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
