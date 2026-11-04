import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  FileX2,
  MessageSquarePlus,
  MessagesSquare,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import ErrorState from '@/components/feedback/ErrorState';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import CommentThread, { ReviewCommentForm } from '@/components/reviews/CommentThread';
import { DiffStat } from '@/components/reviews/ReviewRequestItem';
import { FILE_STATUSES } from '@/components/reviews/reviewVisuals';
import { CodeLine } from '@/components/reviews/SuggestionBlock';
import ViewedProgress from '@/components/reviews/ViewedProgress';
import GithubMark from '@/components/shared/GithubMark';
import { useAddReviewComment, usePullRequestFiles, useReviewParams } from '@/hooks/usePullRequest';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useViewedFiles } from '@/hooks/useViewedFiles';
import { copyText } from '@/lib/clipboard';
import {
  buildFileTree,
  fileAnchor,
  filesInTreeOrder,
  highlightHunks,
  languageOf,
  lineAnchor,
  parsePatch,
  type DiffHunk,
  type DiffLine,
} from '@/lib/diff';
import { cn } from '@/lib/utils';
import type { PullRequestDetail, PullRequestFile, ReviewComment } from '@/types/review.types';
import { getApiError, getApiErrorMessage } from '@/utils/apiError';
import { formatCount } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';
// Au-delà, un fichier s'ouvre replié : on le déplie quand on veut le lire (le reste du diff s'affiche plus vite)
const LARGE_DIFF_LINES = 400;
// Ce que fait le membre pour défiler lui-même : la page cesse alors de le ramener à la ligne visée
const USER_SCROLL = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;
// Le temps de l'arrivée sur une ligne, pendant lequel la page s'y recale si la mise en page bouge
const LANDING_MS = 2500;

/** La ligne visée par l'adresse (#file-3fa2c1-R24) : son fichier et son numéro */
function targetOf(hash: string): { anchor: string; line: number | null } | null {
  const match = /^#(file-[a-z0-9]+)(?:-R(\d+))?$/.exec(hash);
  return match ? { anchor: match[1], line: match[2] ? Number(match[2]) : null } : null;
}

/**
 * Le diff d'une revue, fichier par fichier. Design 3C.
 *
 * En tête, les fichiers et les lignes en chiffres, ceux qu'on a déjà vus, et de quoi tout replier. Chaque fichier a
 * son en-tête collant (ce que la PR en fait, son chemin, ses lignes, « Vu », son lien vers GitHub), puis ses blocs :
 * les numéros des deux versions, le code coloré, les ajouts en vert et les suppressions en rouge. Un « + » au bord
 * d'une ligne ouvre un commentaire, avec, si l'on veut, une suggestion de code ; les discussions s'affichent sous
 * leur ligne. Un lien vers une ligne (#file-…-R24) déplie son fichier et l'éclaire.
 */
