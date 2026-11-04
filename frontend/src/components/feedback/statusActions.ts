import { cn } from '@/lib/utils';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** L'action principale d'une page d'état */
export const statusPrimaryAction = cn(
  'inline-flex h-12 items-center justify-center gap-2.5 rounded-[0.875rem] bg-kente-warm px-5 text-[0.9375rem] font-bold text-kente-night',
  'shadow-[0_12px_28px_-14px_var(--kente-coral)] transition-[translate,box-shadow] duration-300 hover:-translate-y-px',
  focusRing,
);

/** Son action de repli */
export const statusSecondaryAction = cn(
  'inline-flex h-12 items-center justify-center gap-2.5 rounded-[0.875rem] border border-border-strong px-5 text-[0.9375rem] font-bold text-foreground',
  'transition-colors hover:bg-foreground/5',
  focusRing,
);
