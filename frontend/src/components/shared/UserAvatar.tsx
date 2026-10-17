import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { UserSummary } from '@/types/user.types';
import { initials } from '@/utils/formatters';

const SIZES = {
  sm: 'size-7 text-[0.625rem]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-sm',
} as const;

// Sans photo : initiales sur une des trois couleurs du kente, toujours la même pour une personne
const TINTS = ['bg-kente-gold', 'bg-kente-coral', 'bg-kente-jade'] as const;

interface UserAvatarProps {
  user: Pick<UserSummary, 'id' | 'fullName' | 'username' | 'avatarUrl'>;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Avatar : photo, ou initiales sur fond de couleur si elle manque ou ne se charge pas. */
export default function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  const [broken, setBroken] = useState(false);
  const photo = user.avatarUrl && !broken ? user.avatarUrl : null;

  return (
    <span
      title={user.fullName || user.username}
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-kente-night',
        SIZES[size],
        photo ? 'bg-muted' : TINTS[Math.abs(user.id) % TINTS.length],
        className,
      )}
    >
      {photo ? (
        <img src={photo} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} className="size-full object-cover" />
      ) : (
        initials(user.fullName || user.username)
      )}
    </span>
  );
}
