import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  id?: string;
  title: string;
  /** Lien « Tout voir → » à droite (à gauche en arabe) */
  action?: { to: string; label: string; preload?: () => Promise<unknown> };
  className?: string;
}

/** Titre de section, avec le lien « Tout voir → ». */
export default function SectionHeading({ id, title, action, className }: SectionHeadingProps) {
  return (
    <div className={cn('flex items-end justify-between gap-6', className)}>
      <h2 id={id} className="font-display text-h2">
        {title}
      </h2>
      {action && (
        <Link
          to={action.to}
          viewTransition
          onPointerEnter={() => action.preload && prefetch(action.preload)}
          onFocus={() => action.preload && prefetch(action.preload)}
          className="group/heading inline-flex shrink-0 items-center gap-1.5 rounded-full pb-1 text-[0.9375rem] font-semibold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          {action.label}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover/heading:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/heading:-translate-x-0.5"
          />
        </Link>
      )}
    </div>
  );
}
