import { m } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * Couture entre la page et le pied de page (d'après le séparateur « holographique » d'un autre projet,
 * passé aux couleurs du kente). Les bandes d'un kente sont cousues bord à bord : ici, un fil or, rouge et
 * vert, à petits points, se tire d'un bord à l'autre quand il arrive à l'écran ; une navette de lumière
 * le parcourt, et un nœud le tient à chaque bout. Décoratif. Effets : styles/effects.css, « Couture ».
 */
export default function HolographicSeparator({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('py-3', className)}>
      <div className="mx-auto max-w-page px-4 sm:px-6">
        <m.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
          className="relative h-0.5 w-full origin-left rtl:origin-right"
        >
          {/* Le fil, cousu à petits points */}
          <span className="seam-thread absolute inset-0" />
          {/* Sa lueur diffuse */}
          <span className="seam-glow absolute inset-x-0 -inset-y-2 opacity-50 blur-sm" />
          {/* La navette : une lumière qui parcourt le fil d'un bord à l'autre */}
          <span className="absolute inset-0 overflow-hidden">
            <span className="seam-shuttle absolute inset-0">
              <span className="seam-light absolute end-0 top-0 h-full w-20 blur-md" />
            </span>
          </span>
          {/* Les nœuds, aux deux bouts */}
          <span className="seam-knot absolute start-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-current text-kente-gold" />
          <span className="seam-knot seam-knot-end absolute end-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-current text-kente-jade" />
        </m.div>
      </div>
    </div>
  );
}
