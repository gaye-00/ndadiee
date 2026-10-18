import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, CalendarPlus, Check, Globe, LogIn, MapPin, Plus } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { FormatTag } from './HackathonCard';
import HackathonCountdown from './HackathonCountdown';
import HackathonLoom from './HackathonLoom';
import HackathonMedal from './HackathonMedal';
import HackathonPhaseBadge from './HackathonPhaseBadge';
import { rankLabel } from './rank';
import RegisterTeamDialog from './RegisterTeamDialog';
import TeamMark from './TeamMark';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useAuth } from '@/hooks/useAuth';
import { useWithdrawTeam } from '@/hooks/useHackathons';
import { useNow } from '@/hooks/useNow';
import { downloadCalendarFile } from '@/lib/hackathonCalendar';
import {
  cityOfZone,
  displayTimeZone,
  formatInZone,
  formatRangeInZone,
  phaseOf,
  type HackathonPhase,
} from '@/lib/hackathonTime';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { Hackathon } from '@/types/hackathon.types';
import { countryName, isolate } from '@/utils/formatters';

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

interface HackathonHeaderProps {
  hackathon: Hackathon;
}

/**
 * En-tête d'un hackathon : où il en est, son titre, son lieu, son accroche, et l'action du moment (inscrire
 * son équipe, la retirer, rejoindre une équipe). En face, le temps qui reste avant la prochaine étape, ou le
 * vainqueur une fois le hackathon terminé. Dessous, l'essentiel en cinq cases, puis le programme noué sur
 * l'étoffe du hackathon.
 */
export default function HackathonHeader({ hackathon }: HackathonHeaderProps) {
  const { t } = useTranslation('hackathons');
  const now = useNow(60_000);
  const phase = phaseOf(hackathon, now);
  const { zone, local } = displayTimeZone(hackathon);
  const zoneLabel = local ? cityOfZone(zone) : t('time.yours');

  return (
    <header className="pt-6 pb-14 sm:pt-8 lg:pb-20">
      <Link
        to={paths.hackathons}
        viewTransition
        onPointerEnter={() => prefetch(pages.hackathons)}
        onFocus={() => prefetch(pages.hackathons)}
        className={cn('group/back inline-flex items-center gap-2 rounded-full text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground', focusRing)}
      >
        <ArrowLeft aria-hidden className="size-4 transition-transform group-hover/back:-translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/back:translate-x-0.5" />
        {t('detail.back')}
      </Link>

      <div className="mt-6 grid gap-10 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:items-center lg:gap-14">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <HackathonPhaseBadge hackathon={hackathon} variant="chip" />
            <FormatTag format={hackathon.format} className="py-1 text-xs" />
          </div>

          <h1 id="hackathon-title" dir="auto" className="text-start font-display text-h1">
            {hackathon.title}
          </h1>

          <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.9375rem] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              {hackathon.city ? <MapPin aria-hidden className="size-4" /> : <Globe aria-hidden className="size-4" />}
              {hackathon.city ? `${hackathon.city}${hackathon.country ? `, ${countryName(hackathon.country)}` : ''}` : t('card.online')}
            </span>
            <span>{t('feature.organizer', { name: isolate(hackathon.organizerName) })}</span>
          </p>

          {hackathon.tagline && (
            <p dir="auto" className="max-w-2xl text-start text-lead text-soft-foreground">
              {hackathon.tagline}
            </p>
          )}

          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <RegistrationAction hackathon={hackathon} phase={phase} />
            {hackathon.teamCount > 0 && (
              <a
                href="#equipes"
                className={cn(
                  'group/teams inline-flex h-12 items-center justify-center gap-2 rounded-[0.875rem] border border-border-strong px-5 text-[0.9375rem] font-semibold text-foreground transition-colors hover:bg-foreground/5',
                  focusRing,
                )}
              >
                {phase === 'ended' ? t('detail.seePodium') : t('detail.seeTeams', { count: hackathon.teamCount })}
                <ArrowDown aria-hidden className="size-4 transition-transform group-hover/teams:translate-y-0.5" />
              </a>
            )}
          </div>
        </div>

        <TimeCard hackathon={hackathon} phase={phase} zone={zone} zoneLabel={zoneLabel} />
      </div>

      <Facts hackathon={hackathon} zone={zone} zoneLabel={zoneLabel} />
      {hackathon.schedule.length > 0 && <Programme hackathon={hackathon} now={now} zone={zone} />}
    </header>
  );
}

