import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { to: string; label: string };
  className?: string;
}

/** État vide : pictogramme kente, message et action (« Aucun rôle ouvert »). Design 3H. */
export default function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('glass flex flex-col items-start gap-2 rounded-2xl p-5', className)}>
      <span aria-hidden className="mb-1 size-10 rounded-xl bg-kente-conic opacity-80" />
      <p className="font-bold text-foreground">{title}</p>
      {description && <p className="max-w-prose text-[0.8125rem] leading-relaxed text-muted-foreground">{description}</p>}
      {action && (
        <Link
          to={action.to}
          viewTransition
          className="group/empty mt-1 inline-flex items-center gap-1.5 rounded-full text-[0.8125rem] font-bold text-gold outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          {action.label}
          <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/empty:translate-x-0.5 rtl:-scale-x-100" />
        </Link>
      )}
    </div>
  );
}
