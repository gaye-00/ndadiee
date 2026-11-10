import { Check, Code2, Copy, Eye, FileQuestion, ImageOff, RefreshCw, TriangleAlert } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { CodeLine } from '@/components/reviews/SuggestionBlock';
import GithubMark from '@/components/shared/GithubMark';
import MarkdownContent from '@/components/shared/MarkdownContent';
import { useProjectCodeFile } from '@/hooks/useProjects';
import { copyText } from '@/lib/clipboard';
import { highlightLines, languageOf, type CodeToken } from '@/lib/diff';
import { cn } from '@/lib/utils';
import { getApiError } from '@/utils/apiError';
import { formatBytes, formatNumber } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';
// Au-delà, le fichier s'affiche sans couleurs : colorer coûte cher aux petits téléphones
const MAX_HIGHLIGHTED = 120_000;
const MARKDOWN = /\.(md|mdx|markdown)$/i;
const COPIED_MS = 1800;

interface CodeViewerProps {
  slug: string;
  /** Le fichier ouvert */
  path: string;
  /** Le README du dépôt, proposé quand le fichier demandé n'existe pas */
  readme: string | null;
  onOpen: (path: string) => void;
}

/**
 * Un fichier du dépôt : son chemin, sa taille et son nombre de lignes, puis le code coloré, numéroté ligne par ligne
 * (un numéro est un lien vers sa ligne, qui s'éclaire). Un README s'affiche mis en forme, avec son texte brut à un clic.
 * Une image de GitHub s'affiche ; un fichier binaire ou trop gros renvoie vers GitHub.
 */
export default function CodeViewer({ slug, path, readme, onOpen }: CodeViewerProps) {
  const { t } = useTranslation('projectCode');
  const file = useProjectCodeFile(slug, path);
  const data = file.data;
  const markdown = MARKDOWN.test(path);
  const [mode, setMode] = useState<'preview' | 'code'>('preview');
  const content = data && !file.isPlaceholderData ? data.content : null;
  const lines = useMemo(() => (content === null ? [] : content.replace(/\n$/, '').split('\n')), [content]);
  const segments = path.split('/');

  return (
    <section aria-labelledby="code-file-title" className="glass min-w-0 overflow-hidden rounded-[1.375rem]">
      <header className="relative flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-subtle px-4 py-3 sm:px-5">
        <h2 id="code-file-title" dir="ltr" className="flex min-w-0 flex-1 basis-56 flex-wrap items-center gap-x-1 font-mono text-[0.8125rem]">
          {segments.map((segment, index) => (
            <Fragment key={`${segment}-${index}`}>
              <span className={index === segments.length - 1 ? 'font-semibold break-all text-foreground' : 'text-muted-foreground'}>{segment}</span>
              {index < segments.length - 1 && (
                <span aria-hidden className="text-faint-foreground">
                  /
                </span>
              )}
            </Fragment>
          ))}
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {content !== null && (
            <span className="me-1 font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
              {t('code.lines', { count: lines.length, formatted: formatNumber(lines.length) })} · {formatBytes(data?.size ?? 0)}
            </span>
          )}
          {markdown && content !== null && (
            <div role="group" aria-label={t('code.view')} className="flex rounded-lg bg-foreground/6 p-0.5">
              <ModeButton active={mode === 'preview'} onClick={() => setMode('preview')} icon={<Eye aria-hidden className="size-3.5" />}>
                {t('code.preview')}
              </ModeButton>
              <ModeButton active={mode === 'code'} onClick={() => setMode('code')} icon={<Code2 aria-hidden className="size-3.5" />}>
                {t('code.raw')}
              </ModeButton>
            </div>
          )}
          {content !== null && <CopyButton text={content} />}
          {data?.webUrl && !file.isPlaceholderData && (
            <a
              href={data.webUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t('code.openFileOnGithub')}
              title={t('code.openFileOnGithub')}
              className={cn('grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground', focusRing)}
            >
              <GithubMark className="size-4" />
            </a>
          )}
        </div>
        {/* Le fichier suivant arrive : un fil kente court sous l'en-tête */}
        {file.isFetching && (
          <span
            aria-hidden
            className="absolute inset-x-0 -bottom-px h-0.5 animate-[kente-shimmer_1.2s_linear_infinite] bg-[linear-gradient(90deg,transparent,var(--kente-gold),var(--kente-coral),var(--kente-jade),transparent)] bg-size-[200%_100%]"
          />
        )}
      </header>

      <div className={cn('transition-opacity duration-200', file.isPlaceholderData && 'opacity-50')}>
        <FileBody
          state={
            file.isPending
              ? { kind: 'loading' }
              : file.isError
                ? { kind: 'error', notFound: getApiError(file.error)?.status === 404 }
                : { kind: 'ready' }
          }
          path={path}
          content={file.isPlaceholderData ? (data?.content ?? null) : content}
          lines={file.isPlaceholderData ? (data?.content ?? '').replace(/\n$/, '').split('\n') : lines}
          markdown={markdown && mode === 'preview'}
          binary={data?.binary ?? false}
          tooLarge={data?.tooLarge ?? false}
          size={data?.size ?? 0}
          rawUrl={data?.rawUrl ?? null}
          webUrl={data?.webUrl ?? null}
          readme={readme}
          onOpen={onOpen}
          onRetry={() => void file.refetch()}
        />
      </div>
    </section>
  );
}

