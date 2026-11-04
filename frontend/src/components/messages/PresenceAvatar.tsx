import { AnimatePresence, m } from 'motion/react';
import UserAvatar from '@/components/shared/UserAvatar';
import { cn } from '@/lib/utils';
import type { UserSummary } from '@/types/user.types';

const DOTS = {
  sm: 'size-2.5 ring-[1.5px]',
  md: 'size-3 ring-2',
  lg: 'size-3.5 ring-[2.5px]',
} as const;

interface PresenceAvatarProps {
  user: Pick<UserSummary, 'id' | 'fullName' | 'username' | 'avatarUrl'>;
  online: boolean;
  size?: keyof typeof DOTS;
  className?: string;
  avatarClassName?: string;
}

/** L'avatar d'un membre, et la pastille verte quand il est en ligne. */
export default function PresenceAvatar({ user, online, size = 'md', className, avatarClassName }: PresenceAvatarProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <UserAvatar user={user} size={size} className={avatarClassName} />
      <AnimatePresence initial={false}>
        {online && (
          <m.span
            aria-hidden
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 24 }}
            className={cn('absolute end-0 bottom-0 rounded-full bg-kente-jade ring-background', DOTS[size])}
          />
        )}
      </AnimatePresence>
    </span>
  );
}
