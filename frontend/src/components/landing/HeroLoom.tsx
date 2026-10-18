import axios from 'axios';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import GithubMark from '@/components/shared/GithubMark';
import KenteSkyline, { type SkylineView } from '@/components/shared/KenteSkyline';
import { SkylineLegend, SkylineViewToggle } from '@/components/shared/SkylineControls';
import { useAuth } from '@/hooks/useAuth';
import { useGithubContributions } from '@/hooks/useGithubContributions';
import { currentLanguage } from '@/i18n';
import { buildYear, dayMs, sampleYear } from '@/lib/contributions';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import { GITHUB_LOGIN, githubService } from '@/services/github.service';
import { storage } from '@/utils/storage';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * Le « métier » de l'accueil : une année GitHub tissée comme un kente, puis levée en ville.
 * Année type au départ ; le visiteur tape son pseudo et c'est la sienne qui se tisse, bande par
 * bande. Son pseudo est gardé pour sa prochaine visite.
 */
export default function HeroLoom({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [login, setLogin] = useState<string | null>(() => storage.getGithubLogin());
  const [draft, setDraft] = useState(() => login ?? '');
  const [invalid, setInvalid] = useState(false);
  const [view, setView] = useState<SkylineView>('city');
  const [legendLevel, setLegendLevel] = useState(-1);
  const github = useGithubContributions(login);

  // L'année se termine aujourd'hui, figé au premier affichage
  const [today] = useState(() => dayMs(new Date()));
  const sample = useMemo(() => buildYear(sampleYear(today), today), [today]);
  const personal = useMemo(() => (github.data ? buildYear(github.data, today) : null), [github.data, today]);
  const year = personal ?? sample;
  const weaver = personal && login ? login : null;

  const notFound = axios.isAxiosError(github.error) && github.error.response?.status === 404;
  const error = invalid
    ? t('hero.loom.invalid')
    : github.isError
      ? t(notFound ? 'hero.loom.notFound' : 'hero.loom.unavailable')
      : null;

  // Pseudo inconnu de GitHub : on ne le ressort pas à la prochaine visite
  useEffect(() => {
    if (notFound) {
      storage.clearGithubLogin();
    }
  }, [notFound]);

  // Pseudo retrouvé d'une visite précédente : le tissage attend son année, 1,2 s au plus, plutôt que
  // de commencer par l'année type
  const [patient, setPatient] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setPatient(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);
  const pending = patient && !!login && github.isPending;

  function weave(event: FormEvent) {
    event.preventDefault();
    const value = draft.trim().replace(/^@/, '');
    if (!GITHUB_LOGIN.test(value)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDraft(value);
    setLogin(value);
    storage.setGithubLogin(value);
  }

  function backToSample() {
    setLogin(null);
    setDraft('');
    setInvalid(false);
    storage.clearGithubLogin();
  }

  const dates = new Intl.DateTimeFormat(currentLanguage().intl as string[], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const first = year.cells[0]?.date;
  const last = year.cells[year.cells.length - 1]?.date;
  const who = weaver ? `@${weaver}` : t('hero.loom.sample');
  const total = t('contributions.count', { count: year.stats.total });
  const summary = t('contributions.summary', {
    who,
    total,
    from: first ? dates.format(dayMs(first)) : '',
    to: last ? dates.format(dayMs(last)) : '',
  });
  const publishTo = isAuthenticated ? paths.newProject : paths.register;

  return (
    <div className={cn('relative', className)}>
      <div className="mx-auto flex max-w-page flex-wrap items-end justify-between gap-x-8 gap-y-4 px-4 sm:px-6">
        {/* Étiquette du tissu, comme celle cousue sur un kente : qui l'a tissé, et ce qu'il raconte */}
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="h-10 w-1 shrink-0 rounded-full"
            style={{ backgroundImage: 'linear-gradient(180deg, var(--kente-gold), var(--kente-coral), var(--kente-jade))' }}
          />
          {weaver && (
            <img
              src={githubService.avatarUrl(weaver)}
              alt=""
              width={36}
              height={36}
              className="size-9 shrink-0 rounded-full bg-muted ring-1 ring-border"
            />
          )}
          <div className="min-w-0">
            <p className="truncate font-mono text-sm text-foreground">{who}</p>
            <p className="truncate text-xs text-muted-foreground">
              {total} · {t('contributions.streak', { count: year.stats.longest.days })}
            </p>
          </div>
          {weaver && (
            <button
              type="button"
              onClick={backToSample}
              aria-label={t('hero.loom.reset')}
              title={t('hero.loom.reset')}
              className={cn('grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/7 hover:text-foreground', focusRing)}
            >
              <RotateCcw aria-hidden className="size-4" />
            </button>
          )}
        </div>

        <div className="flex w-full flex-wrap items-start gap-2 sm:w-auto">
          <form onSubmit={weave} noValidate className="min-w-0 flex-1 sm:flex-none">
            <label htmlFor="hero-github" className="sr-only">
              {t('hero.loom.username')}
            </label>
            <div
              className={cn(
                'flex h-10 items-center rounded-full border bg-surface/70 ps-3 transition-colors focus-within:border-ring',
                error ? 'border-coral' : 'border-border',
              )}
            >
              <GithubMark className="size-4 shrink-0 text-muted-foreground" />
              <input
                id="hero-github"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setInvalid(false);
                }}
                placeholder={t('hero.loom.placeholder')}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={40}
                dir="ltr"
                aria-invalid={!!error}
                aria-describedby={error ? 'hero-github-error' : undefined}
                className="h-full min-w-0 flex-1 bg-transparent px-2 font-mono text-sm text-foreground outline-none placeholder:text-faint-foreground sm:w-40 sm:flex-none"
              />
              <button
                type="submit"
                disabled={github.isFetching}
                className={cn(
                  'me-1 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-70',
                  focusRing,
                )}
              >
                {github.isFetching && <PulsatingDots size="sm" tone="current" />}
                {github.isFetching ? t('hero.loom.weaving') : t('hero.loom.weave')}
              </button>
            </div>
          </form>

          <SkylineViewToggle view={view} onChange={setView} />

          <p id="hero-github-error" role="status" className="w-full text-xs text-coral empty:hidden sm:text-end">
            {error}
          </p>
        </div>
      </div>

      <KenteSkyline
        className="mt-5"
        year={year}
        yearKey={weaver ? `github:${weaver.toLowerCase()}` : 'sample'}
        view={view}
        legendLevel={legendLevel}
        pending={pending}
        label={summary}
      />

      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 pt-3 text-xs text-muted-foreground sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>{t('contributions.structure')}</span>
          <SkylineLegend level={legendLevel} onLevel={setLegendLevel} />
        </div>
        {weaver ? (
          <Link
            to={publishTo}
            viewTransition
            onPointerEnter={() => prefetch(isAuthenticated ? pages.newProject : pages.register)}
            className={cn('group/showcase inline-flex items-center gap-1.5 rounded-full font-semibold text-gold', focusRing)}
          >
            {t('hero.loom.showcase')}
            <ArrowRight
              aria-hidden
              className="size-3.5 transition-transform group-hover/showcase:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/showcase:-translate-x-0.5"
            />
          </Link>
        ) : (
          <span>{t(view === 'city' ? 'contributions.hintCity' : 'contributions.hintCloth')}</span>
        )}
      </div>
    </div>
  );
}