type BodyState = { kind: 'loading' } | { kind: 'error'; notFound: boolean } | { kind: 'ready' };

interface FileBodyProps {
  state: BodyState;
  path: string;
  content: string | null;
  lines: string[];
  markdown: boolean;
  binary: boolean;
  tooLarge: boolean;
  size: number;
  rawUrl: string | null;
  webUrl: string | null;
  readme: string | null;
  onOpen: (path: string) => void;
  onRetry: () => void;
}

function FileBody({ state, path, content, lines, markdown, binary, tooLarge, size, rawUrl, webUrl, readme, onOpen, onRetry }: FileBodyProps) {
  const { t } = useTranslation('projectCode');

  if (state.kind === 'loading') {
    return (
      <div aria-busy className="flex flex-col gap-2.5 px-5 py-5">
        <span className="sr-only">{t('code.loadingFile')}</span>
        {[62, 80, 45, 70, 30, 88, 54, 40, 75].map((width, index) => (
          <span key={index} aria-hidden className="h-3.5 rounded-full skeleton-shimmer" style={{ width: `${width}%` }} />
        ))}
      </div>
    );
  }
  if (state.kind === 'error') {
    return state.notFound ? (
      <Notice icon={<FileQuestion aria-hidden className="size-5" />} text={t('code.fileNotFound')}>
        {readme && readme !== path && (
          <button type="button" onClick={() => onOpen(readme)} className={noticeAction}>
            {t('code.openReadme')}
          </button>
        )}
      </Notice>
    ) : (
      <Notice icon={<TriangleAlert aria-hidden className="size-5" />} text={t('code.fileError')} tone="coral">
        <button type="button" onClick={onRetry} className={noticeAction}>
          <RefreshCw aria-hidden className="size-3.5" />
          {t('code.retry')}
        </button>
      </Notice>
    );
  }
  if (binary) {
    return rawUrl ? (
      <div className="hatch grid min-h-64 place-items-center p-6">
        <img src={rawUrl} alt={path} loading="lazy" decoding="async" className="max-h-[60vh] max-w-full rounded-xl border border-border bg-background object-contain" />
      </div>
    ) : (
      <Notice icon={<ImageOff aria-hidden className="size-5" />} text={t('code.binary')}>
        {webUrl && <GithubAction href={webUrl} />}
      </Notice>
    );
  }
  if (tooLarge) {
    return (
      <Notice icon={<FileQuestion aria-hidden className="size-5" />} text={t('code.tooLarge', { size: formatBytes(size) })}>
        {webUrl && <GithubAction href={webUrl} />}
      </Notice>
    );
  }
  if (content === null) {
    return null;
  }
  if (content.trim() === '') {
    return <Notice icon={<FileQuestion aria-hidden className="size-5" />} text={t('code.emptyFile')} />;
  }
  if (markdown) {
    return (
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <MarkdownContent>{content}</MarkdownContent>
      </div>
    );
  }
  return <CodeLines path={path} content={content} lines={lines} />;
}

