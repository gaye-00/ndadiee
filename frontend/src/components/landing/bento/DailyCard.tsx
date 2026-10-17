import { ArrowRight, Check, ImageOff, PauseCircle, WifiOff } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import { useDataSaverStore } from '@/store/useDataSaverStore';
import { formatDay, isolate } from '@/utils/formatters';
import BentoCard from './BentoCard';
import CrewAvatar from './CrewAvatar';

// La journée de Chinedu, mainteneur de lagos-transit (design 3B)
const REVIEWS = [
  { who: 'ama', number: 84, title: 'features.daily.review84', project: 'lagos-transit', added: 214, removed: 38 },
  { who: 'kwame', number: 12, title: 'features.daily.review12', project: 'naija-k8s-starter', added: 41, removed: 9 },
] as const;
const TASKS = ['features.daily.task1', 'features.daily.task2', 'features.daily.task3'] as const;
type TaskKey = (typeof TASKS)[number];

/**
 * 05 · Au quotidien. L'atelier du jour d'un membre : ses revues, ses tâches (qu'on coche ici), et le
 * mode économie de données, le vrai : l'activer allège tout le site, ce bento compris.
 */
export default function DailyCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [done, setDone] = useState<ReadonlySet<TaskKey>>(() => new Set());
  // Le jour de l'arrivée sur la page : il ne change pas à chaque rendu
  const [today] = useState(() => new Date());
  const left = TASKS.length - done.size;

  function toggle(task: TaskKey) {
    setDone((current) => {
      const next = new Set(current);
      if (!next.delete(task)) {
        next.add(task);
      }
      return next;
    });
  }

  const action = isAuthenticated
    ? { to: paths.dashboard, preload: pages.dashboard, label: t('features.daily.open') }
    : { to: paths.register, preload: pages.register, label: t('features.daily.create') };

  return (
    <BentoCard
      step={5}
      accent="jade"
      layout="aside"
      eyebrow={t('features.daily.eyebrow')}
      title={t('features.daily.title')}
      text={t('features.daily.text')}
      className={className}
      footer={
        <Link
          to={action.to}
          viewTransition
          onPointerEnter={() => prefetch(action.preload)}
          onFocus={() => prefetch(action.preload)}
          className="group/open inline-flex h-11 items-center gap-2 rounded-full border border-(--card-ink)/40 ps-5 pe-4 text-sm font-bold text-(--card-ink) transition-colors outline-none hover:bg-(--card-tint)/10 focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          {action.label}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover/open:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/open:-translate-x-0.5"
          />
        </Link>
      }
    >
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-glass-border bg-background/50 saver:bg-background">
        {/* L'en-tête du tableau de bord */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-glass-border px-4 py-3 sm:px-5">
          <p className="font-display text-lg font-bold">{t('features.daily.hello', { name: isolate('Chinedu') })}</p>
          <p className="text-xs text-faint-foreground first-letter:uppercase">{formatDay(today)}</p>
        </div>
        <p role="status" className="px-4 pt-3 text-sm text-muted-foreground sm:px-5">
          {left > 0 ? t('features.daily.summary', { count: left }) : t('features.daily.allDone')}
        </p>

        <div className="grid flex-1 gap-3 p-4 sm:px-5 md:grid-cols-2 xl:grid-cols-3">
          <Panel title={t('features.daily.reviews')} count={REVIEWS.length}>
            <ul className="space-y-2">
              {REVIEWS.map((review) => (
                <li key={review.number} className="flex items-start gap-2.5 rounded-lg bg-foreground/[0.035] p-2.5">
                  <CrewAvatar who={review.who} />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[0.8125rem] leading-snug font-semibold">
                      <span className="font-mono text-faint-foreground">#{review.number}</span> {t(review.title)}
                    </span>
                    <span className="mt-0.5 flex flex-wrap gap-x-1.5 text-[0.6875rem] text-muted-foreground">
                      <bdi>{review.project}</bdi>
                      <span dir="ltr" className="font-mono">
                        <span className="text-jade">+{review.added}</span> <span className="text-coral">−{review.removed}</span>
                      </span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title={t('features.daily.tasks')} count={left}>
            <ul className="space-y-1">
              {TASKS.map((task) => (
                <li key={task}>
                  <TaskCheck label={t(task)} checked={done.has(task)} onToggle={() => toggle(task)} />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title={t('dataSaver.label')} className="md:col-span-2 xl:col-span-1">
            <SaverSwitch />
          </Panel>
        </div>
      </div>
    </BentoCard>
  );
}

function Panel({ title, count, className, children }: { title: string; count?: number; className?: string; children: ReactNode }) {
  return (
    <section className={cn('flex flex-col rounded-xl border border-glass-border bg-surface/70 p-3.5 saver:bg-surface', className)}>
      <h4 className="mb-3 flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.06em] text-faint-foreground uppercase">
        {title}
        {count !== undefined && (
          <span className="rounded-full bg-foreground/8 px-1.5 text-soft-foreground tabular-nums">{count}</span>
        )}
      </h4>
      {children}
    </section>
  );
}

/** Une tâche du jour : on la coche, elle se raye d'un trait. */
function TaskCheck({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className="group/task flex cursor-pointer items-start gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-foreground/[0.035]">
      <input type="checkbox" checked={checked} onChange={onToggle} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          'mt-px grid size-[1.125rem] shrink-0 place-items-center rounded-md border transition-[background-color,border-color] duration-300',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-ring/70',
          checked ? 'border-jade bg-jade text-kente-night' : 'border-border-strong group-hover/task:border-jade/60',
        )}
      >
        <AnimatePresence initial={false}>
          {checked && (
            <m.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 26 }}>
              <Check className="size-3" strokeWidth={3.5} />
            </m.span>
          )}
        </AnimatePresence>
      </span>
      <span className="text-[0.8125rem] leading-snug">
        {/* Le trait qui raye la tâche faite court ligne après ligne (styles/effects.css) */}
        <span
          data-done={checked || undefined}
          className={cn('bento-strike', checked ? 'text-faint-foreground' : 'text-soft-foreground')}
        >
          {label}
        </span>
      </span>
    </label>
  );
}

/** L'interrupteur du mode économie de données : le même que dans les réglages et le pied de page. */
function SaverSwitch() {
  const { t } = useTranslation();
  const enabled = useDataSaverStore((s) => s.enabled);
  const setEnabled = useDataSaverStore((s) => s.setEnabled);
  const effects = [
    { icon: ImageOff, label: t('features.daily.saverImages') },
    { icon: PauseCircle, label: t('features.daily.saverMotion') },
    { icon: WifiOff, label: t('features.daily.saverPrefetch') },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={t('dataSaver.label')}
          aria-describedby="bento-saver-description"
          onClick={() => setEnabled(!enabled)}
          className={cn(
            'relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
            enabled ? 'border-jade/50 bg-jade' : 'border-border-strong bg-foreground/10',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'absolute start-0.5 top-0.5 size-[1.125rem] rounded-full bg-background shadow-sm transition-transform duration-300 ease-out-expo',
              enabled && 'translate-x-5 rtl:-translate-x-5',
            )}
          />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {enabled ? t('features.daily.saverOn') : t('features.daily.saverOff')}
          </p>
          <p id="bento-saver-description" className="mt-0.5 text-xs leading-relaxed text-faint-foreground">
            {t('dataSaver.description')}
          </p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {effects.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className={cn('flex items-center gap-2 text-xs transition-colors duration-300', enabled ? 'text-jade' : 'text-faint-foreground')}
          >
            <Icon aria-hidden className="size-3.5 shrink-0" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