export default function DiffViewer({ detail }: { detail: PullRequestDetail }) {
  const { t } = useTranslation('reviews');
  const { slug, number } = useReviewParams();
  const query = usePullRequestFiles(slug, number);
  const viewed = useViewedFiles(slug, number);
  const { hash } = useLocation();
  const reduced = useReducedMotion();
  // Ce que le membre a replié ou déplié lui-même ; les autres fichiers suivent leur état par défaut
  const [toggled, setToggled] = useState<ReadonlyMap<string, boolean>>(() => new Map());

  const files = useMemo(() => filesInTreeOrder(buildFileTree(query.data?.files ?? [])), [query.data]);
  const commentsByPath = useMemo(() => {
    const byPath = new Map<string, ReviewComment[]>();
    detail.comments.forEach((comment) => {
      if (comment.path && comment.line !== null) {
        byPath.set(comment.path, [...(byPath.get(comment.path) ?? []), comment]);
      }
    });
    return byPath;
  }, [detail.comments]);
  const target = targetOf(hash);

  const isCollapsed = (file: PullRequestFile) => {
    if (target?.anchor === fileAnchor(file.path)) {
      return false;
    }
    const own = toggled.get(file.path);
    if (own !== undefined) {
      return own;
    }
    return viewed.isViewed(file) || file.additions + file.deletions > LARGE_DIFF_LINES;
  };
  const setCollapsed = (file: PullRequestFile, collapsed: boolean) => setToggled((current) => new Map(current).set(file.path, collapsed));
  const setAll = (collapsed: boolean) => setToggled(new Map(files.map((file) => [file.path, collapsed])));

  // Arrivée par un lien vers un fichier ou une ligne : on y descend, une fois le diff dessiné. Le temps que la page se
  // pose, rien ne doit l'en écarter : une position rétablie après coup (ScrollRestoration, au rechargement), une hauteur
  // qui change au-dessus (polices, code coloré). On se recale sur la cible, tant que le membre ne défile pas lui-même.
  const ready = files.length > 0;
  useEffect(() => {
    const aim = targetOf(hash);
    if (!aim || !ready) {
      return undefined;
    }
    const id = aim.line !== null ? `${aim.anchor}-R${aim.line}` : aim.anchor;
    const block = aim.line !== null ? 'center' : 'start';
    const align = (behavior: ScrollBehavior) => document.getElementById(id)?.scrollIntoView({ behavior, block });
    const frame = requestAnimationFrame(() => align(reduced ? 'auto' : 'smooth'));
    const settle = () => align('auto');
    const observer = new ResizeObserver(settle);
    observer.observe(document.body);
    const release = () => {
      observer.disconnect();
      clearTimeout(timer);
      window.removeEventListener('scrollend', settle);
      USER_SCROLL.forEach((type) => window.removeEventListener(type, release));
    };
    const timer = setTimeout(release, LANDING_MS);
    window.addEventListener('scrollend', settle);
    USER_SCROLL.forEach((type) => window.addEventListener(type, release, { passive: true }));
    return () => {
      cancelAnimationFrame(frame);
      release();
    };
  }, [hash, ready, reduced]);

  if (query.isPending) {
    return <DiffSkeleton label={t('diff.loading')} />;
  }

  if (query.isError) {
    const code = getApiError(query.error)?.errorCode;
    return (
      <ErrorState
        className="min-w-0 flex-1"
        code={code?.startsWith('GITHUB') ? 'GitHub' : undefined}
        title={t('diff.errorTitle')}
        description={getApiErrorMessage(query.error, t('diff.errorText'))}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data;
  if (!data.available) {
    return (
      <div className="glass flex min-w-0 flex-1 flex-col items-start gap-2 rounded-2xl p-6">
        <span aria-hidden className="mb-1 grid size-10 place-items-center rounded-xl bg-foreground/6 text-muted-foreground">
          <FileX2 className="size-5" />
        </span>
        <p className="font-bold text-foreground">{t('diff.unavailableTitle')}</p>
        <p className="max-w-prose text-[0.8125rem] leading-relaxed text-muted-foreground">
          {t('diff.unavailableText', { count: detail.pullRequest.filesChanged })}
        </p>
      </div>
    );
  }

  const seen = viewed.countViewed(files);
  const additions = files.reduce((sum, file) => sum + file.additions, 0);
  const deletions = files.reduce((sum, file) => sum + file.deletions, 0);
  const allCollapsed = files.length > 0 && files.every(isCollapsed);

  return (
    <section aria-label={t('diff.label')} className="flex min-w-0 flex-1 flex-col gap-4">
      {/* Le diff en chiffres, ce qu'on a vu, et de quoi tout replier */}
      <div className="glass flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-2xl px-4 py-3">
        <p className="font-mono text-xs text-soft-foreground">
          <span className="font-bold text-foreground">{t('item.files', { count: data.total })}</span>
        </p>
        <DiffStat additions={additions} deletions={deletions} className="font-mono text-xs text-muted-foreground" />
        <div className="flex min-w-36 flex-1 items-center gap-2.5 sm:max-w-56">
          <ViewedProgress seen={seen} total={files.length} className="flex-1" />
          <span className="shrink-0 font-mono text-[0.6875rem] text-muted-foreground tabular-nums">{t('files.viewed', { seen, total: files.length })}</span>
        </div>
        {files.length > 1 && (
          <button
            type="button"
            onClick={() => setAll(!allCollapsed)}
            className={cn(
              'ms-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-soft-foreground transition-colors hover:bg-foreground/6 hover:text-foreground',
              focusRing,
            )}
          >
            {allCollapsed ? <ChevronsUpDown aria-hidden className="size-3.5" /> : <ChevronsDownUp aria-hidden className="size-3.5" />}
            {allCollapsed ? t('diff.expandAll') : t('diff.collapseAll')}
          </button>
        )}
      </div>

      {!detail.viewer.canComment && (
        <p className="rounded-xl bg-foreground/4 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">{t('diff.readOnly')}</p>
      )}

      {files.map((file) => (
        <DiffFile
          key={file.path}
          detail={detail}
          file={file}
          comments={commentsByPath.get(file.path) ?? []}
          collapsed={isCollapsed(file)}
          onCollapsedChange={(collapsed) => setCollapsed(file, collapsed)}
          viewed={viewed.isViewed(file)}
          onViewedChange={(value) => {
            viewed.setViewed(file, value);
            // Vu : le fichier se replie, comme sur GitHub ; à revoir : il se rouvre
            setCollapsed(file, value);
          }}
          targetLine={target?.anchor === fileAnchor(file.path) ? target.line : null}
        />
      ))}

      {data.truncated && data.url && (
        <a
          href={data.url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'group/more glass flex items-center gap-3 rounded-2xl px-5 py-4 text-sm text-soft-foreground transition-colors hover:text-foreground',
            focusRing,
          )}
        >
          <GithubMark className="size-4" />
          {t('diff.moreOnGithub', { count: data.total - files.length })}
          <ArrowUpRight aria-hidden className="ms-auto size-4 transition-transform group-hover/more:-translate-y-px group-hover/more:translate-x-px rtl:-scale-x-100" />
        </a>
      )}
    </section>
  );
}

interface DiffFileProps {
  detail: PullRequestDetail;
  file: PullRequestFile;
  comments: ReviewComment[];
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  viewed: boolean;
  onViewedChange: (viewed: boolean) => void;
  /** La ligne visée par l'adresse, à éclairer */
  targetLine: number | null;
}

/** Un fichier du diff : son en-tête collant, puis ses blocs, ses discussions et le champ d'un nouveau commentaire. */
function DiffFile({ detail, file, comments, collapsed, onCollapsedChange, viewed, onViewedChange, targetLine }: DiffFileProps) {
  const { t } = useTranslation('reviews');
  const { pullRequest } = detail;
  const { icon: StatusIcon, tone, letter } = FILE_STATUSES[file.status];
  const anchor = fileAnchor(file.path);
  const language = languageOf(file.path);
  const slash = file.path.lastIndexOf('/');
  const folder = slash >= 0 ? file.path.slice(0, slash + 1) : '';
  const name = file.path.slice(slash + 1);
  const github = pullRequest.github;
  const blobUrl =
    github?.headSha && file.status !== 'REMOVED' ? github.url.replace(/\/pull\/\d+\/?$/, `/blob/${github.headSha}/${file.path}`) : null;
  const discussion = comments.filter((comment) => comment.body !== null).length;

  return (
    <article id={anchor} aria-labelledby={`${anchor}-name`} className="glass scroll-mt-20 overflow-clip rounded-2xl">
      <header
        className={cn(
          'sticky top-16 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2.5 backdrop-blur-xl saver:backdrop-blur-none sm:px-4',
          collapsed ? 'border-transparent' : 'border-border-subtle',
          'bg-[color-mix(in_srgb,var(--surface)_88%,transparent)]',
        )}
      >
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={`${anchor}-body`}
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? t('diff.expandFile', { path: file.path }) : t('diff.collapseFile', { path: file.path })}
          className={cn('grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground', focusRing)}
        >
          <ChevronRight aria-hidden className={cn('size-4 transition-transform duration-200 rtl:-scale-x-100', !collapsed && 'rotate-90 rtl:-rotate-90')} />
        </button>
        <span
          title={t(`files.status.${file.status}`)}
          className={cn('grid size-6 shrink-0 place-items-center rounded-md bg-foreground/5 font-mono text-[0.6875rem] font-bold', tone)}
        >
          <span aria-hidden>{letter}</span>
          <span className="sr-only">{t(`files.status.${file.status}`)}</span>
        </span>
        <h3 id={`${anchor}-name`} dir="ltr" className="flex min-w-0 flex-1 basis-48 items-center gap-1 font-mono text-[0.8125rem]">
          <StatusIcon aria-hidden className={cn('size-3.5 shrink-0 sm:hidden', tone)} />
          {file.previousPath && (
            <>
              <span className="truncate text-muted-foreground line-through decoration-faint-foreground/60">{file.previousPath}</span>
              <ArrowRight aria-hidden className="size-3.5 shrink-0 text-faint-foreground" />
            </>
          )}
          <span className="min-w-0 truncate">
            <span className="text-muted-foreground">{folder}</span>
            <span className="font-semibold text-foreground">{name}</span>
          </span>
          <button
            type="button"
            onClick={() => void copyText(file.path).then((copied) => copied && toast.success(t('diff.pathCopied')))}
            aria-label={t('diff.copyPath')}
            title={t('diff.copyPath')}
            className={cn('grid size-6 shrink-0 place-items-center rounded-md text-faint-foreground transition-colors hover:bg-foreground/6 hover:text-foreground', focusRing)}
          >
            <Copy aria-hidden className="size-3" />
          </button>
        </h3>
        <div className="flex shrink-0 items-center gap-3">
          {discussion > 0 && (
            <span title={t('item.comments', { count: discussion })} className="inline-flex items-center gap-1 font-mono text-[0.6875rem] text-gold">
              <MessagesSquare aria-hidden className="size-3.5" />
              {formatCount(discussion)}
              <span className="sr-only">{t('item.comments', { count: discussion })}</span>
            </span>
          )}
          <DiffStat additions={file.additions} deletions={file.deletions} className="font-mono text-[0.6875rem] text-muted-foreground" />
          {blobUrl && (
            <a
              href={blobUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t('diff.viewOnGithub', { path: file.path })}
              title={t('diff.viewOnGithub', { path: file.path })}
              className={cn('grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground', focusRing)}
            >
              <GithubMark className="size-3.5" />
            </a>
          )}
          <label
            className={cn(
              'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border px-2 text-[0.6875rem] font-semibold transition-colors select-none',
              viewed ? 'border-jade/40 bg-jade/10 text-jade' : 'border-border text-soft-foreground hover:border-border-strong hover:text-foreground',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/70',
            )}
          >
            <input type="checkbox" checked={viewed} onChange={(event) => onViewedChange(event.target.checked)} className="size-3.5 accent-[var(--jade)]" />
            {t('diff.viewed')}
          </label>
        </div>
      </header>

      {!collapsed && (
        <div id={`${anchor}-body`}>
          <FileBody detail={detail} file={file} comments={comments} language={language} targetLine={targetLine} blobUrl={blobUrl} />
        </div>
      )}
    </article>
  );
}

