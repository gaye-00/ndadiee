import { ArrowRight, Clock, Globe, MapPin, Plus, Trophy, Users } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import HackathonLoom from './HackathonLoom';
import HackathonPhaseBadge from './HackathonPhaseBadge';
import TeamMark from './TeamMark';
import WovenMotif from '@/components/shared/WovenMotif';
import { roleOf, type KenteThread } from '@/config/roles';
import { useNow } from '@/hooks/useNow';
import { dateStamp, displayTimeZone, durationOf, phaseOf } from '@/lib/hackathonTime';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { Hackathon } from '@/types/hackathon.types';
import { countryName } from '@/utils/formatters';

const ACCENTS: Record<KenteThread, string> = {
  gold: 'var(--gold)',
  coral: 'var(--coral)',
  jade: 'var(--jade)',
};

// Motifs des rôles recherchés montrés sur la carte ; les autres sont comptés
const ROLES_SHOWN = 3;
// Équipes montrées en pied de carte
const TEAMS_SHOWN = 3;

interface HackathonCardProps {
  hackathon: Hackathon;
  /** Couleur au survol : bordure, ombre et date (vert, or, rouge, une par carte) */
  accent?: KenteThread;
  className?: string;
}

/**
 * Carte d'un hackathon : son étoffe en lisière (elle se tisse à mesure que le temps passe), où il en est,
 * sa date en tampon, son lieu, sa dotation, et ses équipes avec les rôles qu'elles cherchent encore. Toute
 * la carte mène au hackathon.
 *
 * Au survol (ou au focus) : la carte se soulève et prend sa couleur, la navette s'étire, et les équipes
 * s'écartent pour laisser voir une place en pointillés : celle de l'équipe du visiteur.
 */
export default function HackathonCard({ hackathon, accent = 'jade', className }: HackathonCardProps) {
  const { t } = useTranslation('hackathons');
  const now = useNow(60_000);
  const phase = phaseOf(hackathon, now);
  const { zone } = displayTimeZone(hackathon);
  const href = paths.hackathon(hackathon.slug);
  const preload = () => prefetch(pages.hackathon);
  const duration = durationOf(hackathon);

  return (
    <article
      style={{ '--card-accent': ACCENTS[accent] } as CSSProperties}
      className={cn(
        'group/card glass relative flex h-full flex-col overflow-hidden rounded-2xl',
        'transition-[translate,border-color,box-shadow] duration-300 ease-out-expo',
        'hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--card-accent)_45%,transparent)] hover:shadow-[0_24px_48px_-28px_var(--card-accent)]',
        'focus-within:border-[color-mix(in_srgb,var(--card-accent)_45%,transparent)]',
        className,
      )}
    >
      <HackathonLoom hackathon={hackathon} />

      <div className="flex flex-1 flex-col gap-4 p-5.5">
        <div className="flex items-center gap-3">
          <HackathonPhaseBadge hackathon={hackathon} />
          <FormatTag format={hackathon.format} className="ms-auto" />
        </div>

        <div className="flex items-start gap-4">
          <DateStamp hackathon={hackathon} zone={zone} />
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 dir="auto" className="text-start font-display text-[1.3125rem] leading-[1.15] font-bold tracking-[-0.02em] text-foreground">
              {/* Le lien couvre toute la carte */}
              <Link
                to={href}
                viewTransition
                onPointerEnter={preload}
                onFocus={preload}
                className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring/70"
              >
                {hackathon.title}
              </Link>
            </h3>
            <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              {hackathon.city ? (
                <>
                  <MapPin aria-hidden className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {hackathon.city}
                    {hackathon.country && `, ${countryName(hackathon.country)}`}
                  </span>
                </>
              ) : (
                <>
                  <Globe aria-hidden className="size-3.5 shrink-0" />
                  {t('card.online')}
                </>
              )}
            </p>
          </div>
        </div>

        {hackathon.tagline && (
          <p dir="auto" className="line-clamp-2 text-start text-sm leading-[1.55] text-soft-foreground">
            {hackathon.tagline}
          </p>
        )}

        <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-xs text-muted-foreground">
          {hackathon.prizePool && (
            <Fact icon={<Trophy className="size-3.5 text-gold" />} label={t('card.prize')}>
              <span className="text-soft-foreground">{hackathon.prizePool}</span>
            </Fact>
          )}
          <Fact icon={<Users className="size-3.5" />} label={t('card.teamSizeLabel')}>
            {t('card.teamSize', { min: hackathon.minTeamSize, max: hackathon.maxTeamSize })}
          </Fact>
          <Fact icon={<Clock className="size-3.5" />} label={t('card.durationLabel')}>
            {t(`duration.${duration.unit}`, { count: duration.count })}
          </Fact>
        </dl>

        <div className="flex min-h-7 items-center gap-2.5 border-t border-border-subtle pt-3">
          <TeamsLine hackathon={hackathon} recruiting={phase === 'registration'} />
          <ArrowRight
            aria-hidden
            className="ms-auto size-4 shrink-0 text-muted-foreground transition-[translate,color] duration-300 group-hover/card:translate-x-0.5 group-hover/card:text-foreground rtl:-scale-x-100 rtl:group-hover/card:-translate-x-0.5"
          />
        </div>
      </div>
    </article>
  );
}

