import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PageResponse } from '@/types/common.types';

interface PaginationProps {
  /** Page renvoyée par l'API (numérotée à partir de 0) */
  page: Pick<PageResponse<unknown>, 'page' | 'totalPages' | 'first' | 'last'>;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, onPageChange }: PaginationProps) {
  if (page.totalPages <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center justify-center gap-3 pt-2" aria-label="Pagination">
      <Button variant="outline" size="sm" disabled={page.first} onClick={() => onPageChange(page.page - 1)}>
        <ChevronLeft /> Précédent
      </Button>
      <span className="text-sm text-muted-foreground tabular-nums">
        Page {page.page + 1} sur {page.totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page.last} onClick={() => onPageChange(page.page + 1)}>
        Suivant <ChevronRight />
      </Button>
    </nav>
  );
}
