import type { CSSProperties } from 'react';
import type { KenteThread } from '@/config/roles';
import { cn } from '@/lib/utils';

/** Classes partagées par les composants de l'espace d'équipe. */

export const ease = [0.16, 1, 0.3, 1] as const;

export const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/** Le bouton principal : dégradé chaud du kente, reflet au survol (avec <Sheen />) */
export const primaryButton = cn(
  'group/primary relative isolate inline-flex h-10 shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-[0.875rem] bg-kente-warm px-3.5 text-sm font-bold whitespace-nowrap text-kente-night',
  'shadow-[0_10px_24px_-14px_var(--kente-coral)] transition-[translate,box-shadow,opacity] duration-300 ease-out-expo hover:-translate-y-px hover:shadow-[0_14px_30px_-12px_var(--kente-coral)] active:translate-y-0',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60',
);

/** Le bouton secondaire : contour, fond qui se teinte au survol */
export const outlineButton = cn(
  'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[0.875rem] border border-border-strong px-3.5 text-sm font-bold whitespace-nowrap text-foreground',
  'transition-colors duration-200 hover:bg-foreground/5 disabled:pointer-events-none disabled:opacity-60',
  focusRing,
);

/** Un bouton discret, sans contour (« Annuler ») */
export const ghostButton = cn(
  'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[0.875rem] px-3.5 text-sm font-bold text-muted-foreground transition-colors duration-200 hover:bg-foreground/6 hover:text-foreground',
  focusRing,
);

/** Un bouton-icône rond (fermer, menu) */
export const iconButton = cn(
  'grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-foreground/7 hover:text-foreground',
  focusRing,
);

/** Le menu d'un bouton (Radix DropdownMenu) et ses lignes */
export const menuContent = cn(
  'z-50 min-w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-float outline-none',
  'origin-(--radix-dropdown-menu-content-transform-origin) data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
);
export const menuItem =
  'flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-soft-foreground outline-none select-none focus:bg-accent focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

/** La fenêtre (Radix Dialog) : feuille en bas de l'écran sur téléphone, centrée ailleurs */
export const dialogOverlay =
  'fixed inset-0 z-50 bg-kente-night/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 saver:backdrop-blur-none';
export const dialogContent = (width: string) =>
  cn(
    'fixed inset-x-0 bottom-0 z-50 flex max-h-[94dvh] flex-col rounded-t-[1.75rem] border border-border bg-popover text-popover-foreground shadow-float outline-none',
    'pb-[env(safe-area-inset-bottom)] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-10',
    'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(90dvh,52rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:pb-0',
    'sm:data-[state=open]:slide-in-from-bottom-4 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95',
    width,
  );

/** Un champ de saisie, avec le fil d'or au focus des formulaires de la plateforme */
export const fieldClass = cn(
  'block w-full rounded-xl border border-input bg-surface px-3.5 text-base outline-none placeholder:text-faint-foreground/80 sm:text-[0.9375rem]',
  'transition-[border-color,box-shadow] duration-300 focus:border-gold/55 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--kente-gold)_14%,transparent)]',
  'aria-[invalid=true]:border-coral/60 aria-[invalid=true]:focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--kente-coral)_14%,transparent)]',
);

// Couleur de marque (aplats, fils) et couleur lisible (texte) de chaque fil du kente
const BRAND: Record<KenteThread, string> = { gold: 'var(--kente-gold)', coral: 'var(--kente-coral)', jade: 'var(--kente-jade)' };
const READABLE: Record<KenteThread, string> = { gold: 'var(--gold)', coral: 'var(--coral)', jade: 'var(--jade)' };

/** Les variables d'un fil (--thread, --thread-text), ou d'un gris neutre sans fil */
export function threadStyle(thread: KenteThread | null): CSSProperties {
  return thread
    ? ({ '--thread': BRAND[thread], '--thread-text': READABLE[thread] } as CSSProperties)
    : ({ '--thread': 'color-mix(in srgb, var(--foreground) 32%, transparent)', '--thread-text': 'var(--soft-foreground)' } as CSSProperties);
}
