import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, CalendarDays, Clock, MapPin, Trophy, Users } from 'lucide-react';
import { useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FormatTag } from './HackathonCard';
import HackathonCountdown from './HackathonCountdown';
import HackathonLoom from './HackathonLoom';
import TeamMark from './TeamMark';
import WovenMotif from '@/components/shared/WovenMotif';
import { roleOf } from '@/config/roles';
import { useHackathonTeams } from '@/hooks/useHackathons';
import { useNow } from '@/hooks/useNow';
import {
  cityOfZone,
  displayTimeZone,
  durationOf,
  formatInZone,
  formatRangeInZone,
  loomLayout,
  phaseOf,
} from '@/lib/hackathonTime';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { Hackathon, HackathonTeam } from '@/types/hackathon.types';
import { countryName, isolate } from '@/utils/formatters';

// Équipes qui recrutent, citées sous le compte à rebours
const RECRUITING_SHOWN = 3;

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * Le hackathon à la une de la page : celui qui se joue en ce moment, sinon le prochain coup d'envoi. Bordure
 * tournante comme le hackathon de l'atelier (design 3B) ; à gauche, ce qu'il faut savoir pour se décider ;
 * à droite, le compte à rebours, l'étoffe du hackathon avec ses étapes, et les équipes qui cherchent
 * encore quelqu'un : on peut postuler sans même ouvrir le hackathon.
 */
