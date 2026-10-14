import { Link } from 'react-router-dom';
import TagList from '@/components/shared/TagList';
import UserCard from '@/components/shared/UserCard';
import { Badge } from '@/components/ui/badge';
import { paths } from '@/router/paths';
import type { FeedItem } from '@/types/feed.types';
import { countLabel, formatRelativeTime } from '@/utils/formatters';

interface FeedItemCardProps {
  item: FeedItem;
}

const TYPE_LABELS: Record<FeedItem['type'], string> = {
  QUESTION: 'Question',
  ARTICLE: 'Article',
  PROJECT: 'Projet',
};

// Les projets n'ont pas encore de page de détail : leur carte mène à la vitrine
function linkTo(item: FeedItem): string {
  switch (item.type) {
    case 'QUESTION':
      return paths.question(item.slug);
    case 'ARTICLE':
      return paths.article(item.slug);
    case 'PROJECT':
      return paths.projects;
  }
}

function stats(item: FeedItem): string {
  switch (item.type) {
    case 'QUESTION':
      return `${countLabel(item.score, 'vote')} · ${countLabel(item.answerCount ?? 0, 'réponse')}`;
    case 'ARTICLE':
      return countLabel(item.score, 'vote');
    case 'PROJECT':
      return countLabel(item.score, 'étoile');
  }
}

/** Carte commune aux trois types de contenu du fil d'actualité. */
export default function FeedItemCard({ item }: FeedItemCardProps) {
  return (
    <article className="space-y-2 rounded-lg border p-4">
      <Badge variant="outline">{TYPE_LABELS[item.type]}</Badge>
      <h3 className="font-semibold">
        <Link to={linkTo(item)} className="hover:underline">
          {item.title}
        </Link>
      </h3>
      <p className="line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
      <TagList tags={item.tags} />
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <UserCard user={item.author} meta={formatRelativeTime(item.createdAt)} size="sm" />
        <p className="text-xs text-muted-foreground">{stats(item)}</p>
      </div>
    </article>
  );
}
