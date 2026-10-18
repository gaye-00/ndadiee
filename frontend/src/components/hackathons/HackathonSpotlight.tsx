import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { UPCOMING_HACKATHONS, useHackathons, useMyHackathons } from '@/hooks/useHackathons';
import { useNow } from '@/hooks/useNow';
import { roleOf } from '@/config/roles';
import { daysUntil, displayTimeZone, formatInZone, phaseOf } from '@/lib/hackathonTime';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { Hackathon } from '@/types/hackathon.types';
import { formatRelativeTime, isolate } from '@/utils/formatters';

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * Le prochain hackathon de l'équipe, dans l'atelier, à bordure tournante. Design 3B : « Hackathon · J-32 /
 * AgriTech 48h, Abidjan / Ton équipe Kumasi Builders cherche encore 1 dev front. » Ce qu'il dit suit ce qui
 * compte : les rôles qui manquent à l'équipe, son équipe en lice pendant le hackathon, ou, sans équipe, le
 * prochain hackathon où s'inscrire.
 */
export default function HackathonSpotlight() {
  const mine = useMyHackathons();
  const upcoming = useHackathons(UPCOMING_HACKATHONS);
  const now = useNow(60_000);

  const withTeam = mine.data?.[0];
  const open = upcoming.data?.content.find((hackathon) => phaseOf(hackathon, now) === 'registration');

  if (mine.isPending || (!withTeam && upcoming.isPending)) {
    return <div aria-hidden className="h-48 rounded-[1.375rem] skeleton-shimmer" />;
  }
  const hackathon = withTeam ?? open;
  if (!hackathon) {
    return null;
  }
  return <Spotlight hackathon={hackathon} now={now} />;
}

function Spotlight({ hackathon, now }: { hackathon: Hackathon; now: number }) {
  const { t } = useTranslation('hackathons');
  const { t: tc } = useTranslation();
  const phase = phaseOf(hackathon, now);
  const live = phase === 'live';
  const { zone } = displayTimeZone(hackathon);
  const team = hackathon.myTeam;
  const openings = team?.openings ?? [];
  const href = paths.hackathon(hackathon.slug);

  // Ce que dit la carte, et où mène son bouton
  const { message, action } = (() => {
    if (team && live) {
      return {
        message: t('spotlight.inPlay', { team: isolate(team.project.name), time: formatRelativeTime(hackathon.endsAt) }),
        action: { to: paths.workspace(team.project.slug), label: t('spotlight.openWorkspace'), preload: pages.workspaceBoard },
      };
    }
    if (team && openings.length > 0) {
      const seats = openings.reduce((total, opening) => total + opening.seats, 0);
      const roles = [
        ...new Set(
          openings.map((opening) => {
            const role = roleOf(opening.role);
            return role ? tc(`teamRoles.${role.id}`) : opening.title;
          }),
        ),
      ];
      return {
        message:
          roles.length === 1
            ? t('spotlight.seekingOne', { team: isolate(team.project.name), count: seats, role: roles[0].toLocaleLowerCase() })
            : t('spotlight.seekingMany', { team: isolate(team.project.name), count: seats, roles: roles.join(', ') }),
        action: { to: paths.workspaceRoles(team.project.slug), label: t('spotlight.manageRoles'), preload: pages.workspaceRoles },
      };
    }
    if (team) {
      return {
        message: t('spotlight.ready', { team: isolate(team.project.name), date: formatInZone('dayTime', hackathon.startsAt, zone) }),
        action: { to: href, label: t('spotlight.see'), preload: pages.hackathon },
      };
    }
    const date = formatInZone('day', hackathon.registrationClosesAt, zone);
    return {
      message: hackathon.teamCount === 0 ? t('spotlight.joinFirst', { date }) : t('spotlight.join', { date, count: hackathon.teamCount }),
      action: { to: href, label: t('spotlight.see'), preload: pages.hackathon },
    };
  })();

  return (
    <section aria-labelledby="hackathon-spotlight-title" className="border-kente-spin rounded-[1.375rem]">
      <div className="relative flex flex-col gap-2 rounded-[calc(1.375rem-1px)] bg-surface p-5">
        <p className={cn('flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.04em] uppercase', live ? 'text-coral' : 'text-jade')}>
          {live && <span aria-hidden className="size-1.5 rounded-full bg-coral animate-pulse-dot" />}
          {live ? t('spotlight.live') : t('spotlight.daysLeft', { count: daysUntil(hackathon.startsAt, now) })}
        </p>
        <h2 id="hackathon-spotlight-title" dir="auto" className="text-start font-display text-lg leading-snug font-bold">
          <Link to={href} viewTransition onPointerEnter={() => prefetch(pages.hackathon)} onFocus={() => prefetch(pages.hackathon)} className={cn('rounded-sm transition-colors hover:text-gold', focusRing)}>
            {hackathon.city ? t('spotlight.titleIn', { title: hackathon.title, city: hackathon.city }) : hackathon.title}
          </Link>
        </h2>
        <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">{message}</p>
        <Link
          to={action.to}
          viewTransition
          onPointerEnter={() => prefetch(action.preload)}
          onFocus={() => prefetch(action.preload)}
          className={cn(
            'mt-1.5 rounded-xl bg-inverse p-2.5 text-center text-[0.8125rem] font-bold text-inverse-foreground transition-[translate,opacity] duration-300 hover:-translate-y-px hover:opacity-90',
            focusRing,
          )}
        >
          {action.label}
        </Link>
      </div>
    </section>
  );
}
