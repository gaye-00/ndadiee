import { useRef, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CodeBlockProps {
  children: ReactNode;
}

/** Bloc de code d'un contenu Markdown, avec un bouton pour le copier. */
export default function CodeBlock({ children }: CodeBlockProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(preRef.current?.innerText ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="not-prose group relative my-4">
      <pre ref={preRef} className="overflow-x-auto rounded-lg bg-neutral-950 p-4 text-sm leading-relaxed text-neutral-100 [&_code]:bg-transparent! [&_code]:p-0!">
        {children}
      </pre>
      <Button
        variant="secondary"
        size="icon-xs"
        onClick={copy}
        aria-label={copied ? 'Code copié' : 'Copier le code'}
        className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}
