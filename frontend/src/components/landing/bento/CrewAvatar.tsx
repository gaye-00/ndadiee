import { cn } from '@/lib/utils';
import { CREW, type CrewMember } from './crew';

const SIZES = {
  xs: 'size-5 text-[0.5625rem]',
  sm: 'size-6 text-[0.625rem]',
  md: 'size-8 text-xs',
} as const;

/** Avatar d'un membre de l'équipe : ses initiales. Décoratif quand son nom est écrit à côté. */
export default function CrewAvatar({ who, size = 'sm', className }: { who: CrewMember; size?: keyof typeof SIZES; className?: string }) {
  const member = CREW[who];
  return (
    <span
      aria-hidden
      className={cn('inline-grid shrink-0 place-items-center rounded-full font-bold text-kente-night', SIZES[size], member.tint, className)}
    >
      {member.initials}
    </span>
  );
}
