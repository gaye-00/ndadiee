import { site } from '@/config/site';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  /** Classes du nom, par exemple pour le masquer sur les très petits écrans (`max-[22.5rem]:sr-only`) */
  nameClassName?: string;
  /** Tuile seule, le nom reste lu par les lecteurs d'écran (rail de l'application, design 3B) */
  compact?: boolean;
}

/** Logo : tuile en dégradé conique kente et nom de la plateforme. Au survol, le kente tourne sur lui-même. */
export default function Logo({ className, nameClassName, compact = false }: LogoProps) {
  return (
    <span
      className={cn(
        'group/logo inline-flex items-center gap-2.5 font-display text-lg leading-none font-bold tracking-tight text-foreground',
        className,
      )}
    >
      <span
        aria-hidden
        className="size-5.5 shrink-0 rounded-[0.4375rem] bg-kente-conic transition-transform duration-700 ease-out-expo group-hover/logo:rotate-180"
      />
      <span className={cn(nameClassName, compact && 'sr-only')}>{site.name}</span>
    </span>
  );
}
