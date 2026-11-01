import { ArrowLeft, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import NotFoundContent from './NotFoundContent';
import { statusPrimaryAction, statusSecondaryAction } from './statusActions';
import { CRASH_MOTIFS, OFFLINE_MOTIFS, UPDATE_MOTIFS } from './statusMotifs';
import StatusPage from './StatusPage';
import { useAuth } from '@/hooks/useAuth';
import { paths } from '@/router/paths';

type Failure = 'notFound' | 'update' | 'offline' | 'crash';

// Le code d'une page n'a pas pu être téléchargé : selon le navigateur, l'un de ces messages
const CHUNK_FAILURE = /dynamically imported module|importing a module script failed|loading chunk|chunkloaderror|unable to preload css/i;

function failureOf(error: unknown): Failure {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return 'notFound';
  }
  if (error instanceof Error && CHUNK_FAILURE.test(`${error.name} ${error.message}`)) {
    // En ligne, c'est qu'un déploiement a remplacé les fichiers de la version que cet onglet a chargée
    return navigator.onLine ? 'update' : 'offline';
  }
  return 'crash';
}

/**
 * Erreur de navigation : page introuvable, échec de chargement ou bug d'affichage. Chacune dit ce qui se passe et
 * comment en sortir ; recharger repart d'une application saine, y compris vers l'accueil. Le détail technique n'est
 * montré qu'en développement.
 *
 * Sur la route racine, `standalone` : aucune coquille autour, la page porte le logo.
 */
export default function RouteErrorBoundary({ standalone = false }: { standalone?: boolean }) {
  const { t } = useTranslation();
  const { isAuthenticated, home } = useAuth();
  const error = useRouteError();
  const failure = failureOf(error);

  if (failure === 'notFound') {
    return <NotFoundContent standalone={standalone} />;
  }

  const homePath = isAuthenticated ? home : paths.landing;
  const content = {
    update: { motifs: UPDATE_MOTIFS, title: t('errorPages.updateTitle'), description: t('errorPages.updateText') },
    offline: { motifs: OFFLINE_MOTIFS, title: t('states.offline'), description: t('errorPages.offlineText') },
    crash: { motifs: CRASH_MOTIFS, title: t('errorPages.crashTitle'), description: t('errorPages.crashText') },
  }[failure];

  return (
    <StatusPage
      {...content}
      alert
      standalone={standalone}
      home={homePath}
      detail={
        import.meta.env.DEV && error instanceof Error ? (
          <pre dir="ltr" className="mt-5 max-h-48 overflow-auto rounded-xl border border-coral/25 bg-coral/8 p-3.5 font-mono text-xs leading-relaxed text-soft-foreground">
            {error.stack ?? error.message}
          </pre>
        ) : undefined
      }
      actions={
        <>
          <button type="button" onClick={() => window.location.reload()} className={statusPrimaryAction}>
            <RotateCw aria-hidden className="size-4.5" />
            {t('errorPages.reload')}
          </button>
          <Link to={homePath} reloadDocument className={statusSecondaryAction}>
            <ArrowLeft aria-hidden className="size-4.5 rtl:-scale-x-100" />
            {t('errorPages.home')}
          </Link>
        </>
      }
    />
  );
}
