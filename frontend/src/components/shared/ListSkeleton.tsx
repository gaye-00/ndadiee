import { Skeleton } from '@/components/ui/skeleton';

interface ListSkeletonProps {
  count?: number;
}

/** Fantômes de cartes pendant le chargement d'une liste. */
export default function ListSkeleton({ count = 4 }: ListSkeletonProps) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-3 rounded-lg border p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
