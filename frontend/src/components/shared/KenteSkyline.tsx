import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KenteSkylineEngine, type SkylineView } from './kenteSkylineEngine';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { currentLanguage } from '@/i18n';
import { dayMs, type ContributionCell, type ContributionYear } from '@/lib/contributions';
import { cn } from '@/lib/utils';

export type { SkylineView };

interface KenteSkylineProps {
  year: ContributionYear;
  /** Identifie l'année affichée : quand il change, la nouvelle année se tisse bande par bande */
  yearKey: string;
  view: SkylineView;
  /** Niveau mis en avant depuis une légende (les autres jours s'estompent), -1 pour aucun */
  legendLevel?: number;
  /** Les données à tisser arrivent : le tissage attend au lieu de commencer par une autre année */
  pending?: boolean;
  /** Description de la scène pour les lecteurs d'écran */
  label: string;
  className?: string;
}

/** « 12 contributions » et « mardi 14 octobre 2026 », dans la langue de l'interface */
function useDescribeDay() {
  const { t } = useTranslation();
  const format = new Intl.DateTimeFormat(currentLanguage().intl as string[], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return (cell: ContributionCell) => ({
    count: cell.count > 0 ? t('contributions.count', { count: cell.count }) : t('contributions.none'),
    date: format.format(dayMs(cell.date)),
  });
}

/**
 * Une année de contributions tissée comme un kente (une bande par semaine, un bloc par jour), qui se
 * lève en ville en 3D. Survol ou toucher : le détail d'un jour ; flèches du clavier pour parcourir ;
 * en ville, glisser pour tourner autour, double-clic pour revenir. Dessin : kenteSkylineEngine.ts.
 */
export default function KenteSkyline({
  year,
  yearKey,
  view,
  legendLevel = -1,
  pending = false,
  label,
  className,
}: KenteSkylineProps) {
  const { i18n } = useTranslation();
  const describe = useDescribeDay();
  const reducedMotion = useReducedMotion();
  const reduced = useRef(reducedMotion);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const engine = useRef<KenteSkylineEngine | null>(null);
  const shownKey = useRef<string | null>(null);
  const [active, setActive] = useState(-1);
  const [announced, setAnnounced] = useState(-1);

  useEffect(() => {
    reduced.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    const instance = new KenteSkylineEngine(stageRef.current!, canvasRef.current!, tipRef.current!, {
      reducedMotion: () => reduced.current,
      locales: () => currentLanguage().intl,
      onActive: setActive,
      onAnnounce: setAnnounced,
    });
    engine.current = instance;
    return () => {
      instance.destroy();
      engine.current = null;
      shownKey.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.setHeld(pending);
  }, [pending]);

  useEffect(() => {
    // Une autre année que celle déjà montrée : elle se tisse sous les yeux
    engine.current?.setYear(year, shownKey.current !== null && shownKey.current !== yearKey);
    shownKey.current = yearKey;
  }, [year, yearKey]);

  useEffect(() => {
    engine.current?.setView(view);
  }, [view]);

  useEffect(() => {
    engine.current?.setLegendLevel(legendLevel);
  }, [legendLevel]);

  useEffect(() => {
    engine.current?.relabel();
  }, [i18n.resolvedLanguage]);

  // L'infobulle doit rester dans la scène : sa largeur change avec son texte
  useLayoutEffect(() => {
    if (tipRef.current && active >= 0) {
      engine.current?.setTipWidth(tipRef.current.offsetWidth);
    }
  }, [active, year]);

  const cell = active >= 0 ? year.cells[active] : undefined;
  const tip = cell ? describe(cell) : null;
  const spoken = announced >= 0 && year.cells[announced] ? describe(year.cells[announced]) : null;

  return (
    <div
      ref={stageRef}
      className={cn('relative w-full text-foreground', className)}
      // Hauteur proche de la finale avant le premier dessin : la page ne saute pas
      style={{ height: 'clamp(210px, calc(20vw + 40px), 440px)' }}
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label={label}
        // Le passé s'efface à gauche ; à droite, aujourd'hui reste net
        className="absolute inset-x-0 top-0 block rounded-xl outline-none [mask-image:linear-gradient(90deg,transparent,#000_7%)] focus-visible:ring-2 focus-visible:ring-ring/70"
        style={{ touchAction: view === 'city' ? 'pan-y' : 'auto' }}
      />

      <div
        ref={tipRef}
        role="tooltip"
        aria-hidden={!tip}
        className="pointer-events-none absolute top-0 left-0 z-20 rounded-lg bg-inverse px-2.5 py-1.5 text-xs whitespace-nowrap text-inverse-foreground shadow-float transition-opacity duration-150"
        style={{ opacity: tip ? 1 : 0 }}
      >
        {tip && (
          <>
            <strong className="font-semibold">{tip.count}</strong>
            <span className="opacity-75"> · {tip.date}</span>
          </>
        )}
        <span
          aria-hidden
          className="absolute top-full size-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-inverse"
          style={{ left: 'var(--arrow, 50%)', marginLeft: -5 }}
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {spoken ? `${spoken.count}, ${spoken.date}` : ''}
      </p>
    </div>
  );
}
