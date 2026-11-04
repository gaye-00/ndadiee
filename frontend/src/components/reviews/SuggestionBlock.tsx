import { Check, Copy, Lightbulb } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { copyText } from '@/lib/clipboard';
import { highlightHunks, type CodeToken, type DiffHunk } from '@/lib/diff';
import { cn } from '@/lib/utils';

interface SuggestionBlockProps {
  /** Le code proposé à la place de la ligne (vide : supprimer la ligne) */
  suggestion: string;
  /** La ligne visée, telle qu'elle est dans la PR ; inconnue hors du diff */
  original?: string | null;
  /** Le langage du fichier, pour colorer le code */
  language?: string | null;
  className?: string;
}

/**
 * Une suggestion de code dans un commentaire de revue. Design 3C (« Expiration à 0 : les horaires ne seront jamais
 * rafraîchis… SUGGESTION »).
 *
 * La ligne d'aujourd'hui en rouge, ce qui est proposé à sa place en vert, colorés comme dans le diff. Le code reste
 * sur GitHub : on copie la suggestion pour l'appliquer dans sa branche.
 */
export default function SuggestionBlock({ suggestion, original, language = null, className }: SuggestionBlockProps) {
  const { t } = useTranslation('reviews');
  const [copied, setCopied] = useState(false);

  // Une suggestion est un petit diff : la ligne retirée, les lignes proposées
  const lines = useMemo(() => {
    const proposed = suggestion === '' ? [] : suggestion.split('\n');
    const hunk: DiffHunk = {
      oldStart: 1,
      newStart: 1,
      section: '',
      lines: [
        ...(original != null ? [{ kind: 'del' as const, oldNumber: 1, newNumber: null, content: original }] : []),
        ...proposed.map((content, index) => ({ kind: 'add' as const, oldNumber: null, newNumber: index + 1, content })),
      ],
    };
    return highlightHunks([hunk], language)[0].lines;
  }, [suggestion, original, language]);

  async function copy() {
    if (await copyText(suggestion)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <figure className={cn('not-prose overflow-hidden rounded-xl border border-gold/30 bg-code', className)}>
      <figcaption className="flex items-center gap-2 border-b border-gold/20 bg-gold/8 px-3 py-1.5">
        <Lightbulb aria-hidden className="size-3.5 text-gold" />
        <span className="font-mono text-[0.6875rem] font-semibold tracking-[0.08em] text-gold uppercase">{t('suggestion.title')}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="ms-auto inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[0.6875rem] font-semibold text-soft-foreground transition-colors outline-none hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          {copied ? <Check aria-hidden className="size-3.5 text-jade" /> : <Copy aria-hidden className="size-3.5" />}
          <span aria-live="polite">{copied ? t('suggestion.copied') : t('suggestion.copy')}</span>
        </button>
      </figcaption>
      <pre dir="ltr" className="overflow-x-auto py-1.5 font-mono text-[0.78rem] leading-[1.35rem] [tab-size:4]">
        {lines.map((line, index) => (
          <div key={index} className={cn('flex px-3', line.kind === 'del' ? 'bg-diff-remove' : 'bg-diff-add')}>
            <span aria-hidden className={cn('w-4 shrink-0 select-none', line.kind === 'del' ? 'text-coral' : 'text-jade')}>
              {line.kind === 'del' ? '−' : '+'}
            </span>
            <span className="sr-only">{t(line.kind === 'del' ? 'diff.removed' : 'diff.added')}</span>
            <code className="hljs min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">
              <CodeLine tokens={line.tokens} content={line.content} />
            </code>
          </div>
        ))}
        {lines.length === 0 && <p className="px-3 text-xs text-muted-foreground italic">{t('suggestion.empty')}</p>}
      </pre>
    </figure>
  );
}

/** Une ligne de code, colorée si son langage est connu */
export function CodeLine({ tokens, content }: { tokens?: CodeToken[]; content: string }) {
  if (!tokens) {
    return <>{content || ' '}</>;
  }
  if (tokens.length === 0) {
    return <> </>;
  }
  return (
    <>
      {tokens.map((token, index) =>
        token.className ? (
          <span key={index} className={token.className}>
            {token.text}
          </span>
        ) : (
          token.text
        ),
      )}
    </>
  );
}
