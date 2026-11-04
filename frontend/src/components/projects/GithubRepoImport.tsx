import axios from 'axios';
import { Archive, ArrowRight, ArrowUpRight, Check, GitFork, RotateCcw, Sparkles, Star, TriangleAlert, Undo2 } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useId, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import GithubMark from '@/components/shared/GithubMark';
import { useAuth } from '@/hooks/useAuth';
import { useGithubRepositoryImport, useMyGithubRepositories } from '@/hooks/useGithub';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import { parseGithubRepository } from '@/services/github.service';
import type { GithubRepository, GithubRepositorySummary } from '@/types/github.types';
import { getApiError } from '@/utils/apiError';
import { formatCount, formatRelativeTime } from '@/utils/formatters';

/** Ce qu'un import a rempli dans le formulaire, pour le récapitulatif */
export type ImportedField = 'name' | 'tagline' | 'description' | 'tags' | 'license' | 'demo' | 'repository';

interface GithubRepoImportProps {
  /**
   * Remplit le formulaire avec le dépôt lu.
   * @returns les champs remplis, et le nombre de technologies ajoutées
   */
  onImport: (repository: GithubRepository) => { fields: ImportedField[]; tags: number };
  /** Rend au formulaire ce qu'il contenait avant l'import */
  onUndo: () => void;
}

const CODE_MESSAGES: Record<string, 'notFound' | 'rateLimited' | 'unavailable'> = {
  GITHUB_REPOSITORY_NOT_FOUND: 'notFound',
  GITHUB_RATE_LIMITED: 'rateLimited',
  GITHUB_UNAVAILABLE: 'unavailable',
};

/**
 * Import d'un dépôt GitHub en un clic, pour préremplir le projet : on colle son adresse (n'importe quelle forme :
 * github.com/compte/depot, une page du dépôt, git@github.com:…), ou l'on choisit l'un de ses dépôts récents. Le
 * backend lit le dépôt (description, site, licence, langages et sujets, introduction du README) ; le formulaire se
 * remplit, et le récapitulatif dit ce qui a changé, avec de quoi l'annuler. Un dépôt déjà présent dans la vitrine
 * est signalé.
 */