export default function HackathonFeature({ hackathon }: { hackathon: Hackathon }) {
  const { t } = useTranslation('hackathons');
  const queryClient = useQueryClient();
  const now = useNow(60_000);
  const phase = phaseOf(hackathon, now);
  const live = phase === 'live';
  const { zone, local } = displayTimeZone(hackathon);
  const zoneLabel = local ? cityOfZone(zone) : t('time.yours');
  const target = live ? hackathon.endsAt : hackathon.startsAt;
  const href = paths.hackathon(hackathon.slug);
  const preload = () => prefetch(pages.hackathon);
  const duration = durationOf(hackathon);
  const layout = loomLayout(hackathon);
  const teams = useHackathonTeams(phase === 'registration' ? hackathon.id : undefined);
  const recruiting = (teams.data ?? []).filter((team) => (team.openings?.length ?? 0) > 0);

  // L'échéance passée, le hackathon change d'étape : on recharge les listes
  const refresh = useCallback(() => void queryClient.invalidateQueries({ queryKey: ['hackathons'] }), [queryClient]);

  return (
    <section aria-labelledby="hackathon-feature-title" className="border-kente-spin rounded-[1.75rem] shadow-glow">
      <div className="relative isolate grid gap-9 overflow-hidden rounded-[calc(1.75rem-1px)] bg-surface p-5.5 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12 lg:p-10">
        <div aria-hidden className={cn('halo -top-56 -start-48 -z-10 size-[34rem]', live ? 'halo-coral' : 'halo-gold')} />
        <div aria-hidden className="halo halo-jade -end-40 -bottom-64 -z-10 size-[30rem] opacity-60" />

        {/* ── Ce qu'il faut savoir ── */}
        <div className="flex min-w-0 flex-col gap-5">
          <p className={cn('flex items-center gap-2 font-mono text-xs tracking-[0.08em] uppercase', live ? 'text-coral' : 'text-jade')}>
            <span aria-hidden className={cn('size-2 rounded-full animate-pulse-dot', live ? 'bg-coral' : 'bg-jade')} />
            {live ? t('feature.live') : t('feature.next')}
          </p>

          <div>
            <h2 id="hackathon-feature-title" dir="auto" className="text-start font-display text-h2 text-balance">
              <Link to={href} viewTransition onPointerEnter={preload} onFocus={preload} className={cn('rounded-lg', focusRing)}>
                {hackathon.title}
              </Link>
            </h2>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              {hackathon.city && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin aria-hidden className="size-4" />
                  {hackathon.city}
                  {hackathon.country && `, ${countryName(hackathon.country)}`}
                </span>
              )}
              <FormatTag format={hackathon.format} />
            </p>
          </div>

          {hackathon.tagline && (
            <p dir="auto" className="max-w-xl text-start text-lead text-soft-foreground">
              {hackathon.tagline}
            </p>
          )}

          <ul className="flex flex-wrap gap-2">
            <FactChip icon={<CalendarDays className="size-4" />}>{formatRangeInZone(hackathon.startsAt, hackathon.endsAt, zone)}</FactChip>
            <FactChip icon={<Clock className="size-4" />}>{t(`duration.${duration.unit}`, { count: duration.count })}</FactChip>
            <FactChip icon={<Users className="size-4" />}>
              {t('card.teamSize', { min: hackathon.minTeamSize, max: hackathon.maxTeamSize })}
            </FactChip>
            {hackathon.prizePool && (
              <FactChip icon={<Trophy className="size-4 text-gold" />} strong>
                {hackathon.prizePool}
              </FactChip>
            )}
          </ul>

          <div className="mt-auto flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              to={href}
              viewTransition
              onPointerEnter={preload}
              onFocus={preload}
              className={cn(
                'group/see inline-flex h-13 items-center justify-between gap-5 rounded-full bg-kente-warm ps-6 pe-1.5 text-[0.9375rem] font-bold text-kente-night transition-[scale,filter] duration-300 hover:brightness-105 active:scale-[0.98]',
                focusRing,
              )}
            >
              {t('feature.see')}
              {/* La flèche part en diagonale, une autre arrive à sa place */}
              <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-kente-night text-kente-gold rtl:-scale-x-100">
                <ArrowUpRight
                  aria-hidden
                  className="size-5 transition-transform duration-500 ease-out-expo group-hover/see:translate-x-6 group-hover/see:-translate-y-6"
                />
                <ArrowUpRight
                  aria-hidden
                  className="absolute size-5 -translate-x-6 translate-y-6 transition-transform duration-500 ease-out-expo group-hover/see:translate-0"
                />
              </span>
            </Link>
            {recruiting.length > 0 && (
              <Link
                to={`${href}#equipes`}
                viewTransition
                onPointerEnter={preload}
                onFocus={preload}
                className={cn(
                  'inline-flex h-13 items-center justify-center gap-2 rounded-full border border-border-strong px-6 text-[0.9375rem] font-semibold text-foreground transition-colors hover:bg-foreground/5',
                  focusRing,
                )}
              >
                {t('feature.joinTeam')}
              </Link>
            )}
          </div>
        </div>

        {/* ── Le temps qui reste ── */}
        <div className="flex min-w-0 flex-col gap-4">
          <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
            {live ? t('feature.endsIn') : t('feature.startsIn')}
          </p>
          <HackathonCountdown
            to={target}
            size="lg"
            onDone={refresh}
            label={t(live ? 'feature.ending' : 'feature.kickoff', {
              date: t('time.inZone', { time: formatInZone('dayTime', target, zone), zone: isolate(zoneLabel) }),
            })}
          />
          <p className="font-mono text-xs text-soft-foreground">
            {t('time.inZone', { time: formatInZone('dayTime', target, zone), zone: isolate(zoneLabel) })}
          </p>

          {/* L'étoffe et ses étapes : les inscriptions, puis le hackathon lui-même */}
          <div className="mt-2">
            <HackathonLoom hackathon={hackathon} variant="bar" />
            <div className="mt-2.5 flex font-mono text-[0.6875rem] leading-snug text-muted-foreground">
              <span className="min-w-0 pe-3" style={{ width: `${layout.closes * 100}%` }}>
                <span className="block text-soft-foreground">{t('feature.registration')}</span>
                <span className="block truncate">
                  {t('feature.until', { date: formatInZone('day', hackathon.registrationClosesAt, zone) })}
                </span>
              </span>
              <span className="min-w-0 flex-1 ps-2" style={{ marginInlineStart: `${(layout.starts - layout.closes) * 100}%` }}>
                <span className="block text-soft-foreground">{t('feature.hacking')}</span>
                <span className="block truncate">{formatRangeInZone(hackathon.startsAt, hackathon.endsAt, zone)}</span>
              </span>
            </div>
          </div>

          {recruiting.length > 0 && <RecruitingTeams teams={recruiting.slice(0, RECRUITING_SHOWN)} />}
        </div>
      </div>
    </section>
  );
}

