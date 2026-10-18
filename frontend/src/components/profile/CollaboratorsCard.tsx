import { ArrowRight } from 'lucide-react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import UserAvatar from '@/components/shared/UserAvatar';
import { useCollaborators } from '@/hooks/useUsers';
import { prefetch } from '@/lib/prefetch';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { Collaborator, UserProfile } from '@/types/user.types';
import { countryFlag, isolate } from '@/utils/formatters';

/**
 * « A travaillé avec » : collaborateurs et projets communs. Design 3F. Ceux des projets en commun les plus nombreux
 * d'abord ; chacun mène à son profil.
 */
export default function CollaboratorsCard({ profile, own }: { profile: UserProfile; own: boolean }) {
  const { t } = useTranslation('profile');
  const collaborators = useCollaborators(profile.username);

  return (
    <section aria-labelledby="collaborators-title" className="glass rounded-[1.375rem] p-5">
      <h2 id="collaborators-title" className="eyebrow">
        {t('collaborators.title')}
      </h2>

      {collaborators.isPending ? (
        <ul aria-hidden className="mt-3 -mx-2 flex flex-col">
          {[0, 1, 2].map((index) => (
            <li key={index} className="flex items-center gap-3 px-2 py-2">
              <span className="size-9 rounded-full skeleton-shimmer" />
              <span className="flex flex-1 flex-col gap-1.5">
                <span className="h-3 w-32 rounded-full skeleton-shimmer" />
                <span className="h-2.5 w-44 rounded-full skeleton-shimmer" />
              </span>
            </li>
          ))}
        </ul>
      ) : collaborators.isError ? (
        <p role="alert" className="mt-3 text-sm text-muted-foreground">
          {t('collaborators.error')}{' '}
          <button type="button" onClick={() => void collaborators.refetch()} className="font-bold text-gold outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70">
            {t('collaborators.retry')}
          </button>
        </p>
      ) : collaborators.data.length === 0 ? (
        <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <p>{own ? t('collaborators.emptyOwn') : t('collaborators.empty')}</p>
          {own && (
            <Link
              to={paths.openings}
              viewTransition
              onPointerEnter={() => prefetch(pages.openings)}
              className="group/find mt-2 inline-flex items-center gap-1.5 rounded-full font-bold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              {t('collaborators.findTeam')}
              <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/find:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/find:-translate-x-0.5" />
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-3 -mx-2 flex flex-col">
          {collaborators.data.map((collaborator, index) => (
            <CollaboratorRow key={collaborator.user.id} collaborator={collaborator} index={index} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CollaboratorRow({ collaborator, index }: { collaborator: Collaborator; index: number }) {
  const { t } = useTranslation('profile');
  const { user, sharedProjectCount, projects } = collaborator;
  const names = projects.map((project) => isolate(project.name)).join(', ');
  const others = sharedProjectCount - projects.length;

  return (
    <m.li
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={paths.profile(user.username)}
        viewTransition
        className="group/collaborator flex items-center gap-3 rounded-xl px-2 py-2 outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/70"
      >
        <UserAvatar user={user} className="ring-2 ring-surface transition-transform duration-300 ease-out-expo group-hover/collaborator:scale-105" />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <bdi className="truncate">{user.fullName}</bdi>
            {user.country && <span aria-hidden className="shrink-0 text-xs">{countryFlag(user.country)}</span>}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {others > 0 ? t('collaborators.sharedMore', { projects: names, count: others }) : t('collaborators.shared', { projects: names })}
          </span>
        </span>
        <ArrowRight aria-hidden className="size-3.5 shrink-0 text-faint-foreground opacity-0 transition-[opacity,translate] duration-300 group-hover/collaborator:translate-x-0.5 group-hover/collaborator:opacity-100 rtl:-scale-x-100 rtl:group-hover/collaborator:-translate-x-0.5" />
      </Link>
    </m.li>
  );
}