/** En ligne, sur place, ou les deux. */
export function FormatTag({ format, className }: { format: Hackathon['format']; className?: string }) {
  const { t } = useTranslation('hackathons');
  const Icon = format === 'REMOTE' ? Globe : MapPin;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground/6 px-2 py-0.5 text-[0.6875rem] leading-4 font-semibold text-soft-foreground',
        className,
      )}
    >
      <Icon aria-hidden className="size-3" />
      {t(`format.${format}`)}
    </span>
  );
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="contents">
        <span aria-hidden className="contents">
          {icon}
        </span>
        <span className="sr-only">{label}</span>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * Le tampon de date : le jour du coup d'envoi en grand, la fin à côté (« 20 –22 »), le mois dessous, dans
 * la couleur de la carte. Lu dans le fuseau du hackathon (ou celui du visiteur, en ligne).
 */
function DateStamp({ hackathon, zone }: { hackathon: Hackathon; zone: string }) {
  const start = dateStamp(hackathon.startsAt, zone);
  const end = dateStamp(hackathon.endsAt, zone);
  const sameDay = start.day === end.day && start.month === end.month;

  return (
    <span aria-hidden className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-glass-border bg-foreground/[0.03] py-2">
      <span className="font-mono text-[0.625rem] leading-none tracking-[0.08em] text-muted-foreground uppercase">{start.weekday}</span>
      <span className="mt-1 font-display text-[1.75rem] leading-none font-extrabold tracking-[-0.04em] text-foreground">
        {start.day}
      </span>
      <span className="mt-1 font-mono text-[0.6875rem] leading-none font-medium tracking-[0.06em] text-(--card-accent) uppercase">
        {start.month}
      </span>
      {!sameDay && (
        <span className="mt-1.5 border-t border-border-subtle pt-1 font-mono text-[0.625rem] leading-none text-muted-foreground">
          →{end.day}
          {end.month !== start.month && ` ${end.month}`}
        </span>
      )}
    </span>
  );
}

/**
 * Le pied de carte : les équipes déjà là et les rôles qu'elles cherchent encore ; aucune équipe, une place
 * vide qui attend la première ; terminé, l'équipe lauréate.
 */
function TeamsLine({ hackathon, recruiting }: { hackathon: Hackathon; recruiting: boolean }) {
  const { t } = useTranslation('hackathons');
  const teams = hackathon.teams.slice(0, TEAMS_SHOWN);
  const winner = hackathon.teams.find((team) => team.rank === 1);

  if (hackathon.status === 'ENDED' && winner) {
    return (
      <span className="flex min-w-0 items-center gap-2 text-[0.8125rem]">
        <Trophy aria-hidden className="size-4 shrink-0 text-gold" />
        <span className="truncate text-soft-foreground">
          {t('card.winner')} <span className="font-semibold text-foreground">{winner.project.name}</span>
        </span>
      </span>
    );
  }

  if (hackathon.teamCount === 0) {
    return recruiting ? (
      <span className="flex items-center gap-2 text-[0.8125rem] font-semibold text-gold">
        <span aria-hidden className="grid size-7 place-items-center rounded-lg border border-dashed border-gold/60">
          <Plus className="size-3.5" />
        </span>
        {t('card.firstTeam')}
      </span>
    ) : null;
  }

  const roles = hackathon.rolesSought.map(roleOf).filter((role) => role !== undefined);

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="flex shrink-0 items-center">
        {teams.map((team, index) => (
          <TeamMark
            key={team.id}
            project={team.project}
            size="sm"
            className={cn('ring-2 ring-surface transition-[margin] duration-300 ease-out-expo', index > 0 && '-ms-2 group-hover/card:-ms-1')}
          />
        ))}
        {recruiting && (
          <span
            aria-hidden
            className="-ms-2 grid size-7 shrink-0 scale-75 place-items-center rounded-lg border border-dashed border-jade/70 bg-surface text-jade opacity-0 transition-[margin,scale,opacity] duration-300 ease-out-expo group-hover/card:ms-1 group-hover/card:scale-100 group-hover/card:opacity-100"
          >
            <Plus className="size-3.5" />
          </span>
        )}
      </span>
      <span className="min-w-0 truncate text-[0.8125rem] text-soft-foreground">{t('card.teams', { count: hackathon.teamCount })}</span>
      {recruiting && hackathon.openSeats > 0 && (
        <span className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] font-semibold text-jade">
          <span aria-hidden className="flex shrink-0 items-center gap-0.5">
            {roles.slice(0, ROLES_SHOWN).map((role) => (
              <WovenMotif key={role.id} motif={role.motif} colors={role.colors} className="h-4 w-auto" />
            ))}
          </span>
          <span className="truncate">{t('card.seats', { count: hackathon.openSeats })}</span>
        </span>
      )}
    </span>
  );
}

/** Même encombrement qu'une carte, pendant le chargement. Design 3H (squelette à reflet). */
export function HackathonCardSkeleton() {
  return (
    <div aria-hidden className="glass flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="h-1.5 skeleton-shimmer" />
      <div className="flex flex-1 flex-col gap-4 p-5.5">
        <div className="flex items-center justify-between">
          <div className="h-3 w-40 rounded-full skeleton-shimmer" />
          <div className="h-4 w-16 rounded-full skeleton-shimmer" />
        </div>
        <div className="flex gap-4">
          <div className="h-[5.25rem] w-14 shrink-0 rounded-xl skeleton-shimmer" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <div className="h-5 w-3/4 rounded-full skeleton-shimmer" />
            <div className="h-3.5 w-1/2 rounded-full skeleton-shimmer" />
          </div>
        </div>
        <div className="h-3 w-full rounded-full skeleton-shimmer" />
        <div className="h-3 w-2/3 rounded-full skeleton-shimmer" />
        <div className="mt-auto flex items-center gap-2.5 border-t border-border-subtle pt-3">
          <div className="h-7 w-20 rounded-lg skeleton-shimmer" />
          <div className="h-3 w-28 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}
