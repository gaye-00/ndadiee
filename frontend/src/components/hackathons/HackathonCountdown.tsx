import { AnimatePresence, m } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNow } from '@/hooks/useNow';
import { countdown } from '@/lib/hackathonTime';
import { cn } from '@/lib/utils';

interface HackathonCountdownProps {
  /** L'échéance (date ISO) */
  to: string;
  /** Ce que disent les lecteurs d'écran : l'échéance en toutes lettres (« Coup d'envoi le ven. 20 nov., 18:00 ») */
  label: string;
  /** Appelé une fois, quand l'échéance est atteinte (pour recharger le hackathon, qui change d'étape) */
  onDone?: () => void;
  size?: 'md' | 'lg';
  className?: string;
}

/**
 * Compte à rebours en jours, heures, minutes et secondes, comme sur l'affiche d'un hackathon. Chaque chiffre
 * qui change roule vers le haut ; tous les comptes de l'écran changent à la même seconde (hooks/useNow).
 * Les chiffres sont décoratifs pour les lecteurs d'écran, qui entendent l'échéance elle-même : un compte
 * qui parle chaque seconde serait insupportable.
 */
export default function HackathonCountdown({ to, label, onDone, size = 'md', className }: HackathonCountdownProps) {
  const { t } = useTranslation('hackathons');
  const now = useNow(1000);
  const left = countdown(to, now);

  // Une seule fois par échéance
  const signaled = useRef<string | null>(null);
  useEffect(() => {
    if (left.done && signaled.current !== to) {
      signaled.current = to;
      onDone?.();
    }
  }, [left.done, to, onDone]);

  const units = [
    { key: 'days', value: left.days, label: t('countdown.days', { count: left.days }) },
    { key: 'hours', value: left.hours, label: t('countdown.hours') },
    { key: 'minutes', value: left.minutes, label: t('countdown.minutes') },
    { key: 'seconds', value: left.seconds, label: t('countdown.seconds') },
  ];

  return (
    <div role="timer" aria-label={label} className={cn('grid grid-cols-4', size === 'lg' ? 'gap-2 sm:gap-2.5' : 'gap-1.5', className)}>
      {units.map((unit) => (
        <div
          key={unit.key}
          aria-hidden
          className={cn(
            'relative flex flex-col items-center overflow-hidden rounded-2xl border border-glass-border bg-foreground/[0.035] text-center',
            size === 'lg' ? 'gap-1 px-1 pt-3 pb-2.5 sm:pt-4 sm:pb-3' : 'gap-0.5 px-1 pt-2 pb-1.5',
          )}
        >
          {/* Le reflet d'une tuile d'affichage, en haut */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-foreground/[0.04] to-transparent" />
          <RollingNumber
            value={unit.value}
            digits={unit.key === 'days' ? Math.max(2, String(unit.value).length) : 2}
            className={cn(
              'font-display font-extrabold tracking-[-0.04em] text-foreground tabular-nums',
              size === 'lg' ? 'text-[2rem] sm:text-[2.625rem]' : 'text-[1.375rem]',
            )}
          />
          <span className={cn('font-mono tracking-[0.08em] text-muted-foreground uppercase', size === 'lg' ? 'text-[0.6875rem]' : 'text-[0.625rem]')}>
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Un nombre à chiffres fixes : chaque chiffre roule seul quand il change. */
function RollingNumber({ value, digits, className }: { value: number; digits: number; className?: string }) {
  const text = String(value).padStart(digits, '0');
  // Les chiffres se lisent de gauche à droite, même en arabe
  return (
    <span dir="ltr" className={cn('flex leading-none', className)}>
      {[...text].map((digit, index) => (
        <RollingDigit key={text.length - index} digit={digit} />
      ))}
    </span>
  );
}

function RollingDigit({ digit }: { digit: string }) {
  return (
    <span className="relative inline-block h-[1.08em] w-[0.66em] overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <m.span
          key={digit}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 grid place-items-center"
        >
          {digit}
        </m.span>
      </AnimatePresence>
    </span>
  );
}
