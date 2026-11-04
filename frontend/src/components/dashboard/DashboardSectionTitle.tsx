import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import type { PageImport } from '@/router/pages';

interface DashboardSectionTitleProps {
  id: string;
  children: ReactNode;
  /** Pastille après le titre : combien d'éléments attendent */
  count?: number;
  /** Lien « Toutes les annonces → » au bout de la ligne */
  action?: { to: string; label: string; preload?: PageImport };
  className?: string;
}

/**
 * Titre d'une section de l'atelier, en petites capitales mono comme le design 3B (« MES PROJETS »), avec ce qui
 * attend et un lien vers la suite.
 */
export default function DashboardSectionTitle({ id, children, count, action, className }: DashboardSectionTitleProps) {
  return (
    <div className={cn('flex min-h-6 items-center gap-3', className)}>
      <h2 id={id} className="eyebrow flex items-center gap-2">
        {children}
        {count !== undefined && count > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-kente-coral px-1.5 font-mono text-[0.625rem] leading-none tracking-normal text-white tabular-nums">
            {count}
          </span>
        )}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-linear-to-r from-border to-transparent rtl:bg-linear-to-l" />
      {action && (
        <Link
          to={action.to}
          viewTransition
          onPointerEnter={() => action.preload && prefetch(action.preload)}
          onFocus={() => action.preload && prefetch(action.preload)}
          className="group/more inline-flex shrink-0 items-center gap-1 rounded-full text-xs font-bold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          {action.label}
          <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/more:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/more:-translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
