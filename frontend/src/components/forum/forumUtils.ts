import { Bookmark, CircleCheck, CircleHelp, MessagesSquare, PenLine, Rss, type LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { KenteThread } from '@/config/roles';
import { forumSearch, type ForumView } from '@/hooks/useForumFilters';
import { paths } from '@/router/paths';
import type { ForumOverview } from '@/types/question.types';

const THREADS: readonly KenteThread[] = ['gold', 'coral', 'jade'];

/**
 * Le fil du kente d'un tag : or, rouge ou vert, toujours le même pour un tag (son dièse, la lisière d'une carte).
 * Calculé à partir de son slug : aucun tag n'a à le déclarer.
 */
export function tagThread(slug: string): KenteThread {
  let hash = 0;
  for (const char of slug) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return THREADS[Math.abs(hash) % THREADS.length];
}

/** La couleur lisible d'un tag (texte, bordure), dans une variable CSS : `--tag-accent` */
export function tagAccent(slug: string | undefined): CSSProperties {
  return { '--tag-accent': `var(--${slug ? tagThread(slug) : 'gold'})` } as CSSProperties;
}

// Longueur d'un commentaire (CommentRequest.java)
export const MAX_COMMENT = 2000;
// Modifié plus d'une minute après sa publication : « modifié »
const EDITED_AFTER_MS = 60_000;

/** Le contenu a-t-il été modifié après sa publication ? */
export function wasEdited(item: { createdAt: string; updatedAt: string }): boolean {
  return new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime() > EDITED_AFTER_MS;
}

/** Une vue du forum, son icône, et son nombre de sujets (vue d'ensemble) quand on le connaît */
export const VIEW_ITEMS: readonly { view: ForumView; icon: LucideIcon; count?: (overview: ForumOverview) => number }[] = [
  { view: 'all', icon: MessagesSquare, count: (overview) => overview.topics },
  { view: 'following', icon: Rss },
  { view: 'unanswered', icon: CircleHelp, count: (overview) => overview.unanswered },
  { view: 'solved', icon: CircleCheck, count: (overview) => overview.solved },
  { view: 'mine', icon: PenLine },
  { view: 'saved', icon: Bookmark },
];

/** L'adresse d'une vue : la liste de lecture n'a ni recherche ni tag, les autres les gardent */
export function viewHref(view: ForumView, params: URLSearchParams): string {
  return `${paths.forum}${forumSearch(view === 'saved' ? { view, q: '', tag: null } : { view }, params)}`;
}
