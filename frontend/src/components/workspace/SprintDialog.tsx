import { AlertCircle, Flag, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useWorkspaceContext } from './workspaceContext';
import { dialogContent, dialogOverlay, fieldClass, ghostButton, iconButton, primaryButton } from './workspaceStyles';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import SettingsSwitch from '@/components/settings/SettingsSwitch';
import { useNow } from '@/hooks/useNow';
import { useSprintActions, useWorkspaceTasks } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/apiError';
import { formatDate, isolate } from '@/utils/formatters';

export type SprintDialogMode = 'start' | 'close';

const WEEKS = [1, 2, 3, 4] as const;
const MAX_GOAL = 140;

interface SprintDialogProps {
  mode: SprintDialogMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Ouvrir un sprint (son objectif, sa durée), ou clore celui en cours : ce qui est livré quitte le tableau, le reste
 * continue. En le closant, on peut ouvrir le suivant dans la foulée. Pour le porteur et les mainteneurs.
 */
export default function SprintDialog({ mode, open, onOpenChange }: SprintDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={dialogOverlay} />
        <Dialog.Content className={dialogContent('sm:w-[min(30rem,calc(100vw-2rem))]')}>
          {open && <SprintForm mode={mode} onDone={() => onOpenChange(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SprintForm({ mode, onDone }: { mode: SprintDialogMode; onDone: () => void }) {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const tasks = useWorkspaceTasks(slug);
  const { start, close } = useSprintActions(slug);
  const now = useNow(60_000);
  const [goal, setGoal] = useState('');
  const [weeks, setWeeks] = useState<number>(2);
  const [next, setNext] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const goalId = useId();
  const sprint = workspace.sprint;
  const nextNumber = workspace.lastSprintNumber + 1;
  const pending = start.isPending || close.isPending;
  const opening = mode === 'start' || next;

  const done = tasks.data?.filter((task) => task.status === 'DONE').length ?? sprint?.doneCount ?? 0;
  const carried = (tasks.data?.length ?? sprint?.taskCount ?? 0) - done;
  const endsAt = new Date(now + weeks * 7 * 86_400_000).toISOString();

  function openNext(onSuccess: () => void, onError: (error: unknown) => void = (error) => setFailure(getApiErrorMessage(error))) {
    start.mutate({ goal: goal.trim() || undefined, weeks }, { onSuccess, onError });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) {
      return;
    }
    setFailure(null);
    if (mode === 'start') {
      openNext(() => {
        toast.success(t('sprintDialog.started', { number: nextNumber }));
        onDone();
      });
      return;
    }
    close.mutate(undefined, {
      onSuccess: (closed) => {
        const delivered = t('sprintDialog.closed', { number: closed.number, count: closed.doneCount });
        if (!next) {
          toast.success(delivered);
          onDone();
          return;
        }
        openNext(
          () => {
            toast.success(`${delivered} ${t('sprintDialog.started', { number: closed.number + 1 })}`);
            onDone();
          },
          // Le sprint est clos : la fenêtre se ferme, l'en-tête propose d'ouvrir le suivant
          (error) => {
            toast.success(delivered);
            toast.error(getApiErrorMessage(error));
            onDone();
          },
        );
      },
      onError: (error) => setFailure(getApiErrorMessage(error)),
    });
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7">
        <span aria-hidden className="mx-auto -mt-2 mb-4 block h-1 w-10 rounded-full bg-foreground/15 sm:hidden" />
        <div className="flex items-start gap-3.5">
          <span aria-hidden className={cn('grid size-11 shrink-0 place-items-center rounded-2xl ring-1 ring-inset', mode === 'close' ? 'bg-jade/12 text-jade ring-jade/20' : 'bg-gold/12 text-gold ring-gold/20')}>
            <Flag className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <Dialog.Title className="font-display text-h5">
              {mode === 'close' && sprint ? t('sprintDialog.closeTitle', { number: sprint.number }) : t('sprintDialog.startTitle', { number: nextNumber })}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {mode === 'close' ? t('sprintDialog.closeText') : t('sprintDialog.startText')}
            </Dialog.Description>
          </div>
          <Dialog.Close aria-label={t('dialog.close')} className={cn(iconButton, '-me-2 -mt-1')}>
            <X aria-hidden className="size-4.5" />
          </Dialog.Close>
        </div>

        {mode === 'close' && sprint && (
          <dl className="mt-5 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-jade/25 bg-jade/8 p-3.5">
              <dt className="text-xs font-semibold text-jade">{t('sprintDialog.delivered')}</dt>
              <dd className="mt-1 font-display text-2xl font-bold text-foreground tabular-nums">{done}</dd>
            </div>
            <div className="rounded-2xl border border-border bg-foreground/[0.03] p-3.5">
              <dt className="text-xs font-semibold text-muted-foreground">{t('sprintDialog.carried')}</dt>
              <dd className="mt-1 font-display text-2xl font-bold text-foreground tabular-nums">{carried}</dd>
            </div>
          </dl>
        )}

        {mode === 'close' && (
          <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-border-subtle px-4 py-3">
            <span className="text-sm font-semibold">{t('sprintDialog.openNext', { number: nextNumber })}</span>
            <SettingsSwitch checked={next} onCheckedChange={setNext} label={t('sprintDialog.openNext', { number: nextNumber })} tone="gold" />
          </div>
        )}

        {opening && (
          <div className="mt-5 flex flex-col gap-4">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={goalId} className="text-sm font-semibold">
                  {t('sprintDialog.goal')}
                </label>
                <span className="text-xs text-faint-foreground">{t('sprintDialog.optional')}</span>
              </div>
              <input
                id={goalId}
                value={goal}
                maxLength={MAX_GOAL}
                onChange={(event) => setGoal(event.target.value)}
                dir="auto"
                placeholder={t('sprintDialog.goalPlaceholder')}
                className={cn(fieldClass, 'mt-2 h-11')}
              />
            </div>
            <fieldset>
              <legend className="text-sm font-semibold">{t('sprintDialog.duration')}</legend>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {WEEKS.map((value) => (
                  <label
                    key={value}
                    className={cn(
                      'relative flex h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring/70',
                      weeks === value ? 'border-gold/50 bg-gold/10 text-gold' : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
                    )}
                  >
                    <input type="radio" name="weeks" value={value} checked={weeks === value} onChange={() => setWeeks(value)} className="sr-only" />
                    {t('sprintDialog.weeks', { count: value })}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t('sprintDialog.until', { date: isolate(formatDate(endsAt)) })}</p>
            </fieldset>
          </div>
        )}

        {failure && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/8 px-3.5 py-3 text-sm text-coral">
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {failure}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border-subtle px-5 py-3.5 sm:flex-row sm:justify-end sm:px-7">
        <Dialog.Close className={ghostButton}>{t('dialog.cancel')}</Dialog.Close>
        <button type="submit" aria-busy={pending || undefined} className={primaryButton}>
          {pending && <PulsatingDots size="sm" tone="current" />}
          {mode === 'close' ? t('sprintDialog.closeAction', { number: sprint?.number ?? '' }) : t('sprintDialog.startAction', { number: nextNumber })}
        </button>
      </div>
    </form>
  );
}
