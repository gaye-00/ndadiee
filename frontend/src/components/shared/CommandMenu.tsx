import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from '@/components/layout/navigation';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { MIN_SEARCH_LENGTH } from '@/hooks/useSearch';
import { paths } from '@/router/paths';

/** Bouton de recherche de la barre de navigation et sa palette de commandes (Ctrl+K ou ⌘K). */
export default function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const goTo = (to: string) => {
    setOpen(false);
    setQuery('');
    void navigate(to);
  };

  const trimmedQuery = query.trim();

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-9 justify-center px-0 text-muted-foreground sm:w-56 sm:justify-start sm:px-2.5"
        aria-label="Rechercher"
      >
        <Search />
        <span className="hidden sm:inline">Rechercher…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-[0.7rem] font-medium sm:inline">Ctrl K</kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Recherche"
        description="Rechercher sur Ndadiee ou aller à une section"
      >
        <CommandInput value={query} onValueChange={setQuery} placeholder="Rechercher ou aller à…" />
        <CommandList>
          <CommandEmpty>Aucun résultat.</CommandEmpty>
          {trimmedQuery.length >= MIN_SEARCH_LENGTH && (
            <CommandGroup heading="Recherche">
              <CommandItem
                // La valeur contient la saisie : cet élément reste donc visible quel que soit le filtre
                value={`rechercher ${trimmedQuery}`}
                onSelect={() => goTo(`${paths.search}?q=${encodeURIComponent(trimmedQuery)}`)}
              >
                <Search />
                Rechercher « {trimmedQuery} »
              </CommandItem>
            </CommandGroup>
          )}
          <CommandGroup heading="Aller à">
            {NAV_ITEMS.map((item) => (
              <CommandItem key={item.to} value={item.label} onSelect={() => goTo(item.to)}>
                <item.icon />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
