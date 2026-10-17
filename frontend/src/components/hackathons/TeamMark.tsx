import { cn } from '@/lib/utils';
import type { ProjectBrief } from '@/types/project.types';

const SIZES = {
  sm: 'size-7 rounded-lg text-[0.625rem]',
  md: 'size-10 rounded-xl text-xs',
  lg: 'size-14 rounded-2xl text-base',
} as const;

// Une des trois couleurs du kente, toujours la même pour une équipe
const TINTS = ['bg-kente-gold', 'bg-kente-coral', 'bg-kente-jade'] as const;

/** « lagos-transit » → « LT », « Kumasi Builders » → « KB », « AgriData » → « AD » */
function monogram(name: string): string {
  const words = name.split(/[\s\-_.]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  // Un seul mot : ses deux premières majuscules (« AgriData »), sinon ses deux premières lettres
  const capitals = name.match(/\p{Lu}/gu);
  return (capitals && capitals.length >= 2 ? capitals.slice(0, 2).join('') : name.slice(0, 2)).toUpperCase();
}

/**
 * La marque d'une équipe : ses initiales sur une étoffe de sa couleur, en carré (les personnes sont en
 * rond). Jamais d'image : une miniature de 640 px pour un carré de 28 pesait trop sur un petit forfait.
 * Décorative : le nom de l'équipe est écrit à côté.
 */
export default function TeamMark({
  project,
  size = 'sm',
  className,
}: {
  project: Pick<ProjectBrief, 'id' | 'name'>;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      title={project.name}
      className={cn(
        'team-mark relative inline-grid shrink-0 place-items-center overflow-hidden font-display font-bold text-kente-night',
        SIZES[size],
        TINTS[Math.abs(project.id) % TINTS.length],
        className,
      )}
    >
      {monogram(project.name)}
    </span>
  );
}
