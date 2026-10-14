import { LogOut, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import UserAvatar from '@/components/shared/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { paths } from '@/router/paths';

/** Avatar de l'utilisateur connecté et son menu (profil, déconnexion). */
export default function UserMenu() {
  const { user, isDeveloper, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const onLogout = () => {
    logout();
    void navigate(paths.landing);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Mon compte">
        <UserAvatar user={user} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="truncate font-medium">{user.fullName}</div>
          <div className="truncate text-xs font-normal text-muted-foreground">@{user.username}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Un compte Admin n'a pas de profil public */}
        {isDeveloper && (
          <DropdownMenuItem asChild>
            <Link to={paths.profile(user.username)}>
              <User /> Mon profil
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onLogout}>
          <LogOut /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
