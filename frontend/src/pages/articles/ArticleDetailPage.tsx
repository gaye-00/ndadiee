import { Clock } from 'lucide-react';
import { useParams } from 'react-router-dom';
import CommentSection from '@/components/comment/CommentSection';
import ErrorState from '@/components/shared/ErrorState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import MarkdownContent from '@/components/shared/MarkdownContent';
import TagList from '@/components/shared/TagList';
import UserCard from '@/components/shared/UserCard';
import VoteButtons from '@/components/shared/VoteButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useArticle, usePublishArticle } from '@/hooks/useArticles';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/formatters';

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const article = useArticle(slug);
  const publishArticle = usePublishArticle();

  if (article.isPending) {
    return <ListSkeleton count={2} />;
  }
  if (article.isError) {
    return <ErrorState error={article.error} onRetry={() => void article.refetch()} />;
  }

  const data = article.data;
  const isDraft = data.status === 'DRAFT';

  return (
    <article className="space-y-6">
      {data.coverImageUrl && (
        <img src={data.coverImageUrl} alt="" className="aspect-[3/1] w-full rounded-lg object-cover" />
      )}

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{data.language}</Badge>
          {isDraft && <Badge variant="secondary">Brouillon</Badge>}
          <span className="flex items-center gap-1">
            <Clock className="size-4" /> {data.readingTimeMinutes} min de lecture
          </span>
          {data.publishedAt && <span>· Publié le {formatDate(data.publishedAt)}</span>}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">{data.title}</h1>
        <UserCard user={data.author} />
        {/* Un brouillon n'est visible que de son auteur : lui seul voit ce bouton */}
        {isDraft && user?.id === data.author.id && (
          <Button onClick={() => publishArticle.mutate(data.id)} disabled={publishArticle.isPending}>
            Publier l'article
          </Button>
        )}
      </header>

      <MarkdownContent content={data.content} />
      <TagList tags={data.tags} />

      {!isDraft && (
        <>
          <div className="flex items-center gap-3">
            <VoteButtons
              targetType="ARTICLE"
              targetId={data.id}
              score={data.score}
              currentUserVote={data.currentUserVote}
              authorId={data.author.id}
              orientation="horizontal"
            />
            <span className="text-sm text-muted-foreground">Cet article vous a été utile ?</span>
          </div>
          <Separator />
          <CommentSection targetType="ARTICLE" targetId={data.id} />
        </>
      )}
    </article>
  );
}
