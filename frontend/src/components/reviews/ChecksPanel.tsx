import { ArrowUpRight, CircleCheck, CircleMinus, CircleX, LoaderCircle, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePullRequestChecks } from '@/hooks/usePullRequest';
import { cn } from '@/lib/utils';
import type { CheckState, PullRequestCheck, PullRequestDetail } from '@/types/review.types';
import { getApiErrorMessage } from '@/utils/apiError';
import { formatDuration } from '@/utils/formatters';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

const STATES: Record<CheckState, { icon: LucideIcon; tone: string; bar: string; spin?: boolean }> = {
  FAILURE: { icon: CircleX, tone: 'text-coral', bar: 'bg-kente-coral' },
  PENDING: { icon: LoaderCircle, tone: 'text-gold', bar: 'bg-kente-gold', spin: true },
  SUCCESS: { icon: CircleCheck, tone: 'text-jade', bar: 'bg-kente-jade' },
  SKIPPED: { icon: CircleMinus, tone: 'text-faint-foreground', bar: 'bg-foreground/15' },
};

/** Les totaux des vérifications : réussies (ou ignorées), en échec, en cours */
interface Tally {
  passed: number;
  failed: number;
  running: number;
  total: number;
}

/**
 * Les vérifications du dernier commit : tests, lint, build. Design 3C (« Vérifications »).
 *
 * En tête, où elles en sont, et un fil qui les compte (vert, rouge, or). Dessous, chacune avec son workflow, ce qu'elle
 * dit d'elle-même, sa durée, et le lien vers son journal sur GitHub ; en échec d'abord. Tant que l'une tourne, la
 * carte revient voir. Une PR de démonstration sans détail n'a que ses totaux.
 */
