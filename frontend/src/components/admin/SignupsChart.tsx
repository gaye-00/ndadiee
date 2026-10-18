import { ChartColumn, Table2 } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { DailyCount } from '@/types/admin.types';
import { formatNumber, formatShortDay } from '@/utils/formatters';

// Quatre graduations : 0, puis trois pas « ronds » (1, 2, 5 × 10ⁿ) dont le dernier couvre le maximum
const STEPS = 3;

function niceStep(max: number): number {
  if (max <= 0) {
    return 1;
  }
  const target = max / STEPS;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= target);
  return Math.max(1, step ?? 10 * magnitude);
}

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

/**
 * Les inscriptions des 30 derniers jours, une colonne par jour (une seule série : pas de légende, le titre la
 * nomme). Au survol, ou au clavier (un seul arrêt de tabulation, puis les flèches, Début et Fin), une bulle donne
 * le jour et le nombre ; la colonne visée s'éclaire. Tout se relit aussi en tableau.
 */
export default function SignupsChart({ data }: { data: DailyCount[] }) {
  const { t } = useTranslation('admin');
  const titleId = useId();
  const [asTable, setAsTable] = useState(false);
  const total = data.reduce((sum, day) => sum + day.count, 0);

  return (
    <section aria-labelledby={titleId} className="glass flex flex-col rounded-[1.375rem] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={titleId} className="font-display text-h5">
            {t('overview.signups.title')}
          </h2>
          <p className="mt-1 text-[0.8125rem] text-muted-foreground">
            {t('overview.signups.subtitle', { count: total, formatted: formatNumber(total) })}
          </p>
        </div>
        <button
          type="button"
          aria-pressed={asTable}
          onClick={() => setAsTable((value) => !value)}
          className={cn(
            'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-border px-3 text-[0.8125rem] font-semibold text-soft-foreground transition-colors hover:bg-foreground/5 hover:text-foreground',
            focusRing,
          )}
        >
          {asTable ? <ChartColumn aria-hidden className="size-4" /> : <Table2 aria-hidden className="size-4" />}
          {asTable ? t('overview.signups.showChart') : t('overview.signups.showTable')}
        </button>
      </div>

      {asTable ? <SignupsTable data={data} /> : <Columns data={data} />}
    </section>
  );
}