/**
 * L'action du moment pour le visiteur : se connecter pour inscrire son équipe, l'inscrire, voir qu'elle est
 * inscrite et pouvoir la retirer (en deux temps, pour qu'un clic de trop ne la retire pas). Rien à faire
 * quand les inscriptions sont closes.
 */
function RegistrationAction({ hackathon, phase }: { hackathon: Hackathon; phase: HackathonPhase }) {
  const { t } = useTranslation('hackathons');
  const { isAuthenticated, isDeveloper } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  // Toujours montée : une fois l'équipe inscrite, le hackathon rechargé fait place à « Ton équipe est
  // inscrite », et la fenêtre doit rester là pour dire que c'est fait
  const dialog = isDeveloper && <RegisterTeamDialog hackathon={hackathon} open={open} onOpenChange={setOpen} />;

  if (hackathon.myTeam && phase !== 'ended') {
    return (
      <>
        <MyTeam hackathon={hackathon} phase={phase} />
        {dialog}
      </>
    );
  }
  if (phase !== 'registration') {
    return null;
  }
  if (!isAuthenticated) {
    return (
      <Link
        to={paths.login}
        state={{ from: location }}
        viewTransition
        className={cn(
          'inline-flex h-12 items-center justify-center gap-2.5 rounded-[0.875rem] bg-kente-warm px-5 text-[0.9375rem] font-bold text-kente-night transition-[translate,filter] duration-300 hover:-translate-y-px hover:brightness-105',
          focusRing,
        )}
      >
        <LogIn aria-hidden className="size-4.5 rtl:-scale-x-100" />
        {t('detail.loginToRegister')}
      </Link>
    );
  }
  // Un compte admin organise, il ne concourt pas
  if (!isDeveloper) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group/register inline-flex h-12 items-center justify-center gap-2.5 rounded-[0.875rem] bg-kente-warm px-5 text-[0.9375rem] font-bold text-kente-night transition-[translate,filter] duration-300 hover:-translate-y-px hover:brightness-105',
          focusRing,
        )}
      >
        <Plus aria-hidden className="size-4.5 transition-transform duration-300 group-hover/register:rotate-90" />
        {t('detail.register')}
      </button>
      {dialog}
    </>
  );
}

/** L'équipe du visiteur est inscrite : son nom, et de quoi la retirer avant le coup d'envoi. */
function MyTeam({ hackathon, phase }: { hackathon: Hackathon; phase: HackathonPhase }) {
  const { t } = useTranslation('hackathons');
  const withdraw = useWithdrawTeam(hackathon.id);
  const [confirming, setConfirming] = useState(false);
  const team = hackathon.myTeam!;
  const beforeKickoff = phase !== 'live';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex h-12 items-center gap-3 rounded-[0.875rem] border border-jade/30 bg-jade/10 ps-2 pe-4 text-[0.9375rem] font-semibold text-foreground">
        <span className="relative">
          <TeamMark project={team.project} size="sm" />
          <span aria-hidden className="absolute -end-1.5 -bottom-1.5 grid size-4 place-items-center rounded-full bg-jade text-kente-night ring-2 ring-background">
            <Check className="size-2.5" strokeWidth={3.5} />
          </span>
        </span>
        <span>{t('detail.myTeam', { team: isolate(team.project.name) })}</span>
      </span>
      {beforeKickoff && (
        <button
          type="button"
          onClick={() => {
            if (!confirming) {
              setConfirming(true);
              // Sans confirmation dans les quatre secondes, le bouton redevient inoffensif
              setTimeout(() => setConfirming(false), 4000);
              return;
            }
            withdraw.mutate(team.project.id);
          }}
          disabled={withdraw.isPending}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-[0.75rem] px-3.5 text-sm font-semibold transition-colors',
            confirming ? 'bg-coral/12 text-coral' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
            focusRing,
          )}
        >
          {withdraw.isPending && <PulsatingDots size="sm" tone="current" label={t('detail.withdrawing')} />}
          {confirming ? t('detail.confirmWithdraw') : t('detail.withdraw')}
        </button>
      )}
    </div>
  );
}

/**
 * Le temps qui reste : avant le coup d'envoi, puis avant la fin ; ensuite, le vainqueur. Bordure tournante,
 * comme le hackathon de l'atelier (design 3B). Le fichier d'agenda part d'ici.
 */
