import { ArrowRight, Plus, ShieldCheck } from 'lucide-react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FOCUS_ROLES_EVENT } from './projectEvents';
import UserAvatar from '@/components/shared/UserAvatar';
import { useProjectMembers } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Project, ProjectMember } from '@/types/project.types';

// Un membre arrivé depuis moins de ce nombre de jours : « depuis 2 jours »
const RECENT_DAYS = 30;

function daysSince(isoDate: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000));
}

/**
 * L'équipe du projet : chacun avec son rôle (« fondateur·rice · back-end », « mobile ») et, s'il vient
 * d'arriver, depuis quand. Une place vide attend le visiteur quand le projet recrute. Design 3D.
 */
export default function TeamMembersCard({ project }: { project: Project }) {
  const { t } = useTranslation();
  const members = useProjectMembers(project.id);
  // Le porteur et les mainteneurs reçoivent aussi les demandes en attente : seule l'équipe compte ici
  const team = (members.data ?? []).filter((member) => member.status === 'ACCEPTED');
  const recruiting = project.openings.length > 0;

  return (
    <section aria-labelledby="team-title" className="glass rounded-[1.375rem] p-5">
      <h2 id="team-title" className="eyebrow">
        {t('project.team.title', { count: project.memberCount })}
      </h2>

      <ul className="mt-3 -mx-2 flex flex-col">
        {members.isPending
          ? Array.from({ length: Math.min(project.memberCount, 4) || 1 }, (_, index) => (
              <li key={index} aria-hidden className="flex items-center gap-3 px-2 py-2">
                <span className="size-8 rounded-full skeleton-shimmer" />
                <span className="flex flex-1 flex-col gap-1.5">
                  <span className="h-3 w-32 rounded-full skeleton-shimmer" />
                  <span className="h-2.5 w-20 rounded-full skeleton-shimmer" />
                </span>
              </li>
            ))
          : team.map((member, index) => <MemberRow key={member.id} member={member} index={index} />)}

        {/* La place du visiteur */}
        {recruiting && project.myMembershipStatus !== 'ACCEPTED' && (
          <li>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(FOCUS_ROLES_EVENT))}
              className="group/seat flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start outline-none transition-colors hover:bg-jade/8 focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full border border-dashed border-jade/70 text-jade transition-transform duration-300 ease-out-expo group-hover/seat:rotate-90">
                <Plus className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-sm font-bold text-jade">{t('project.team.yourSeat')}</span>
                <span className="block text-xs text-muted-foreground">{t('project.team.openRoles', { count: project.openings.length })}</span>
              </span>
              <ArrowRight aria-hidden className="size-4 text-jade opacity-0 transition-[opacity,translate] duration-300 group-hover/seat:translate-x-0.5 group-hover/seat:opacity-100 rtl:-scale-x-100 rtl:group-hover/seat:-translate-x-0.5" />
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}

function MemberRow({ member, index }: { member: ProjectMember; index: number }) {
  const { t } = useTranslation();
  const days = daysSince(member.createdAt);
  const recent = member.role !== 'OWNER' && days < RECENT_DAYS;
  const parts = [
    member.role === 'OWNER' ? t('project.team.founder') : null,
    member.specialty ? t(`project.specialty.${member.specialty.toLowerCase() as Lowercase<NonNullable<ProjectMember['specialty']>>}`) : null,
  ].filter(Boolean);

  return (
    <m.li
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={paths.profile(member.user.username)}
        viewTransition
        className="group/member flex items-center gap-3 rounded-xl px-2 py-2 outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/70"
      >
        <span className="relative shrink-0">
          <UserAvatar
            user={member.user}
            size="sm"
            className={cn('size-8 text-[0.6875rem] ring-2 ring-surface transition-transform duration-300 ease-out-expo group-hover/member:scale-105', recent && 'ring-jade/60')}
          />
          {member.role === 'MAINTAINER' && (
            <span className="absolute -end-1 -bottom-1 grid size-4 place-items-center rounded-full bg-surface text-gold ring-2 ring-surface" title={t('project.team.maintainer')}>
              <ShieldCheck aria-hidden className="size-3" />
              <span className="sr-only">{t('project.team.maintainer')}</span>
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-bold text-foreground">
            <bdi>{member.user.fullName}</bdi>
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {parts.join(' · ')}
            {recent && (
              <span className="text-jade">
                {parts.length > 0 ? ' · ' : ''}
                {t('project.team.since', { count: Math.max(days, 1) })}
              </span>
            )}
          </span>
        </span>
        <ArrowRight aria-hidden className="size-3.5 shrink-0 text-faint-foreground opacity-0 transition-[opacity,translate] duration-300 group-hover/member:translate-x-0.5 group-hover/member:opacity-100 rtl:-scale-x-100 rtl:group-hover/member:-translate-x-0.5" />
      </Link>
    </m.li>
  );
}
