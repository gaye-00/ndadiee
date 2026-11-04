import { ArrowUpRight, GitFork, Star, Users } from 'lucide-react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import GithubMark from '@/components/shared/GithubMark';
import { cn } from '@/lib/utils';
import type { GithubActivity, Project } from '@/types/project.types';
import { formatCount, formatDate, formatRelativeTime } from '@/utils/formatters';

const WEEK = 7 * 86_400_000;

/**
 * Activité du dépôt GitHub, à la dernière synchronisation : commits de la semaine, issues « premier
 * pas », dernière release, et l'histogramme des 12 dernières semaines, dont les barres montent à
 * l'arrivée de la carte. Design 3D.
 */
export default function GithubActivityCard({ project }: { project: Project }) {
  const { t } = useTranslation();
  const github = project.github;

  if (!github) {
    // Un dépôt GitHub sans relevé d'activité : la carte des pull requests (RepositorySyncCard) dit déjà où il en est
    return project.repositoryUrl && !/github\.com\//i.test(project.repositoryUrl) ? (
      <section className="glass flex flex-col gap-2 rounded-[1.375rem] p-5 font-mono text-xs text-muted-foreground">
        <h2 className="eyebrow flex items-center gap-2">
          <GithubMark className="size-3.5" />
          {t('project.github.title')}
        </h2>
        <p>{t('project.github.notSynced')}</p>
        <RepositoryLink url={project.repositoryUrl} />
      </section>
    ) : null;
  }

  return (
    <section aria-labelledby="github-title" className="glass rounded-[1.375rem] p-5">
      <h2 id="github-title" className="eyebrow flex flex-wrap items-center gap-x-2 gap-y-1">
        <GithubMark className="size-3.5 text-soft-foreground" />
        {t('project.github.title')}
        <span aria-hidden className="text-faint-foreground">
          ·
        </span>
        <span className="flex items-center gap-1.5 normal-case">
          <span aria-hidden className="live-dot size-1.5" />
          <time dateTime={github.syncedAt}>{t('project.github.synced', { time: formatRelativeTime(github.syncedAt) })}</time>
        </span>
      </h2>

      <CommitWeeks github={github} />

      <ul className="mt-3.5 flex flex-col gap-2 font-mono text-xs text-soft-foreground">
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-1.5 rounded-full bg-kente-jade" />
          {t('project.github.commits', { count: github.commitsThisWeek })}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-1.5 rounded-full bg-kente-gold" />
          {t('project.github.firstIssues', { count: github.goodFirstIssues })}
        </li>
        {github.lastRelease && github.lastReleaseAt && (
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-1.5 rounded-full bg-kente-coral" />
            {t('project.github.release', { version: github.lastRelease, time: formatRelativeTime(github.lastReleaseAt) })}
          </li>
        )}
      </ul>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle pt-3 font-mono text-[0.6875rem] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Star aria-hidden className="size-3.5 text-gold" />
          {formatCount(github.stars)}
        </span>
        <span className="flex items-center gap-1.5">
          <GitFork aria-hidden className="size-3.5" />
          {t('project.github.forks', { count: github.forks, formatted: formatCount(github.forks) })}
        </span>
        <span className="flex items-center gap-1.5">
          <Users aria-hidden className="size-3.5" />
          {t('project.github.contributors', { count: github.contributors })}
        </span>
      </div>
      {project.repositoryUrl && <RepositoryLink url={project.repositoryUrl} />}
    </section>
  );
}

/** Les commits des 12 dernières semaines : la semaine en cours en vert, le détail au survol. */
function CommitWeeks({ github }: { github: GithubActivity }) {
  const { t } = useTranslation();
  const weeks = github.commitWeeks;
  const max = Math.max(1, ...weeks);
  const synced = new Date(github.syncedAt).getTime();

  return (
    <figure className="mt-4">
      <figcaption className="sr-only">{t('project.github.weeks')}</figcaption>
      <ol className="flex h-14 items-end gap-1">
        {weeks.map((count, index) => {
          const current = index === weeks.length - 1;
          const label = t('project.github.week', {
            count,
            date: formatDate(new Date(synced - (weeks.length - 1 - index) * WEEK).toISOString()),
          });
          return (
            <li key={index} title={label} className="group/week relative flex h-full flex-1 items-end">
              <span className="sr-only">{label}</span>
              <m.span
                aria-hidden
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 + index * 0.04, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: `${Math.max(8, (count / max) * 100)}%` }}
                className={cn(
                  'block w-full origin-bottom rounded-[3px] transition-colors duration-200',
                  current ? 'bg-kente-jade shadow-[0_0_14px_-2px_var(--kente-jade)]' : 'bg-foreground/14 group-hover/week:bg-foreground/30',
                )}
              />
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

function RepositoryLink({ url }: { url: string }) {
  const { t } = useTranslation();
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group/repo mt-3 inline-flex items-center gap-1 rounded-md text-xs font-bold text-soft-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
    >
      {t('project.github.open')}
      <ArrowUpRight aria-hidden className="size-3.5 transition-transform group-hover/repo:-translate-y-0.5 group-hover/repo:translate-x-0.5 rtl:-scale-x-100" />
    </a>
  );
}