function FactChip({ icon, strong, children }: { icon: ReactNode; strong?: boolean; children: ReactNode }) {
  return (
    <li
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-glass-border bg-foreground/[0.04] px-3 py-1.5 text-[0.8125rem]',
        strong ? 'font-semibold text-foreground' : 'text-soft-foreground',
      )}
    >
      <span aria-hidden className="text-muted-foreground">
        {icon}
      </span>
      {children}
    </li>
  );
}

/** Les équipes qui cherchent encore quelqu'un, et le rôle : on peut postuler sans ouvrir le hackathon. */
function RecruitingTeams({ teams }: { teams: HackathonTeam[] }) {
  const { t } = useTranslation('hackathons');

  return (
    <div className="mt-2">
      <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground uppercase">{t('feature.recruiting')}</p>
      <ul className="mt-2.5 flex flex-col gap-2">
        {teams.map((team) => {
          const opening = team.openings![0];
          const role = roleOf(opening.role);
          return (
            <li key={team.id}>
              <Link
                to={`${paths.project(team.project.slug)}#roles`}
                viewTransition
                onPointerEnter={() => prefetch(pages.project)}
                onFocus={() => prefetch(pages.project)}
                className={cn(
                  'group/team flex items-center gap-3 rounded-2xl border border-glass-border bg-foreground/[0.03] p-2.5 pe-3.5 transition-[border-color,background-color] duration-300 hover:border-jade/40 hover:bg-jade/[0.05]',
                  focusRing,
                )}
              >
                <TeamMark project={team.project} size="md" />
                <span className="min-w-0 flex-1">
                  <span dir="auto" className="block truncate text-start text-sm font-semibold text-foreground">
                    {team.project.name}
                  </span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    {role && <WovenMotif motif={role.motif} colors={role.colors} className="h-3.5 w-auto shrink-0" />}
                    <span className="truncate">{t('feature.seeks', { role: isolate(opening.title) })}</span>
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-jade">
                  {t('feature.apply')}
                  <ArrowRight
                    aria-hidden
                    className="size-3.5 transition-transform duration-300 group-hover/team:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/team:-translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Même encombrement que le hackathon à la une, pendant le chargement. */
export function HackathonFeatureSkeleton() {
  return (
    <div aria-hidden className="glass grid gap-9 rounded-[1.75rem] p-5.5 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12 lg:p-10">
      <div className="flex flex-col gap-5">
        <div className="h-3 w-52 rounded-full skeleton-shimmer" />
        <div className="h-11 w-3/4 rounded-2xl skeleton-shimmer" />
        <div className="h-4 w-1/2 rounded-full skeleton-shimmer" />
        <div className="h-4 w-full max-w-md rounded-full skeleton-shimmer" />
        <div className="flex flex-wrap gap-2">
          {[36, 20, 28, 40].map((width) => (
            <span key={width} className="h-8 rounded-full skeleton-shimmer" style={{ width: `${width * 0.25}rem` }} />
          ))}
        </div>
        <div className="mt-auto h-13 w-56 rounded-full skeleton-shimmer" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-3 w-32 rounded-full skeleton-shimmer" />
        <div className="grid grid-cols-4 gap-2.5">
          {[0, 1, 2, 3].map((index) => (
            <span key={index} className="h-22 rounded-2xl skeleton-shimmer" />
          ))}
        </div>
        <div className="h-3.5 w-full rounded-full skeleton-shimmer" />
        <div className="h-16 w-full rounded-2xl skeleton-shimmer" />
      </div>
    </div>
  );
}