function TimeCard({ hackathon, phase, zone, zoneLabel }: { hackathon: Hackathon; phase: HackathonPhase; zone: string; zoneLabel: string }) {
  const { t } = useTranslation('hackathons');
  const queryClient = useQueryClient();
  const live = phase === 'live';
  const target = live ? hackathon.endsAt : hackathon.startsAt;
  const when = t('time.inZone', { time: formatInZone('dayTime', target, zone), zone: isolate(zoneLabel) });
  // L'échéance passée, le hackathon change d'étape : on le recharge
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['hackathon', hackathon.slug] });
    void queryClient.invalidateQueries({ queryKey: ['hackathon-teams', hackathon.id] });
  }, [queryClient, hackathon.slug, hackathon.id]);

  return (
    <div className="border-kente-spin rounded-[1.75rem] shadow-glow">
      <div className="relative isolate overflow-hidden rounded-[calc(1.75rem-1px)] bg-surface p-5.5 sm:p-7">
        <div aria-hidden className={cn('halo -top-32 -end-24 -z-10 size-72', live ? 'halo-coral' : 'halo-jade')} />
        {phase === 'ended' ? (
          <Winner hackathon={hackathon} zone={zone} />
        ) : (
          <>
            <p className={cn('flex items-center gap-2 font-mono text-xs tracking-[0.08em] uppercase', live ? 'text-coral' : 'text-muted-foreground')}>
              {live && <span aria-hidden className="size-2 rounded-full bg-coral animate-pulse-dot" />}
              {live ? t('feature.endsIn') : t('feature.startsIn')}
            </p>
            <HackathonCountdown
              to={target}
              onDone={refresh}
              label={t(live ? 'feature.ending' : 'feature.kickoff', { date: when })}
              className="mt-4"
            />
            <p className="mt-3 font-mono text-xs text-soft-foreground">{when}</p>
            {!live && (
              <button
                type="button"
                onClick={() => downloadCalendarFile(hackathon, window.location.href.split('#')[0], t('card.online'))}
                className={cn(
                  'mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[0.75rem] border border-border-strong text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5',
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
                )}
              >
                <CalendarPlus aria-hidden className="size-4" />
                {t('detail.addToCalendar')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Le hackathon terminé : son vainqueur, en grand, et ce qu'il a remporté. */
function Winner({ hackathon, zone }: { hackathon: Hackathon; zone: string }) {
  const { t } = useTranslation('hackathons');
  const winner = hackathon.teams.find((team) => team.rank === 1);

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
        {t('detail.endedOn', { date: formatInZone('day', hackathon.endsAt, zone) })}
      </p>
      {winner ? (
        <Link
          to={paths.project(winner.project.slug)}
          viewTransition
          onPointerEnter={() => prefetch(pages.project)}
          onFocus={() => prefetch(pages.project)}
          className="group/winner flex items-center gap-4 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          <HackathonMedal rank={1} size="lg" />
          <span className="min-w-0">
            <span className="block text-sm text-gold">{rankLabel(t, 1)}</span>
            <span dir="auto" className="block truncate text-start font-display text-h4 transition-colors group-hover/winner:text-gold">
              {winner.project.name}
            </span>
          </span>
        </Link>
      ) : (
        <p className="text-sm text-muted-foreground">{t('detail.noResults')}</p>
      )}
      {winner?.pitch && (
        <p dir="auto" className="text-start text-sm leading-relaxed text-soft-foreground">
          {winner.pitch}
        </p>
      )}
    </div>
  );
}

/** L'essentiel en cinq cases : dates, lieu, équipes, taille des équipes, dotation. */
function Facts({ hackathon, zone, zoneLabel }: { hackathon: Hackathon; zone: string; zoneLabel: string }) {
  const { t } = useTranslation('hackathons');
  const places = hackathon.maxTeams === null ? null : Math.max(0, hackathon.maxTeams - hackathon.teamCount);

  return (
    <dl className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-glass-border bg-glass-border min-[22.5rem]:grid-cols-2 lg:mt-16 lg:grid-cols-5">
      <Fact label={t('detail.dates')} sub={t('detail.hours', {
        start: formatInZone('time', hackathon.startsAt, zone),
        end: formatInZone('time', hackathon.endsAt, zone),
        zone: isolate(zoneLabel),
      })}>
        {formatRangeInZone(hackathon.startsAt, hackathon.endsAt, zone)}
      </Fact>
      <Fact label={t('detail.place')} sub={t(`detail.formatHint.${hackathon.format}`)}>
        {hackathon.city ?? t('card.online')}
      </Fact>
      <Fact
        label={t('detail.teams')}
        sub={places === null ? t('detail.noLimit') : t('detail.placesLeft', { count: places })}
      >
        {hackathon.maxTeams === null ? hackathon.teamCount : `${hackathon.teamCount} / ${hackathon.maxTeams}`}
      </Fact>
      <Fact label={t('detail.teamSize')} sub={t('detail.perTeam')}>
        {t('detail.sizeRange', { min: hackathon.minTeamSize, max: hackathon.maxTeamSize })}
      </Fact>
      <Fact label={t('detail.prize')} sub={hackathon.prizes.length > 0 ? t('detail.prizes', { count: hackathon.prizes.length }) : undefined}>
        {hackathon.prizePool ? <bdi>{hackathon.prizePool}</bdi> : '—'}
      </Fact>
    </dl>
  );
}

function Fact({ label, sub, children }: { label: string; sub?: string; children: ReactNode }) {
  return (
    // Le fond de la page sur chaque case : les filets entre elles sont la couleur de la grille qui transparaît.
    // Sur deux colonnes, la cinquième case prend toute la rangée plutôt que de laisser un trou.
    <div className="flex min-w-0 flex-col gap-1.5 bg-background px-4 py-4 min-[22.5rem]:last:col-span-2 sm:px-5 sm:py-4.5 lg:last:col-span-1">
      <dt className="eyebrow">{label}</dt>
      <dd className="flex flex-col gap-1">
        <span className="font-display text-lg leading-tight font-bold text-foreground">{children}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </dd>
    </div>
  );
}

/**
 * Le programme : les temps forts noués sur l'étoffe du hackathon, puis leur liste, dans l'ordre. Ceux qui
 * sont passés pâlissent, le prochain s'allume.
 */
function Programme({ hackathon, now, zone }: { hackathon: Hackathon; now: number; zone: string }) {
  const { t } = useTranslation('hackathons');
  const nextIndex = hackathon.schedule.findIndex((milestone) => Date.parse(milestone.scheduledAt) > now);

  return (
    <section aria-labelledby="hackathon-programme-title" className="mt-12 lg:mt-16">
      <div className="flex items-end justify-between gap-6">
        <h2 id="hackathon-programme-title" className="font-display text-h4">
          {t('detail.programme')}
        </h2>
        <p className="font-mono text-xs text-muted-foreground">{t(`detail.zoneHint.${hackathon.format === 'REMOTE' ? 'yours' : 'local'}`, { zone: isolate(cityOfZone(zone)) })}</p>
      </div>
      <HackathonLoom hackathon={hackathon} variant="bar" className="mt-6" />
      <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
        {hackathon.schedule.map((milestone, index) => {
          const past = nextIndex === -1 || index < nextIndex;
          const next = index === nextIndex;
          return (
            <li
              key={milestone.scheduledAt + milestone.label}
              className={cn(
                'relative flex flex-col gap-1.5 rounded-2xl border p-4 transition-colors',
                next ? 'border-jade/35 bg-jade/[0.06]' : 'border-glass-border bg-glass',
                past && 'opacity-60',
              )}
            >
              <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <span
                  aria-hidden
                  className={cn('size-2 rounded-full', next ? 'bg-jade animate-pulse-dot' : past ? 'bg-foreground/40' : 'bg-foreground/20 ring-1 ring-foreground/30')}
                />
                {formatInZone('dayTime', milestone.scheduledAt, zone)}
              </span>
              <span dir="auto" className="text-start text-sm leading-snug font-semibold text-foreground">
                {milestone.label}
              </span>
              {next && <span className="sr-only">{t('detail.nextMilestone')}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Même encombrement que l'en-tête, pendant le chargement. */
export function HackathonHeaderSkeleton() {
  return (
    <div aria-hidden className="pt-6 pb-14 sm:pt-8 lg:pb-20">
      <span className="block h-4 w-40 rounded-full skeleton-shimmer" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:items-center lg:gap-14">
        <div className="flex flex-col gap-5">
          <div className="flex gap-2">
            <span className="h-6 w-56 rounded-full skeleton-shimmer" />
            <span className="h-6 w-20 rounded-full skeleton-shimmer" />
          </div>
          <span className="h-14 w-3/4 rounded-2xl skeleton-shimmer" />
          <span className="h-4 w-1/2 rounded-full skeleton-shimmer" />
          <span className="h-5 w-full max-w-xl rounded-full skeleton-shimmer" />
          <span className="h-12 w-52 rounded-[0.875rem] skeleton-shimmer" />
        </div>
        <span className="h-64 rounded-[1.75rem] skeleton-shimmer" />
      </div>
      <span className="mt-12 block h-24 rounded-2xl skeleton-shimmer lg:mt-16" />
    </div>
  );
}
