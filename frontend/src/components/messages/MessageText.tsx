import { Fragment, type ReactNode } from 'react';

// Un bloc de code entre ``` (la langue éventuelle après les accents est ignorée)
const FENCE = /```[^\n`]*\n?([\s\S]*?)```/g;
// Du code en ligne entre `, ou une adresse web (sans la ponctuation qui la suit dans la phrase)
const INLINE = /(`[^`\n]+`)|(https?:\/\/[^\s<>]+[^\s<>.,;:!?'")\]])/g;

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      nodes.push(text.slice(cursor, index));
    }
    const [whole, code, url] = match;
    if (code) {
      nodes.push(
        <code key={`${keyPrefix}-${index}`} dir="ltr" className="rounded-md bg-current/10 px-1 py-px font-mono text-[0.86em]">
          {code.slice(1, -1)}
        </code>,
      );
    } else if (url) {
      nodes.push(
        <a
          key={`${keyPrefix}-${index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="underline decoration-current/40 underline-offset-2 transition-[text-decoration-color] [overflow-wrap:anywhere] hover:decoration-current"
        >
          {url}
        </a>,
      );
    }
    cursor = index + whole.length;
  }
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
}

/**
 * Le texte d'un message : les sauts de ligne gardés, les adresses web en liens (nouvel onglet), le code entre ` et
 * les blocs entre ``` en police mono. Rien n'est interprété comme du HTML.
 */
export default function MessageText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(FENCE)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      // Le saut de ligne qui touche le bloc ne fait pas une ligne vide de plus
      nodes.push(<Fragment key={`t${cursor}`}>{inline(text.slice(cursor, index).replace(/\n$/, ''), `t${cursor}`)}</Fragment>);
    }
    nodes.push(
      <pre
        key={`c${index}`}
        dir="ltr"
        className="my-1.5 overflow-x-auto rounded-xl bg-current/8 px-3 py-2 text-start font-mono text-[0.8125rem] leading-relaxed whitespace-pre"
      >
        {(match[1] ?? '').replace(/\n$/, '')}
      </pre>,
    );
    cursor = index + match[0].length;
  }
  if (cursor < text.length) {
    nodes.push(<Fragment key={`t${cursor}`}>{inline(text.slice(cursor).replace(/^\n/, ''), `t${cursor}`)}</Fragment>);
  }
  return <>{nodes}</>;
}
