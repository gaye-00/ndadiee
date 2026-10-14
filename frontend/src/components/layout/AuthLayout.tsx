import { Outlet } from 'react-router-dom';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

/** Pages de connexion et d'inscription : formulaire centré, sans navigation. */
export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="flex items-center justify-between p-4">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
