import { Archive, GitPullRequestArrow, Inbox, type LucideIcon } from 'lucide-react';
import { m } from 'motion/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import RepositorySyncCard from '@/components/projects/RepositorySyncCard';
import ReviewList from '@/components/reviews/ReviewList';
import { useWorkspaceContext } from '@/components/workspace/workspaceContext';
import { focusRing } from '@/components/workspace/workspaceStyles';
import { reviewTabSlug } from '@/hooks/useReviewFilters';
import { cn } from '@/lib/utils';
import type { ReviewTab } from '@/types/review.types';

// Les revues du projet : ses PR ouvertes d'abord, celles qui attendent le membre, celles qui sont terminées
const VIEWS: ReadonlyArray<{ tab: Extract<ReviewTab, 'TEAM' | 'TO_REVIEW' | 'DONE'>; icon: LucideIcon }> = [
  { tab: 'TEAM', icon: GitPullRequestArrow },
  { tab: 'TO_REVIEW', icon: Inbox },
  { tab: 'DONE', icon: Archive },
];

/**
 * Espace d'équipe, onglet Revues : les pull requests du projet (la liste des revues, réduite à ce projet), et l'état de
 * la lecture de son dépôt GitHub. Tout est dans l'adresse (« ?tab=to-review&project=lagos-transit »), comme sur la page
 * des revues.
 */
export default function WorkspaceReviewsPage() {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab');
  const view = VIEWS.find((candidate) => reviewTabSlug(candidate.tab) === tab);
  const aligned = params.get('project') === slug && view !== undefined;

  // L'adresse dit toujours ce projet, et une des trois vues (ses PR ouvertes par défaut)
  useEffect(() => {
    if (!aligned) {
      const next = new URLSearchParams(params);
      next.set('project', slug);
      next.set('tab', reviewTabSlug(view?.tab ?? 'TEAM'));
      setParams(next, { replace: true, preventScrollReset: true });
    }
  }, [aligned, params, setParams, slug, view]);

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <RepositorySyncCard project={{ slug, name: workspace.project.name, myMembershipStatus: 'ACCEPTED' }} />
      <nav aria-label={t('reviews.label')} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1 rounded-2xl bg-foreground/5 p-1">
          {VIEWS.map((candidate) => {
            const current = candidate.tab === view?.tab;
            const search = new URLSearchParams(params);
            search.set('project', slug);
            search.set('tab', reviewTabSlug(candidate.tab));
            const Icon = candidate.icon;
            return (
              <li key={candidate.tab}>
                <Link
                  to={{ search: `?${search.toString()}` }}
                  replace
                  preventScrollReset
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'relative flex h-9 items-center gap-2 rounded-xl px-3 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors',
                    current ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    focusRing,
                  )}
                >
                  {current && (
                    <m.span
                      layoutId="workspace-reviews-view"
                      aria-hidden
                      transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                      className="absolute inset-0 rounded-xl bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12)]"
                    />
                  )}
                  <Icon aria-hidden className="relative size-4" />
                  <span className="relative">{t(`reviews.${candidate.tab}`)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {aligned && <ReviewList />}
    </div>
  );
}
