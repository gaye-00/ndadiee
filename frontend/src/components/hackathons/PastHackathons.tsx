import { ArrowRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import HackathonMedal from './HackathonMedal';
import { rankLabel } from './rank';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { usePastHackathons } from '@/hooks/useHackathons';
import { displayTimeZone, formatInZone } from '@/lib/hackathonTime';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { Hackathon, HackathonTeam } from '@/types/hackathon.types';
import { countryName } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * Le palmarès : les hackathons terminés, du plus récent au plus ancien, chacun avec son podium et ses
 * distinctions. Les équipes lauréates mènent à leur projet, la ligne au hackathon. Quatre à la fois ; les
 * précédents à la demande. Rien tant qu'aucun hackathon n'est terminé.
 */
export default function PastHackathons() {
  const { t } = useTranslation('hackathons');
  const past = usePastHackathons();
  const hackathons = past.data?.pages.flatMap((page) => page.content) ?? [];

  if (past.isPending || past.isError || hackathons.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="hackathons-past-title" className="mt-20 lg:mt-28">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <h2 id="hackathons-past-title" className="font-display text-h2">
          {t('past.title')}
        </h2>
        <p className="max-w-md text-[0.9375rem] text-muted-foreground sm:pb-1 sm:text-end">{t('past.lead')}</p>
      </div>

      <ol className="glass mt-6 divide-y divide-border-subtle overflow-hidden rounded-2xl">
        {hackathons.map((hackathon) => (
          <PastRow key={hackathon.id} hackathon={hackathon} />
        ))}
      </ol>

      {past.hasNextPage && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => void past.fetchNextPage()}
            disabled={past.isFetchingNextPage}
            className={cn(
              'inline-flex h-11 items-center gap-2.5 rounded-full border border-border-strong px-5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-wait',
              focusRing,
            )}
          >
            {past.isFetchingNextPage ? <PulsatingDots size="sm" label={t('past.loadingMore')} /> : <ChevronDown aria-hidden className="size-4" />}
            {t('past.more')}
          </button>
        </div>
      )}
    </section>
  );
}

/** Une ligne du palmarès : quand et où, le hackathon, son podium, ses distinctions. */
function PastRow({ hackathon }: { hackathon: Hackathon }) {
  const { t } = useTranslation('hackathons');
  const { zone } = displayTimeZone(hackathon);
  const podium = hackathon.teams.filter((team) => team.rank !== null);
  const awards = hackathon.teams.filter((team) => team.rank === null && team.award);

  return (
    <li className="group/past relative grid gap-x-8 gap-y-4 p-5 transition-colors duration-300 hover:bg-foreground/[0.025] sm:p-6 md:grid-cols-[9rem_minmax(0,1fr)] lg:grid-cols-[9rem_minmax(0,17rem)_minmax(0,1fr)_auto] lg:items-center">
      <div className="flex items-baseline gap-3 md:block">
        <p className="font-mono text-xs tracking-[0.08em] text-gold uppercase">{formatInZone('monthYear', hackathon.endsAt, zone)}</p>
        <p className="text-xs text-muted-foreground md:mt-1">
          {hackathon.city ? `${hackathon.city}${hackathon.country ? `, ${countryName(hackathon.country)}` : ''}` : t('card.online')}
        </p>
      </div>

      <div className="min-w-0">
        <h3 dir="auto" className="text-start font-display text-lg leading-tight font-bold">
          {/* Le lien couvre toute la ligne ; les équipes lauréates passent au-dessus */}
          <Link
            to={paths.hackathon(hackathon.slug)}
            viewTransition
            onPointerEnter={() => prefetch(pages.hackathon)}
            onFocus={() => prefetch(pages.hackathon)}
            className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring/70 focus-visible:after:ring-inset"
          >
            {hackathon.title}
          </Link>
        </h3>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {t('past.teams', { count: hackathon.teamCount })}
          {hackathon.prizePool && (
            <>
              {' · '}
              <bdi>{hackathon.prizePool}</bdi>
            </>
          )}
        </p>
      </div>

      {(podium.length > 0 || awards.length > 0) && (
        <ul className="flex flex-wrap gap-2 md:col-start-2 lg:col-start-auto">
          {[...podium, ...awards].map((team) => (
            <Laureate key={team.id} team={team} />
          ))}
        </ul>
      )}

      <ArrowRight
        aria-hidden
        className="absolute end-5 top-6 size-4 text-muted-foreground transition-[translate,color] duration-300 group-hover/past:translate-x-0.5 group-hover/past:text-foreground sm:end-6 lg:static rtl:-scale-x-100 rtl:group-hover/past:-translate-x-0.5"
      />
    </li>
  );
}

/** Une équipe lauréate : sa médaille, son nom, sa place ou sa distinction ; elle mène à son projet. */
function Laureate({ team }: { team: HackathonTeam }) {
  const { t } = useTranslation('hackathons');
  const distinction = team.rank !== null ? rankLabel(t, team.rank) : team.award;

  return (
    <li className="relative z-10">
      <Link
        to={paths.project(team.project.slug)}
        viewTransition
        onPointerEnter={() => prefetch(pages.project)}
        onFocus={() => prefetch(pages.project)}
        className={cn(
          'flex items-center gap-2 rounded-full border border-glass-border bg-surface/60 py-1 ps-1 pe-3 text-[0.8125rem] transition-[border-color,background-color] duration-300 hover:border-border-strong hover:bg-surface',
          focusRing,
        )}
      >
        <HackathonMedal rank={team.rank} />
        <span dir="auto" className="font-semibold text-foreground">
          {team.project.name}
        </span>
        <span className="text-xs text-muted-foreground">{distinction}</span>
      </Link>
    </li>
  );
}
