import type { LucideIcon } from 'lucide-react';
import { m } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { KenteThread } from '@/config/roles';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/formatters';

const TONES: Record<KenteThread, { icon: string; thread: string }> = {
  gold: { icon: 'bg-gold/12 text-gold ring-gold/20', thread: 'from-kente-gold' },
  coral: { icon: 'bg-coral/12 text-coral ring-coral/20', thread: 'from-kente-coral' },
  jade: { icon: 'bg-jade/12 text-jade ring-jade/20', thread: 'from-kente-jade' },
};

// Durée du décompte, quand la tuile entre à l'écran
const COUNT_MS = 1100;

/**
 * Le chiffre se compte jusqu'à sa valeur quand il paraît à l'écran, puis d'une valeur à l'autre s'il change ; sans
 * animations, il est là tout de suite.
 */
function useCountUp(value: number, start: boolean, reduced: boolean): number {
  const [shown, setShown] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const from = latest.current;
    if (!start || reduced || from === value) {
      return undefined;
    }
    let frame = 0;
    const begin = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - begin) / COUNT_MS);
      // Décélération (ease-out-expo, comme les transitions de l'application)
      const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
      latest.current = Math.round(from + (value - from) * eased);
      setShown(latest.current);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, start, reduced]);

  return reduced ? value : shown;
}

interface StatTileProps {
  icon: LucideIcon;
  value: number;
  /** « projets lancés » : accordé au chiffre */
  label: string;
  /** Une précision sous le libellé (« sur 12 réponses ») */
  detail?: string;
  tone?: KenteThread;
  /** Rang de la tuile dans sa rangée : elles arrivent l'une après l'autre */
  index?: number;
  className?: string;
}

/**
 * Chiffre clé et son libellé (« 312 PR fusionnées »). À son arrivée à l'écran, le chiffre se compte ; au survol, un
 * fil kente de sa couleur se tisse sous la tuile.
 */
export default function StatTile({ icon: Icon, value, label, detail, tone = 'gold', index = 0, className }: StatTileProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const shown = useCountUp(value, seen, reduced);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setSeen(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className={cn('group/stat glass relative isolate overflow-hidden rounded-[1.375rem] p-5', className)}
    >
      <span aria-hidden className={cn('grid size-9 place-items-center rounded-xl ring-1 ring-inset', TONES[tone].icon)}>
        <Icon className="size-4.5" />
      </span>
      <p className="mt-4 flex flex-col">
        {/* Le chiffre final pour les lecteurs d'écran ; le décompte n'est qu'un effet */}
        <span aria-hidden className="font-display text-h3 tabular-nums">
          {formatNumber(shown)}
        </span>
        <span className="sr-only">{formatNumber(value)}</span>
        <span className="mt-1 text-sm font-semibold text-soft-foreground">{label}</span>
        {detail && <span className="mt-0.5 text-xs text-muted-foreground">{detail}</span>}
      </p>
      <span
        aria-hidden
        className={cn(
          'absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-linear-to-r to-transparent transition-transform duration-700 ease-out-expo group-hover/stat:scale-x-100 rtl:origin-right rtl:bg-linear-to-l',
          TONES[tone].thread,
        )}
      />
    </m.div>
  );
}
