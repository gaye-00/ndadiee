import { cn } from '@/lib/utils';

// Les deux palettes en dur : l'aperçu montre l'autre thème quel que soit celui de la page
const PALETTES = {
  light: { page: '#f5f5f2', card: '#ffffff', line: 'rgb(13 15 22 / 0.12)', strong: 'rgb(13 15 22 / 0.55)', rail: 'rgb(13 15 22 / 0.05)' },
  dark: { page: '#07080d', card: '#151821', line: 'rgb(255 255 255 / 0.1)', strong: 'rgb(242 243 247 / 0.7)', rail: 'rgb(255 255 255 / 0.04)' },
} as const;

/** Un écran de l'application en miniature, dans une palette : rail, titre, deux cartes, un bouton */
function Screen({ palette, className }: { palette: keyof typeof PALETTES; className?: string }) {
  const colors = PALETTES[palette];

  return (
    <div aria-hidden className={cn('absolute inset-0 flex', className)} style={{ backgroundColor: colors.page }}>
      <div className="flex w-[18%] flex-col items-center gap-1.5 pt-2.5" style={{ backgroundColor: colors.rail }}>
        <span className="size-2.5 rounded-[3px] bg-kente-conic" />
        <span className="mt-1 h-1 w-2.5 rounded-full" style={{ backgroundColor: colors.line }} />
        <span className="h-1 w-2.5 rounded-full" style={{ backgroundColor: colors.line }} />
        <span className="h-1 w-2.5 rounded-full" style={{ backgroundColor: colors.line }} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <span className="h-1.5 w-3/5 rounded-full" style={{ backgroundColor: colors.strong }} />
        <span className="h-1 w-2/5 rounded-full" style={{ backgroundColor: colors.line }} />
        <div className="mt-1 grid flex-1 grid-cols-2 gap-1.5">
          {[0, 1].map((card) => (
            <div
              key={card}
              className="flex flex-col gap-1 rounded-[5px] p-1.5 transition-transform duration-500 ease-out-expo group-hover/theme:-translate-y-0.5"
              style={{ backgroundColor: colors.card, boxShadow: `inset 0 0 0 1px ${colors.line}`, transitionDelay: `${card * 60}ms` }}
            >
              <span className={cn('h-1 rounded-full', card === 0 ? 'w-3/4 bg-kente-gold' : 'w-2/3 bg-kente-jade')} />
              <span className="h-1 w-full rounded-full" style={{ backgroundColor: colors.line }} />
              <span className="h-1 w-1/2 rounded-full" style={{ backgroundColor: colors.line }} />
            </div>
          ))}
        </div>
        <span className="h-2 w-8 self-end rounded-full bg-kente-warm" />
      </div>
    </div>
  );
}

/**
 * L'aperçu d'un thème sur sa carte : l'application en miniature, claire ou sombre ; « comme l'appareil » montre
 * les deux, coupées en biais.
 */
export default function ThemePreview({ theme }: { theme: 'light' | 'dark' | 'system' }) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl">
      {theme === 'system' ? (
        <>
          <Screen palette="light" />
          <Screen palette="dark" className="[clip-path:polygon(58%_0,100%_0,100%_100%,42%_100%)]" />
        </>
      ) : (
        <Screen palette={theme} />
      )}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-foreground/10 ring-inset" />
    </div>
  );
}
