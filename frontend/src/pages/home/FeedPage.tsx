import { useState } from 'react';
import { Inbox } from 'lucide-react';
import FeedItemCard from '@/components/feed/FeedItemCard';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ListSkeleton from '@/components/shared/ListSkeleton';
import PageHeader from '@/components/shared/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useFeed } from '@/hooks/useFeed';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { Language } from '@/types/common.types';

type LanguageFilter = Language | 'ALL';

export default function FeedPage() {
  const { isAuthenticated } = useAuth();
  const [language, setLanguage] = useState<LanguageFilter>('ALL');
  const feed = useFeed({ language: language === 'ALL' ? undefined : language });

  const sentinelRef = useInfiniteScroll(
    () => void feed.fetchNextPage(),
    !!feed.hasNextPage && !feed.isFetchingNextPage,
  );

  const items = feed.data?.pages.flatMap((page) => page.content) ?? [];

  return (
    <>
      <PageHeader
        title="Fil d'actualité"
        description={
          isAuthenticated
            ? 'Les contenus des auteurs et des tags que vous suivez.'
            : 'Les dernières questions, articles et projets de la communauté.'
        }
        action={
          <Tabs value={language} onValueChange={(value) => setLanguage(value as LanguageFilter)}>
            <TabsList aria-label="Langue des contenus">
              <TabsTrigger value="ALL">Tout</TabsTrigger>
              <TabsTrigger value="FR">Français</TabsTrigger>
              <TabsTrigger value="EN">English</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {feed.isPending ? (
        <ListSkeleton />
      ) : feed.isError ? (
        <ErrorState error={feed.error} onRetry={() => void feed.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Inbox />} title="Rien à afficher" description="Aucun contenu ne correspond à ce filtre pour l'instant." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <FeedItemCard key={`${item.type}-${item.id}`} item={item} />
          ))}
          {/* Sentinelle : son arrivée près de l'écran déclenche le chargement de la page suivante */}
          <div ref={sentinelRef} aria-hidden="true" />
          {feed.isFetchingNextPage && <ListSkeleton count={2} />}
          {!feed.hasNextPage && <p className="py-4 text-center text-sm text-muted-foreground">Vous avez tout vu.</p>}
        </div>
      )}
    </>
  );
}
