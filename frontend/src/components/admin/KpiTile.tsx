import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/formatters';

const TONES = {
  gold: 'bg-gold/12 text-gold',
  coral: 'bg-coral/12 text-coral',
  jade: 'bg-jade/12 text-jade',
  muted: 'bg-foreground/6 text-muted-foreground',
} as const;

interface KpiTileProps {
  label: string;
  value: number;
  /** Une précision sous le chiffre (« +11 cette semaine ») */
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  /** La liste derrière le chiffre : la tuile y mène */
  to?: string;
}

/** Un chiffre clé du back-office : son libellé, le nombre, une précision. Menant à sa liste s'il en a une. */
export default function KpiTile({ label, value, hint, icon: Icon, tone = 'muted', to }: KpiTileProps) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-3">
        <span className="text-[0.8125rem] font-semibold text-soft-foreground">{label}</span>
        <span aria-hidden className={cn('grid size-8 shrink-0 place-items-center rounded-[0.625rem]', TONES[tone])}>
          <Icon className="size-4" />
        </span>
      </span>
      <span className="mt-3 block text-[2rem] leading-none font-bold tracking-tight">{formatNumber(value)}</span>
      {hint && <span className="mt-2 block font-mono text-[0.6875rem] text-muted-foreground">{hint}</span>}
    </>
  );
  const className = 'glass flex flex-col rounded-2xl p-4 sm:p-5';

  return to ? (
    <Link
      to={to}
      viewTransition
      className={cn(
        className,
        'transition-[translate,box-shadow,border-color] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-border-strong hover:shadow-float',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
