import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { paths } from '@/router/paths';
import type { UserSummary } from '@/types/user.types';

// **gras**, `code` et @mention (pas celle d'une adresse e-mail), dans cet ordre de priorité
const TOKENS = /(\*\*[^*]+\*\*|`[^`]+`|(?<![\w.])@[a-z0-9_]{3,30}\b)/gi;

interface InlineMarkdownProps {
  text: string;
  /** Les membres qu'une mention peut nommer : « @ama_owusu » devient « Ama Owusu », vers son profil */
  people?: readonly Pick<UserSummary, 'username' | 'fullName'>[];
}

/**
 * Texte court écrit par une équipe (accroche, devlog) : le gras, le code et les mentions, rien d'autre.
 * Le reste du Markdown reste tel quel ; le texte n'est jamais interprété comme du HTML.
 */
export default function InlineMarkdown({ text, people = [] }: InlineMarkdownProps) {
  // split() garde les jetons reconnus aux rangs impairs : le reste est du texte
  return <>{text.split(TOKENS).map((part, index) => <Fragment key={index}>{index % 2 === 1 ? render(part, people) : part}</Fragment>)}</>;
}

function render(part: string, people: InlineMarkdownProps['people'] = []): ReactNode {
  if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
    return <strong className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
  }
  if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
    return <code className="rounded-md bg-foreground/8 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">{part.slice(1, -1)}</code>;
  }
  if (part.startsWith('@')) {
    const username = part.slice(1).toLowerCase();
    const person = people.find((candidate) => candidate.username === username);
    return (
      <Link
        to={paths.profile(username)}
        viewTransition
        className="rounded-sm font-semibold text-jade underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70"
      >
        {person ? person.fullName : part}
      </Link>
    );
  }
  return part;
}
