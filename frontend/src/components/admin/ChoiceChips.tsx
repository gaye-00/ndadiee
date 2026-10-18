import { m } from 'motion/react';
import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

const slide = { type: 'spring', stiffness: 420, damping: 36 } as const;

interface ChoiceChipsProps<T extends string> {
  /** Ce que l'on choisit, pour un lecteur d'écran (« État du compte ») */
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  /** Identifiant de l'animation de la pastille : unique dans la page */
  layoutId: string;
}

/**
 * Un choix parmi quelques-uns, en pastilles : la pastille du choix glisse de l'un à l'autre. Au clavier, un seul
 * arrêt de tabulation, et les flèches changent de choix (comme les ordres du forum).
 */
export default function ChoiceChips<T extends string>({ label, options, value, onChange, layoutId }: ChoiceChipsProps<T>) {
  const group = useRef<HTMLDivElement>(null);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let step = keys[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    // En arabe, la flèche de droite recule
    if (getComputedStyle(event.currentTarget).direction === 'rtl' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      step = -step;
    }
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    requestAnimationFrame(() => group.current?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus());
  }

  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="inline-flex w-fit max-w-full flex-wrap gap-1 rounded-[0.875rem] border border-glass-border bg-glass p-1"
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            data-value={option.value}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative h-8 rounded-[0.625rem] px-3 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
              checked ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {checked && (
              <m.span layoutId={layoutId} transition={slide} className="absolute inset-0 rounded-[0.625rem] bg-foreground/10 ring-1 ring-foreground/8 ring-inset" />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
