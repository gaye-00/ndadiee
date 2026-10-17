import { Moon, Sun } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/hooks/useTheme';
import { revealTheme } from '@/lib/themeReveal';
import { cn } from '@/lib/utils';

/**
 * Thème clair ou sombre, d'un clic : la nouvelle palette s'ouvre en cercle depuis le bouton, comme avec
 * la corde de l'accueil (lib/themeReveal.ts). Le choix « comme l'appareil » reste dans le pied de page.
 */
export default function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const dark = resolvedTheme === 'dark';

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    revealTheme(dark ? 'light' : 'dark', { x: box.left + box.width / 2, y: box.top + box.height / 2 }, !reducedMotion);
  }

  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label={t('theme.darkTheme')}
      title={t('theme.darkTheme')}
      onClick={toggle}
      className={cn(
        'relative grid size-9 place-items-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70',
        className,
      )}
    >
      {/* Le soleil se couche quand la lune se lève */}
      <Sun
        aria-hidden
        className={cn('absolute size-4 transition-[rotate,scale,opacity] duration-500 ease-out-expo', dark ? 'scale-50 -rotate-90 opacity-0' : 'opacity-100')}
      />
      <Moon
        aria-hidden
        className={cn('absolute size-4 transition-[rotate,scale,opacity] duration-500 ease-out-expo', dark ? 'opacity-100' : 'scale-50 rotate-90 opacity-0')}
      />
    </button>
  );
}
