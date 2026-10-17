import { m } from 'motion/react';
import { useMemo, type CSSProperties } from 'react';
import { useNow } from '@/hooks/useNow';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { loomLayout, loomPosition, loomProgress, phaseOf } from '@/lib/hackathonTime';
import { cn } from '@/lib/utils';
import type { Hackathon } from '@/types/hackathon.types';

type Thread = 'gold' | 'coral' | 'jade';

// Largeurs des bandes, en parts : des bandes larges coupées de bandes fines, comme sur la maquette
// (3, 1, 2, 1, 3, 1)
const WIDTHS = [3, 1, 2, 1, 3, 1, 2, 4] as const;
const THREADS: readonly Thread[] = ['gold', 'coral', 'jade'];
// Parts tissées en tout : assez de bandes pour que l'étoffe se lise, pas assez pour qu'elle grésille
const CLOTH_LENGTH = 30;

/**
 * Les bandes de l'étoffe d'un hackathon, toujours les mêmes pour lui : tirées de son slug, comme un kente a
 * son motif. Deux bandes voisines n'ont jamais la même couleur.
 */
export function clothOf(slug: string): { thread: Thread; from: number; to: number }[] {
  let seed = [...slug].reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0, 7);
  const random = () => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    return seed / 2 ** 32;
  };

  const bands: { thread: Thread; width: number }[] = [];
  let length = 0;
  let previous = -1;
  while (length < CLOTH_LENGTH) {
    let thread = Math.floor(random() * THREADS.length);
    if (thread === previous) {
      thread = (thread + 1) % THREADS.length;
    }
    const width = WIDTHS[Math.floor(random() * WIDTHS.length)];
    bands.push({ thread: THREADS[thread], width });
    length += width;
    previous = thread;
  }

  let from = 0;
  return bands.map(({ thread, width }) => {
    const band = { thread, from, to: from + (width / length) * 100 };
    from = band.to;
    return band;
  });
}

/** L'étoffe en un dégradé à arrêts francs : une seule image de fond, rien à dessiner de plus. */
function clothGradient(slug: string): string {
  const stops = clothOf(slug).map(({ thread, from, to }) => `var(--loom-${thread}) ${from.toFixed(2)}% ${to.toFixed(2)}%`);
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

interface HackathonLoomProps {
  hackathon: Pick<Hackathon, 'slug' | 'createdAt' | 'registrationClosesAt' | 'startsAt' | 'endsAt' | 'registrationOpen' | 'schedule'>;
  /**
   * edge : lisière de 6 px en haut d'une carte, sans coins ; bar : bande de 14 px, les étapes marquées et
   * les temps forts du programme noués dessus
   */
  variant?: 'edge' | 'bar';
  className?: string;
}

/**
 * Le métier d'un hackathon : son étoffe se tisse à mesure que le temps passe, de l'annonce à la clôture des
 * inscriptions, jusqu'au coup d'envoi, puis pendant le hackathon (parts fixes, voir lib/hackathonTime.ts).
 * Ce qui reste à tisser n'est que la chaîne, quelques fils tendus ; la navette, une perle de lumière, marque
 * l'instant présent. À l'apparition, l'étoffe se tisse jusqu'à aujourd'hui. Décoratif : le statut est écrit
 * à côté. Effets : styles/effects.css, « Hackathons ».
 */
export default function HackathonLoom({ hackathon, variant = 'edge', className }: HackathonLoomProps) {
  const reduced = useReducedMotion();
  // À la minute : la bande avance d'un cheveu, inutile de la redessiner chaque seconde
  const now = useNow(60_000);
  const progress = loomProgress(hackathon, now);
  const phase = phaseOf(hackathon, now);
  const cloth = useMemo(() => clothGradient(hackathon.slug), [hackathon.slug]);
  const layout = loomLayout(hackathon);
  const woven = `${(progress * 100).toFixed(3)}%`;
  // Même forme au départ et à l'arrivée (« inset(0 N% 0 0) ») : Motion peut glisser de l'une à l'autre
  const cut = `inset(0 ${((1 - progress) * 100).toFixed(3)}% 0 0)`;
  const weave = { duration: reduced ? 0 : 1.4, ease: [0.16, 1, 0.3, 1] } as const;

  return (
    <div
      aria-hidden
      data-live={phase === 'live' ? '' : undefined}
      style={{ '--cloth': cloth } as CSSProperties}
      className={cn('hackathon-loom relative shrink-0', variant === 'edge' ? 'h-1.5' : 'h-3.5 rounded-full', className)}
    >
      <div className={cn('absolute inset-0 overflow-hidden', variant === 'bar' && 'rounded-full bg-foreground/4')}>
        {/* La chaîne : les fils pas encore tissés */}
        <span className="hackathon-loom-warp absolute inset-0" />
        {/* L'étoffe, coupée à l'instant présent */}
        <m.span
          className="hackathon-loom-cloth absolute inset-0 transition-[filter] duration-500 group-hover/card:brightness-110"
          initial={{ clipPath: reduced ? cut : 'inset(0 100% 0 0)' }}
          whileInView={{ clipPath: cut }}
          viewport={{ once: true, amount: 0.6 }}
          transition={weave}
        />
      </div>

      {variant === 'bar' && (
        <>
          {/* Les étapes : clôture des inscriptions, coup d'envoi */}
          {[layout.closes, layout.starts]
            .filter((at, index, all) => all.indexOf(at) === index)
            .map((at) => (
              <span key={at} className="absolute -inset-y-1 w-px bg-foreground/25" style={{ left: `${at * 100}%` }} />
            ))}
          {/* Les temps forts du programme, noués sur la bande */}
          {hackathon.schedule.map((milestone) => {
            const at = loomPosition(hackathon, milestone.scheduledAt);
            return (
              <span
                key={milestone.scheduledAt + milestone.label}
                className={cn(
                  'absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface',
                  at <= progress ? 'bg-kente-paper' : 'bg-foreground/35',
                )}
                style={{ left: `${at * 100}%` }}
              />
            );
          })}
        </>
      )}

      {/* La navette : l'instant présent. Plus de navette quand l'étoffe est finie. */}
      {phase !== 'ended' && (
        <m.span
          className={cn(
            'hackathon-loom-shuttle absolute top-1/2 transition-[scale] duration-500 ease-out-expo group-hover/card:scale-y-125',
            variant === 'edge' ? 'h-3.5 w-[3px]' : 'h-6 w-1',
          )}
          initial={{ left: reduced ? woven : '0%' }}
          whileInView={{ left: woven }}
          viewport={{ once: true, amount: 0.6 }}
          transition={weave}
        />
      )}
    </div>
  );
}