interface FileBodyProps {
  detail: PullRequestDetail;
  file: PullRequestFile;
  comments: ReviewComment[];
  language: string | null;
  targetLine: number | null;
  blobUrl: string | null;
}

/** Les blocs d'un fichier, ses discussions sous leurs lignes, et celles qui visent une ligne hors du diff. */
function FileBody({ detail, file, comments, language, targetLine, blobUrl }: FileBodyProps) {
  const { t } = useTranslation('reviews');
  const { pullRequest, viewer } = detail;
  const add = useAddReviewComment(pullRequest.project.slug, pullRequest.number);
  const [composing, setComposing] = useState<number | null>(null);
  const hunks = useMemo(() => (file.patch ? highlightHunks(parsePatch(file.patch), language) : []), [file.patch, language]);

  const byLine = useMemo(() => {
    const map = new Map<number, ReviewComment[]>();
    comments.forEach((comment) => {
      if (comment.line !== null) {
        map.set(comment.line, [...(map.get(comment.line) ?? []), comment]);
      }
    });
    return map;
  }, [comments]);
  const shown = useMemo(() => new Set(hunks.flatMap((hunk) => hunk.lines.map((line) => line.newNumber).filter((n): n is number => n !== null))), [hunks]);
  // Des commentaires sur une ligne qui n'est plus dans le diff (le code a bougé depuis)
  const outdated = [...byLine.entries()].filter(([line]) => !shown.has(line)).sort(([a], [b]) => a - b);

  if (!file.patch) {
    return (
      <div className="flex flex-wrap items-center gap-3 px-5 py-6 text-[0.8125rem] text-muted-foreground">
        <FileX2 aria-hidden className="size-4 text-faint-foreground" />
        {t(file.status === 'RENAMED' && file.additions + file.deletions === 0 ? 'diff.renamedOnly' : 'diff.noPatch')}
        {blobUrl && (
          <a href={blobUrl} target="_blank" rel="noreferrer" className={cn('inline-flex items-center gap-1 rounded-sm font-semibold text-gold', focusRing)}>
            {t('diff.openOnGithub')}
            <ArrowUpRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      <table className="w-full table-fixed border-collapse font-mono text-[0.78rem] leading-[1.35rem]" dir="ltr">
        {/* Sur téléphone, des numéros serrés : la place va au code */}
        <colgroup>
          <col className="w-10 sm:w-[3.25rem]" />
          <col className="w-10 sm:w-[3.25rem]" />
          <col />
        </colgroup>
        <tbody>
          {hunks.map((hunk, index) => (
            <Fragment key={`${hunk.oldStart}-${hunk.newStart}-${index}`}>
              <HunkHeader hunk={hunk} />
              {hunk.lines.map((line, lineIndex) => {
                const thread = line.newNumber !== null ? byLine.get(line.newNumber) : undefined;
                const open = line.newNumber !== null && composing === line.newNumber;
                return (
                  <Fragment key={lineIndex}>
                    <DiffRow
                      file={file}
                      line={line}
                      targeted={targetLine !== null && line.newNumber === targetLine}
                      commented={thread !== undefined}
                      onComment={viewer.canComment && line.newNumber !== null ? () => setComposing(line.newNumber) : undefined}
                    />
                    {thread && line.newNumber !== null && (
                      <ThreadRow>
                        <CommentThread
                          detail={detail}
                          comments={thread}
                          path={file.path}
                          line={line.newNumber}
                          original={line.content}
                          language={language}
                        />
                      </ThreadRow>
                    )}
                    {open && line.newNumber !== null && (
                      <ThreadRow>
                        <div className="rounded-2xl border border-border bg-surface p-3.5 shadow-[0_18px_40px_-34px_var(--kente-night)]">
                          <p className="mb-2 font-mono text-[0.6875rem] text-muted-foreground">{t('thread.newOnLine', { line: line.newNumber })}</p>
                          <ReviewCommentForm
                            suggestable
                            original={line.content}
                            submitLabel={t('thread.comment')}
                            placeholder={t('thread.placeholder')}
                            label={t('thread.newLabel', { path: file.path, line: line.newNumber })}
                            onCancel={() => setComposing(null)}
                            onSubmit={async ({ body, suggestion }) => {
                              await add.mutateAsync({ body, path: file.path, line: line.newNumber ?? undefined, suggestion: suggestion ?? undefined });
                              setComposing(null);
                            }}
                          />
                        </div>
                      </ThreadRow>
                    )}
                  </Fragment>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>

      {outdated.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-border-subtle bg-foreground/[0.02] p-3 sm:p-4">
          <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground uppercase">{t('diff.outdated')}</p>
          {outdated.map(([line, thread]) => (
            <div key={line}>
              <p className="mb-1.5 font-mono text-[0.6875rem] text-faint-foreground">{t('diff.lineLabel', { line })}</p>
              <CommentThread detail={detail} comments={thread} path={file.path} line={line} original={null} language={language} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** « @@ -1,3 +1,4 @@ Departures » : où commence le bloc, et la fonction qui le contient */
function HunkHeader({ hunk }: { hunk: DiffHunk }) {
  return (
    <tr className="bg-[color-mix(in_srgb,var(--gold)_6%,transparent)]">
      <td colSpan={2} className="py-1 text-center text-faint-foreground select-none">
        ⋯
      </td>
      <td className="truncate py-1 pe-4 text-muted-foreground">
        <span className="text-faint-foreground">
          @@ −{hunk.oldStart} +{hunk.newStart} @@
        </span>
        {hunk.section && <span className="ms-2 text-soft-foreground">{hunk.section}</span>}
      </td>
    </tr>
  );
}

const ROW_TONES: Record<DiffLine['kind'], { row: string; gutter: string; marker: string; sign: string }> = {
  add: {
    row: 'bg-diff-add',
    gutter: 'bg-[color-mix(in_srgb,var(--jade)_13%,transparent)] text-jade/80',
    marker: 'text-jade',
    sign: '+',
  },
  del: {
    row: 'bg-diff-remove',
    gutter: 'bg-[color-mix(in_srgb,var(--coral)_12%,transparent)] text-coral/80',
    marker: 'text-coral',
    sign: '−',
  },
  context: { row: '', gutter: 'text-code-gutter', marker: 'text-transparent', sign: ' ' },
};

interface DiffRowProps {
  file: PullRequestFile;
  line: DiffLine;
  /** Visée par l'adresse : éclairée */
  targeted: boolean;
  /** Une discussion la suit */
  commented: boolean;
  /** Commenter cette ligne ; absent quand on ne peut pas (ligne supprimée, PR fermée à la communauté) */
  onComment?: () => void;
}

/** Une ligne du diff : ses deux numéros, puis son code ; au survol, le « + » d'un nouveau commentaire. */
function DiffRow({ file, line, targeted, commented, onComment }: DiffRowProps) {
  const { t } = useTranslation('reviews');
  const tones = ROW_TONES[line.kind];
  const id = line.newNumber !== null ? lineAnchor(file.path, line.newNumber) : undefined;

  return (
    <tr
      id={id}
      className={cn(
        'group/line scroll-mt-28',
        tones.row,
        targeted && 'bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] shadow-[inset_3px_0_0_var(--kente-gold)]',
      )}
    >
      <td className={cn('relative px-1.5 text-end align-top tabular-nums select-none sm:px-2', tones.gutter)}>
        {onComment && (
          <button
            type="button"
            onClick={onComment}
            aria-label={t('diff.commentLine', { line: line.newNumber })}
            className={cn(
              'absolute start-1 top-0.5 z-[1] grid size-5 place-items-center rounded-md bg-kente-warm text-kente-night opacity-0 shadow-sm transition-[opacity,scale] duration-150',
              'scale-90 group-hover/line:scale-100 group-hover/line:opacity-100 focus-visible:scale-100 focus-visible:opacity-100',
              // Au doigt, pas de survol : le « + » reste visible, discret
              'pointer-coarse:scale-100 pointer-coarse:opacity-40',
              focusRing,
            )}
          >
            <MessageSquarePlus aria-hidden className="size-3" strokeWidth={2.5} />
          </button>
        )}
        {line.oldNumber ?? ''}
      </td>
      <td className={cn('relative px-1.5 text-end align-top tabular-nums select-none sm:px-2', tones.gutter)}>
        {commented && <span aria-hidden className="absolute inset-y-0 end-0 w-0.5 bg-kente-gold" />}
        {line.newNumber ?? ''}
      </td>
      <td className="py-0 pe-3 align-top sm:pe-4">
        <span className="flex">
          <span aria-hidden className={cn('w-5 shrink-0 ps-1.5 select-none', tones.marker)}>
            {tones.sign}
          </span>
          {line.kind !== 'context' && <span className="sr-only">{t(line.kind === 'add' ? 'diff.added' : 'diff.removed')}</span>}
          <code className="hljs min-w-0 flex-1 whitespace-pre-wrap [overflow-wrap:anywhere] [tab-size:4]">
            <CodeLine tokens={line.tokens} content={line.content} />
          </code>
          {line.noNewline && (
            <span title={t('diff.noNewline')} className="ms-2 shrink-0 text-coral/70 select-none">
              ⏎̸
            </span>
          )}
        </span>
      </td>
    </tr>
  );
}

/** Une discussion ou un champ de commentaire, sous sa ligne, sur toute la largeur du diff */
function ThreadRow({ children }: { children: ReactNode }) {
  return (
    <tr>
      <td colSpan={3} className="border-y border-border-subtle bg-foreground/[0.025] px-3 py-3 font-sans text-sm leading-normal sm:px-4" dir="auto">
        <div className="max-w-3xl">{children}</div>
      </td>
    </tr>
  );
}

/** Même encombrement que le diff, pendant le chargement. Design 3H (squelette à reflet). */
function DiffSkeleton({ label }: { label: string }) {
  const widths = [72, 54, 88, 40, 66, 80, 35, 58];
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <span className="block h-[3.25rem] rounded-2xl skeleton-shimmer" />
      {[0, 1].map((file) => (
        <div key={file} aria-hidden className="glass overflow-hidden rounded-2xl">
          <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
            <span className="size-6 rounded-md skeleton-shimmer" />
            <span className="h-3.5 w-64 rounded-full skeleton-shimmer" />
          </div>
          <div className="flex flex-col gap-2 p-4">
            {widths.map((width, index) => (
              <span key={index} className="h-3 rounded-full skeleton-shimmer" style={{ width: `${width - file * 8}%` }} />
            ))}
          </div>
        </div>
      ))}
      <PulsatingDots label={label} className="self-center" />
    </div>
  );
}
