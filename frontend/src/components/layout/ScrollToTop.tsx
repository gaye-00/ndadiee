import { ArrowUp } from 'lucide-react';
import { m, useMotionValueEvent, useScroll } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

// Le bouton apparaît quand on a lu à peu près un écran
const AFTER_SCREENS = 0.9;

/**
 * Bouton pour remonter en haut de la page, en bas à droite (à gauche en arabe). Il arrive dès qu'on a
 * lu un écran ; son anneau se tisse au fil de la lecture, en or, rouge et vert.
 *
 * - Sur téléphone et tablette, il se tient au-dessus du dock, et descend quand le dock se range.
 * - Il s'efface quand la dernière ligne du pied de page, qui a son propre « Haut de page », est à l'écran.
 * - Au clavier, le focus repart lui aussi du haut de la page.
 */
export default function ScrollToTop() {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const { scrollY, scrollYProgress } = useScroll();
  const { hidden: dockHidden } = useHideOnScroll();
  const [past, setPast] = useState(() => window.scrollY > window.innerHeight * AFTER_SCREENS);
  const [footerEnd, setFooterEnd] = useState(false);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const next = y > window.innerHeight * AFTER_SCREENS;
    setPast((previous) => (previous === next ? previous : next));
  });

  // La dernière ligne du pied de page (layout/Footer.tsx) a déjà son lien vers le haut
  useEffect(() => {
    const end = document.getElementById('site-footer-end');
    if (!end) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setFooterEnd(entry.isIntersecting));
    observer.observe(end);
    return () => observer.disconnect();
  }, []);

  const visible = past && !footerEnd;

  function toTop() {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    document.getElementById('main')?.focus({ preventScroll: true });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      inert={!visible}
      aria-label={t('footer.scrollTop')}
      title={t('footer.scrollTop')}
      data-visible={visible || undefined}
      data-dock={!dockHidden || undefined}
      className={cn(
        'group/top fixed end-4 z-30 grid size-12 place-items-center rounded-full border border-glass-border bg-surface/85 text-foreground shadow-float backdrop-blur-xl saver:bg-surface',
        // Au-dessus du dock tant qu'il est là ; sur grand écran, pas de dock
        'bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+0.25rem)] data-dock:bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.25rem)]',
        'lg:end-6 lg:bottom-6 lg:data-dock:bottom-6',
        'pointer-events-none translate-y-3 scale-90 opacity-0 transition-[bottom,opacity,scale,translate] duration-500 ease-out-expo',
        'data-visible:pointer-events-auto data-visible:translate-y-0 data-visible:scale-100 data-visible:opacity-100',
        'outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring/70',
      )}
    >
      {/* L'anneau de lecture : le fil se tisse à mesure qu'on descend */}
      <svg viewBox="0 0 48 48" aria-hidden className="absolute inset-0 size-full -rotate-90 rtl:-scale-x-100">
        <defs>
          <linearGradient id="scroll-thread" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--kente-gold)' }} />
            <stop offset="0.55" style={{ stopColor: 'var(--kente-coral)' }} />
            <stop offset="1" style={{ stopColor: 'var(--kente-jade)' }} />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="2" />
        <m.circle
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke="url(#scroll-thread)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ pathLength: scrollYProgress }}
        />
      </svg>
      <ArrowUp aria-hidden className="relative size-4 transition-transform duration-300 group-hover/top:-translate-y-0.5" />
    </button>
  );
}
