import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import ApplyDialog from './ApplyDialog';
import OpenRoleCard, { type RoleViewer } from './OpenRoleCard';
import EmptyState from '@/components/feedback/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Project, ProjectOpening } from '@/types/project.types';

// Une compatibilité d'au moins ce score fait du rôle « le plus proche du profil »
const BEST_MATCH = 60;

/** Le rôle le plus proche du profil du membre connecté, s'il l'est assez. */
function bestOf(openings: ProjectOpening[]): ProjectOpening | undefined {
  return openings
    .filter((opening) => (opening.match?.score ?? 0) >= BEST_MATCH && !opening.appliedByMe)
    .sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0))[0];
}

/** Les rôles à montrer, demandés par la page (ProjectPage) : `nonce` change à chaque demande */
export interface RolesFocus {
  /** Le rôle d'un lien (« #role-12 ») ; null : celui où l'on a postulé, sinon le plus proche du profil */
  opening: number | null;
  nonce: number;
}

interface OpenRolesListProps {
  project: Project;
  /** Arrivée par un lien vers les rôles, ou « Rejoindre l'équipe » : le rôle visé s'éclaire */
  focus?: RolesFocus | null;
  className?: string;
}

/**
 * « On cherche » : les rôles ouverts du projet, le plus proche du profil mis en avant. Design 3D.
 *
 * « Postuler » ouvre la candidature (ApplyDialog) ; un visiteur passe d'abord par la connexion, et revient
 * ici, sur ce rôle. Quand la page descend jusqu'ici (un lien vers les rôles, « Rejoindre l'équipe »), le rôle
 * visé s'éclaire : celui du lien, sinon le rôle à prendre.
 */
export default function OpenRolesList({ project, focus = null, className }: OpenRolesListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [applying, setApplying] = useState<ProjectOpening | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openings = project.openings;
  const best = bestOf(openings);
  // Le rôle à montrer : celui du lien, sinon celui où l'on a postulé, sinon le plus proche du profil, sinon le premier
  const target =
    openings.find((opening) => opening.id === focus?.opening) ??
    openings.find((opening) => opening.appliedByMe) ??
    best ??
    openings[0];
  const viewer: RoleViewer =
    user?.id === project.owner.id ? 'owner' : project.myMembershipStatus === 'ACCEPTED' ? 'member' : 'visitor';
  const waiting = project.myMembershipStatus === 'PENDING';

  function apply(opening: ProjectOpening) {
    if (!isAuthenticated) {
      // Après la connexion, la page revient sur ce rôle
      void navigate(paths.login, { state: { from: { ...location, hash: `#role-${opening.id}` } } });
      return;
    }
    setApplying(opening);
    setDialogOpen(true);
  }

  return (
    // La page s'arrête avec le titre sous la barre du haut (scroll-mt-24 : ProjectPage en tient compte)
    <section id="roles" aria-labelledby="roles-title" className={cn('min-w-0 scroll-mt-24', className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1.5">
        <h2 id="roles-title" className="font-display text-h4">
          {t('project.roles.title')}
        </h2>
        {openings.length > 0 && <p className="text-sm text-muted-foreground">{t('project.roles.hint')}</p>}
      </div>

      {openings.length === 0 ? (
        <EmptyState title={t('project.roles.none')} className="mt-5" />
      ) : (
        // Les cartes se disposent selon la place de la liste, pas de l'écran (requêtes de conteneur)
        <ul className="@container mt-5 flex flex-col gap-3.5">
          {openings.map((opening, index) => (
            <OpenRoleCard
              key={opening.id}
              opening={opening}
              project={project}
              index={index}
              best={opening.id === best?.id}
              highlight={focus && opening.id === target?.id ? focus.nonce : 0}
              viewer={viewer}
              waiting={waiting}
              onApply={() => apply(opening)}
            />
          ))}
        </ul>
      )}

      <ApplyDialog project={project} opening={applying} open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  );
}
