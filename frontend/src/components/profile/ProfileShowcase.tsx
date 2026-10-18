import { ChevronDown, Crown, ShieldCheck, UserRound } from 'lucide-react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import EmptyState from '@/components/feedback/EmptyState';
import ErrorState from '@/components/feedback/ErrorState';
import ProjectCard, { ProjectCardSkeleton } from '@/components/projects/ProjectCard';
import type { KenteThread } from '@/config/roles';
import { useUserProjects } from '@/hooks/useUsers';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { MemberProject, UserProfile } from '@/types/user.types';

// Une couleur par carte, comme sur la vitrine
const ACCENTS: readonly KenteThread[] = ['jade', 'gold', 'coral'];
// La couleur de sa place dans l'équipe
const TONES: Record<MemberProject['role'], string> = {
  OWNER: 'text-gold',
  MAINTAINER: 'text-jade',
  CONTRIBUTOR: 'text-soft-foreground',
};

/** Vitrine du développeur : ses projets mis en avant, ceux qu'il porte d'abord, chacun avec sa place dans l'équipe. Design 3F. */
export default function ProfileShowcase({ profile, own }: { profile: UserProfile; own: boolean }) {
  const { t } = useTranslation('profile');
  const projects = useUserProjects(profile.username);
  const items = projects.data?.pages.flatMap((page) => page.content) ?? [];
  const total = projects.data?.pages[0]?.totalElements ?? 0;
  const firstName = profile.fullName.split(/\s+/)[0] || profile.username;

  return (
    <section aria-labelledby="showcase-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t('showcase.eyebrow')}</p>
          <h2 id="showcase-title" className="mt-1 font-display text-h4">
            {own ? t('showcase.titleOwn') : t('showcase.title', { name: firstName })}
          </h2>
        </div>
        {total > 0 && <span className="shrink-0 font-mono text-sm text-muted-foreground">{t('showcase.count', { count: total })}</span>}
      </div>

      <div className="mt-5">
        {projects.isPending ? (
          <div aria-hidden className="grid gap-4 sm:grid-cols-2">
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
          </div>
        ) : projects.isError ? (
          <ErrorState title={t('showcase.errorTitle')} description={t('showcase.errorText')} onRetry={() => void projects.refetch()} />
        ) : items.length === 0 ? (
          own ? (
            <EmptyState title={t('showcase.emptyOwnTitle')} description={t('showcase.emptyOwnText')} action={{ to: paths.newProject, label: t('showcase.emptyOwnAction') }} />
          ) : (
            <EmptyState title={t('showcase.emptyTitle', { name: firstName })} description={t('showcase.emptyText')} />
          )
        ) : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2">
              {items.map((item, index) => (
                <m.li
                  key={item.project.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: (index % 2) * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col gap-2"
                >
                  <PlaceInTeam item={item} />
                  <ProjectCard project={item.project} accent={ACCENTS[index % ACCENTS.length]} imageSizes="(min-width: 640px) 26rem, 100vw" className="flex-1" />
                </m.li>
              ))}
            </ul>
            {projects.hasNextPage && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => void projects.fetchNextPage()}
                  disabled={projects.isFetchingNextPage}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-border-strong px-4 text-sm font-bold text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/70 disabled:opacity-70"
                >
                  {projects.isFetchingNextPage ? <PulsatingDots size="sm" tone="current" /> : <ChevronDown aria-hidden className="size-4" />}
                  {t('showcase.more', { count: total - items.length })}
                </button>
              </div>
            )}
            {projects.isFetchNextPageError && (
              <p role="alert" className="mt-3 text-center text-sm text-coral">
                {t('showcase.moreFailed')}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** Sa place dans l'équipe, au-dessus de la carte : porteur, mainteneur ou contributeur, et le rôle qu'il y tient. */
function PlaceInTeam({ item }: { item: MemberProject }) {
  const { t } = useTranslation('profile');
  const { t: tc } = useTranslation();
  const Icon = item.role === 'OWNER' ? Crown : item.role === 'MAINTAINER' ? ShieldCheck : UserRound;
  const specialty = item.specialty ? tc(`project.specialty.${item.specialty.toLowerCase() as Lowercase<NonNullable<MemberProject['specialty']>>}`) : null;

  return (
    <p className="flex min-w-0 items-center gap-1.5 px-1 text-xs font-semibold">
      <Icon aria-hidden className={cn('size-3.5 shrink-0', TONES[item.role])} />
      <span className={cn('shrink-0', TONES[item.role])}>{t(`showcase.role.${item.role}`)}</span>
      {specialty && <span className="truncate font-medium text-muted-foreground">· {specialty}</span>}
    </p>
  );
}
