import { Link } from 'react-router-dom';
import { NAV_ITEMS } from './navigation';

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Ndadiee — la plateforme d'échange africaine, pour les devs, par les devs.</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Link to={item.to} className="hover:text-foreground">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
