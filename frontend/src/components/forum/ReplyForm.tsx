import { Lock } from 'lucide-react';
import { useId, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import MarkdownEditor, { type MarkdownEditorHandle } from '@/components/shared/MarkdownEditor';
import UserAvatar from '@/components/shared/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useDraft } from '@/hooks/useDraft';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useMemberAction } from '@/hooks/useMemberAction';
import { useCreateAnswer } from '@/hooks/useQuestions';
import { isApple } from '@/lib/platform';
import { cn } from '@/lib/utils';
import type { Answer, Question } from '@/types/question.types';
import { getApiErrorMessage } from '@/utils/apiError';
import { answerSchema } from '@/utils/validators';

const MAX_ANSWER = 30000;

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/70';

interface ReplyFormProps {
  topic: Question;
  /** La réponse vient d'être publiée : la liste la montre et y descend */
  onPosted: (answer: Answer) => void;
}

/**
 * Répondre au sujet, comme « Add to the discussion » sur dev.to : un champ d'une ligne, qui s'ouvre en éditeur
 * Markdown complet (barre d'outils, aperçu) au premier clic. La réponse en cours est gardée sur l'appareil
 * (brouillon) jusqu'à sa publication. Un visiteur est invité à se connecter ; un sujet fermé le dit.
 */
export default function ReplyForm({ topic, onPosted }: ReplyFormProps) {
  const { t } = useTranslation('forum');
  const { user, isAuthenticated } = useAuth();
  const memberAction = useMemberAction();
  const create = useCreateAnswer(topic);
  const images = useImageUpload();
  const errorId = useId();
  const editor = useRef<MarkdownEditorHandle>(null);
  const draft = useDraft(isAuthenticated ? `answer-${topic.id}` : null, '', (value) => !value.trim());
  // Un brouillon retrouvé : l'éditeur est déjà ouvert
  const [open, setOpen] = useState(draft.restored);
  const [error, setError] = useState<string | null>(null);
  const own = topic.author.id === user?.id;

  // Masqué par l'équipe : le sujet n'accepte plus de réponses (l'avis en tête de page dit pourquoi)
  if (topic.hidden) {
    return null;
  }

  if (topic.status === 'CLOSED') {
    return (
      <p className="mt-5 flex items-center gap-2.5 rounded-2xl border border-border bg-foreground/4 px-4 py-3 text-sm text-soft-foreground">
        <Lock aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        {t('answers.closed')}
      </p>
    );
  }

  function expand() {
    memberAction(
      'answer',
      () => {
        setOpen(true);
        requestAnimationFrame(() => editor.current?.focus());
      },
      '#answers',
    );
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (create.isPending) {
      return;
    }
    if (images.pending > 0) {
      toast(t('form.imagesPending'));
      return;
    }
    const parsed = answerSchema.safeParse({ body: draft.value });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? null);
      editor.current?.focus();
      return;
    }
    setError(null);
    create.mutate(parsed.data.body, {
      onSuccess: (answer) => {
        draft.clear();
        draft.setValue('');
        setOpen(false);
        toast.success(t('answers.posted'));
        onPosted(answer);
      },
      onError: (failure) => setError(getApiErrorMessage(failure)),
    });
  }

  function cancel() {
    setOpen(false);
    setError(null);
  }

  const placeholder = t(own ? 'answers.placeholderOwn' : 'answers.placeholder');

  return (
    <div className="mt-5 flex gap-3">
      {user ? <UserAvatar user={user} size="md" className="mt-1 hidden sm:inline-grid" /> : <span aria-hidden className="mt-1 hidden size-9 shrink-0 rounded-full bg-kente-conic opacity-70 sm:block" />}
      {open ? (
        <form onSubmit={submit} className="flex min-w-0 flex-1 flex-col gap-2.5">
          <MarkdownEditor
            ref={editor}
            value={draft.value}
            onChange={(value) => {
              draft.setValue(value);
              if (error) {
                setError(null);
              }
            }}
            label={t('answers.label')}
            placeholder={placeholder}
            minRows={5}
            maxLength={MAX_ANSWER}
            onSubmit={() => submit()}
            onUploadImage={images.upload}
            invalid={error !== null}
            describedBy={error ? errorId : undefined}
            hint={
              draft.savedAt ? (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-1.5 rounded-full bg-jade" />
                  {t('form.draftSaved')}
                </span>
              ) : (
                t('form.submitHint', { mod: isApple ? '⌘' : 'Ctrl' })
              )
            }
          />
          {error && (
            <p id={errorId} role="alert" className="text-sm text-coral">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={create.isPending || images.pending > 0}
              className={cn(
                'inline-flex h-10 min-w-36 items-center justify-center rounded-xl bg-kente-warm px-4 text-sm font-bold text-kente-night transition-[translate,filter] hover:-translate-y-px hover:brightness-105 disabled:translate-y-0 disabled:opacity-70',
                focusRing,
                'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              )}
            >
              {create.isPending ? <PulsatingDots size="sm" tone="current" /> : t('answers.submit')}
            </button>
            <button
              type="button"
              onClick={cancel}
              className={cn('h-10 rounded-xl px-4 text-sm font-semibold text-soft-foreground transition-colors hover:bg-foreground/6 hover:text-foreground', focusRing)}
            >
              {t('form.cancel')}
            </button>
            <p className="ms-auto hidden text-xs text-muted-foreground md:block">{t('answers.guideline')}</p>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={expand}
          className={cn(
            'flex h-12 min-w-0 flex-1 items-center rounded-2xl border border-border bg-surface px-4 text-start text-[0.9375rem] text-faint-foreground transition-[border-color,box-shadow] hover:border-border-strong',
            focusRing,
          )}
        >
          <span className="truncate">{draft.value.trim() ? draft.value : placeholder}</span>
        </button>
      )}
    </div>
  );
}