/** Le code, numéroté : chaque numéro mène à sa ligne (#L12), qui s'éclaire. */
function CodeLines({ path, content, lines }: { path: string; content: string; lines: string[] }) {
  const { t } = useTranslation('projectCode');
  const { hash } = useLocation();
  const language = languageOf(path);
  const tokens = useMemo<CodeToken[][] | null>(
    () => (language && content.length <= MAX_HIGHLIGHTED ? highlightLines(content.replace(/\n$/, ''), language) : null),
    [content, language],
  );

  // Arrivée par un lien vers une ligne : la page y descend, une fois le fichier dessiné
  useEffect(() => {
    if (!/^#L\d+$/.test(hash)) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'center' }));
    return () => cancelAnimationFrame(frame);
  }, [hash, content]);

  return (
    <div dir="ltr" className="py-3">
      <table className="w-full table-fixed border-collapse font-mono text-[0.78rem] leading-[1.4rem]">
        <colgroup>
          <col className="w-11 sm:w-14" />
          <col />
        </colgroup>
        <tbody>
          {lines.map((line, index) => {
            const number = index + 1;
            return (
              <tr key={number} id={`L${number}`} className="scroll-mt-28 target:bg-gold/12 hover:bg-foreground/3">
                <td className="px-2 text-end align-top text-faint-foreground tabular-nums select-none sm:px-3">
                  <a href={`#L${number}`} aria-label={t('code.line', { line: number })} className="rounded hover:text-foreground focus-visible:text-foreground focus-visible:outline-none">
                    {number}
                  </a>
                </td>
                <td className="py-0 pe-4 align-top sm:pe-5">
                  <code className="hljs block whitespace-pre-wrap [overflow-wrap:anywhere] [tab-size:4]">
                    <CodeLine tokens={tokens?.[index]} content={line} />
                  </code>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ModeButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[0.6875rem] font-semibold transition-colors',
        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
        focusRing,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation('projectCode');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => void copyText(text).then(setCopied)}
      aria-label={copied ? t('code.copied') : t('code.copyFile')}
      title={copied ? t('code.copied') : t('code.copyFile')}
      className={cn(
        'grid size-8 place-items-center rounded-lg transition-colors hover:bg-foreground/6',
        copied ? 'text-jade' : 'text-muted-foreground hover:text-foreground',
        focusRing,
      )}
    >
      {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
    </button>
  );
}

const noticeAction = cn(
  'inline-flex h-9 items-center gap-2 rounded-xl border border-border-strong px-3.5 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5',
  focusRing,
);

function GithubAction({ href }: { href: string }) {
  const { t } = useTranslation('projectCode');
  return (
    <a href={href} target="_blank" rel="noreferrer" className={noticeAction}>
      <GithubMark className="size-4" />
      {t('code.openFileOnGithub')}
    </a>
  );
}

function Notice({ icon, text, tone = 'neutral', children }: { icon: ReactNode; text: string; tone?: 'neutral' | 'coral'; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 px-5 py-10 sm:px-8">
      <span className={cn('grid size-11 place-items-center rounded-2xl', tone === 'coral' ? 'bg-coral/12 text-coral' : 'bg-foreground/6 text-soft-foreground')}>
        {icon}
      </span>
      <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">{text}</p>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
