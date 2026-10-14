import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserSummary } from '@/types/user.types';
import { initials } from '@/utils/formatters';

interface UserAvatarProps {
  user: Pick<UserSummary, 'fullName' | 'avatarUrl'>;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

/** Photo de l'utilisateur, ou ses initiales s'il n'en a pas. */
export default function UserAvatar({ user, size = 'default', className }: UserAvatarProps) {
  return (
    <Avatar size={size} className={className}>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
      <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
    </Avatar>
  );
}
