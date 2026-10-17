import { ArrowDownWideNarrow, Check, ChevronDown, type LucideIcon } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/** Un ordre proposé */
export interface SortOption<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
  /** Une précision sous son nom (« Connecte-toi pour l'activer ») */
  hint?: string;
}

interface SortMenuProps<T extends string> {
  value: T;
  options: readonly SortOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/** L'ordre des résultats d'une page à filtrer (vitrine, annonces) : un bouton discret, puis la liste des ordres. */
export default function SortMenu<T extends string>({ value, options, onChange, className }: SortMenuProps<T>) {
  const { t } = useTranslation();
  const current = options.find((option) => option.value === value) ?? options[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`${t('filters.sort')} — ${current.label}`}
        className={cn(
          'group/sort inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold text-soft-foreground transition-colors',
          'hover:bg-foreground/6 hover:text-foreground data-[state=open]:bg-foreground/7 data-[state=open]:text-foreground',
          focusRing,
          className,
        )}
      >
        <ArrowDownWideNarrow aria-hidden className="size-4 text-muted-foreground" />
        {current.label}
        <ChevronDown
          aria-hidden
          className="size-4 opacity-60 transition-transform duration-300 ease-out-expo group-data-[state=open]/sort:rotate-180"
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            // À la largeur des ordres, 14 rem au moins
            'z-50 w-max max-w-[min(20rem,calc(100vw-1.5rem))] min-w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-float outline-none',
            'origin-(--radix-dropdown-menu-content-transform-origin) data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}
        >
          <DropdownMenu.Label className="eyebrow px-2.5 pt-1.5 pb-2">{t('filters.sort')}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={value} onValueChange={(next) => onChange(next as T)}>
            {options.map(({ value: option, label, icon: Icon, hint }) => (
              <DropdownMenu.RadioItem
                key={option}
                value={option}
                className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-soft-foreground outline-none select-none focus:bg-accent focus:text-foreground data-[state=checked]:font-semibold data-[state=checked]:text-foreground"
              >
                <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block">{label}</span>
                  {hint && <span className="block text-xs font-normal text-muted-foreground">{hint}</span>}
                </span>
                <DropdownMenu.ItemIndicator>
                  <Check aria-hidden className="size-4 text-gold" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
