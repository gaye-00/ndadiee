import axios from 'axios';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ErrorState from '@/components/feedback/ErrorState';
import GithubMark from '@/components/shared/GithubMark';
import KenteSkyline, { type SkylineView } from '@/components/shared/KenteSkyline';
import { SkylineLegend, SkylineViewToggle } from '@/components/shared/SkylineControls';
import { useGithubContributions } from '@/hooks/useGithubContributions';
import { useUserActivity } from '@/hooks/useUsers';
import { currentLanguage } from '@/i18n';
import { buildYear, dayMs } from '@/lib/contributions';
import { cn } from '@/lib/utils';
import { GITHUB_LOGIN } from '@/services/github.service';
import type { UserProfile } from '@/types/user.types';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/** Le pseudo GitHub d'une adresse de profil (« https://github.com/ada » → « ada »), s'il y en a un valide */
function githubLoginOf(url: string | null): string | null {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') {
      return null;
    }
    const login = parsed.pathname.split('/').find(Boolean) ?? '';
    return GITHUB_LOGIN.test(login) ? login : null;
  } catch {
    return null;
  }
}

/**
 * Carte de chaleur des contributions de l'année, plateforme et GitHub. Design 3F.
 *
 * L'année du membre tissée comme un kente (shared/KenteSkyline : une bande par semaine, un bloc par jour), à plat ou
 * levée en ville. Elle compte ce qu'il a fait de visible sur la plateforme ; s'il a lié son GitHub, le visiteur peut y
 * ajouter son calendrier public. GitHub n'est appelé qu'à sa demande : c'est un service tiers.
 */
export default function ContributionHeatmap({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation('profile');
  const { t: tc } = useTranslation();
  const activity = useUserActivity(profile.username);
  const login = githubLoginOf(profile.githubUrl);
  const [withGithub, setWithGithub] = useState(false);
  const github = useGithubContributions(withGithub ? login : null);
  const [view, setView] = useState<SkylineView>('cloth');
  const [legendLevel, setLegendLevel] = useState(-1);
  // L'année se termine aujourd'hui, figé au premier affichage
  const [today] = useState(() => dayMs(new Date()));

  // Le calendrier GitHub ne compte que si le visiteur l'a demandé, et une fois arrivé
  const githubDays = withGithub ? github.data : undefined;
  const merged = githubDays !== undefined;
  const year = useMemo(() => buildYear([...(activity.data ?? []), ...(githubDays ?? [])], today), [activity.data, githubDays, today]);
  const githubFailed = withGithub && github.isError;
  const githubUnknown = githubFailed && axios.isAxiosError(github.error) && github.error.response?.status === 404;

  const dates = new Intl.DateTimeFormat(currentLanguage().intl as string[], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const first = year.cells[0]?.date;
  const last = year.cells[year.cells.length - 1]?.date;
  const total = tc('contributions.count', { count: year.stats.total });
  const label = tc('contributions.summary', {
    who: profile.fullName,
    total,
    from: first ? dates.format(dayMs(first)) : '',
    to: last ? dates.format(dayMs(last)) : '',
  });

  return (
    <section aria-labelledby="heatmap-title" className="glass overflow-hidden rounded-[1.75rem] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="eyebrow">{t('heatmap.eyebrow')}</p>
          <h2 id="heatmap-title" className="mt-1 font-display text-h4">
            {t('heatmap.title')}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {activity.isPending ? (
              <span aria-hidden className="inline-block h-3.5 w-56 rounded-full align-middle skeleton-shimmer" />
            ) : (
              <>
                <strong className="font-semibold text-foreground">{total}</strong>
                {year.stats.total > 0 && <> · {tc('contributions.streak', { count: year.stats.longest.days })}</>}
                {year.stats.current.days > 1 && <span className="text-jade"> · {t('heatmap.currentStreak', { count: year.stats.current.days })}</span>}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {login && (
            <div role="group" aria-label={t('heatmap.sources')} className="inline-flex rounded-full border border-border p-0.5">
              {[false, true].map((option) => (
                <button
                  key={String(option)}
                  type="button"
                  aria-pressed={withGithub === option}
                  onClick={() => setWithGithub(option)}
                  title={option ? t('heatmap.githubHint', { login }) : undefined}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors duration-300',
                    withGithub === option ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                    focusRing,
                  )}
                >
                  {option && <GithubMark className="size-3.5" />}
                  {t(option ? 'heatmap.withGithub' : 'heatmap.platform')}
                </button>
              ))}
            </div>
          )}
          <SkylineViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {activity.isError ? (
        <ErrorState className="mt-5" title={t('heatmap.errorTitle')} description={t('heatmap.errorText')} onRetry={() => void activity.refetch()} />
      ) : (
        <KenteSkyline
          className="mt-5"
          year={year}
          yearKey={`${profile.username}:${merged ? `github:${login}` : 'platform'}`}
          view={view}
          legendLevel={legendLevel}
          pending={activity.isPending || (withGithub && github.isPending)}
          label={label}
        />
      )}

      {githubFailed && (
        <p role="status" className="mt-3 text-xs text-coral">
          {t(githubUnknown ? 'heatmap.githubUnknown' : 'heatmap.githubUnavailable', { login })}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>{tc('contributions.structure')}</span>
          <SkylineLegend level={legendLevel} onLevel={setLegendLevel} />
        </div>
        <span>{t(merged ? 'heatmap.countsWithGithub' : 'heatmap.counts')}</span>
      </div>
    </section>
  );
}
