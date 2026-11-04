import { AlertCircle, ArrowRight, Check, MessageSquareHeart, Star } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useFeedbackCalls, useGiveFeedback } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { FeedbackCall, Project } from '@/types/project.types';
import { getApiError, getApiErrorMessage } from '@/utils/apiError';

// Longueur d'un avis (FeedbackRequest.java)
const MAX_BODY = 1000;

/**
 * Demande de retours de l'équipe (« Votre avis sur l'écran trajets »). Design 3D.
 *
 * « Donner mon avis » déplie, dans la carte, une note en étoiles et un champ ; envoyé, le compteur
 * avance et la carte remercie. Un visiteur passe d'abord par la connexion. Sans demande ouverte, la
 * carte n'est pas là.
 */
export default function FeedbackRequestCard({ project }: { project: Project }) {
  const calls = useFeedbackCalls(project.id);
  const call = calls.data?.[0];

  // Tant qu'on ne sait pas s'il y en a une, la carte n'occupe aucune place
  if (!call) {
    return null;
  }
  return <FeedbackCallCard project={project} call={call} />;
}

function FeedbackCallCard({ project, call }: { project: Project; call: FeedbackCall }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [writing, setWriting] = useState(false);
  const [thanked, setThanked] = useState(false);
  const titleId = useId();
  const mine = user?.id === call.author.id;

  function start() {
    if (!isAuthenticated) {
      void navigate(paths.login, { state: { from: location } });
      return;
    }
    setWriting(true);
  }

  return (
    <m.section
      layout
      aria-labelledby={titleId}
      transition={{ layout: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
      className="relative overflow-hidden rounded-[1.375rem] border border-coral/20 bg-[linear-gradient(160deg,color-mix(in_srgb,var(--kente-coral)_13%,transparent),color-mix(in_srgb,var(--foreground)_2%,transparent)_70%)] p-5"
    >
      <span aria-hidden className="pointer-events-none absolute -end-6 -top-6 text-coral/10">
        <MessageSquareHeart className="size-28" strokeWidth={1.25} />
      </span>
      <m.p layout="position" className="relative font-mono text-[0.6875rem] tracking-[0.08em] text-coral uppercase">
        {t('project.feedback.eyebrow')}
      </m.p>
      <m.h2 layout="position" id={titleId} dir="auto" className="relative mt-2.5 text-start font-sans text-[0.9375rem] leading-snug font-bold rtl:text-right">
        {call.title}
      </m.h2>
      {call.prompt && (
        <m.p layout="position" dir="auto" className="relative mt-1.5 text-start text-sm leading-relaxed text-muted-foreground rtl:text-right">
          {call.prompt}
        </m.p>
      )}
      <m.p layout="position" className="relative mt-1 text-sm">
        <span className="inline-flex overflow-hidden align-bottom font-semibold text-soft-foreground">
          <AnimatePresence initial={false} mode="popLayout">
            <m.span
              key={call.feedbackCount}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {t('project.feedback.received', { count: call.feedbackCount })}
            </m.span>
          </AnimatePresence>
        </span>
      </m.p>
      {call.averageRating !== null && (
        <m.p layout="position" className="relative mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <StarRow value={call.averageRating} />
          <span>{t('project.feedback.average', { rating: call.averageRating.toLocaleString(undefined, { maximumFractionDigits: 1 }) })}</span>
        </m.p>
      )}

      <div className="relative mt-3.5">
        <AnimatePresence mode="wait" initial={false}>
          {thanked || call.givenByMe ? (
            <m.p
              key="given"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-[0.8125rem] font-bold text-jade"
            >
              <span className="grid size-5 place-items-center rounded-full bg-jade/15">
                <Check aria-hidden className="size-3" strokeWidth={3} />
              </span>
              {thanked ? t('project.feedback.thanks') : t('project.feedback.given')}
            </m.p>
          ) : mine ? (
            <m.p key="mine" className="text-[0.8125rem] font-semibold text-muted-foreground">
              {t('project.feedback.yours')}
            </m.p>
          ) : writing ? (
            <FeedbackForm
              key="form"
              projectId={project.id}
              call={call}
              onCancel={() => setWriting(false)}
              onSent={() => {
                setWriting(false);
                setThanked(true);
              }}
            />
          ) : (
            <m.button
              key="cta"
              type="button"
              onClick={start}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="group/cta inline-flex items-center gap-1.5 rounded-md text-[0.8125rem] font-bold text-coral outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              {t('project.feedback.give')}
              <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/cta:translate-x-1 rtl:-scale-x-100 rtl:group-hover/cta:-translate-x-1" />
            </m.button>
          )}
        </AnimatePresence>
      </div>
    </m.section>
  );
}

/** Note moyenne en cinq étoiles, remplies à la proportion près. */
function StarRow({ value }: { value: number }) {
  return (
    <span aria-hidden className="relative inline-flex text-coral">
      <span className="flex opacity-25">
        {[0, 1, 2, 3, 4].map((index) => (
          <Star key={index} className="size-3 fill-current" />
        ))}
      </span>
      <span className="absolute inset-y-0 start-0 flex overflow-hidden" style={{ width: `${(value / 5) * 100}%` }}>
        {[0, 1, 2, 3, 4].map((index) => (
          <Star key={index} className="size-3 shrink-0 fill-current" />
        ))}
      </span>
    </span>
  );
}

interface FeedbackFormProps {
  projectId: number;
  call: FeedbackCall;
  onCancel: () => void;
  onSent: () => void;
}

/** L'avis : une note (facultative) et quelques mots. Aussi dans l'atelier (dashboard/PendingReviews). */
export function FeedbackForm({ projectId, call, onCancel, onSent }: FeedbackFormProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const give = useGiveFeedback(projectId);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const fieldId = useId();
  const shown = hover || rating;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (give.isPending || !body.trim()) {
      return;
    }
    setFailure(null);
    give.mutate(
      { callId: call.id, body: { rating: rating || undefined, body: body.trim() } },
      {
        onSuccess: onSent,
        onError: (error) => setFailure(getApiError(error)?.status === 409 ? t('project.feedback.already') : getApiErrorMessage(error)),
      },
    );
  }

  // Les étoiles se choisissent aussi au clavier, comme un groupe de boutons radio (en arabe, la flèche
  // de gauche avance)
  function onStarKey(event: KeyboardEvent<HTMLDivElement>) {
    const forward = language.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = language.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    const step = event.key === forward || event.key === 'ArrowUp' ? 1 : event.key === backward || event.key === 'ArrowDown' ? -1 : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    const next = Math.min(5, Math.max(1, rating + step));
    setRating(next);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next - 1]?.focus();
  }

  return (
    <m.form
      onSubmit={submit}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="flex flex-col gap-3 pt-0.5">
        <div>
          <p id={`${fieldId}-rating`} className="text-xs font-semibold text-soft-foreground">
            {t('project.feedback.rating')}
          </p>
          <div role="radiogroup" aria-labelledby={`${fieldId}-rating`} onKeyDown={onStarKey} onPointerLeave={() => setHover(0)} className="mt-1 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={t('project.feedback.ratingValue', { count: value })}
                tabIndex={rating === value || (rating === 0 && value === 1) ? 0 : -1}
                onClick={() => setRating(value)}
                onPointerEnter={() => setHover(value)}
                className="grid size-8 place-items-center rounded-lg outline-none transition-transform duration-200 hover:scale-115 focus-visible:ring-2 focus-visible:ring-ring/70 active:scale-90"
              >
                <Star
                  aria-hidden
                  className={cn('size-5 transition-[color,fill] duration-200', value <= shown ? 'fill-kente-coral text-kente-coral' : 'text-foreground/25')}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor={fieldId} className="text-xs font-semibold text-soft-foreground">
            {t('project.feedback.body')}
          </label>
          <textarea
            id={fieldId}
            value={body}
            onChange={(event) => setBody(event.target.value.slice(0, MAX_BODY))}
            required
            maxLength={MAX_BODY}
            rows={3}
            dir="auto"
            autoFocus
            placeholder={t('project.feedback.placeholder')}
            className="mt-1 block w-full resize-none rounded-xl border border-input bg-surface px-3 py-2.5 text-base leading-relaxed outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-faint-foreground/80 focus:border-coral/50 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--kente-coral)_12%,transparent)] sm:text-sm"
          />
        </div>

        {failure && (
          <p role="alert" className="flex items-start gap-1.5 text-xs text-coral">
            <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />
            {failure}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-xl px-3 text-[0.8125rem] font-semibold text-muted-foreground outline-none transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            {t('project.feedback.cancel')}
          </button>
          <button
            type="submit"
            disabled={!body.trim()}
            aria-busy={give.isPending || undefined}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-kente-coral px-3.5 text-[0.8125rem] font-bold text-white outline-none transition-[opacity,translate] hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:translate-y-0 disabled:opacity-50"
          >
            {give.isPending && <PulsatingDots size="sm" tone="current" />}
            {t(give.isPending ? 'project.feedback.sending' : 'project.feedback.send')}
          </button>
        </div>
      </div>
    </m.form>
  );
}
