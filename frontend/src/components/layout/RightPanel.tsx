import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useTags } from '@/hooks/useTags';
import { paths } from '@/router/paths';

/** Colonne de droite, sur les grands écrans : tags les plus utilisés. */
export default function RightPanel() {
  const { data: tags, isPending } = useTags({ size: 12 });

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto py-6 xl:block">
      <section aria-labelledby="popular-tags">
        <h2 id="popular-tags" className="mb-3 text-sm font-semibold">
          Tags populaires
        </h2>
        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-5 w-full" />
            ))}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {tags?.content.map((tag) => (
              <li key={tag.id} className="flex items-center justify-between gap-2 text-sm">
                <Link to={`${paths.questions}?tag=${tag.slug}`} className="truncate hover:underline">
                  {tag.name}
                </Link>
                <span className="text-xs text-muted-foreground tabular-nums">{tag.usageCount}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
