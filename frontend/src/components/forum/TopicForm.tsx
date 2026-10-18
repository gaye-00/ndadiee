import { ArrowLeft, ArrowUpRight, CircleCheck, Eye, Lightbulb, PenLine, RotateCcw } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useBlocker, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { tagAccent } from './forumUtils';
import TopicTagInput from './TopicTagInput';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import MarkdownContent from '@/components/shared/MarkdownContent';
import MarkdownEditor from '@/components/shared/MarkdownEditor';
import UserAvatar from '@/components/shared/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useDraft } from '@/hooks/useDraft';
import { forumHome } from '@/hooks/useForumFilters';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useCreateQuestion, useQuestions, useUpdateQuestion } from '@/hooks/useQuestions';
import { isApple } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Question } from '@/types/question.types';
import { getApiError, getApiErrorMessage } from '@/utils/apiError';
import { questionSchema } from '@/utils/validators';

// Limites du sujet (QuestionRequest.java)
const MAX_TITLE = 200;
const MAX_BODY = 30000;

type Field = 'title' | 'tags' | 'body';

interface Values {
  title: string;
  tags: string[];
  body: string;
}

const EMPTY: Values = { title: '', tags: [], body: '' };
const isEmpty = (values: Values) => !values.title.trim() && values.tags.length === 0 && !values.body.trim();

// Les petits mots qui ne disent rien du sujet : on cherche les sujets proches avec les autres
const STOP_WORDS = new Set(
  'comment pourquoi quand quelle quel quels quelles avec dans pour sans sur entre plus moins mais donc faire être avoir mon mes une des les est sont what which when where with without from have does that this your their there how why can'.split(
    ' ',
  ),
);

