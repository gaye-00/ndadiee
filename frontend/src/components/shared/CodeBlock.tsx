import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { copyText } from '@/lib/clipboard';
import { cn } from '@/lib/utils';

// Noms affichés des langages les plus courants ; les autres s'affichent tels qu'écrits après les ```
const LANGUAGE_NAMES: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  jsx: 'JSX',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  tsx: 'TSX',
  java: 'Java',
  kotlin: 'Kotlin',
  kt: 'Kotlin',
  python: 'Python',
  py: 'Python',
  go: 'Go',
  php: 'PHP',
  sql: 'SQL',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  dockerfile: 'Dockerfile',
  dart: 'Dart',
  css: 'CSS',
  html: 'HTML',
  xml: 'XML',
  csharp: 'C#',
  cs: 'C#',
  cpp: 'C++',
  c: 'C',
  rust: 'Rust',
  swift: 'Swift',
  ruby: 'Ruby',
  vue: 'Vue',
};

// Le temps de lire « Copié »
const COPIED_MS = 1800;

interface CodeBlockProps {
  /** Langage indiqué après les ``` (« java », « tsx ») */
  language?: string;
  /** Le code, déjà coloré (rehype-highlight) */
  children: ReactNode;
  className?: string;
}

/**
 * Bloc de code d'un contenu Markdown : le langage en tête, le code coloré, qui défile en largeur sans casser les
 * lignes, et un bouton pour le copier. Copier prend le texte tel qu'affiché, sans la coloration.
 */
export default function CodeBlock({ language, children, className }: CodeBlockProps) {
  const { t } = useTranslation();
  const pre = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const name = language ? (LANGUAGE_NAMES[language.toLowerCase()] ?? language) : null;

  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    const text = pre.current?.textContent ?? '';
    if (await copyText(text.replace(/\n$/, ''))) {
      setCopied(true);
    }
  }

  return (
    <div className={cn('not-prose group/code relative my-5 overflow-hidden rounded-xl border border-border bg-code', className)}>
      <div className="flex h-9 items-center gap-2 border-b border-border-subtle ps-4 pe-1.5">
        {/* Trois fils kente, à la place des boutons d'une fenêtre */}
        <span aria-hidden className="flex gap-1">
          <span className="size-1.5 rounded-full bg-kente-gold" />
          <span className="size-1.5 rounded-full bg-kente-coral" />
          <span className="size-1.5 rounded-full bg-kente-jade" />
        </span>
        {name && <span className="font-mono text-[0.6875rem] tracking-wide text-muted-foreground">{name}</span>}
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={copied ? t('code.copied') : t('code.copy')}
          className={cn(
            'ms-auto inline-flex h-7 items-center gap-1.5 rounded-lg px-2 font-mono text-[0.6875rem] transition-colors',
            copied ? 'text-jade' : 'text-muted-foreground hover:bg-foreground/7 hover:text-foreground',
            'outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
          )}
        >
          {copied ? <Check aria-hidden className="size-3.5" strokeWidth={3} /> : <Copy aria-hidden className="size-3.5" />}
          <span aria-live="polite">{copied ? t('code.copied') : t('code.copy')}</span>
        </button>
      </div>
      {/* dir="ltr" : le code se lit de gauche à droite, même dans une page en arabe */}
      <pre ref={pre} dir="ltr" tabIndex={0} className="overflow-x-auto p-4 text-[0.8125rem] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-inset">
        {children}
      </pre>
    </div>
  );
}
