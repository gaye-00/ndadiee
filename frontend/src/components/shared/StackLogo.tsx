import { cn } from '@/lib/utils';

/**
 * Logo d'une technologie (tracé de lib/stackLogos.ts, via useStackLogos), dans la couleur du texte.
 * Tant que le tracé n'est pas là, sa place reste réservée. Décoratif : son nom est écrit à côté.
 */
export default function StackLogo({ path, className }: { path?: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" className={cn('size-3.5 shrink-0 fill-current', className)}>
      {path && <path d={path} />}
    </svg>
  );
}
