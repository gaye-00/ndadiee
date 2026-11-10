import { ArrowLeft, ChevronDown, Code2, ExternalLink, FolderTree, GitBranch, Info, RefreshCw } from 'lucide-react';
import { m } from 'motion/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import CodeTree from '@/components/projects/code/CodeTree';
import CodeViewer from '@/components/projects/code/CodeViewer';
import Chip from '@/components/shared/Chip';
import GithubMark from '@/components/shared/GithubMark';
import { site } from '@/config/site';
import { useProject, useProjectCode } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { ProjectCode } from '@/types/code.types';
import type { Project } from '@/types/project.types';
import { getApiError } from '@/utils/apiError';
import { formatNumber } from '@/utils/formatters';
import { isPlaceholderUrl } from '@/utils/repository';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';
const OUTLINE = cn(
  'inline-flex h-10 items-center gap-2 rounded-[0.875rem] border border-border-strong px-3.5 text-sm font-bold text-foreground',
  'transition-[background-color,border-color,translate] duration-300 ease-out-expo hover:-translate-y-px hover:border-foreground/30 hover:bg-foreground/5',
  focusRing,
);

/** Le fichier ouvert d'office : le README à la racine, sinon le premier fichier. */
function defaultFileOf(code: ProjectCode | undefined): string | null {
  const files = code?.entries.filter((entry) => entry.type === 'FILE') ?? [];
  return (files.find((file) => /^readme(\.[a-z]+)?$/i.test(file.path)) ?? files.find((file) => !file.path.includes('/')) ?? files[0])?.path ?? null;
}

/**
 * « Code source » d'un projet, lu sans quitter Ndadiee : l'arbre du dépôt à gauche, le fichier ouvert à droite (le
 * README d'abord). Le fichier ouvert est dans l'adresse (?path=…) : on partage un lien vers lui, le retour en arrière
 * revient au précédent.
 *
 * Un dépôt GitHub public est lu sur GitHub ; un projet de démonstration a son dépôt fourni avec l'application, et la
 * page le dit. Un dépôt hors de GitHub, ou que GitHub ne sert pas (privé, quota atteint), a sa page d'explication.
 */
export default function ProjectCodePage() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation('projectCode');
  const { t: tc } = useTranslation();
  const [params, setParams] = useSearchParams();
  const project = useProject(slug);
  const code = useProjectCode(slug);
  const readme = useMemo(() => defaultFileOf(code.data), [code.data]);
  const selected = params.get('path') ?? readme;
  const [treeOpen, setTreeOpen] = useState(false);
  const name = project.data?.name;

  useEffect(() => {
    if (!name) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      document.title = `${tc('pages.projectCode')} · ${name} · ${site.name}`;
    });
    return () => cancelAnimationFrame(frame);
  }, [name, tc, i18n.language]);

  const open = (path: string) => {
    setParams({ path });
    setTreeOpen(false);
    // L'arbre est collant : on revient en haut du fichier s'il est plus haut que l'écran
    const viewer = document.getElementById('code-file-title');
    if (viewer && viewer.getBoundingClientRect().top < 0) {
      viewer.scrollIntoView({ block: 'start' });
    }
  };

  if (project.isPending || code.isPending) {
    return (
      <Shell>
        <div className="grid min-h-[50dvh] place-items-center">
          <PulsatingDots label={t('code.loading')} />
        </div>
      </Shell>
    );
  }
  if (project.isError) {
    return (
      <Shell>
        <Problem title={tc('project.notFoundTitle')} text={tc('project.notFoundText')}>
          <Link to={paths.showcase} viewTransition className={OUTLINE}>
            <ArrowLeft aria-hidden className="size-4 rtl:-scale-x-100" />
            {tc('project.backToShowcase')}
          </Link>
        </Problem>
      </Shell>
    );
  }
  if (code.isError) {
    return (
      <Shell project={project.data}>
        <CodeProblem project={project.data} error={code.error} onRetry={() => void code.refetch()} />
      </Shell>
    );
  }

  const data = code.data;
  const files = data.entries.filter((entry) => entry.type === 'FILE').length;
  const tree = <CodeTree key={data.repository} entries={data.entries} selected={selected} onSelect={open} truncated={data.truncated} />;

  return (
    <Shell project={project.data}>
      <CodeHeader project={project.data} code={data} files={files} />

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-5">
        {/* Téléphone et tablette : l'arbre se déplie au-dessus du fichier */}
        <div className="lg:hidden">
          <button
            type="button"
            aria-expanded={treeOpen}
            onClick={() => setTreeOpen((value) => !value)}
            className={cn('glass flex h-12 w-full items-center gap-2.5 rounded-2xl px-4 text-sm font-semibold text-foreground', focusRing)}
          >
            <FolderTree aria-hidden className="size-4 text-soft-foreground" />
            {t('code.filesTitle')}
            <span className="font-mono text-xs font-normal text-muted-foreground">{formatNumber(files)}</span>
            <ChevronDown aria-hidden className={cn('ms-auto size-4 text-muted-foreground transition-transform duration-300', treeOpen && 'rotate-180')} />
          </button>
          {treeOpen && <div className="glass mt-2 flex max-h-[60dvh] flex-col rounded-2xl">{tree}</div>}
        </div>
        {/* Grand écran : une colonne qui reste à l'écran pendant la lecture */}
        <aside className="glass sticky top-20 hidden max-h-[calc(100dvh-6rem)] flex-col rounded-[1.375rem] lg:flex">
          <h2 className="eyebrow flex items-center gap-2 px-4 pt-4">
            <FolderTree aria-hidden className="size-3.5" />
            {t('code.filesTitle')}
            <span className="font-mono text-faint-foreground">{formatNumber(files)}</span>
          </h2>
          {tree}
        </aside>

        {selected ? (
          <CodeViewer key={selected} slug={project.data.slug} path={selected} readme={readme} onOpen={open} />
        ) : (
          <div className="glass rounded-[1.375rem] px-6 py-12 text-sm text-muted-foreground">{t('code.empty')}</div>
        )}
      </div>
    </Shell>
  );
}

