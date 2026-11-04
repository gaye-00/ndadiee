import { cn } from '@/lib/utils';

/** Le style d'un champ de saisie d'une ligne */
export const inputClass = (invalid?: boolean) =>
  cn(
    'h-12 w-full min-w-0 rounded-[0.875rem] border bg-surface/60 px-4 text-[0.9375rem] text-foreground transition-[border-color,box-shadow,background-color] duration-200',
    'placeholder:text-faint-foreground/80 outline-none hover:border-border-strong focus:border-gold/60 focus:bg-surface focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--gold)_14%,transparent)]',
    invalid ? 'border-coral/60' : 'border-border',
  );
