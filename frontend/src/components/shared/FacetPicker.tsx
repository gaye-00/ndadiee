import { Command } from 'cmdk';
import { Check, ChevronDown, Search, type LucideIcon } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { cn } from '@/lib/utils';

/** Une valeur proposée : son nom, combien de résultats elle donnerait, son logo ou son drapeau */
export interface FacetOption {
  value: string;
  label: string;
  count?: number;
  icon?: ReactNode;
  /** Rubrique de la liste (« Technologies », « Thèmes ») : voir `groups` */
  group?: string;
  /** Mots qui la trouvent dans la recherche ; par défaut, son nom */
  keywords?: string[];
}

interface FacetPickerProps {
  /** Nom du filtre (« Stack ») : sur le bouton tant que rien n'est choisi */
  label: string;
  icon: LucideIcon;
  /** Valeur choisie ; null : toutes */
  value: string | null;
  /** Ce que montre le bouton quand une valeur est choisie (logo et nom) */
  selected?: { label: string; icon?: ReactNode };
  options: readonly FacetOption[];
  /** Ordre des rubriques ; sans rubriques, une seule liste */
  groups?: readonly string[];
  /** La première ligne, qui retire le filtre (« Toutes les stacks ») */
  anyLabel: string;
  searchPlaceholder: string;
  /** Aucune valeur ne correspond à la recherche */
  emptyLabel: string;
  /** Une précision sous la liste (« Pays du porteur du projet ») */
  hint?: string;
  /** Les valeurs ne sont pas encore arrivées */
  loading?: boolean;
  onChange: (value: string | null) => void;
  className?: string;
}

// Valeur de la ligne « toutes » : ni un slug, ni un code pays
const ANY = '\u0000any';

// Recherche sans accents ni majuscules : « senegal » trouve « Sénégal »
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();

function matches(value: string, search: string, keywords?: string[]): number {
  const term = fold(search.trim());
  return (keywords?.length ? keywords : [value]).some((keyword) => fold(keyword).includes(term)) ? 1 : 0;
}

// Sur un écran tactile, ouvrir la liste ne fait pas surgir le clavier : on choisit le plus souvent du doigt
const coarsePointer = window.matchMedia('(pointer: coarse)');

const itemClass = cn(
  'flex h-10 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-sm text-soft-foreground outline-none select-none',
  'data-[selected=true]:bg-foreground/6 data-[selected=true]:text-foreground',
);

/**
 * Filtre à choix unique dans une longue liste (technologie, pays) : un bouton, puis une liste qui se
 * cherche au clavier, chaque valeur avec le nombre de résultats qu'elle donnerait. Une valeur choisie
 * s'affiche sur le bouton, teinté d'or.
 */
export default function FacetPicker({
  label,
  icon: Icon,
  value,
  selected,
  options,
  groups,
  anyLabel,
  searchPlaceholder,
  emptyLabel,
  hint,
  loading = false,
  onChange,
  className,
}: FacetPickerProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const active = value !== null && selected !== undefined;

  function choose(next: string | null) {
    setOpen(false);
    if (next !== value) {
      onChange(next);
    }
  }

  const sections = groups?.length
    ? groups.map((group) => ({ group, items: options.filter((option) => option.group === group) }))
    : [{ group: undefined, items: options }];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        // Le bouton montre la valeur choisie : le nom du filtre reste dans ce que lit un lecteur d'écran
        aria-label={active ? `${label} — ${selected.label}` : undefined}
        className={cn(
          'group/picker inline-flex h-11 min-w-0 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-sm font-semibold outline-none',
          'transition-[background-color,color,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-ring/70',
          active
            ? 'bg-gold/10 text-gold shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--gold)_28%,transparent)] hover:bg-gold/15'
            : 'text-soft-foreground hover:bg-foreground/5 hover:text-foreground data-[state=open]:bg-foreground/7 data-[state=open]:text-foreground',
          className,
        )}
      >
        {active && selected.icon ? (
          <span aria-hidden className="grid size-4 shrink-0 place-items-center">
            {selected.icon}
          </span>
        ) : (
          <Icon aria-hidden className={cn('size-4 shrink-0', !active && 'text-muted-foreground')} />
        )}
        <span dir="auto" className="min-w-0 truncate">
          {active ? selected.label : label}
        </span>
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 opacity-60 transition-transform duration-300 ease-out-expo group-data-[state=open]/picker:rotate-180"
        />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          onOpenAutoFocus={(event) => {
            if (coarsePointer.matches) {
              event.preventDefault();
            }
          }}
          className={cn(
            'facet-picker z-50 w-[min(19rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-float outline-none',
            'origin-(--radix-popover-content-transform-origin) data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}
        >
          <Command label={label} filter={matches} defaultValue={value ?? ANY} loop>
            <div className="flex items-center gap-2.5 border-b border-border-subtle px-3.5">
              <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                placeholder={searchPlaceholder}
                dir={i18n.dir()}
                className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint-foreground sm:text-sm"
              />
            </div>

            <Command.List className="max-h-[min(20rem,calc(var(--radix-popover-content-available-height)-7rem))] scroll-py-1.5 overflow-y-auto overscroll-contain p-1.5">
              {loading ? (
                <Command.Loading>
                  <span className="grid h-24 place-items-center">
                    <PulsatingDots />
                  </span>
                </Command.Loading>
              ) : (
                <>
                  <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</Command.Empty>
                  <Command.Item value={ANY} keywords={[anyLabel]} onSelect={() => choose(null)} className={itemClass}>
                    <span aria-hidden className="grid size-5 shrink-0 place-items-center">
                      <span className="size-3 rounded-[0.25rem] bg-kente-conic opacity-80" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{anyLabel}</span>
                    <Check aria-hidden className={cn('size-4 shrink-0 text-gold', value === null ? 'opacity-100' : 'opacity-0')} />
                  </Command.Item>
                  {sections.map(({ group, items }) =>
                    items.length === 0 ? null : (
                      <Command.Group key={group ?? 'all'} heading={group}>
                        {items.map((option) => (
                          <Command.Item
                            key={option.value}
                            value={option.value}
                            keywords={option.keywords ?? [option.label]}
                            onSelect={() => choose(option.value)}
                            className={cn(itemClass, option.value === value && 'font-semibold text-foreground')}
                          >
                            <span aria-hidden className="grid size-5 shrink-0 place-items-center">
                              {option.icon}
                            </span>
                            <span dir="auto" className="min-w-0 flex-1 truncate text-start">
                              {option.label}
                            </span>
                            {option.count !== undefined && (
                              <span className="font-mono text-xs text-muted-foreground tabular-nums">{option.count}</span>
                            )}
                            <Check aria-hidden className={cn('size-4 shrink-0 text-gold', option.value === value ? 'opacity-100' : 'opacity-0')} />
                          </Command.Item>
                        ))}
                      </Command.Group>
                    ),
                  )}
                </>
              )}
            </Command.List>

            {hint && <p className="border-t border-border-subtle px-3.5 py-2.5 text-xs text-muted-foreground">{hint}</p>}
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
