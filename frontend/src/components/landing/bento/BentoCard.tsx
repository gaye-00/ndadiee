import { m } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import type { KenteThread } from '@/config/roles';
import { cn } from '@/lib/utils';

// Les teintes prennent la couleur de marque ; le texte, sa variante lisible dans les deux thèmes
const TINTS: Record<KenteThread, string> = {
  gold: 'var(--kente-gold)',
  coral: 'var(--kente-coral)',
  jade: 'var(--kente-jade)',
};
const INKS: Record<KenteThread, string> = {
  gold: 'var(--gold)',
  coral: 'var(--coral)',
  jade: 'var(--jade)',
};

interface BentoCardProps {
  /** Rang de l'usage, de 1 à 5 : « 01 · Se rencontrer » */
  step: number;
  accent: KenteThread;
  eyebrow: string;
  title: string;
  text: string;
  /** La démo sous le texte (par défaut), ou à côté sur grand écran */
  layout?: 'stacked' | 'aside';
  /** Sous le texte : un lien, un réglage */
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Une carte du bento de l'accueil : teintée de sa couleur (design 3A), avec sa démo. La lampe de la
 * grille l'éclaire, bords compris (landing/FeatureBento.tsx, styles/effects.css « Usages »).
 */
export default function BentoCard({ step, accent, eyebrow, title, text, layout = 'stacked', footer, className, children }: BentoCardProps) {
  const id = `feature-${step}`;

  return (
    <m.article
      data-bento-card
      aria-labelledby={id}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: (step % 2) * 0.08 }}
      style={{ '--card-tint': TINTS[accent], '--card-ink': INKS[accent] } as CSSProperties}
      className={cn(
        'bento-card relative isolate flex flex-col gap-6 overflow-hidden rounded-2xl p-5 sm:p-7',
        layout === 'aside' && 'lg:flex-row lg:gap-10',
        className,
      )}
    >
      <span aria-hidden className="bento-lamp pointer-events-none absolute inset-0 -z-10" />

      <header className={cn('relative flex flex-col', layout === 'aside' && 'lg:w-[17.5rem] lg:shrink-0')}>
        <p className="font-mono text-xs tracking-[0.08em] text-(--card-ink) uppercase">
          <span className="tabular-nums">{String(step).padStart(2, '0')}</span>
          <span aria-hidden> · </span>
          <span className="sr-only">. </span>
          {eyebrow}
        </p>
        <h3 id={id} className="mt-3 font-display text-[1.375rem] leading-tight font-bold tracking-[-0.01em]">
          {title}
        </h3>
        <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">{text}</p>
        {footer && <div className="mt-auto pt-6">{footer}</div>}
      </header>

      <div className="relative flex min-w-0 flex-1 flex-col">{children}</div>

      <span aria-hidden className="bento-rim pointer-events-none absolute inset-0 rounded-[inherit]" />
    </m.article>
  );
}
