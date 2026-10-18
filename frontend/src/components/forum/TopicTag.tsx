import { Link } from 'react-router-dom';
import { tagAccent } from './forumUtils';
import { forumSearch } from '@/hooks/useForumFilters';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';

interface TopicTagProps {
  tag: { slug: string; name: string };
  /** Les filtres du forum à garder (vue, ordre) ; sans eux, le forum filtré sur ce seul tag */
  params?: URLSearchParams;
  /** Le tag est celui du filtre en cours */
  active?: boolean;
  className?: string;
}

/**
 * Un tag d'un sujet, comme sur dev.to : un dièse à sa couleur du kente, puis son nom. Il mène au forum filtré sur
 * ce tag. Au-dessus du lien qui couvre une carte (relative z-10) : il reste cliquable.
 */
export default function TopicTag({ tag, params, active = false, className }: TopicTagProps) {
  return (
    <Link
      to={`${paths.forum}${forumSearch({ tag: tag.slug }, params)}`}
      viewTransition
      style={tagAccent(tag.slug)}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'relative z-10 inline-flex h-7 max-w-full items-center rounded-lg border px-2 text-[0.8125rem] text-soft-foreground transition-[border-color,background-color,color] duration-200',
        'border-transparent hover:border-[color-mix(in_srgb,var(--tag-accent)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--tag-accent)_9%,transparent)] hover:text-foreground',
        active && 'border-[color-mix(in_srgb,var(--tag-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--tag-accent)_9%,transparent)] text-foreground',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
        className,
      )}
    >
      <span aria-hidden className="me-px font-mono font-semibold text-(--tag-accent)">
        #
      </span>
      <span className="truncate">{tag.name}</span>
    </Link>
  );
}
