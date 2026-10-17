import type { ReactNode } from 'react';

/**
 * La barre d'une page à filtrer (vitrine, annonces), en verre : la recherche, puis les listes (technologie,
 * pays). Sur téléphone, les listes passent sous la recherche, côte à côte.
 */
export default function FilterBar({ search, children }: { search: ReactNode; children: ReactNode }) {
  return (
    <div className="glass flex flex-col gap-1 rounded-[1.375rem] p-1.5 backdrop-blur-xl saver:bg-background md:flex-row md:items-center">
      {search}
      <span aria-hidden className="mx-1 hidden h-6 w-px shrink-0 bg-border md:block" />
      <div className="flex gap-1 border-t border-border-subtle pt-1 md:border-0 md:pt-0">{children}</div>
    </div>
  );
}
