import { Star } from 'lucide-react';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

// Les trois couleurs du kente pour le podium : or, vert, rouge ; au-delà, la couleur du texte
const MEDALS = ['var(--kente-gold)', 'var(--kente-jade)', 'var(--kente-coral)'] as const;

const SIZES = {
  sm: 'size-5 text-[0.625rem]',
  md: 'size-7 text-xs',
  lg: 'size-11 text-base',
} as const;

/**
 * Médaille du palmarès : un disque tissé, or pour la 1re place, vert pour la 2e, rouge pour la 3e, avec sa
 * place dessus ; une étoile pour une distinction sans place (« Prix du public »). Décorative : la place est
 * écrite à côté. Effets : styles/effects.css, « Hackathons ».
 */
export default function HackathonMedal({
  rank,
  size = 'md',
  className,
}: {
  /** Place au palmarès ; absente pour une distinction */
  rank: number | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const medal = rank !== null && rank <= MEDALS.length ? MEDALS[rank - 1] : 'var(--soft-foreground)';

  return (
    <span
      aria-hidden
      style={{ '--medal': medal } as CSSProperties}
      className={cn(
        'hackathon-medal relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-display font-extrabold text-kente-night',
        SIZES[size],
        className,
      )}
    >
      {rank !== null ? <span className="relative">{rank}</span> : <Star className="relative size-[55%] fill-current" />}
    </span>
  );
}