/** Les deux mots les plus parlants d'un titre : la recherche des sujets proches (l'API veut chaque mot) */
function keywordsOf(title: string): string {
  return title
    .toLowerCase()
    .split(/[^\p{L}\p{N}.#+-]+/u)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
    .sort((a, b) => b.length - a.length)
    .slice(0, 2)
    .join(' ');
}

/**
 * Ouvrir ou modifier un sujet, comme l'éditeur de dev.to : le titre en grand, les tags, puis le contenu en Markdown
 * (barre d'outils, raccourcis) ; un onglet « Aperçu » montre le sujet tel qu'il sera publié. À côté, des conseils
 * qui suivent le champ en cours (le titre, les tags, le contenu) et, pendant qu'on écrit le titre, les sujets qui
 * répondent peut-être déjà à la question.
 *
 * Un nouveau sujet est gardé en brouillon sur l'appareil à chaque pause dans la frappe ; il revient à la prochaine
 * visite. En modification, quitter la page avec des changements non enregistrés demande confirmation. Les erreurs
 * (les règles du backend, rappelées sous chaque champ) s'affichent à la publication, puis à chaque correction.
 */
export default function TopicForm({ topic }: { topic?: Question }) {
  const { t } = useTranslation('forum');
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const editing = topic !== undefined;
  const ids = { title: useId(), tags: useId(), body: useId() };

  // La recherche du forum (« Poser la question » sans résultat) devient le début du titre
  const prefill = (location.state as { title?: string } | null)?.title;
  const initial: Values = topic ? { title: topic.title, tags: topic.tags.map((tag) => tag.name), body: topic.body } : { ...EMPTY, title: prefill ?? '' };
  const draft = useDraft<Values>(editing ? null : 'topic', initial, isEmpty);
  const values = draft.value;
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [focus, setFocus] = useState<Field>('title');
  const [errors, setErrors] = useState<Partial<Record<Field | 'form', string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const leaving = useRef(false);
  const create = useCreateQuestion();
  const update = useUpdateQuestion(topic ?? { id: 0, slug: '' });
  const images = useImageUpload();
  const pending = create.isPending || update.isPending;

  const dirty = editing && (values.title !== topic.title || values.body !== topic.body || values.tags.join('|') !== topic.tags.map((tag) => tag.name).join('|'));

  // Quitter une modification non enregistrée : on demande d'abord (navigation dans l'application, puis onglet fermé)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!dirty) {
      return undefined;
    }
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function validate(next: Values) {
    const parsed = questionSchema.safeParse(next);
    if (parsed.success) {
      return { data: parsed.data, errors: {} };
    }
    const found: Partial<Record<Field, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as Field;
      found[field] ??= issue.message;
    });
    return { data: null, errors: found };
  }

  function change(next: Partial<Values>) {
    const merged = { ...values, ...next };
    draft.setValue(merged);
    // Après une première tentative, les erreurs suivent la frappe
    if (submitted) {
      setErrors(validate(merged).errors);
    }
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (pending) {
      return;
    }
    // Une image encore en route : son repère serait publié à sa place
    if (images.pending > 0) {
      toast(t('form.imagesPending'));
      return;
    }
    setSubmitted(true);
    const result = validate(values);
    if (!result.data) {
      setErrors(result.errors);
      setMode('write');
      const first = (['title', 'tags', 'body'] as const).find((field) => result.errors[field]);
      if (first) {
        requestAnimationFrame(() => document.getElementById(ids[first])?.focus());
      }
      return;
    }
    setErrors({});
    const body = { title: result.data.title, body: result.data.body, tags: result.data.tags };
    const onError = (failure: unknown) => {
      const fields = getApiError(failure)?.validationErrors;
      if (fields) {
        const mapped: Partial<Record<Field | 'form', string>> = {};
        Object.entries(fields).forEach(([field, message]) => {
          const key = field.replace(/\[\d+\].*$/, '') as Field;
          mapped[(['title', 'tags', 'body'] as string[]).includes(key) ? key : 'form'] = message;
        });
        setErrors(mapped);
      } else {
        setErrors({ form: getApiErrorMessage(failure) });
      }
    };

    if (editing) {
      update.mutate(body, {
        onSuccess: (updated) => {
          leaving.current = true;
          toast.success(t('form.updated'));
          void navigate(paths.topic(updated.slug), { replace: true, viewTransition: true });
        },
        onError,
      });
    } else {
      create.mutate(body, {
        onSuccess: (created) => {
          draft.clear();
          leaving.current = true;
          toast.success(t('form.published'));
          void navigate(paths.topic(created.slug), { replace: true, viewTransition: true });
        },
        onError,
      });
    }
  }

  function reset() {
    draft.clear();
    draft.setValue(EMPTY);
    setErrors({});
    setSubmitted(false);
    setConfirmReset(false);
    document.getElementById(ids.title)?.focus();
  }

  const backTo = editing ? paths.topic(topic.slug) : forumHome();

  return (
    <div className="relative isolate overflow-x-clip">
      <div aria-hidden className="halo halo-gold -top-72 -start-56 -z-10 size-[44rem] animate-float" />

      <div className="mx-auto max-w-[90rem] px-4 pt-6 pb-24 sm:px-6 sm:pt-8 lg:px-10 xl:px-16">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            to={backTo}
            viewTransition
            className="group/back inline-flex items-center gap-2 rounded-full text-sm font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <ArrowLeft aria-hidden className="size-4 transition-transform group-hover/back:-translate-x-0.5 rtl:-scale-x-100" />
            {t(editing ? 'form.backToTopic' : 'topic.back')}
          </Link>
          <h1 className="font-display text-h4">{t(editing ? 'form.editTitle' : 'form.newTitle')}</h1>
          <div role="tablist" aria-label={t('form.mode')} className="ms-auto flex gap-0.5 rounded-xl bg-foreground/5 p-1">
            {(['write', 'preview'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={mode === tab}
                aria-controls="topic-form-panel"
                onClick={() => setMode(tab)}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-[0.625rem] px-3.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
                  mode === tab ? 'bg-surface text-foreground shadow-[0_1px_3px_var(--float-shadow)]' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab === 'write' ? <PenLine aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
                {t(tab === 'write' ? 'form.write' : 'form.preview')}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem] xl:gap-8">
          <form onSubmit={submit} noValidate className="glass min-w-0 overflow-hidden rounded-[1.75rem]">
            <span aria-hidden className="block h-1.5 bg-kente" />
            <div id="topic-form-panel" role="tabpanel">
              {mode === 'write' ? (
                <div className="flex flex-col gap-7 px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
                  {draft.restored && !editing && (
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-jade/25 bg-jade/8 px-4 py-2.5 text-sm text-soft-foreground">
                      <CircleCheck aria-hidden className="size-4 text-jade" />
                      {t('form.draftRestored')}
                      <button
                        type="button"
                        onClick={() => setConfirmReset(true)}
                        className="ms-auto inline-flex items-center gap-1.5 rounded-full text-sm font-bold text-gold underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70"
                      >
                        <RotateCcw aria-hidden className="size-3.5" />
                        {t('form.startOver')}
                      </button>
                    </p>
                  )}

                  {/* ── Le titre ── */}
                  <Field id={ids.title} label={t('form.titleLabel')} error={errors.title} hint={t('form.titleHint')} count={[values.title.length, MAX_TITLE]}>
                    <TitleInput
                      id={ids.title}
                      value={values.title}
                      onChange={(title) => change({ title })}
                      onFocus={() => setFocus('title')}
                      invalid={errors.title !== undefined}
                      describedBy={`${ids.title}-help`}
                      placeholder={t('form.titlePlaceholder')}
                      autoFocus={!editing}
                    />
                  </Field>

                  {/* ── Les tags ── */}
                  <Field id={ids.tags} label={t('form.tagsLabel')} error={errors.tags} hint={t('form.tagsHint', { count: 5 })}>
                    <TopicTagInput
                      id={ids.tags}
                      value={values.tags}
                      onChange={(tags) => change({ tags })}
                      onFocus={() => setFocus('tags')}
                      invalid={errors.tags !== undefined}
                      describedBy={`${ids.tags}-help`}
                    />
                  </Field>

                  {/* ── Le contenu ── */}
                  <Field id={ids.body} label={t('form.bodyLabel')} error={errors.body}>
                    <MarkdownEditor
                      id={ids.body}
                      value={values.body}
                      onChange={(body) => change({ body })}
                      onFocus={() => setFocus('body')}
                      onSubmit={() => submit()}
                      placeholder={t('form.bodyPlaceholder')}
                      minRows={14}
                      maxLength={MAX_BODY}
                      invalid={errors.body !== undefined}
                      describedBy={errors.body ? `${ids.body}-help` : undefined}
                      hint={t('form.submitHint', { mod: isApple ? '⌘' : 'Ctrl' })}
                      onUploadImage={images.upload}
                    />
                  </Field>
                </div>
              ) : (
                <Preview values={values} author={user} />
              )}
            </div>

            {errors.form && (
              <p role="alert" className="mx-5 mb-4 rounded-xl border border-coral/25 bg-coral/8 px-4 py-3 text-sm text-coral sm:mx-8 lg:mx-12">
                {errors.form}
              </p>
            )}

            {/* ── Publier : la barre reste au bas de l'écran pendant qu'on écrit un long sujet ── */}
            <div className="flex flex-wrap items-center gap-3 border-t border-border-subtle bg-surface/85 px-5 py-3.5 backdrop-blur-xl saver:bg-surface sm:px-8 md:sticky md:bottom-0 lg:px-12">
              <button
                type="submit"
                disabled={pending || images.pending > 0 || (editing && !dirty)}
                className={cn(
                  'inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-[0.875rem] bg-kente-warm px-5 text-sm font-bold text-kente-night',
                  'shadow-[0_12px_28px_-14px_var(--kente-coral)] transition-[translate,box-shadow,opacity] duration-300 enabled:hover:-translate-y-px disabled:opacity-60',
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
              >
                {pending ? <PulsatingDots size="sm" tone="current" /> : t(editing ? 'form.save' : 'form.publish')}
              </button>
              {editing ? (
                <Link to={backTo} viewTransition className="h-11 rounded-[0.875rem] px-4 text-sm leading-11 font-semibold text-soft-foreground transition-colors outline-none hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70">
                  {t('form.cancel')}
                </Link>
              ) : (
                <p aria-live="polite" className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  {draft.savedAt && (
                    <>
                      <span aria-hidden className="size-1.5 rounded-full bg-jade" />
                      {t('form.draftSaved')}
                    </>
                  )}
                </p>
              )}
              {!editing && !isEmpty(values) && (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="ms-auto h-9 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors outline-none hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
                >
                  {t('form.discard')}
                </button>
              )}
            </div>
          </form>

          <aside aria-label={t('form.helpLabel')} className="flex flex-col gap-4 lg:sticky lg:top-22">
            <Guide field={focus} />
            {!editing && <SimilarTopics title={values.title} />}
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={t('form.discardTitle')}
        description={t('form.discardText')}
        confirmLabel={t('form.discardConfirm')}
        destructive
        onConfirm={reset}
      />
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title={t('form.leaveTitle')}
        description={t('form.leaveText')}
        confirmLabel={t('form.leaveConfirm')}
        cancelLabel={t('form.leaveCancel')}
        destructive
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  /** Longueur et maximum : le compteur s'affiche à l'approche de la limite */
  count?: [number, number];
  children: ReactNode;
}

/** Un champ du formulaire : son libellé, et sous lui l'erreur (en rouge) ou l'aide, reliées au champ. */
function Field({ id, label, error, hint, count, children }: FieldProps) {
  const near = count && count[0] > count[1] * 0.8;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      {children}
      {(error || hint || near) && (
        <p id={`${id}-help`} role={error ? 'alert' : undefined} className={cn('flex gap-3 text-xs', error ? 'text-coral' : 'text-muted-foreground')}>
          <span className="min-w-0 flex-1">{error ?? hint}</span>
          {near && <span className={cn('font-mono tabular-nums', count[0] > count[1] ? 'text-coral' : 'text-gold')}>{`${count[0]}/${count[1]}`}</span>}
        </p>
      )}
    </div>
  );
}

interface TitleInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  invalid: boolean;
  describedBy: string;
  placeholder: string;
  autoFocus: boolean;
}

/** Le titre, en grand comme sur dev.to : un champ qui passe à la ligne et grandit, sans saut de ligne possible. */
function TitleInput({ id, value, onChange, onFocus, invalid, describedBy, placeholder, autoFocus }: TitleInputProps) {
  const area = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = area.current;
    if (element) {
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={area}
      id={id}
      rows={1}
      value={value}
      // Un titre tient sur une ligne : Entrée ne l'allonge pas, un saut de ligne collé devient une espace
      onChange={(event) => onChange(event.target.value.replace(/\s*\n\s*/g, ' '))}
      onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
      onFocus={onFocus}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      placeholder={placeholder}
      maxLength={MAX_TITLE + 20}
      autoFocus={autoFocus}
      dir="auto"
      className="w-full resize-none overflow-hidden bg-transparent font-display text-h2 text-foreground outline-none placeholder:text-faint-foreground/70"
    />
  );
}

/** L'aperçu : le sujet tel qu'il sera publié, avec ses tags et son contenu rendu. */
function Preview({ values, author }: { values: Values; author: ReturnType<typeof useAuth>['user'] }) {
  const { t } = useTranslation('forum');

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      {author && (
        <div className="flex items-center gap-3">
          <UserAvatar user={author} size="lg" />
          <span>
            <span className="block font-bold text-foreground">{author.fullName}</span>
            <span className="text-[0.8125rem] text-muted-foreground">{t('form.previewNow')}</span>
          </span>
        </div>
      )}
      <h2 dir="auto" className={cn('mt-6 font-display text-h2', !values.title.trim() && 'text-faint-foreground')}>
        {values.title.trim() || t('form.previewNoTitle')}
      </h2>
      {values.tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {values.tags.map((tag) => (
            <li key={tag} style={tagAccent(tag.toLowerCase())} className="text-sm text-soft-foreground">
              <span className="font-mono font-semibold text-(--tag-accent)">#</span>
              {tag}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8">
        {values.body.trim() ? (
          <MarkdownContent className="text-[1.0625rem] leading-[1.75]">{values.body}</MarkdownContent>
        ) : (
          <p className="text-sm text-faint-foreground">{t('form.previewNoBody')}</p>
        )}
      </div>
    </div>
  );
}

/** Les conseils du champ en cours, comme la colonne d'aide de l'éditeur de dev.to. */
function Guide({ field }: { field: Field }) {
  const { t } = useTranslation('forum');
  const points = t(`guide.${field}.points`, { returnObjects: true }) as string[];

  return (
    <section aria-live="polite" className="rounded-2xl border border-gold/20 bg-gold/6 p-5">
      <h2 className="flex items-center gap-2 font-sans text-sm font-bold text-foreground">
        <Lightbulb aria-hidden className="size-4 text-gold" />
        {t(`guide.${field}.title`)}
      </h2>
      <ul className="mt-3 flex flex-col gap-2 text-[0.8125rem] leading-relaxed text-soft-foreground">
        {points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-gold" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Pendant qu'on écrit le titre : les sujets qui répondent peut-être déjà à la question, avec leurs réponses. Ils
 * s'ouvrent dans un nouvel onglet : le brouillon reste.
 */
function SimilarTopics({ title }: { title: string }) {
  const { t } = useTranslation('forum');
  const typed = useDebounce(title, 500);
  const keywords = useMemo(() => keywordsOf(typed), [typed]);
  const { data, isFetching } = useQuestions({ q: keywords, sort: 'hotness,desc', size: 5 }, { enabled: keywords.length > 0 });
  const topics = keywords ? (data?.content ?? []) : [];

  if (!keywords || (!isFetching && topics.length === 0)) {
    return null;
  }

  return (
    <section aria-labelledby="similar-topics" className="glass overflow-hidden rounded-2xl">
      <h2 id="similar-topics" className="flex items-center gap-2 border-b border-border-subtle px-4 py-3 font-sans text-sm font-bold text-foreground">
        {t('form.similarTitle')}
        {isFetching && <PulsatingDots size="sm" />}
      </h2>
      <ul>
        {topics.map((item) => (
          <li key={item.id} className="border-b border-border-subtle last:border-0">
            <Link
              to={paths.topic(item.slug)}
              target="_blank"
              rel="noopener"
              className="group/similar flex gap-2 px-4 py-3 transition-colors outline-none hover:bg-foreground/4 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-inset"
            >
              <span className="min-w-0 flex-1">
                <span dir="auto" className="line-clamp-2 text-[0.8125rem] leading-snug font-semibold text-foreground group-hover/similar:text-gold">
                  {item.title}
                </span>
                <span className={cn('mt-1 block font-mono text-[0.6875rem]', item.hasAcceptedAnswer ? 'text-jade' : 'text-muted-foreground')}>
                  {item.hasAcceptedAnswer ? t('card.solved') : t('card.answers', { count: item.answerCount })}
                </span>
              </span>
              <ArrowUpRight aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
