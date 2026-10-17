import { Check, GitPullRequest, RotateCcw, Triangle } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import BentoCard from './BentoCard';
import CrewAvatar from './CrewAvatar';

// La revue #84 de lagos-transit (design 3C) : le cache Redis des horaires du BRT
const LINES = [
  { number: 19, code: '\tkey := "dep:" + stop' },
  { number: 20, code: '\tif raw, err := c.rdb.Get(key); err == nil {' },
  { number: 21, code: '\t\treturn decode(raw)' },
  { number: 22, code: '\t}' },
  { number: 23, code: '\tdeps, err := c.src.Departures(stop)' },
] as const;
const BEFORE = '\tc.rdb.Set(key, encode(deps), 0)';
const AFTER = '\tc.rdb.Set(key, encode(deps), 10*time.Minute)';
const LAST = { number: 25, code: '\treturn deps, err' } as const;
const HELPFUL = 3;

// Coloration du Go, juste ce qu'il faut : mots-clés, chaînes, nombres, appels
const TOKENS = /("[^"]*")|\b(func|if|return|nil)\b|\b(\d+)\b|([A-Za-z_]\w*)(?=\()/g;
const TONES = ['text-jade', 'text-coral', 'text-gold', 'text-gold'] as const;

function highlight(code: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of code.matchAll(TOKENS)) {
    const index = match.index ?? 0;
    parts.push(code.slice(last, index));
    const tone = TONES[match.slice(1).findIndex((group) => group !== undefined)];
    parts.push(
      <span key={index} className={tone}>
        {match[0]}
      </span>,
    );
    last = index + match[0].length;
  }
  parts.push(code.slice(last));
  return parts;
}

/**
 * 02 · Échanger. Une revue de code, ligne à ligne : le mainteneur propose une correction sur la ligne
 * 24 ; on l'applique d'un clic, la ligne change, la pull request est approuvée (tampon). On peut aussi
 * dire que la revue a été utile : c'est ce qui fait la réputation sur Ndadiee.
 */