export default function GithubRepoImport({ onImport, onUndo }: GithubRepoImportProps) {
  const { t } = useTranslation('projectForm');
  const { user } = useAuth();
  const inputId = useId();
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [imported, setImported] = useState<{ repository: GithubRepository; fields: ImportedField[]; tags: number } | null>(null);
  const importer = useGithubRepositoryImport();
  const hasGithub = Boolean(user?.githubUrl);
  const mine = useMyGithubRepositories(hasGithub && imported === null);

  function run(input: string) {
    const target = parseGithubRepository(input);
    setInvalid(target === null);
    if (!target || importer.isPending) {
      return;
    }
    importer.mutate(target, {
      onSuccess: (repository) => {
        const result = onImport(repository);
        setImported({ repository, ...result });
        setText('');
      },
    });
  }

  // La carte vit dans le formulaire du projet : pas de formulaire imbriqué, Entrée lance l'import
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      run(text);
    }
  }

  // Une adresse collée part aussitôt : c'est ce qu'on attendait
  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text/plain');
    if (parseGithubRepository(pasted)) {
      event.preventDefault();
      setText(pasted.trim());
      run(pasted);
    }
  }

  function undo() {
    onUndo();
    setImported(null);
    importer.reset();
  }

  const failure = importer.error ? errorMessageOf(importer.error, t) : null;

  return (
    <section aria-labelledby={`${inputId}-title`} className="glass relative overflow-hidden rounded-[1.75rem]">
      {/* Le fil de la carte : un dégradé kente qui court en haut */}
      <span aria-hidden className="block h-1 bg-kente" />
      <div aria-hidden className="pointer-events-none absolute -end-16 -top-20 size-56 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--gold)_16%,transparent),transparent_70%)]" />

      <AnimatePresence mode="wait" initial={false}>
        {imported ? (
          <m.div
            key="imported"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col gap-4 p-5 sm:p-7"
          >
            <Summary imported={imported} onUndo={undo} onAnother={() => setImported(null)} />
          </m.div>
        ) : (
          <m.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col gap-4 p-5 sm:p-7"
          >
            <div className="flex items-start gap-4">
              <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-foreground text-background shadow-[0_14px_30px_-16px_rgb(0_0_0/0.6)]">
                <GithubMark className="size-5.5" />
              </span>
              <div className="min-w-0">
                <h2 id={`${inputId}-title`} className="font-display text-h5">
                  {t('github.title')}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('github.text')}</p>
              </div>
            </div>

            <div role="search" aria-label={t('github.label')} className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor={inputId} className="sr-only">
                {t('github.label')}
              </label>
              <div
                className={cn(
                  'flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-[0.875rem] border bg-surface/60 px-3.5 transition-[border-color,box-shadow,background-color] duration-200',
                  'focus-within:border-gold/60 focus-within:bg-surface focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--gold)_14%,transparent)]',
                  invalid || failure ? 'border-coral/60' : 'border-border hover:border-border-strong',
                )}
              >
                <GithubMark className="size-4 shrink-0 text-muted-foreground" />
                <input
                  id={inputId}
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    setInvalid(false);
                  }}
                  onPaste={onPaste}
                  onKeyDown={onKeyDown}
                  placeholder={t('github.placeholder')}
                  aria-invalid={invalid || failure ? true : undefined}
                  aria-describedby={`${inputId}-help`}
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  dir="ltr"
                  className="h-full min-w-0 flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:font-sans placeholder:text-faint-foreground/80"
                />
              </div>
              <button
                type="button"
                onClick={() => run(text)}
                disabled={importer.isPending || !text.trim()}
                className={cn(
                  'inline-flex h-12 min-w-32 items-center justify-center gap-2 rounded-[0.875rem] bg-foreground px-5 text-sm font-bold text-background outline-none transition-[translate,opacity] duration-300',
                  'enabled:hover:-translate-y-px disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
              >
                {importer.isPending ? <PulsatingDots size="sm" tone="current" label={t('github.reading')} /> : t('github.import')}
              </button>
            </div>

            <p id={`${inputId}-help`} role={invalid || failure ? 'alert' : undefined} aria-live="polite" className={cn('-mt-1 text-xs leading-relaxed', invalid || failure ? 'text-coral' : 'text-muted-foreground')}>
              {invalid ? t('github.invalid') : (failure ?? (importer.isPending ? t('github.reading') : t('github.hint')))}
            </p>

            {hasGithub ? (
              <MyRepositories
                repositories={mine.data}
                loading={mine.isPending}
                failed={mine.isError}
                busy={importer.isPending}
                onPick={(repository) => {
                  setText(repository.fullName);
                  run(repository.fullName);
                }}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('github.noProfile')}{' '}
                <Link to={paths.settings} className="font-semibold text-gold underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70">
                  {t('github.addProfile')}
                </Link>
              </p>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function errorMessageOf(error: unknown, t: ReturnType<typeof useTranslation<'projectForm'>>['t']) {
  if (axios.isAxiosError(error) && !error.response) {
    return t('github.errors.network');
  }
  const code = getApiError(error)?.errorCode;
  return t(`github.errors.${(code && CODE_MESSAGES[code]) || 'unavailable'}`);
}

interface MyRepositoriesProps {
  repositories: GithubRepositorySummary[] | undefined;
  loading: boolean;
  failed: boolean;
  busy: boolean;
  onPick: (repository: GithubRepositorySummary) => void;
}

/** Les dépôts récents du membre (d'après son profil), à importer d'un clic */
function MyRepositories({ repositories, loading, failed, busy, onPick }: MyRepositoriesProps) {
  const { t } = useTranslation('projectForm');

  if (failed || (!loading && !repositories?.length)) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="eyebrow">{t('github.mine')}</p>
      <ul className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {loading
          ? [0, 1, 2].map((index) => <li key={index} aria-hidden className="h-16 w-52 shrink-0 rounded-xl skeleton-shimmer" />)
          : repositories!.map((repository) => (
              <li key={repository.fullName} className="shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => onPick(repository)}
                  disabled={busy}
                  className={cn(
                    'group/repo flex h-16 w-56 flex-col justify-center gap-1 rounded-xl border border-border bg-surface/50 px-3.5 text-start outline-none transition-[border-color,background-color,translate] duration-300',
                    'hover:-translate-y-px hover:border-gold/45 hover:bg-gold/5 focus-visible:ring-2 focus-visible:ring-ring/70 disabled:opacity-60',
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate font-mono text-[0.8125rem] font-semibold text-foreground">{repository.name}</span>
                    {repository.listedProjectSlug ? (
                      <Check aria-label={t('github.alreadyListedShort')} className="size-3.5 shrink-0 text-jade" />
                    ) : (
                      <ArrowRight aria-hidden className="size-3.5 shrink-0 text-faint-foreground transition-transform group-hover/repo:translate-x-0.5 group-hover/repo:text-gold rtl:-scale-x-100" />
                    )}
                  </span>
                  <span className="flex items-center gap-2.5 font-mono text-[0.6875rem] text-muted-foreground">
                    {repository.language && <span className="truncate">{repository.language}</span>}
                    {repository.stars > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-0.5">
                        <Star aria-hidden className="size-3" />
                        {formatCount(repository.stars)}
                      </span>
                    )}
                    {repository.pushedAt && <span className="truncate">{formatRelativeTime(repository.pushedAt)}</span>}
                  </span>
                </button>
              </li>
            ))}
      </ul>
    </div>
  );
}

interface SummaryProps {
  imported: { repository: GithubRepository; fields: ImportedField[]; tags: number };
  onUndo: () => void;
  onAnother: () => void;
}

/** Le dépôt importé, ce qui a été rempli, et les mises en garde (déjà dans la vitrine, archivé, copie) */
function Summary({ imported, onUndo, onAnother }: SummaryProps) {
  const { t } = useTranslation('projectForm');
  const { repository, fields, tags } = imported;
  const filled = fields.map((field) => (field === 'tags' ? t('github.fields.tags', { count: tags }) : t(`github.fields.${field}`)));

  return (
    <>
      <div className="flex items-center gap-3.5">
        {repository.ownerAvatarUrl ? (
          <img src={repository.ownerAvatarUrl} alt="" className="size-11 shrink-0 rounded-2xl bg-foreground/8 object-cover" />
        ) : (
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-foreground text-background">
            <GithubMark className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-jade">
            <Sparkles aria-hidden className="size-3.5" />
            {t('github.done')}
          </p>
          <a
            href={repository.repositoryUrl}
            target="_blank"
            rel="noreferrer"
            className="group/link mt-0.5 inline-flex max-w-full items-center gap-1 rounded-sm font-mono text-[0.9375rem] font-semibold text-foreground outline-none hover:text-gold focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <span className="truncate">{repository.fullName}</span>
            <ArrowUpRight aria-hidden className="size-3.5 shrink-0 opacity-60 rtl:-scale-x-100" />
          </a>
        </div>
        <span className="hidden shrink-0 items-center gap-3 font-mono text-xs text-muted-foreground sm:flex">
          <span className="inline-flex items-center gap-1">
            <Star aria-hidden className="size-3.5" />
            {formatCount(repository.stars)}
          </span>
          <span className="inline-flex items-center gap-1">
            <GitFork aria-hidden className="size-3.5" />
            {formatCount(repository.forks)}
          </span>
        </span>
      </div>

      {filled.length > 0 ? (
        <ul aria-label={t('github.filled')} className="flex flex-wrap gap-1.5">
          {filled.map((label, index) => (
            <m.li
              key={label}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08 + index * 0.05, duration: 0.3 }}
              className="inline-flex items-center gap-1 rounded-full border border-jade/25 bg-jade/10 px-2.5 py-0.5 text-xs font-semibold text-jade"
            >
              <Check aria-hidden className="size-3" strokeWidth={3} />
              {label}
            </m.li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t('github.nothingNew')}</p>
      )}

      {repository.listedProjectSlug && (
        <p role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-gold/25 bg-gold/8 px-3.5 py-2.5 text-[0.8125rem] text-soft-foreground">
          <TriangleAlert aria-hidden className="size-4 shrink-0 text-gold" />
          <span className="min-w-0 flex-1">{t('github.alreadyListed')}</span>
          <Link
            to={paths.project(repository.listedProjectSlug)}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 rounded-sm font-bold text-gold underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            {t('github.seeProject')}
            <ArrowUpRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
          </Link>
        </p>
      )}
      {(repository.archived || repository.fork) && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {repository.archived ? <Archive aria-hidden className="size-3.5" /> : <GitFork aria-hidden className="size-3.5" />}
          {t(repository.archived ? 'github.archived' : 'github.fork')}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onUndo}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-soft-foreground outline-none transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          <Undo2 aria-hidden className="size-4 rtl:-scale-x-100" />
          {t('github.undo')}
        </button>
        <button
          type="button"
          onClick={onAnother}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-soft-foreground outline-none transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          <RotateCcw aria-hidden className="size-4" />
          {t('github.another')}
        </button>
      </div>
    </>
  );
}
