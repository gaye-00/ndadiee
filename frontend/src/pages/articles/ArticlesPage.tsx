import { FileText } from 'lucide-react';
import ArticleCard from '@/components/article/ArticleCard';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import PageHeader from '@/components/shared/PageHeader';
import Pagination from '@/components/shared/Pagination';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useArticles } from '@/hooks/useArticles';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import type { Language } from '@/types/common.types';

export default function ArticlesPage() {
  const { get, page, update } = useUrlFilters();
  const language = get('language') as Language | undefined;

  const articles = useArticles({ language, page, size: 10 });

  return (
    <>
      <PageHeader
        title="Articles"
        description="Tutoriels, retours d'expérience et parcours partagés par la communauté."
        action={
          <Tabs
            value={language ?? 'ALL'}
            onValueChange={(value) => update({ language: value === 'ALL' ? null : value, page: null })}
          >
            <TabsList aria-label="Langue des articles">
              <TabsTrigger value="ALL">Tout</TabsTrigger>
              <TabsTrigger value="FR">Français</TabsTrigger>
              <TabsTrigger value="EN">English</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {articles.isPending ? (
        <ListSkeleton />
      ) : articles.isError ? (
        <ErrorState error={articles.error} onRetry={() => void articles.refetch()} />
      ) : articles.data.content.length === 0 ? (
        <EmptyState icon={<FileText />} title="Aucun article" description="Aucun article publié dans cette langue pour l'instant." />
      ) : (
        <div className="space-y-4">
          {articles.data.content.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
          <Pagination page={articles.data} onPageChange={(next) => update({ page: String(next) })} />
        </div>
      )}
    </>
  );
}
