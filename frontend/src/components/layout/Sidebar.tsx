import { Plus } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';

/** Navigation principale, à gauche sur les écrans moyens et larges. */
export default function Sidebar() {
  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 flex-col gap-4 overflow-y-auto py-6 md:flex">
      <nav aria-label="Navigation principale">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )
                }
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Button asChild>
        <Link to={paths.askQuestion}>
          <Plus /> Poser une question
        </Link>
      </Button>
    </aside>
  );
}
