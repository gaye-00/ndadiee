import { useTranslation } from 'react-i18next';
import HackathonCard, { HackathonCardSkeleton } from './HackathonCard';
import HackathonFeature, { HackathonFeatureSkeleton } from './HackathonFeature';
import PastHackathons from './PastHackathons';
import EmptyState from '@/components/feedback/EmptyState';
import ErrorState from '@/components/feedback/ErrorState';
import type { KenteThread } from '@/config/roles';
import { useAuth } from '@/hooks/useAuth';
import { LIVE_HACKATHONS, UPCOMING_HACKATHONS, useHackathons } from '@/hooks/useHackathons';
import { useNow } from '@/hooks/useNow';
import { phaseOf } from '@/lib/hackathonTime';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Hackathon } from '@/types/hackathon.types';

// Une couleur par carte au survol, comme la vitrine : vert, or, rouge, décalées d'une rangée à l'autre
const ACCENTS: readonly KenteThread[] = ['jade', 'gold', 'coral'];
const accentOf = (index: number) => ACCENTS[(index + Math.floor(index / 3)) % ACCENTS.length];

/**
 * À la une : le hackathon qui se joue en ce moment, sinon le prochain dont les inscriptions sont ouvertes,
 * sinon le prochain tout court.
 */
function featuredOf(hackathons: Hackathon[], now: number): Hackathon | undefined {
  return (
    hackathons.find((hackathon) => phaseOf(hackathon, now) === 'live') ??
    hackathons.find((hackathon) => phaseOf(hackathon, now) === 'registration') ??
    hackathons[0]
  );
}

/**
 * La page des hackathons : l'accroche et ce qui se passe en ce moment, le hackathon à la une avec son
 * compte à rebours, les suivants en cartes, puis le palmarès des hackathons terminés.
 */
export default function HackathonList() {
  const { t } = useTranslation('hackathons');
  const { isAuthenticated } = useAuth();
  const now = useNow(60_000);
  const live = useHackathons(LIVE_HACKATHONS);
  const upcoming = useHackathons(UPCOMING_HACKATHONS);

  const pending = live.isPending || upcoming.isPending;
  const failed = live.isError || upcoming.isError;
  const current = [...(live.data?.content ?? []), ...(upcoming.data?.content ?? [])];
  const featured = featuredOf(current, now);
  const others = current.filter((hackathon) => hackathon.id !== featured?.id);

  return (
    <div className="relative isolate overflow-x-clip">
      {/* Lumières de fond : l'or derrière l'accroche, le vert derrière le hackathon à la une */}
      <div aria-hidden className="halo halo-gold -top-72 -start-64 -z-10 size-[46rem] animate-float" />
      <div aria-hidden className="halo halo-jade top-[22rem] end-[-16rem] -z-10 size-[40rem] opacity-70" />

      <div className="mx-auto max-w-[90rem] px-4 pb-24 sm:px-6 lg:px-10 lg:pb-32 xl:px-16">
        <Intro
          liveCount={live.data?.totalElements}
          upcomingCount={upcoming.data?.totalElements}
          seats={upcoming.data?.content.reduce((total, hackathon) => total + hackathon.openSeats, 0)}
        />

        <div aria-busy={pending}>
          {pending ? (
            <>
              <span className="sr-only">{t('list.loading')}</span>
              <HackathonFeatureSkeleton />
            </>
          ) : failed ? (
            <ErrorState
              title={t('list.errorTitle')}
              description={t('list.errorText')}
              onRetry={() => {
                void live.refetch();
                void upcoming.refetch();
              }}
            />
          ) : featured ? (
            <HackathonFeature hackathon={featured} />
          ) : (
            <EmptyState
              title={t('list.emptyTitle')}
              description={t('list.emptyText')}
              action={{ to: isAuthenticated ? paths.newProject : paths.register, label: t('list.emptyAction') }}
            />
          )}
        </div>

        {(pending || others.length > 0) && (
          <section aria-labelledby="hackathons-upcoming-title" className="mt-20 lg:mt-28">
            <h2 id="hackathons-upcoming-title" className="font-display text-h2">
              {t('list.upcomingTitle')}
            </h2>
            {/* Quatre hackathons : deux rangées de deux plutôt qu'une carte seule sur la seconde rangée */}
            <ul className={cn('mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5', others.length !== 4 && 'lg:grid-cols-3')}>
              {pending
                ? Array.from({ length: 3 }, (_, index) => (
                    <li key={index}>
                      <HackathonCardSkeleton />
                    </li>
                  ))
                : others.map((hackathon, index) => (
                    <li key={hackathon.id}>
                      <HackathonCard hackathon={hackathon} accent={accentOf(index)} />
                    </li>
                  ))}
            </ul>
          </section>
        )}

        <PastHackathons />
      </div>
    </div>
  );
}

/**
 * L'accroche de la page, et ce qui se passe en ce moment : hackathons en direct, à venir, et places que
 * les équipes inscrites cherchent encore à pourvoir. Les chiffres arrivent avec les listes.
 */
function Intro({ liveCount, upcomingCount, seats }: { liveCount?: number; upcomingCount?: number; seats?: number }) {
  const { t } = useTranslation('hackathons');
  const ready = liveCount !== undefined && upcomingCount !== undefined;

  return (
    <header className="grid gap-x-16 gap-y-7 pt-8 pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-end lg:pt-14 lg:pb-14">
      <div>
        <p className="eyebrow">{t('list.eyebrow')}</p>
        <h1 className="mt-4 font-display text-h1">
          <span className="block">{t('list.titleTeam')}</span>
          {/* Les lettres sont taillées dans le kente (styles/effects.css) */}
          <span className="block w-fit text-kente-woven">{t('list.titleShip')}</span>
        </h1>
      </div>

      <div className="flex flex-col gap-5 lg:pb-1.5">
        <p className="text-lead text-muted-foreground">{t('list.lead')}</p>
        {/* Place gardée tant que les chiffres ne sont pas là : rien ne bouge à leur arrivée */}
        <p aria-live="polite" className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-xs text-soft-foreground">
          {ready && (
            <>
              {liveCount > 0 && (
                <span className="inline-flex items-center gap-2 text-coral">
                  <span aria-hidden className="size-2 rounded-full bg-coral animate-pulse-dot" />
                  {t('list.live', { count: liveCount })}
                </span>
              )}
              <span className="inline-flex items-center gap-2">
                <span aria-hidden className="size-1.5 rounded-full bg-jade" />
                {t('list.upcoming', { count: upcomingCount })}
              </span>
              {seats !== undefined && seats > 0 && (
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="size-1.5 rounded-full bg-gold" />
                  {t('list.seats', { count: seats })}
                </span>
              )}
            </>
          )}
        </p>
      </div>
    </header>
  );
}
