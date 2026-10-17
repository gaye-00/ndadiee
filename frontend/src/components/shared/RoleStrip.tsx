import { ChevronLeft, ChevronRight } from 'lucide-react';
import { m } from 'motion/react';
import { ToggleGroup } from 'radix-ui';
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { KenteThread } from '@/config/roles';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

// La pastille du choix prend sa couleur : celle du premier fil de son motif
const CHIP_ACCENTS: Record<KenteThread, string> = {
  gold: 'var(--kente-gold)',
  coral: 'var(--kente-coral)',
  jade: 'var(--kente-jade)',
};

// La pastille glisse d'un rôle à l'autre, comme celle de la page en cours dans la navigation
const slide = { type: 'spring', stiffness: 420, damping: 36 } as const;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/** Une pastille de la bande : « Tous », un état (« Qui recrutent ») ou un rôle du catalogue */
export interface RoleStripChip {
  value: string;
  label: string;
  /** Résultats que donnerait ce choix ; absent tant que les facettes chargent */
  count?: number;
  accent: KenteThread;
  icon: ReactNode;
  /** Aucun résultat avec les autres filtres : il resterait une liste vide */
  disabled?: boolean;
}

interface RoleStripProps {
  /** Nom de la bande (« Rôle recherché ») */
  label: string;
  chips: readonly RoleStripChip[];
  value: string;
  onChange: (value: string) => void;
  /** Les nombres sont ceux des filtres d'avant, le temps que les nouveaux arrivent */
  stale: boolean;
  /** Ce que donne un choix, pour un lecteur d'écran (« 3 projets ») */
  countLabel: (count: number) => string;
  /** Titre d'une pastille qu'on ne peut pas choisir (« Aucun projet avec les autres filtres ») */
  unavailableLabel: string;
  /** Identifiant de la pastille qui glisse d'un choix à l'autre : un par page */
  layoutId: string;
}

/**
 * La rangée des rôles d'une page à filtrer (vitrine, annonces), une bande comme celle de l'accueil : les
 * métiers du catalogue, dans le même ordre, avec leur motif tissé et le nombre de résultats. Un seul choix ;
 * les flèches du clavier passent d'un rôle à l'autre. La bande défile au doigt, à la molette ou avec ses deux
 * boutons ; ses bords s'effacent là où d'autres rôles attendent, et le rôle choisi (par un lien, par
 * Précédent) y est amené.
 */