export default function ChecksPanel({ detail }: { detail: PullRequestDetail }) {
  const { t } = useTranslation('reviews');
  const { pullRequest } = detail;
  const query = usePullRequestChecks(pullRequest.project.slug, pullRequest.number);
  const checks = query.data?.available ? query.data.checks : null;

  const tally: Tally = checks
    ? {
        passed: checks.filter((check) => check.state === 'SUCCESS' || check.state === 'SKIPPED').length,
        failed: checks.filter((check) => check.state === 'FAILURE').length,
        running: checks.filter((check) => check.state === 'PENDING').length,
        total: query.data?.total ?? checks.length,
      }
    : {
        passed: pullRequest.checksPassed,
        failed: pullRequest.checksFailed,
        running: pullRequest.checksTotal - pullRequest.checksPassed - pullRequest.checksFailed,
        total: pullRequest.checksTotal,
      };

  return (
    <section aria-labelledby="checks-title" className="glass rounded-[1.375rem] p-5">
      <div className="flex items-center gap-2">
        <h2 id="checks-title" className="font-sans text-[0.9375rem] font-bold">
          {t('checks.title')}
        </h2>
        {query.data?.url && (
          <a
            href={query.data.url}
            target="_blank"
            rel="noreferrer"
            aria-label={t('checks.onGithub')}
            title={t('checks.onGithub')}
            className={cn('ms-auto grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground', focusRing)}
          >
            <ArrowUpRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
          </a>
        )}
      </div>

      {query.isPending ? (
        <div aria-hidden className="mt-3 flex flex-col gap-3">
          <span className="h-3 w-32 rounded-full skeleton-shimmer" />
          <span className="h-1 w-full rounded-full skeleton-shimmer" />
          {[0, 1, 2].map((index) => (
            <span key={index} className="flex items-center gap-2.5">
              <span className="size-4 rounded-full skeleton-shimmer" />
              <span className="h-3 flex-1 rounded-full skeleton-shimmer" />
            </span>
          ))}
        </div>
      ) : tally.total === 0 ? (
        <p className="mt-3 flex items-start gap-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-faint-foreground" />
          {t('checks.none')}
        </p>
      ) : (
        <>
          <Summary tally={tally} />
          {query.isError && <p className="mt-3 text-xs leading-relaxed text-coral">{getApiErrorMessage(query.error, t('checks.error'))}</p>}
          {checks && checks.length > 0 && (
            <ul className="mt-3.5 flex flex-col">
              {checks.map((check, index) => (
                <CheckRow key={`${check.name}-${index}`} check={check} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/** Où en sont les vérifications, en une phrase, et le fil qui les compte */
function Summary({ tally }: { tally: Tally }) {
  const { t } = useTranslation('reviews');
  const state: CheckState = tally.failed > 0 ? 'FAILURE' : tally.running > 0 ? 'PENDING' : 'SUCCESS';
  const { icon: Icon, tone, spin } = STATES[state];
  const sentence =
    state === 'FAILURE'
      ? t('item.checksFailed', { count: tally.failed })
      : state === 'PENDING'
        ? t('checks.running', { count: tally.running })
        : t('checks.passed', { count: tally.total });
  const segments: Array<{ state: CheckState; count: number }> = [
    { state: 'SUCCESS', count: tally.passed },
    { state: 'FAILURE', count: tally.failed },
    { state: 'PENDING', count: tally.running },
  ];

  return (
    <div className="mt-2.5">
      <p role="status" className={cn('flex items-center gap-2 text-[0.8125rem] font-semibold', tone)}>
        <Icon aria-hidden className={cn('size-4', spin && 'animate-spin [animation-duration:1.6s]')} />
        {sentence}
        <span className="ms-auto font-mono text-[0.6875rem] font-normal text-muted-foreground tabular-nums">
          {tally.passed}/{tally.total}
        </span>
      </p>
      <div aria-hidden className="mt-2.5 flex h-1 gap-0.5 overflow-hidden rounded-full">
        {segments
          .filter((segment) => segment.count > 0)
          .map((segment) => (
            <span key={segment.state} className={cn('h-full rounded-full', STATES[segment.state].bar)} style={{ flexGrow: segment.count }} />
          ))}
      </div>
    </div>
  );
}

/** Une vérification : son état, son nom et son workflow, ce qu'elle dit, sa durée, son journal */
function CheckRow({ check }: { check: PullRequestCheck }) {
  const { t } = useTranslation('reviews');
  const { icon: Icon, tone, spin } = STATES[check.state];
  const seconds =
    check.startedAt && check.completedAt ? Math.max(0, Math.round((Date.parse(check.completedAt) - Date.parse(check.startedAt)) / 1000)) : null;

  const content = (
    <>
      <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', tone, spin && 'animate-spin [animation-duration:1.6s]')} />
      <span className="sr-only">{t(`checks.state.${check.state}`)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span dir="ltr" className="truncate text-[0.8125rem] font-semibold text-foreground">
            {check.name}
          </span>
          {seconds !== null && <span className="ms-auto shrink-0 font-mono text-[0.6875rem] text-faint-foreground tabular-nums">{formatDuration(seconds)}</span>}
        </span>
        {(check.context || check.description) && (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {check.context && <span dir="ltr">{check.context}</span>}
            {check.context && check.description && <span aria-hidden> · </span>}
            {check.description}
          </span>
        )}
      </span>
      {check.url && <ArrowUpRight aria-hidden className="mt-0.5 size-3.5 shrink-0 text-faint-foreground transition-colors group-hover/check:text-foreground rtl:-scale-x-100" />}
    </>
  );

  return (
    <li className="border-t border-border-subtle first:border-t-0">
      {check.url ? (
        <a
          href={check.url}
          target="_blank"
          rel="noreferrer"
          title={t('checks.details', { name: check.name })}
          className={cn('group/check -mx-2 flex items-start gap-2.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-foreground/4', focusRing)}
        >
          {content}
        </a>
      ) : (
        <div className="flex items-start gap-2.5 py-2.5">{content}</div>
      )}
    </li>
  );
}