export default function ReviewCard({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const [applied, setApplied] = useState(false);
  const [helpful, setHelpful] = useState(false);

  return (
    <BentoCard
      step={2}
      accent="coral"
      eyebrow={t('features.review.eyebrow')}
      title={t('features.review.title')}
      text={t('features.review.text')}
      className={className}
    >
      <div className="relative -mx-5 flex flex-1 flex-col border-y border-glass-border bg-code sm:-mx-7">
        {/* La pull request */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-3 sm:px-7">
          <GitPullRequest aria-hidden className={cn('mt-0.5 size-4 shrink-0 transition-colors', applied ? 'text-jade' : 'text-coral')} />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm leading-snug font-semibold">
              <span className="font-mono text-faint-foreground">#84</span> {t('features.review.pr')}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-xs text-muted-foreground">
              <CrewAvatar who="ama" size="xs" />
              <span>ama.o</span>
              <span aria-hidden>·</span>
              <span dir="ltr" className="font-mono">
                <span className="text-jade">+214</span> <span className="text-coral">−38</span>
              </span>
              <span
                role="status"
                className={cn(
                  'ms-auto rounded-full border px-2 py-0.5 text-[0.6875rem] font-bold transition-colors duration-500',
                  applied ? 'border-jade/30 bg-jade/12 text-jade' : 'border-coral/30 bg-coral/12 text-coral',
                )}
              >
                {applied ? t('features.review.approved') : t('features.review.changesRequested')}
              </span>
            </div>
          </div>
        </div>

        {/* Le fichier et ses lignes */}
        <div dir="ltr" className="flex items-center justify-between border-y border-glass-border px-5 py-2 font-mono text-[0.6875rem] text-muted-foreground sm:px-7">
          <span className="truncate">internal/schedule/cache.go</span>
          <span className="text-jade">+96</span>
        </div>

        {/* 10 px tant que la carte est étroite (téléphone, tablette) : la plus longue ligne tient */}
        <div dir="ltr" className="overflow-x-auto py-1.5 font-mono text-[0.625rem] leading-5 [tab-size:2] [scrollbar-width:none] lg:text-[0.6875rem]">
          {LINES.map((line) => (
            <DiffLine key={line.number} number={line.number}>
              {highlight(line.code)}
            </DiffLine>
          ))}
          <DiffLine number={24} flagged={!applied} flash={applied}>
            <AnimatePresence mode="popLayout" initial={false}>
              <m.span
                key={applied ? 'after' : 'before'}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="inline-block"
              >
                {highlight(applied ? AFTER : BEFORE)}
              </m.span>
            </AnimatePresence>
          </DiffLine>

          {/* Le fil de discussion de la ligne 24, dans le sens de la langue */}
          <div dir={i18n.dir()} className="px-3 py-2 font-sans text-xs leading-normal whitespace-normal sm:px-5">
            <AnimatePresence mode="wait" initial={false}>
              {applied ? (
                <m.p
                  key="resolved"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 overflow-hidden rounded-lg border border-jade/25 bg-jade/8 px-3 py-2 text-soft-foreground"
                >
                  <Check aria-hidden className="size-3.5 shrink-0 text-jade" />
                  <span className="min-w-0 flex-1">{t('features.review.resolved')}</span>
                  <button
                    type="button"
                    onClick={() => setApplied(false)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
                  >
                    <RotateCcw aria-hidden className="size-3" />
                    {t('features.review.replay')}
                  </button>
                </m.p>
              ) : (
                <m.div
                  key="thread"
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.3 } }}
                  className="overflow-hidden rounded-lg border border-glass-border bg-surface p-3 shadow-[0_12px_30px_-24px_var(--kente-night)] saver:shadow-none"
                >
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <CrewAvatar who="chinedu" size="xs" />
                    <span className="font-semibold text-foreground">Chinedu Okafor</span>
                    <span aria-hidden>·</span>
                    <span>{t('features.review.maintainer')}</span>
                  </p>
                  <p className="mt-1.5 text-soft-foreground">{t('features.review.comment')}</p>
                  <div dir="ltr" className="mt-2 overflow-x-auto rounded-md border border-glass-border font-mono text-[0.625rem] leading-[1.125rem] [tab-size:2] [scrollbar-width:none]">
                    <p className="bg-diff-remove px-2 whitespace-pre">
                      <span className="text-coral">− </span>
                      {BEFORE.trim()}
                    </p>
                    <p className="bg-diff-add px-2 whitespace-pre">
                      <span className="text-jade">+ </span>
                      {AFTER.trim()}
                    </p>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setApplied(true)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-xs font-bold text-background transition-[scale,opacity] duration-200 outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-95"
                    >
                      {t('features.review.apply')}
                    </button>
                    <HelpfulButton pressed={helpful} onToggle={() => setHelpful((value) => !value)} />
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          <DiffLine number={LAST.number}>{highlight(LAST.code)}</DiffLine>
        </div>

        <ApprovedStamp shown={applied} />
      </div>
    </BentoCard>
  );
}

/** Une ligne ajoutée du diff : son numéro, le « + », le code. La ligne commentée a un repère dans la marge. */
function DiffLine({ number, flagged, flash, children }: { number: number; flagged?: boolean; flash?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'group/line relative flex bg-diff-add pe-5 whitespace-pre transition-colors duration-700 hover:bg-[color-mix(in_srgb,var(--jade)_16%,transparent)] sm:pe-7',
        flash && 'bento-line-flash',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'w-9 shrink-0 pe-2 text-end text-code-gutter tabular-nums select-none lg:w-13',
          flagged && 'text-coral',
        )}
      >
        {flagged && <span className="absolute start-1 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-coral lg:start-3" />}
        {number}
      </span>
      <span aria-hidden className="w-4 shrink-0 text-jade select-none">
        +
      </span>
      <code className="font-mono">{children}</code>
    </div>
  );
}

/** « Utile » : la revue a aidé. +10 de réputation pour son auteur, qui monte de la flèche. */
function HelpfulButton({ pressed, onToggle }: { pressed: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
        pressed ? 'border-gold/40 bg-gold/12 text-gold' : 'border-glass-border text-muted-foreground hover:text-foreground',
      )}
    >
      <Triangle aria-hidden className={cn('size-2.5 transition-transform duration-300', pressed && 'fill-current')} />
      <span className="tabular-nums">{HELPFUL + (pressed ? 1 : 0)}</span>
      {t('features.review.helpful')}
      <AnimatePresence>
        {pressed && (
          <m.span
            key="reputation"
            aria-hidden
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: -26 }}
            transition={{ duration: 1.4, ease: 'easeOut', times: [0, 0.15, 0.7, 1] }}
            className="pointer-events-none absolute start-1/2 top-0 -translate-x-1/2 font-mono text-[0.6875rem] font-bold whitespace-nowrap text-gold rtl:translate-x-1/2"
          >
            +10
          </m.span>
        )}
      </AnimatePresence>
      <span className="sr-only">{t('features.review.helpfulHint')}</span>
    </button>
  );
}

/** Le tampon « Approuvé », posé d'un coup sur la revue. Décoratif : le statut de la PR le dit. */
function ApprovedStamp({ shown }: { shown: boolean }) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {shown && (
        <m.span
          aria-hidden
          initial={{ opacity: 0, scale: 1.8, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: -11 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', stiffness: 520, damping: 24, delay: 0.25 }}
          className="bento-stamp pointer-events-none absolute end-6 top-[46%] inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-display text-sm font-extrabold tracking-[0.06em] text-jade uppercase sm:end-8"
        >
          <Check className="size-4" strokeWidth={3} />
          {t('features.review.approved')}
        </m.span>
      )}
    </AnimatePresence>
  );
}
