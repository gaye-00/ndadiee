import { Check, ChevronRight } from 'lucide-react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { progressOf, type ChecklistItem } from './projectDraft';
import { cn } from '@/lib/utils';

interface ChecklistProps {
  items: Array<{ item: ChecklistItem; done: boolean }>;
  /** Mène au champ d'une étape */
  onGoTo: (item: ChecklistItem) => void;
}

/**
 * « Prêt à 70 % » : ce qui rend un projet attirant dans la vitrine (une accroche qui dit quelque chose, une couverture,
 * des captures, un récit, un lien), coché au fil de l'écriture. Chaque étape restante mène à son champ. Rien n'y est
 * obligatoire : le nom et la description suffisent pour publier.
 */
export default function Checklist({ items, onGoTo }: ChecklistProps) {
  const { t } = useTranslation('projectForm');
  const progress = progressOf(items);
  const percent = Math.round(progress * 100);

  return (
    <section aria-labelledby="checklist-title" className="glass rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <ProgressRing progress={progress} />
        <div className="min-w-0">
          <h2 id="checklist-title" className="font-sans text-sm font-bold text-foreground">
            {t(percent === 100 ? 'checklist.ready' : 'checklist.title', { percent })}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t(percent === 100 ? 'checklist.readyText' : 'checklist.text')}</p>
        </div>
      </div>
      <ul className="mt-4 flex flex-col">
        {items.map(({ item, done }) => (
          <li key={item}>
            <button
              type="button"
              onClick={() => onGoTo(item)}
              className="group/step flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start outline-none transition-colors hover:bg-foreground/4 focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <span
                aria-hidden
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full border transition-[background-color,border-color] duration-300',
                  done ? 'border-jade bg-jade text-kente-night' : 'border-border-strong',
                )}
              >
                {done && (
                  <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 24 }}>
                    <Check className="size-3" strokeWidth={3.5} />
                  </m.span>
                )}
              </span>
              <span className={cn('min-w-0 flex-1 text-[0.8125rem]', done ? 'text-muted-foreground line-through decoration-foreground/25' : 'font-semibold text-soft-foreground group-hover/step:text-foreground')}>
                {t(`checklist.items.${item}`)}
                <span className="sr-only">{` · ${t(done ? 'checklist.done' : 'checklist.todo')}`}</span>
              </span>
              {!done && <ChevronRight aria-hidden className="size-3.5 shrink-0 text-faint-foreground transition-transform group-hover/step:translate-x-0.5 rtl:-scale-x-100" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** L'anneau d'avancement, tissé aux trois couleurs du kente, et le pourcentage au centre */
export function ProgressRing({ progress, size = 'md' }: { progress: number; size?: 'sm' | 'md' }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.round(progress * 100);

  return (
    <span className={cn('relative grid shrink-0 place-items-center', size === 'md' ? 'size-14' : 'size-10')}>
      <svg viewBox="0 0 48 48" aria-hidden className="absolute inset-0 size-full -rotate-90">
        <defs>
          <linearGradient id="checklist-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--kente-gold)" />
            <stop offset="55%" stopColor="var(--kente-coral)" />
            <stop offset="100%" stopColor="var(--kente-jade)" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={percent === 100 ? 'var(--jade)' : 'url(#checklist-ring)'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="transition-[stroke-dashoffset] duration-700 ease-out-expo"
        />
      </svg>
      <span className={cn('font-mono font-semibold tabular-nums', size === 'md' ? 'text-sm' : 'text-[0.6875rem]')}>
        {percent}
        <span className="text-[0.6em] text-muted-foreground">%</span>
      </span>
    </span>
  );
}
