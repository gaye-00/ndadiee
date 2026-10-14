import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Tag } from '@/types/tag.types';

interface TagListProps {
  tags: Tag[];
  className?: string;
}

/** Tags d'un contenu ; chacun mène aux questions qui le portent. */
export default function TagList({ tags, className }: TagListProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)}>
      {tags.map((tag) => (
        <li key={tag.id}>
          <Badge variant="secondary" asChild>
            <Link to={`${paths.questions}?tag=${tag.slug}`}>{tag.name}</Link>
          </Badge>
        </li>
      ))}
    </ul>
  );
}
