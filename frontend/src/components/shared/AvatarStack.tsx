import UserAvatar from './UserAvatar';
import { cn } from '@/lib/utils';
import type { UserSummary } from '@/types/user.types';

interface AvatarStackProps {
  users: ReadonlyArray<Pick<UserSummary, 'id' | 'fullName' | 'username' | 'avatarUrl'>>;
  /** Au-delà, un « +3 » remplace les suivants */
  max?: number;
  size?: 'sm' | 'md';
  /** Liseré qui sépare les avatars : la couleur du fond sur lequel ils sont posés */
  ringClassName?: string;
  className?: string;
}

/** Avatars superposés d'une équipe. Décoratif : le texte voisin dit combien de personnes il y a. */
export default function AvatarStack({ users, max = 4, size = 'sm', ringClassName = 'ring-background', className }: AvatarStackProps) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;

  return (
    <span aria-hidden className={cn('flex -space-x-2', className)}>
      {shown.map((user) => (
        <UserAvatar key={user.id} user={user} size={size} className={cn('ring-2', ringClassName)} />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            'inline-grid shrink-0 place-items-center rounded-full bg-muted font-semibold text-muted-foreground ring-2',
            ringClassName,
            size === 'sm' ? 'size-7 text-[0.625rem]' : 'size-9 text-xs',
          )}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