/** Le cadre de la page : ses lumières, sa largeur, le retour au projet. */
function Shell({ project, children }: { project?: Project; children: ReactNode }) {
  const { t } = useTranslation('projectCode');
  return (
    <article aria-labelledby="code-title" className="relative isolate overflow-x-clip">
      <div aria-hidden className="halo halo-jade -top-72 -start-56 -z-10 size-[40rem] animate-float" />
      <div aria-hidden className="halo halo-gold -top-48 end-[-14rem] -z-10 size-[32rem] opacity-60" />
      <div className="mx-auto max-w-[90rem] px-4 pt-6 pb-16 sm:px-6 sm:pt-8 lg:px-10 xl:px-16">
        {project && (
          <Link
            to={paths.project(project.slug)}
            viewTransition
            className="group/back inline-flex items-center gap-2 rounded-full text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none"
          >
            <ArrowLeft aria-hidden className="size-4 transition-transform group-hover/back:-translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/back:translate-x-0.5" />
            <span>
              {t('code.back')} <bdi className="text-foreground">{project.name}</bdi>
            </span>
          </Link>
        )}
        {children}
      </div>
    </article>
  );
}

/** Le dépôt : son nom, sa branche, d'où vient le code, et le lien vers GitHub. */
function CodeHeader({ project, code, files }: { project: Project; code: ProjectCode; files: number }) {
  const { t } = useTranslation('projectCode');
  const { t: tc } = useTranslation();
  const [owner, ...rest] = code.repository.split('/');
  const demo = code.source === 'DEMO';

  return (
    <m.header
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mt-5 flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-2">
            <Code2 aria-hidden className="size-3.5" />
            {tc('pages.projectCode')}
          </p>
          <h1 id="code-title" dir="ltr" className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 font-display text-h3 break-all">
            {demo ? (
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-kente-conic text-kente-night">
                <Code2 className="size-4.5" />
              </span>
            ) : (
              <GithubMark className="size-7 shrink-0" />
            )}
            <span className="text-muted-foreground">{owner}</span>
            <span aria-hidden className="text-faint-foreground">
              /
            </span>
            <span>{rest.join('/')}</span>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Chip className="font-mono">
              <GitBranch aria-hidden className="size-3" />
              {code.branch}
            </Chip>
            <Chip className="font-mono">{t('code.files', { count: files, formatted: formatNumber(files) })}</Chip>
            {project.license && <Chip className="font-mono">{project.license}</Chip>}
            {demo ? <Chip tone="gold">{t('code.sourceDemo')}</Chip> : <Chip tone="jade">{t('code.sourceGithub')}</Chip>}
          </div>
        </div>
        {code.webUrl && (
          <a href={code.webUrl} target="_blank" rel="noreferrer" className={OUTLINE}>
            <GithubMark className="size-4" />
            {t('code.openOnGithub')}
            <ExternalLink aria-hidden className="size-3.5 text-faint-foreground" />
          </a>
        )}
      </div>
      {demo && (
        <p className="flex max-w-3xl items-start gap-2.5 rounded-2xl border border-gold/25 bg-gold/8 px-4 py-3 text-sm leading-relaxed text-soft-foreground">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
          {t('code.demoNotice')}
        </p>
      )}
    </m.header>
  );
}

/** Le code ne se lit pas ici : pourquoi, et où le trouver. */
function CodeProblem({ project, error, onRetry }: { project: Project; error: unknown; onRetry: () => void }) {
  const { t } = useTranslation('projectCode');
  const code = getApiError(error)?.errorCode;
  const repository = project.repositoryUrl && !isPlaceholderUrl(project.repositoryUrl) ? project.repositoryUrl : null;
  const [title, text] =
    code === 'PROJECT_CODE_UNAVAILABLE'
      ? [t('code.unavailableTitle'), t(repository ? 'code.unavailableText' : 'code.noRepositoryText')]
      : code === 'GITHUB_REPOSITORY_NOT_FOUND'
        ? [t('code.notFoundTitle'), t('code.notFoundText')]
        : code === 'GITHUB_RATE_LIMITED'
          ? [t('code.rateLimitedTitle'), t('code.rateLimitedText')]
          : [t('code.errorTitle'), t('code.errorText')];
  const transient = code !== 'PROJECT_CODE_UNAVAILABLE' && code !== 'GITHUB_REPOSITORY_NOT_FOUND';

  return (
    <Problem title={title} text={text}>
      {repository && (
        <a href={repository} target="_blank" rel="noreferrer" className={OUTLINE}>
          {/github\.com\//i.test(repository) ? <GithubMark className="size-4" /> : <Code2 aria-hidden className="size-4" />}
          {t('code.openRepository')}
          <ExternalLink aria-hidden className="size-3.5 text-faint-foreground" />
        </a>
      )}
      {transient && (
        <button type="button" onClick={onRetry} className={OUTLINE}>
          <RefreshCw aria-hidden className="size-4" />
          {t('code.retry')}
        </button>
      )}
    </Problem>
  );
}

function Problem({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[55dvh] max-w-xl flex-col justify-center py-12">
      <div className="glass flex flex-col items-start gap-3 rounded-[1.375rem] p-7">
        <span aria-hidden className="grid size-11 place-items-center rounded-xl bg-kente-conic text-kente-night opacity-90">
          <Code2 className="size-5" />
        </span>
        <h1 id="code-title" className="font-display text-h4">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
        {children && <div className="mt-1 flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}
