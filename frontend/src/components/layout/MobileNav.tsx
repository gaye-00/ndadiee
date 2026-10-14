import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navigation';
import { cn } from '@/lib/utils';

/** Barre de navigation fixée en bas de l'écran, sur mobile uniquement. */
export default function MobileNav() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[0.65rem] font-medium',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )
              }
            >
              <item.icon className="size-5" />
              {item.shortLabel ?? item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
