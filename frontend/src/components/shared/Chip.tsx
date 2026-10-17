import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const TONES = {
  neutral: 'bg-foreground/8 text-soft-foreground',
  gold: 'border border-gold/25 bg-gold/12 text-gold',
  coral: 'border border-coral/25 bg-coral/12 text-coral',
  jade: 'border border-jade/25 bg-jade/12 text-jade',
} as const;

interface ChipProps {
  children: ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}

/** Pastille : technologie, statut ou étiquette, neutre ou teintée (or, rouge, vert). */
export default function Chip({ children, tone = 'neutral', className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-xs leading-5 font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
