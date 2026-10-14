import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import { paths } from '@/router/paths';
import type { UserSummary } from '@/types/user.types';
import { countryFlag, countryName, formatCount } from '@/utils/formatters';

interface UserCardProps {
  user: UserSummary;
  /** Texte affiché sous le nom (date de publication...) ; par défaut, pays et réputation */
  meta?: ReactNode;
  size?: 'sm' | 'default';
}

/** Auteur d'un contenu : avatar, nom, pays et réputation. */
export default function UserCard({ user, meta, size = 'default' }: UserCardProps) {
  // Un compte Admin n'a pas de profil public (réputation absente) : pas de lien
  const hasProfile = user.reputation !== null;
  const name = hasProfile ? (
    <Link to={paths.profile(user.username)} className="font-medium hover:underline">
      {user.fullName}
    </Link>
  ) : (
    <span className="font-medium">{user.fullName}</span>
  );

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <UserAvatar user={user} size={size === 'sm' ? 'sm' : 'default'} />
      <div className="min-w-0 leading-tight">
        <div className="truncate">{name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {meta ?? (
            <>
              {user.country && (
                <span title={countryName(user.country)}>
                  {countryFlag(user.country)} {countryName(user.country)}
                </span>
              )}
              {user.country && hasProfile && ' · '}
              {hasProfile && <span>{formatCount(user.reputation ?? 0)} pts</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
