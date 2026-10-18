import { ArrowRight, Plus } from 'lucide-react';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import HackathonMedal from './HackathonMedal';
import { rankLabel } from './rank';
import TeamMark from './TeamMark';
import ErrorState from '@/components/feedback/ErrorState';
import AvatarStack from '@/components/shared/AvatarStack';
import WovenMotif from '@/components/shared/WovenMotif';
import { roleOf } from '@/config/roles';
import { useHackathonTeams } from '@/hooks/useHackathons';
import { useNow } from '@/hooks/useNow';
import { phaseOf } from '@/lib/hackathonTime';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { Hackathon, HackathonTeam } from '@/types/hackathon.types';
import type { TeamRole } from '@/types/project.types';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

// Le podium : la 2e place à gauche, la 1re au milieu, plus haute, la 3e à droite (en arabe, l'inverse)
const PODIUM = {
  1: { order: 'order-2', height: 'h-36 sm:h-40', medal: 'var(--kente-gold)' },
  2: { order: 'order-1', height: 'h-26 sm:h-30', medal: 'var(--kente-jade)' },
  3: { order: 'order-3', height: 'h-20 sm:h-22', medal: 'var(--kente-coral)' },
} as const;

/**
 * Les équipes du hackathon. Avant le coup d'envoi, chacune montre les rôles qu'elle cherche encore et son
 * issue « premier pas » : on choisit son rôle (filtre), puis son équipe. Terminé, le podium d'abord, tissé
 * aux couleurs du kente, puis les autres équipes et leurs distinctions.
 */
