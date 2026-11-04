import { AlertCircle, CalendarPlus, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useWorkspaceContext } from './workspaceContext';
import { dialogContent, dialogOverlay, fieldClass, ghostButton, iconButton, primaryButton } from './workspaceStyles';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useScheduleEvent } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';
import { getApiError, getApiErrorMessage } from '@/utils/apiError';

const DURATIONS = [30, 60, 90, 120] as const;
const MAX_TITLE = 120;

// « 2026-11-01 » et « 15:30 », dans le fuseau de l'appareil
const pad = (value: number) => String(value).padStart(2, '0');
const dateOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const timeOf = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** La prochaine demi-heure ronde, au moins une demi-heure plus tard : le temps de prévenir l'équipe */
function nextSlot(): Date {
  const slot = new Date(Date.now() + 30 * 60_000);
  slot.setMinutes(slot.getMinutes() < 30 ? 30 : 60, 0, 0);
  return slot;
}

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Proposer un rendez-vous à l'équipe (« Pair programming : cache Redis », aujourd'hui à 15 h) : il s'épingle en haut de
 * la discussion, et celui qui le propose y sera. L'heure est celle de l'appareil ; chacun la lit dans la sienne.
 */
export default function EventDialog({ open, onOpenChange }: EventDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={dialogOverlay} />
        <Dialog.Content className={dialogContent('sm:w-[min(30rem,calc(100vw-2rem))]')}>{open && <EventForm onDone={() => onOpenChange(false)} />}</Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EventForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation('workspace');
  const { slug } = useWorkspaceContext();
  const schedule = useScheduleEvent(slug);
  const [slot] = useState(nextSlot);
  const [today] = useState(() => dateOf(new Date()));
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(dateOf(slot));
  const [time, setTime] = useState(timeOf(slot));
  const [duration, setDuration] = useState<number>(60);
  const [link, setLink] = useState('');
  const [errors, setErrors] = useState<{ title?: string; startsAt?: string; link?: string; form?: string }>({});
  const ids = { title: useId(), date: useId(), time: useId(), link: useId() };
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (schedule.isPending) {
      return;
    }
    const startsAt = new Date(`${date}T${time}`);
    const next: typeof errors = {};
    if (!title.trim()) {
      next.title = t('eventDialog.titleRequired');
    }
    if (Number.isNaN(startsAt.getTime())) {
      next.startsAt = t('eventDialog.whenRequired');
    } else if (startsAt.getTime() < Date.now() - 30 * 60_000) {
      next.startsAt = t('eventDialog.past');
    }
    if (link.trim() && !/^https:\/\/\S+$/i.test(link.trim())) {
      next.link = t('eventDialog.linkInvalid');
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }
    schedule.mutate(
      { title: title.trim(), startsAt: startsAt.toISOString(), durationMinutes: duration, link: link.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t('eventDialog.done'));
          onDone();
        },
        onError: (failure) => {
          const fields = getApiError(failure)?.validationErrors;
          setErrors(fields ? { title: fields.title, startsAt: fields.startsAt, link: fields.link } : { form: getApiErrorMessage(failure) });
        },
      },
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7">
        <span aria-hidden className="mx-auto -mt-2 mb-4 block h-1 w-10 rounded-full bg-foreground/15 sm:hidden" />
        <div className="flex items-start gap-3.5">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold/12 text-gold ring-1 ring-gold/20 ring-inset">
            <CalendarPlus className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <Dialog.Title className="font-display text-h5">{t('eventDialog.title')}</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('eventDialog.text')}</Dialog.Description>
          </div>
          <Dialog.Close aria-label={t('dialog.close')} className={cn(iconButton, '-me-2 -mt-1')}>
            <X aria-hidden className="size-4.5" />
          </Dialog.Close>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label htmlFor={ids.title} className="text-sm font-semibold">
              {t('eventDialog.what')}
            </label>
            <input
              id={ids.title}
              autoFocus
              value={title}
              maxLength={MAX_TITLE}
              onChange={(event) => setTitle(event.target.value)}
              dir="auto"
              placeholder={t('eventDialog.whatPlaceholder')}
              aria-invalid={errors.title ? true : undefined}
              className={cn(fieldClass, 'mt-2 h-11')}
            />
            {errors.title && <p role="alert" className="mt-1 text-xs text-coral">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={ids.date} className="text-sm font-semibold">
                {t('eventDialog.date')}
              </label>
              <input
                id={ids.date}
                type="date"
                value={date}
                min={today}
                onChange={(event) => setDate(event.target.value)}
                aria-invalid={errors.startsAt ? true : undefined}
                className={cn(fieldClass, 'mt-2 h-11')}
              />
            </div>
            <div>
              <label htmlFor={ids.time} className="text-sm font-semibold">
                {t('eventDialog.time')}
              </label>
              <input
                id={ids.time}
                type="time"
                step={300}
                value={time}
                onChange={(event) => setTime(event.target.value)}
                aria-invalid={errors.startsAt ? true : undefined}
                className={cn(fieldClass, 'mt-2 h-11')}
              />
            </div>
          </div>
          {errors.startsAt ? (
            <p role="alert" className="-mt-2 text-xs text-coral">
              {errors.startsAt}
            </p>
          ) : (
            <p className="-mt-2 text-xs text-muted-foreground">{t('eventDialog.zone', { zone })}</p>
          )}

          <fieldset>
            <legend className="text-sm font-semibold">{t('eventDialog.duration')}</legend>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {DURATIONS.map((minutes) => (
                <label
                  key={minutes}
                  className={cn(
                    'flex h-10 cursor-pointer items-center justify-center rounded-xl border text-[0.8125rem] font-semibold transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring/70',
                    duration === minutes ? 'border-gold/50 bg-gold/10 text-gold' : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
                  )}
                >
                  <input type="radio" name="duration" value={minutes} checked={duration === minutes} onChange={() => setDuration(minutes)} className="sr-only" />
                  {minutes < 60 ? t('eventDialog.minutes', { count: minutes }) : t('eventDialog.hours', { count: minutes / 60 })}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={ids.link} className="text-sm font-semibold">
                {t('eventDialog.link')}
              </label>
              <span className="text-xs text-faint-foreground">{t('eventDialog.optional')}</span>
            </div>
            <input
              id={ids.link}
              type="url"
              inputMode="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              dir="ltr"
              placeholder="https://meet.jit.si/…"
              aria-invalid={errors.link ? true : undefined}
              className={cn(fieldClass, 'mt-2 h-11 font-mono text-sm')}
            />
            {errors.link && <p role="alert" className="mt-1 text-xs text-coral">{errors.link}</p>}
          </div>

          {errors.form && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/8 px-3.5 py-3 text-sm text-coral">
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {errors.form}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border-subtle px-5 py-3.5 sm:flex-row sm:justify-end sm:px-7">
        <Dialog.Close className={ghostButton}>{t('dialog.cancel')}</Dialog.Close>
        <button type="submit" aria-busy={schedule.isPending || undefined} className={primaryButton}>
          {schedule.isPending && <PulsatingDots size="sm" tone="current" />}
          {t('eventDialog.submit')}
        </button>
      </div>
    </form>
  );
}
