import { useTranslation } from 'react-i18next';
import { useNow } from '@/hooks/useNow';
import { displayTimeZone, formatInZone, phaseOf } from '@/lib/hackathonTime';
import { cn } from '@/lib/utils';
import type { Hackathon } from '@/types/hackathon.types';
import { formatRelativeTime } from '@/utils/formatters';

// Moins de trois jours avant la clôture : on presse un peu
const LAST_CALL_MS = 3 * 86_400_000;

const TONES = {
  jade: { text: 'text-jade', dot: 'bg-jade', chip: 'border-jade/25 bg-jade/10' },
  coral: { text: 'text-coral', dot: 'bg-coral', chip: 'border-coral/25 bg-coral/10' },
  gold: { text: 'text-gold', dot: 'bg-gold', chip: 'border-gold/25 bg-gold/10' },
  muted: { text: 'text-muted-foreground', dot: 'bg-muted-foreground', chip: 'border-border bg-foreground/5' },
} as const;

interface HackathonPhaseBadgeProps {
  hackathon: Pick<Hackathon, 'format' | 'timezone' | 'createdAt' | 'registrationClosesAt' | 'startsAt' | 'endsAt' | 'registrationOpen'>;
  /** eyebrow : libellé mono en capitales (cartes) ; chip : pastille (en-tête d'un hackathon) */
  variant?: 'eyebrow' | 'chip';
  className?: string;
}

/**
 * Où en est un hackathon, en un coup d'œil : inscriptions ouvertes (vert) jusqu'à telle date, dernière ligne
 * droite (rouge), complet ou inscriptions closes (or), en direct (rouge, le point bat), terminé. Calculé à la
 * minute dans le navigateur : le libellé change de lui-même quand une échéance passe.
 */
export default function HackathonPhaseBadge({ hackathon, variant = 'eyebrow', className }: HackathonPhaseBadgeProps) {
  const { t } = useTranslation('hackathons');
  const now = useNow(60_000);
  const phase = phaseOf(hackathon, now);
  const { zone } = displayTimeZone(hackathon);

  const lastCall = phase === 'registration' && Date.parse(hackathon.registrationClosesAt) - now < LAST_CALL_MS;
  const { tone, text, beating } = (() => {
    switch (phase) {
      case 'registration':
        return lastCall
          ? { tone: 'coral', text: t('status.lastCall', { time: formatRelativeTime(hackathon.registrationClosesAt) }), beating: true }
          : {
              tone: 'jade',
              text: t('status.registration', { date: formatInZone('day', hackathon.registrationClosesAt, zone) }),
              beating: true,
            };
      case 'full':
        return { tone: 'gold', text: t('status.full'), beating: false };
      case 'closed':
        return { tone: 'gold', text: t('status.closed', { time: formatRelativeTime(hackathon.startsAt) }), beating: false };
      case 'live':
        return { tone: 'coral', text: t('status.live', { time: formatRelativeTime(hackathon.endsAt) }), beating: true };
      case 'ended':
        return { tone: 'muted', text: t('status.ended'), beating: false };
    }
  })() satisfies { tone: keyof typeof TONES; text: string; beating: boolean };
  const colors = TONES[tone];

  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-2',
        // Le style de l'utilitaire eyebrow, sans sa couleur : celle de l'étape la remplace
        variant === 'eyebrow'
          ? 'font-mono text-[0.6875rem] leading-4 tracking-[0.08em] uppercase'
          : 'rounded-full border px-2.5 py-0.5 text-xs leading-5 font-semibold',
        variant === 'chip' && colors.chip,
        colors.text,
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', colors.dot, beating && 'animate-pulse-dot')} />
      <span className="truncate">{text}</span>
    </span>
  );
}