export default function HackathonTeams({ hackathon }: { hackathon: Hackathon }) {
  const { t } = useTranslation('hackathons');
  const { t: tc } = useTranslation();
  const now = useNow(60_000);
  const phase = phaseOf(hackathon, now);
  const teams = useHackathonTeams(hackathon.id);
  const [role, setRole] = useState<TeamRole | null>(null);

  // Les équipes recrutent jusqu'au coup d'envoi ; l'API ne renvoie leurs rôles ouverts que jusque-là
  const recruiting = phase === 'registration' || phase === 'full' || phase === 'closed';
  const ended = phase === 'ended';
  const all = teams.data ?? [];
  const podium = ended ? all.filter((team) => team.rank !== null && team.rank <= 3).sort((a, b) => a.rank! - b.rank!) : [];
  const others = all.filter((team) => !podium.includes(team));
  const shown = role ? others.filter((team) => team.openings?.some((opening) => opening.role === role)) : others;
  const roles = hackathon.rolesSought.map(roleOf).filter((item) => item !== undefined);

  return (
    <section id="equipes" aria-labelledby="hackathon-teams-title" className="min-w-0 scroll-mt-28">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h2 id="hackathon-teams-title" className="flex items-center gap-3 font-display text-h3">
          {ended ? t('teams.podiumTitle') : t('teams.title')}
          {hackathon.teamCount > 0 && (
            <span className="rounded-full bg-foreground/7 px-2.5 py-0.5 font-mono text-sm font-medium text-soft-foreground">
              {hackathon.teamCount}
            </span>
          )}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">{t(`teams.hint.${phase}`)}</p>
      </div>

      {/* Mon rôle : ne garder que les équipes qui le cherchent */}
      {roles.length > 1 && (
        <div role="group" aria-label={t('teams.filterLabel')} className="mt-5 flex flex-wrap gap-2">
          <FilterChip active={role === null} onClick={() => setRole(null)}>
            {t('teams.allRoles')}
          </FilterChip>
          {roles.map((item) => (
            <FilterChip key={item.id} active={role === item.id.toUpperCase()} onClick={() => setRole(item.id.toUpperCase() as TeamRole)}>
              <WovenMotif motif={item.motif} colors={item.colors} className="h-4 w-auto" />
              {tc(`teamRoles.${item.id}`)}
            </FilterChip>
          ))}
        </div>
      )}

      <div className="mt-6" aria-busy={teams.isPending}>
        {teams.isPending ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[0, 1].map((index) => (
              <li key={index} aria-hidden className="h-56 rounded-2xl skeleton-shimmer" />
            ))}
          </ul>
        ) : teams.isError ? (
          <ErrorState title={t('teams.errorTitle')} description={t('list.errorText')} onRetry={() => void teams.refetch()} />
        ) : all.length === 0 ? (
          <NoTeam recruiting={recruiting} />
        ) : (
          <>
            {podium.length > 0 && <Podium teams={podium} />}
            {podium.length > 0 && others.length > 0 && (
              <h3 className="mt-10 mb-4 eyebrow">{t('teams.othersTitle')}</h3>
            )}
            {shown.length > 0 ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {shown.map((team) => (
                  <li key={team.id}>
                    <TeamCard team={team} hackathon={hackathon} recruiting={recruiting} />
                  </li>
                ))}
              </ul>
            ) : (
              role && <p className="rounded-2xl border border-dashed border-border-strong p-5 text-sm text-muted-foreground">{t('teams.noneForRole')}</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[0.8125rem] font-semibold transition-[background-color,border-color,color] duration-300',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border text-soft-foreground hover:border-border-strong hover:text-foreground',
        focusRing,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Une équipe : sa marque, son projet, ce qu'elle veut construire, ses membres, et avant le coup d'envoi, les
 * rôles qu'elle cherche encore avec leur issue « premier pas ». Postuler mène au rôle, sur la page du projet.
 */
function TeamCard({ team, hackathon, recruiting }: { team: HackathonTeam; hackathon: Hackathon; recruiting: boolean }) {
  const { t } = useTranslation('hackathons');
  const projectHref = paths.project(team.project.slug);
  const preload = () => prefetch(pages.project);
  const openings = team.openings ?? [];
  const room = hackathon.maxTeamSize - team.memberCount;

  return (
    <article className="glass flex h-full flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-start gap-3.5">
        <TeamMark project={team.project} size="md" />
        <div className="min-w-0 flex-1">
          <h3 dir="auto" className="text-start text-[1.0625rem] leading-snug font-bold">
            <Link to={projectHref} viewTransition onPointerEnter={preload} onFocus={preload} className={cn('rounded-sm transition-colors hover:text-gold', focusRing)}>
              {team.project.name}
            </Link>
          </h3>
          {/* L'accroche du projet, sauf si elle redit le pitch de l'équipe */}
          {team.project.tagline && team.project.tagline.trim() !== team.pitch?.trim() && (
            <p dir="auto" className="mt-0.5 line-clamp-1 text-start text-[0.8125rem] text-muted-foreground">
              {team.project.tagline}
            </p>
          )}
        </div>
        {(team.rank !== null || team.award) && (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-gold">
            <HackathonMedal rank={team.rank} size="sm" />
            <span className="max-w-28 truncate">{team.rank !== null ? rankLabel(t, team.rank) : team.award}</span>
          </span>
        )}
      </div>

      {team.pitch && (
        <p dir="auto" className="border-s-2 border-gold/50 ps-3 text-start text-sm leading-relaxed text-soft-foreground">
          {team.pitch}
        </p>
      )}

      <div className="flex items-center gap-2.5">
        {team.members && team.members.length > 0 && <AvatarStack users={team.members} max={5} ringClassName="ring-surface" />}
        {recruiting && room > 0 && (
          <span aria-hidden className="grid size-7 place-items-center rounded-full border border-dashed border-jade/60 text-jade">
            <Plus className="size-3.5" />
          </span>
        )}
        <span className="text-xs text-muted-foreground">{t('teams.members', { count: team.memberCount })}</span>
      </div>

      {openings.length > 0 && (
        <ul className="mt-auto flex flex-col gap-2 border-t border-border-subtle pt-4">
          {openings.map((opening) => {
            const item = roleOf(opening.role);
            return (
              <li key={opening.id}>
                <Link
                  to={`${projectHref}#roles`}
                  viewTransition
                  onPointerEnter={preload}
                  onFocus={preload}
                  className={cn(
                    'group/role flex items-center gap-3 rounded-xl p-2 -mx-2 transition-colors hover:bg-jade/[0.06]',
                    focusRing,
                  )}
                >
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground/5">
                    {item && <WovenMotif motif={item.motif} colors={item.colors} className="h-5 w-auto" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span dir="auto" className="block truncate text-start text-sm font-semibold text-foreground">
                      {opening.title}
                      {opening.seats > 1 && <span className="ms-1.5 font-mono text-xs text-muted-foreground">×{opening.seats}</span>}
                    </span>
                    {opening.starterIssueNumber && (
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        #{opening.starterIssueNumber} · <span dir="auto">{opening.starterIssueTitle}</span>
                      </span>
                    )}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-jade">
                    {t('feature.apply')}
                    <ArrowRight
                      aria-hidden
                      className="size-3.5 transition-transform duration-300 group-hover/role:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/role:-translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

/**
 * Le podium, tissé aux couleurs du kente : or, vert, rouge. La 1re place au milieu, plus haute. Chaque
 * marche mène au projet de l'équipe.
 */
function Podium({ teams }: { teams: HackathonTeam[] }) {
  const { t } = useTranslation('hackathons');

  return (
    <ol aria-label={t('teams.podiumLabel')} className="grid grid-cols-3 items-end gap-2.5 sm:gap-4">
      {teams.map((team) => {
        const step = PODIUM[team.rank as 1 | 2 | 3];
        return (
          <li key={team.id} className={cn('flex min-w-0 flex-col items-center gap-3 text-center', step.order)}>
            <TeamMark project={team.project} size={team.rank === 1 ? 'lg' : 'md'} />
            <div className="min-w-0 max-w-full">
              <Link
                to={paths.project(team.project.slug)}
                viewTransition
                onPointerEnter={() => prefetch(pages.project)}
                onFocus={() => prefetch(pages.project)}
                dir="auto"
                className={cn('block truncate text-sm font-bold text-foreground transition-colors hover:text-gold sm:text-base', focusRing)}
              >
                {team.project.name}
              </Link>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {rankLabel(t, team.rank!)}
                {team.award && <> · {team.award}</>}
              </span>
            </div>
            {/* La marche : une étoffe de la couleur de la place, son numéro taillé dedans */}
            <div
              aria-hidden
              style={{ '--medal': step.medal } as CSSProperties}
              className={cn('hackathon-podium-step relative grid w-full justify-center rounded-t-2xl pt-2.5', step.height)}
            >
              <span className="font-display text-4xl leading-none font-extrabold text-kente-night/70 sm:text-5xl">{team.rank}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Pas encore d'équipe : avant la clôture, une invitation à être la première. */
function NoTeam({ recruiting }: { recruiting: boolean }) {
  const { t } = useTranslation('hackathons');

  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-border-strong p-6">
      <span aria-hidden className="mb-1 grid size-11 place-items-center rounded-xl border border-dashed border-gold/60 text-gold">
        <Plus className="size-5" />
      </span>
      <p className="font-bold text-foreground">{recruiting ? t('teams.emptyTitle') : t('teams.emptyClosedTitle')}</p>
      {recruiting && <p className="max-w-md text-[0.8125rem] leading-relaxed text-muted-foreground">{t('teams.emptyText')}</p>}
    </div>
  );
}