export default function RoleStrip({ label, chips, value, onChange, stale, countLabel, unavailableLabel, layoutId }: RoleStripProps) {
  const { t } = useTranslation();
  const labelId = useId();
  const strip = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // D'autres rôles attendent-ils avant, après ? (début et fin suivent le sens de lecture)
  const [more, setMore] = useState({ start: false, end: false });

  useEffect(() => {
    const row = strip.current;
    if (!row) {
      return;
    }
    const measure = () => {
      // En arabe, scrollLeft va de 0 à un nombre négatif
      const travelled = Math.abs(row.scrollLeft);
      const room = row.scrollWidth - row.clientWidth;
      const next = { start: travelled > 1, end: travelled < room - 1 };
      setMore((current) => (current.start === next.start && current.end === next.end ? current : next));
    };
    measure();
    row.addEventListener('scroll', measure, { passive: true });
    // Les pastilles changent de largeur quand leurs nombres arrivent, ou avec la langue
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    Array.from(row.children).forEach((chip) => observer.observe(chip));
    return () => {
      row.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, []);

  // Le rôle choisi est amené dans la bande, sans bouger la page
  useEffect(() => {
    const row = strip.current;
    const chip = row?.querySelector<HTMLElement>('[data-state="on"]');
    if (!row || !chip || row.scrollWidth <= row.clientWidth + 1) {
      return;
    }
    const box = row.getBoundingClientRect();
    const rect = chip.getBoundingClientRect();
    const margin = 56;
    const delta =
      rect.left < box.left + margin ? rect.left - box.left - margin : rect.right > box.right - margin ? rect.right - box.right + margin : 0;
    if (delta !== 0) {
      row.scrollBy({ left: delta, behavior: reduced ? 'auto' : 'smooth' });
    }
  }, [value, reduced]);

  // Une page de rôles vers le début ou vers la fin, dans le sens de lecture
  function page(toward: 'start' | 'end') {
    const row = strip.current;
    if (!row) {
      return;
    }
    const rtl = getComputedStyle(row).direction === 'rtl';
    const step = row.clientWidth * 0.75 * (toward === 'end' ? 1 : -1) * (rtl ? -1 : 1);
    row.scrollBy({ left: step, behavior: reduced ? 'auto' : 'smooth' });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <p id={labelId} className="eyebrow">
          {label}
        </p>
        {/* À la souris ; au doigt, la bande se fait glisser */}
        {(more.start || more.end) && (
          <div className="hidden shrink-0 items-center gap-2 pointer-fine:flex">
            <StripButton label={t('filters.previousRoles')} disabled={!more.start} onClick={() => page('start')}>
              <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
            </StripButton>
            <StripButton label={t('filters.nextRoles')} disabled={!more.end} onClick={() => page('end')}>
              <ChevronRight aria-hidden className="size-4 rtl:-scale-x-100" />
            </StripButton>
          </div>
        )}
      </div>
      <ToggleGroup.Root
        type="single"
        value={value}
        // Un second clic sur le rôle choisi ne laisse pas la rangée sans choix
        onValueChange={(next) => next && onChange(next)}
        aria-labelledby={labelId}
        asChild
      >
        <m.div
          ref={strip}
          layoutScroll
          data-stale={stale || undefined}
          data-more-start={more.start || undefined}
          data-more-end={more.end || undefined}
          // Pleine largeur sur téléphone et tablette ; ailleurs, un peu d'air sur les bords pour l'anneau du focus
          className="role-strip group/strip -mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pt-1 pb-2.5 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-1.5 lg:px-1.5"
        >
          {chips.map((chip) => (
            <RoleChip
              key={chip.value}
              chip={chip}
              selected={chip.value === value}
              // Le choix en cours reste toujours possible : on doit pouvoir le voir, et en sortir
              disabled={chip.disabled === true && chip.value !== value}
              countLabel={countLabel}
              unavailableLabel={unavailableLabel}
              layoutId={layoutId}
            />
          ))}
        </m.div>
      </ToggleGroup.Root>
    </div>
  );
}

/** Bouton rond qui fait défiler la bande des rôles, comme celui qui met en pause la bande de l'accueil */
function StripButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      // La bande se parcourt aussi au clavier : ces boutons n'ajoutent pas d'étape à la tabulation
      tabIndex={-1}
      className={cn(
        'grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-[color,border-color,opacity] duration-300',
        'hover:border-border-strong hover:text-foreground disabled:pointer-events-none disabled:opacity-35',
        focusRing,
      )}
    >
      {children}
    </button>
  );
}

interface RoleChipProps {
  chip: RoleStripChip;
  selected: boolean;
  disabled: boolean;
  countLabel: (count: number) => string;
  unavailableLabel: string;
  layoutId: string;
}

function RoleChip({ chip, selected, disabled, countLabel, unavailableLabel, layoutId }: RoleChipProps) {
  const { value, label, count, accent, icon } = chip;

  return (
    <ToggleGroup.Item
      value={value}
      disabled={disabled}
      aria-label={count === undefined ? label : `${label} (${countLabel(count)})`}
      title={disabled ? unavailableLabel : undefined}
      style={{ '--chip-accent': CHIP_ACCENTS[accent] } as CSSProperties}
      className={cn(
        'group/role relative isolate inline-flex h-11 shrink-0 items-center gap-2.5 rounded-full border ps-3 pe-3.5 text-sm font-semibold whitespace-nowrap',
        'border-glass-border bg-glass text-soft-foreground transition-[border-color,color,opacity] duration-300',
        'hover:border-border-strong hover:text-foreground',
        'data-[state=on]:border-transparent data-[state=on]:text-foreground',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-glass-border disabled:hover:text-soft-foreground',
        focusRing,
      )}
    >
      {/* La pastille du choix : une seule dans la rangée, elle glisse vers le rôle choisi */}
      {selected && <m.span aria-hidden layoutId={layoutId} transition={slide} className="role-chip-on absolute inset-0 -z-10 rounded-full" />}
      <span
        aria-hidden
        className="grid min-w-4 place-items-center transition-transform duration-300 ease-out-expo group-hover/role:-translate-y-0.5 group-disabled/role:translate-y-0"
      >
        {icon}
      </span>
      {label}
      {count !== undefined && (
        <span
          aria-hidden
          className="font-mono text-xs text-muted-foreground tabular-nums transition-opacity duration-300 group-data-[state=on]/role:text-foreground/70 group-data-stale/strip:opacity-40"
        >
          {count}
        </span>
      )}
    </ToggleGroup.Item>
  );
}
