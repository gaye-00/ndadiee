import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isApple } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { useCommandPaletteStore } from '@/store/useCommandPaletteStore';

/**
 * Faux champ « Tout rechercher · Ctrl K » qui ouvre la palette de recherche. Design 3B.
 * Sur téléphone, la loupe seule.
 */
export default function SearchTrigger({ className }: { className?: string }) {
  const { t } = useTranslation();
  const setOpen = useCommandPaletteStore((s) => s.setOpen);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t('search.placeholder')}
      aria-keyshortcuts="Control+K Meta+K"
      className={cn(
        'group/search relative flex h-10 items-center gap-2.5 rounded-xl text-sm text-muted-foreground transition-[border-color,background-color,color,box-shadow] duration-300',
        'max-md:w-10 max-md:justify-center max-md:rounded-full max-md:hover:bg-foreground/7 max-md:hover:text-foreground',
        'md:w-56 md:border md:border-border md:bg-foreground/[0.03] md:ps-3 md:pe-2 lg:w-72',
        'md:hover:border-gold/40 md:hover:text-soft-foreground md:hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--kente-gold)_8%,transparent)]',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
        className,
      )}
    >
      <Search
        aria-hidden
        className="size-4.5 shrink-0 transition-transform duration-300 ease-out-expo group-hover/search:-rotate-12 md:size-4"
      />
      <span className="hidden flex-1 truncate text-start md:block">{t('search.placeholder')}</span>
      <kbd
        aria-hidden
        className="hidden h-6 items-center rounded-md border border-border-strong px-1.5 font-mono text-[0.6875rem] text-muted-foreground transition-colors duration-300 group-hover/search:border-gold/50 group-hover/search:text-gold md:inline-flex"
      >
        {isApple ? '⌘ K' : t('search.shortcut')}
      </kbd>
    </button>
  );
}
