import { HeartHandshake, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useId, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { MAX_REVIEW_TEXT, STATE_BADGES } from '@/components/reviews/reviewVisuals';
import MarkdownEditor, { type MarkdownEditorHandle } from '@/components/shared/MarkdownEditor';
import { useSubmitReview } from '@/hooks/usePullRequest';
import { isApple } from '@/lib/platform';
import { cn } from '@/lib/utils';
import type { PullRequestDetail, SubmittedReviewState } from '@/types/review.types';
import { getApiErrorMessage } from '@/utils/apiError';

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-popover';

// Les trois verdicts, du plus léger au plus exigeant ; chacun sur son fil du kente
const VERDICTS: ReadonlyArray<{ state: SubmittedReviewState; ring: string; glow: string }> = [
  { state: 'COMMENTED', ring: 'peer-checked:ring-gold/60 peer-checked:bg-gold/8', glow: 'peer-checked:shadow-[0_14px_30px_-22px_var(--kente-gold)]' },
  { state: 'APPROVED', ring: 'peer-checked:ring-jade/60 peer-checked:bg-jade/8', glow: 'peer-checked:shadow-[0_14px_30px_-22px_var(--kente-jade)]' },
  {
    state: 'CHANGES_REQUESTED',
    ring: 'peer-checked:ring-coral/60 peer-checked:bg-coral/8',
    glow: 'peer-checked:shadow-[0_14px_30px_-22px_var(--kente-coral)]',
  },
];

interface ReviewSubmitDialogProps {
  detail: PullRequestDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Rendre sa revue (« Rends un verdict clair ») : commenter, approuver ou demander des changements, avec un message.
 * Le message est facultatif pour une approbation ; sinon, il dit ce qui manque. Un relecteur de la communauté voit
 * ce qu'une revue jugée utile lui rapporte. Feuille en bas de l'écran sur téléphone.
 */
export default function ReviewSubmitDialog({ detail, open, onOpenChange }: ReviewSubmitDialogProps) {
  const { t } = useTranslation('reviews');
  const { pullRequest } = detail;
  const submit = useSubmitReview(pullRequest.project.slug, pullRequest.number);
  const editor = useRef<MarkdownEditorHandle>(null);
  const errorId = useId();
  const [state, setState] = useState<SubmittedReviewState>('APPROVED');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const explained = state === 'APPROVED' || body.trim() !== '';

  function close(next: boolean) {
    if (!submit.isPending) {
      onOpenChange(next);
      setError(null);
    }
  }

  function send(event?: FormEvent) {
    event?.preventDefault();
    if (submit.isPending) {
      return;
    }
    if (!explained) {
      setError(t('submit.explain'));
      editor.current?.focus();
      return;
    }
    setError(null);
    submit.mutate(
      { state, body: body.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t(`submit.done.${state}`, { number: pullRequest.number }));
          setBody('');
          onOpenChange(false);
        },
        onError: (failure) => setError(getApiErrorMessage(failure)),
      },
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-kente-night/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 saver:backdrop-blur-none" />
        <Dialog.Content
          // On arrive pour écrire : le champ du message plutôt que le bouton de fermeture
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            editor.current?.focus();
          }}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[1.75rem] border border-border bg-popover p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-popover-foreground shadow-float outline-none',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(36rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:pb-6',
            'sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95',
          )}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="eyebrow">{t('submit.eyebrow', { number: pullRequest.number })}</p>
              <Dialog.Title className="mt-1.5 font-display text-h5">{t('submit.title')}</Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t('submit.text')}</Dialog.Description>
            </div>
            <Dialog.Close
              disabled={submit.isPending}
              aria-label={t('submit.close')}
              className={cn('grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground', focusRing)}
            >
              <X aria-hidden className="size-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={send} className="mt-5 flex flex-col gap-4">
            <fieldset>
              <legend className="sr-only">{t('submit.verdict')}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {VERDICTS.map(({ state: value, ring, glow }) => {
                  const { icon: Icon, tone } = STATE_BADGES[value];
                  return (
                    <label key={value} className="relative block cursor-pointer">
                      <input
                        type="radio"
                        name="verdict"
                        value={value}
                        checked={state === value}
                        onChange={() => {
                          setState(value);
                          setError(null);
                        }}
                        className="peer sr-only"
                      />
                      <span
                        className={cn(
                          'flex h-full flex-col gap-2 rounded-2xl p-3.5 ring-1 ring-border transition-[background-color,box-shadow] duration-300 ease-out-expo ring-inset hover:bg-foreground/4',
                          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                          ring,
                          glow,
                        )}
                      >
                        <span aria-hidden className={cn('grid size-7 place-items-center rounded-full', tone)}>
                          <Icon className="size-3.5" strokeWidth={2.75} />
                        </span>
                        <span className="text-sm font-bold text-foreground">{t(`submit.verdicts.${value}`)}</span>
                        <span className="text-xs leading-snug text-muted-foreground">{t(`submit.verdictHints.${value}`)}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <MarkdownEditor
                ref={editor}
                variant="compact"
                value={body}
                onChange={(value) => {
                  setBody(value);
                  if (error) {
                    setError(null);
                  }
                }}
                label={t('submit.message')}
                placeholder={t(state === 'APPROVED' ? 'submit.placeholderOptional' : 'submit.placeholder')}
                minRows={4}
                maxLength={MAX_REVIEW_TEXT}
                onSubmit={() => send()}
                invalid={error !== null}
                describedBy={error ? errorId : undefined}
                hint={t('submit.hint', { mod: isApple ? '⌘' : 'Ctrl' })}
              />
              {error && (
                <p id={errorId} role="alert" className="text-xs text-coral">
                  {error}
                </p>
              )}
            </div>

            {pullRequest.reward !== null && (
              <p className="flex items-start gap-2.5 rounded-xl bg-jade/8 px-3.5 py-2.5 text-xs leading-relaxed text-soft-foreground">
                <HeartHandshake aria-hidden className="mt-px size-4 shrink-0 text-jade" />
                {t('submit.reward', { reward: pullRequest.reward })}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Dialog.Close
                type="button"
                disabled={submit.isPending}
                className={cn(
                  'inline-flex h-11 items-center justify-center rounded-[0.875rem] border border-border-strong px-4 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50',
                  focusRing,
                )}
              >
                {t('submit.cancel')}
              </Dialog.Close>
              <button
                type="submit"
                disabled={submit.isPending}
                aria-busy={submit.isPending || undefined}
                className={cn(
                  'inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-[0.875rem] px-4 text-sm font-bold transition-[translate,filter,opacity] hover:-translate-y-px disabled:translate-y-0 disabled:opacity-70',
                  state === 'CHANGES_REQUESTED' ? 'bg-coral text-white hover:brightness-110' : 'bg-kente-warm text-kente-night hover:brightness-105',
                  focusRing,
                )}
              >
                {submit.isPending ? <PulsatingDots size="sm" tone="current" /> : t(`submit.send.${state}`)}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
