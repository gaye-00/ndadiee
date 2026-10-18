import { Building2, Grid2x2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SkylineView } from './KenteSkyline';
import { cn } from '@/lib/utils';

// Couleurs de la légende : les mêmes que la scène (kenteSkylineEngine.ts, retheme)
const EMPTY = 'color-mix(in srgb, var(--foreground) 8%, var(--background))';
const SWATCHES = [
  EMPTY,
  `color-mix(in srgb, var(--kente-jade) 50%, ${EMPTY})`,
  'var(--kente-jade)',
  'var(--kente-gold)',
  'var(--kente-coral)',
];
const LEVELS = ['level0', 'level1', 'level2', 'level3', 'level4'] as const;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/** Pagne (l'année à plat) ou ville (l'année en 3D) : le choix de vue d'une année tissée (KenteSkyline). */
export function SkylineViewToggle({ view, onChange }: { view: SkylineView; onChange: (view: SkylineView) => void }) {
  const { t } = useTranslation();

  return (
    <div role="group" aria-label={t('contributions.viewLabel')} className="relative inline-flex shrink-0 rounded-full border border-border p-0.5">
      <span
        aria-hidden
        data-view={view}
        className="absolute inset-y-0.5 start-0.5 w-9 rounded-full bg-foreground transition-transform duration-500 ease-out-expo data-[view=city]:translate-x-full rtl:data-[view=city]:-translate-x-full"
      />
      {(['cloth', 'city'] as const).map((option) => {
        const Icon = option === 'cloth' ? Grid2x2 : Building2;
        const name = t(option === 'cloth' ? 'contributions.viewCloth' : 'contributions.viewCity');
        return (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            aria-label={name}
            title={name}
            onClick={() => onChange(option)}
            className={cn(
              'relative z-10 grid h-8 w-9 place-items-center rounded-full transition-colors duration-300',
              view === option ? 'text-background' : 'text-muted-foreground hover:text-foreground',
              focusRing,
            )}
          >
            <Icon aria-hidden className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

/**
 * La légende d'une année tissée, du jour sans contribution au plus chargé. Survoler ou choisir un niveau
 * l'éclaire dans la scène (les autres jours s'estompent) ; -1 pour aucun.
 */
export function SkylineLegend({ level, onLevel }: { level: number; onLevel: (level: number) => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1.5" onMouseLeave={() => onLevel(-1)}>
      <span>{t('contributions.less')}</span>
      {SWATCHES.map((background, index) => (
        <button
          key={index}
          type="button"
          aria-label={t(`contributions.${LEVELS[index]}`)}
          aria-pressed={level === index}
          title={t(`contributions.${LEVELS[index]}`)}
          onMouseEnter={() => onLevel(index)}
          onFocus={() => onLevel(index)}
          onBlur={() => onLevel(-1)}
          onClick={() => onLevel(level === index ? -1 : index)}
          className={cn('size-3 rounded-[3px] ring-1 ring-foreground/10 transition-transform hover:scale-125', focusRing)}
          style={{ background }}
        />
      ))}
      <span>{t('contributions.more')}</span>
    </div>
  );
}