function Columns({ data }: { data: DailyCount[] }) {
  const { t } = useTranslation('admin');
  const [active, setActive] = useState<number | null>(null);
  // Le jour qui reçoit le focus au clavier : aujourd'hui, tant qu'aucun autre n'a été visé
  const [focusable, setFocusable] = useState(data.length - 1);
  const group = useRef<HTMLDivElement>(null);
  const max = Math.max(0, ...data.map((day) => day.count));
  const step = niceStep(max);
  const top = step * STEPS;
  const ticks = Array.from({ length: STEPS + 1 }, (_, index) => index * step);

  function moveTo(index: number) {
    const next = Math.min(data.length - 1, Math.max(0, index));
    setFocusable(next);
    setActive(next);
    group.current?.querySelectorAll<HTMLButtonElement>('[data-day]')[next]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const moves: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      Home: -data.length,
      End: data.length,
    };
    const move = moves[event.key];
    if (move === undefined) {
      return;
    }
    event.preventDefault();
    moveTo((active ?? focusable) + move);
  }

  const shown = active === null ? null : data[active];

  return (
    <div className="mt-6">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
        {/* Graduations : chiffres alignés, à gauche des colonnes */}
        <div aria-hidden className="relative h-44 w-7 font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
          {ticks.map((tick) => (
            <span key={tick} className="absolute end-0 translate-y-1/2" style={{ bottom: `${(tick / top) * 100}%` }}>
              {formatNumber(tick)}
            </span>
          ))}
        </div>

        <div className="relative h-44">
          {/* Lignes de graduation : un trait fin, en retrait */}
          {ticks.map((tick) => (
            <span key={tick} aria-hidden className="absolute inset-x-0 h-px bg-border-subtle" style={{ bottom: `${(tick / top) * 100}%` }} />
          ))}

          <div
            ref={group}
            role="group"
            aria-label={t('overview.signups.chartLabel')}
            onKeyDown={onKeyDown}
            onPointerLeave={() => setActive(null)}
            className="relative flex h-full items-end gap-0.5"
          >
            {data.map((day, index) => {
              const label = t('overview.signups.day', { date: formatShortDay(day.date), count: day.count });
              return (
                <button
                  key={day.date}
                  type="button"
                  data-day
                  tabIndex={index === focusable ? 0 : -1}
                  aria-label={label}
                  onPointerEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  // Toute la hauteur du jour se vise, pas seulement la colonne
                  className="group/day flex h-full min-w-0 flex-1 items-end justify-center rounded-md outline-none focus-visible:bg-foreground/5"
                >
                  <span
                    className={cn(
                      'block w-[70%] max-w-6 rounded-t-[4px] bg-(--chart-bar) transition-[filter,opacity] duration-150',
                      active !== null && active !== index && 'opacity-55',
                      active === index && 'brightness-110',
                    )}
                    style={{ height: day.count === 0 ? 0 : `max(2px, ${(day.count / top) * 100}%)` }}
                  />
                </button>
              );
            })}
          </div>

          {/* La bulle du jour visé : la valeur d'abord, le jour ensuite */}
          {shown && active !== null && (
            <div
              aria-hidden
              className={cn(
                'pointer-events-none absolute z-10 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-center shadow-float',
                // Aux bords, la bulle s'aligne sur la colonne au lieu de se centrer : elle ne sort pas de la carte
                active < 3 ? '-translate-x-2 rtl:translate-x-2' : active > data.length - 4 ? '-translate-x-[calc(100%-0.5rem)] rtl:translate-x-[calc(100%-0.5rem)]' : '-translate-x-1/2 rtl:translate-x-1/2',
              )}
              style={{
                insetInlineStart: `${((active + 0.5) / data.length) * 100}%`,
                bottom: `calc(${Math.min(100, (shown.count / top) * 100)}% + 0.5rem)`,
              }}
            >
              <span className="block text-sm font-bold whitespace-nowrap text-foreground">
                {t('overview.signups.count', { count: shown.count, formatted: formatNumber(shown.count) })}
              </span>
              <span className="block font-mono text-[0.6875rem] whitespace-nowrap text-muted-foreground">{formatShortDay(shown.date)}</span>
            </div>
          )}
        </div>

        {/* Repères du temps : le premier jour, le milieu, aujourd'hui */}
        <span aria-hidden />
        <div aria-hidden className="mt-2 flex justify-between font-mono text-[0.6875rem] text-muted-foreground">
          <span>{data.length > 0 && formatShortDay(data[0].date)}</span>
          <span>{data.length > 2 && formatShortDay(data[Math.floor(data.length / 2)].date)}</span>
          <span>{t('overview.signups.today')}</span>
        </div>
      </div>
    </div>
  );
}

/** Les mêmes chiffres, jour par jour : les plus récents d'abord. */
function SignupsTable({ data }: { data: DailyCount[] }) {
  const { t } = useTranslation('admin');

  return (
    <div className="mt-5 max-h-64 overflow-y-auto rounded-xl border border-border-subtle">
      <table className="w-full text-sm">
        <caption className="sr-only">{t('overview.signups.title')}</caption>
        <thead className="sticky top-0 bg-popover text-start text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3.5 py-2 text-start font-semibold">
              {t('overview.signups.dayColumn')}
            </th>
            <th scope="col" className="px-3.5 py-2 text-end font-semibold">
              {t('overview.signups.countColumn')}
            </th>
          </tr>
        </thead>
        <tbody>
          {[...data].reverse().map((day) => (
            <tr key={day.date} className="border-t border-border-subtle">
              <td className="px-3.5 py-1.5">{formatShortDay(day.date)}</td>
              <td className="px-3.5 py-1.5 text-end font-mono tabular-nums">{formatNumber(day.count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
