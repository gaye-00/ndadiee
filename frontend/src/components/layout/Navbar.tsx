import { Link } from 'react-router-dom';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';
import CommandMenu from '@/components/shared/CommandMenu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { paths } from '@/router/paths';

export default function Navbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Logo />

        <div className="ml-auto flex items-center gap-1.5">
          <CommandMenu />
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <>
              {/* Sur mobile, un seul bouton tient dans la barre : la connexion (qui mène aussi à l'inscription) */}
              <Button variant="ghost" asChild>
                <Link to={paths.login}>Se connecter</Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link to={paths.register}>S'inscrire</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
