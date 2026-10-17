import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { PUBLIC_NAV } from '@/config/navigation';
import { useCommandPaletteStore } from '@/store/useCommandPaletteStore';

/** Palette de recherche et d'actions, ouverte avec Ctrl K depuis n'importe quelle page. Design 3H. */
export default function CommandPalette() {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const toggle = useCommandPaletteStore((s) => s.toggle);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      {/* CommandDialog de shadcn n'enveloppe pas son contenu : <Command> fournit l'état de la recherche */}
      <Command>
        <CommandInput placeholder="Rechercher… (CommandPalette)" />
        <CommandList>
          <CommandEmpty>Aucun résultat.</CommandEmpty>
          <CommandGroup heading="Pages">
            {PUBLIC_NAV.map((item) => (
              <CommandItem
                key={item.to}
                onSelect={() => {
                  setOpen(false);
                  navigate(item.to);
                }}
              >
                <item.icon />
                {t(`nav.${item.labelKey}`)}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
