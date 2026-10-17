import type { TFunction } from 'i18next';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link, useMatches, type Params } from 'react-router-dom';
import type { RouteHandle } from '@/router/handle';
import type { PageName } from '@/router/pages';
import { paths } from '@/router/paths';
import { cn } from '@/lib/utils';

interface Crumb {
  label: string;
  to?: string;
  /** Nom de section, écrit en minuscules comme un chemin (« vitrine ») ; un slug reste tel quel */
  section?: boolean;
}

/** Les étapes du chemin vers une page, d'après son nom et les paramètres de son adresse. */
function crumbsOf(page: PageName | undefined, params: Params, t: TFunction): Crumb[] {
  const slug = params.slug ?? '';
  const section = (label: string, to?: string): Crumb => ({ label, to, section: true });
  const project: Crumb = { label: slug, to: paths.project(slug) };

  switch (page) {
    case undefined:
      return [];
    case 'project':
      return [section(t('nav.showcase'), paths.showcase), { label: slug }];
    case 'workspaceBoard':
    case 'workspaceReviews':
    case 'workspaceDevlog':
    case 'workspaceRoles':
    case 'workspaceSettings':
      return [project, section(t(`pages.${page}`))];
    case 'review':
      return [project, section(t('nav.reviews'), paths.workspaceReviews(slug)), { label: `#${params.number ?? ''}` }];
    case 'topic':
      return [section(t('nav.forum'), paths.forum), { label: slug }];
    case 'newTopic':
      return [section(t('nav.forum'), paths.forum), section(t('pages.newTopic'))];
    case 'hackathon':
      return [section(t('nav.hackathons'), paths.hackathons), { label: slug }];
    case 'newOpening':
      return [section(t('nav.openings'), paths.openings), section(t('pages.newOpening'))];
    case 'newProject':
      return [section(t('nav.projects'), paths.myProjects), section(t('pages.newProject'))];
    case 'profile':
      return [{ label: `@${params.username ?? ''}` }];
    default:
      return [section(t(`pages.${page}`))];
  }
}

/**
 * Fil d'Ariane de la barre du haut, en police mono comme un chemin : « / vitrine / lagos-transit ».
 * Design 3C, 3D. Sur téléphone, seules les deux dernières étapes restent.
 */
export default function Breadcrumbs({ className }: { className?: string }) {
  const { t } = useTranslation();
  const matches = useMatches();
  const match = matches.findLast((candidate) => candidate.handle);
  const crumbs = crumbsOf((match?.handle as RouteHandle | undefined)?.page, match?.params ?? {}, t);
  const last = crumbs.length - 1;

  return (
    <nav aria-label={t('a11y.breadcrumb')} className={cn('min-w-0', className)}>
      <ol className="flex min-w-0 items-center gap-1.5 font-mono text-[0.8125rem] text-faint-foreground">
        <AnimatePresence initial={false} mode="popLayout">
          {crumbs.map((crumb, index) => (
            <m.li
              key={`${index}-${crumb.label}`}
              layout="position"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={cn('flex min-w-0 items-center gap-1.5', index < last - 1 && 'max-sm:hidden', index === last && 'min-w-0 shrink')}
            >
              <span aria-hidden className="text-border-strong">
                /
              </span>
              {crumb.to && index < last ? (
                <Link
                  to={crumb.to}
                  viewTransition
                  className={cn(
                    'truncate rounded outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70',
                    crumb.section && 'lowercase',
                  )}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={index === last ? 'page' : undefined}
                  dir="auto"
                  className={cn('truncate', index === last ? 'font-medium text-foreground' : '', crumb.section && 'lowercase')}
                >
                  {crumb.label}
                </span>
              )}
            </m.li>
          ))}
        </AnimatePresence>
      </ol>
    </nav>
  );
}
