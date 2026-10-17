import { AnimatePresence, m, useMotionValueEvent, useScroll } from 'motion/react';
import { PullCord } from 'pullcord';
import 'pullcord/pullcord.css';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/hooks/useTheme';
import { revealTheme } from '@/lib/themeReveal';
import { cn } from '@/lib/utils';
import { storage } from '@/utils/storage';

// La corde tombe du plafond une seule fois par visite, pas à chaque changement de page
let hasDropped = false;

/**
 * Corde suspendue en haut à droite de l'écran (à gauche en arabe) : on la tire pour passer du thème
 * sombre au thème clair, et inversement. La nouvelle palette s'ouvre en cercle depuis la boule, comme
 * une lampe qu'on allume. Un clic, Entrée ou Espace la tirent aussi.
 *
 * Bibliothèque pullcord, qui embarque tout Motion : chargée à part, par PublicLayout.
 */
export default function ThemePullCord() {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const container = useRef<HTMLDivElement>(null);
  const [noEntrance] = useState(hasDropped);
  const [showHint, setShowHint] = useState(() => !storage.getCordPulled());
  const atTop = useAtTop();

  useEffect(() => {
    hasDropped = true;
  }, []);

  function pull() {
    // Le cercle part de la boule, là où elle est en ce moment (elle se balance)
    const bead = container.current?.querySelector('.pullcord circle')?.getBoundingClientRect();
    const from = bead
      ? { x: bead.left + bead.width / 2, y: bead.top + bead.height / 2 }
      : { x: window.innerWidth, y: 0 };

    // Petit cran sous le doigt, comme une vraie tirette (téléphones Android)
    navigator.vibrate?.(12);
    revealTheme(resolvedTheme === 'dark' ? 'light' : 'dark', from, !reducedMotion);

    if (showHint) {
      storage.setCordPulled();
      setShowHint(false);
    }
  }

  return (
    <div
      ref={container}
      className={cn(
        // `contents` : la boîte disparaît, ses variables passent à la corde
        'contents',
        // Distance au bord de l'écran. Sur mobile, la corde passe derrière la barre de navigation
        '[--cord-inset:0.75rem] lg:[--cord-inset:clamp(1.5rem,5vw_-_1rem,4.5rem)]',
        '[--pullcord-right:var(--cord-inset)] rtl:[--pullcord-right:calc(100%_-_4rem_-_var(--cord-inset))]',
        '[--pullcord-z:30] [--pullcord-ink:color-mix(in_srgb,var(--foreground)_32%,transparent)]',
      )}
    >
      <PullCord
        className={cn('theme-cord', !atTop && 'theme-cord--away')}
        onPull={pull}
        pulled={resolvedTheme === 'light'}
        ariaLabel={t('theme.lightTheme')}
        noEntrance={noEntrance}
      />

      {/* Couleurs de la boule (styles/effects.css, « Corde du thème ») */}
      <svg aria-hidden width="0" height="0" className="absolute">
        <defs>
          <radialGradient id="theme-cord-bead" cx="38%" cy="32%" r="72%">
            <stop offset="0%" style={{ stopColor: 'var(--kente-paper)' }} />
            <stop offset="34%" style={{ stopColor: 'var(--kente-gold)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--kente-coral)' }} />
          </radialGradient>
          <filter id="theme-cord-shadow" x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" style={{ floodColor: 'var(--float-shadow)' }} />
          </filter>
          <filter id="theme-cord-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodOpacity="0.8" style={{ floodColor: 'var(--kente-gold)' }} />
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.5" style={{ floodColor: 'var(--kente-night)' }} />
          </filter>
        </defs>
      </svg>

      {/* Indication, sur grand écran, jusqu'à la première fois où la corde est tirée */}
      <AnimatePresence>
        {showHint && atTop && (
          <m.span
            aria-hidden
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { delay: noEntrance ? 0.3 : 1.6, duration: 0.6 } }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            className="eyebrow pointer-events-none fixed end-[calc(var(--cord-inset)+3.25rem)] top-42 z-30 hidden items-center gap-1.5 lg:flex"
          >
            {t('theme.pullHint')}
            <svg viewBox="0 0 28 14" className="h-3.5 w-7 rtl:-scale-x-100" aria-hidden>
              <path
                d="M2 10.5C8 3.5 17 3 25 8.5M25 8.5l-4.6.4M25 8.5l-1.6-4.3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </m.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/** La page est tout en haut : l'indication ne recouvre pas le contenu qui défile. */
function useAtTop(): boolean {
  const { scrollY } = useScroll();
  const [atTop, setAtTop] = useState(() => window.scrollY < 40);
  useMotionValueEvent(scrollY, 'change', (y) => setAtTop(y < 40));
  return atTop;
}
