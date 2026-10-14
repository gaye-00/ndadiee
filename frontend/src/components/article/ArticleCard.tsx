import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import TagList from '@/components/shared/TagList';
import UserCard from '@/components/shared/UserCard';
import { Badge } from '@/components/ui/badge';
import { paths } from '@/router/paths';
import type { ArticleSummary } from '@/types/article.types';
import { countLabel, formatRelativeTime } from '@/utils/formatters';

interface ArticleCardProps {
  article: ArticleSummary;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  return (
    <article className="overflow-hidden rounded-lg border">
      {article.coverImageUrl && (
        <img src={article.coverImageUrl} alt="" loading="lazy" className="aspect-[3/1] w-full object-cover" />
      )}
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{article.language}</Badge>
          {article.status === 'DRAFT' && <Badge variant="secondary">Brouillon</Badge>}
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {article.readingTimeMinutes} min de lecture
          </span>
        </div>
        <h3 className="text-lg font-semibold">
          <Link to={paths.article(article.slug)} className="hover:underline">
            {article.title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm text-muted-foreground">{article.excerpt}</p>
        <TagList tags={article.tags} />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <UserCard
            user={article.author}
            meta={formatRelativeTime(article.publishedAt ?? article.createdAt)}
            size="sm"
          />
          <p className="text-xs text-muted-foreground">{countLabel(article.score, 'vote')}</p>
        </div>
      </div>
    </article>
  );
}
