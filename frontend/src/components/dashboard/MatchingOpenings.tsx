import { m } from 'motion/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardSectionTitle from './DashboardSectionTitle';
import EmptyState from '@/components/feedback/EmptyState';
import OpeningCard, { OpeningCardSkeleton, type BoardOpening } from '@/components/openings/OpeningCard';
import ApplyDialog from '@/components/projects/ApplyDialog';
import { useAuth } from '@/hooks/useAuth';
import { useOpenings } from '@/hooks/useOpenings';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { OpeningFilters, ProjectOpening } from '@/types/project.types';

// Les plus proches du profil, parmi assez d'annonces pour en garder deux après le tri
const MATCHING_FILTERS = { sort: 'match', size: 8 } as const satisfies OpeningFilters;
const SHOWN = 2;
// Comme sur la page des annonces : à partir de ce score, la plus proche est entourée d'un fil kente
const BEST_MATCH = 60;

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Les annonces où le membre peut postuler et qui lui correspondent : pas celles de ses équipes, ni celles où sa
 * candidature attend déjà.
 */
function candidatesOf(openings: ProjectOpening[]): BoardOpening[] {
  return openings.filter(
    (opening): opening is BoardOpening =>
      opening.project !== null &&
      (opening.match?.score ?? 0) > 0 &&
      !opening.appliedByMe &&
      opening.project.myMembershipStatus === null,
  );
}

/**
 * « Annonces qui correspondent à ta stack », avec le score de compatibilité. Design 3B.
 *
 * Les deux rôles ouverts les plus proches du profil du membre (OpeningMatcher), sur les cartes de la page des
 * annonces : la plus proche entourée du fil kente qui tourne. « Postuler » ouvre la candidature ici même. Sans
 * compétence dans son profil, l'atelier l'invite à les renseigner.
 */
export default function MatchingOpenings() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const openings = useOpenings(MATCHING_FILTERS);
  const matching = useMemo(() => candidatesOf(openings.data?.content ?? []).slice(0, SHOWN), [openings.data]);
  const noSkills = (user?.skills?.length ?? 0) === 0;

  // La candidature : l'annonce reste après la fermeture, le temps que la fenêtre s'en aille
  const [applying, setApplying] = useState<BoardOpening | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (openings.isError) {
    return null;
  }

  return (
    <section aria-labelledby="atelier-annonces-title">
      <DashboardSectionTitle
        id="atelier-annonces-title"
        action={matching.length > 0 ? { to: paths.openings, label: t('openings.all'), preload: pages.openings } : undefined}
      >
        {t('openings.title')}
      </DashboardSectionTitle>

      <div className="@container mt-3.5">
        {openings.isPending ? (
          <div className="grid gap-3.5 @2xl:grid-cols-2">
            <OpeningCardSkeleton />
            <div className="hidden @2xl:block">
              <OpeningCardSkeleton />
            </div>
          </div>
        ) : matching.length === 0 ? (
          noSkills ? (
            <EmptyState
              title={t('openings.noSkillsTitle')}
              description={t('openings.noSkillsText')}
              action={{ to: paths.settings, label: t('openings.noSkillsAction') }}
            />
          ) : (
            <EmptyState
              title={t('openings.emptyTitle')}
              description={t('openings.emptyText')}
              action={{ to: paths.openings, label: t('openings.emptyAction') }}
            />
          )
        ) : (
          <ul className="grid gap-3.5 @2xl:grid-cols-2">
            {matching.map((opening, index) => (
              <m.li
                key={opening.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -30px 0px' }}
                transition={{ duration: 0.55, ease, delay: index * 0.08 }}
              >
                <OpeningCard
                  opening={opening}
                  index={index}
                  best={index === 0 && (opening.match?.score ?? 0) >= BEST_MATCH}
                  onApply={() => {
                    setApplying(opening);
                    setDialogOpen(true);
                  }}
                />
              </m.li>
            ))}
          </ul>
        )}
      </div>

      {applying && <ApplyDialog project={applying.project} opening={applying} open={dialogOpen} onOpenChange={setDialogOpen} />}
    </section>
  );
}
