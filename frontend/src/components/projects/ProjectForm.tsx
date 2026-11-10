import { ArrowLeft, ArrowUpRight, CircleCheck, Eye, PenLine, RotateCcw, Rocket, Save } from 'lucide-react';
import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import GithubRepoImport, { type ImportedField } from './GithubRepoImport';
import Checklist, { ProgressRing } from './form/Checklist';
import CoverPicker from './form/CoverPicker';
import { FormField, FormSection } from './form/FormSection';
import { inputClass } from './form/formStyles';
import GalleryEditor from './form/GalleryEditor';
import LicensePicker from './form/LicensePicker';
import { PreviewCard, PreviewPage } from './form/ProjectPreview';
import {
  checklistOf,
  completeDraft,
  draftErrorsOf,
  draftOf,
  EMPTY_DRAFT,
  GOOD_STACK,
  GOOD_STORY,
  GOOD_TAGLINE,
  isDraftChanged,
  isDraftEmpty,
  isWebUrl,
  LIMITS,
  previewProjectOf,
  progressOf,
  toProjectRequest,
  toProjectUpdateRequest,
  validateDraft,
  withScheme,
  type ChecklistItem,
  type DraftErrors,
  type ProjectDraft,
} from './form/projectDraft';
import RolesEditor from './form/RolesEditor';
import StackInput from './form/StackInput';
import { useLocalImages } from './form/useLocalImages';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import MarkdownEditor from '@/components/shared/MarkdownEditor';
import { WovenThreads } from '@/components/shared/WovenMotif';
import { useAuth } from '@/hooks/useAuth';
import { useDraft } from '@/hooks/useDraft';
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { isApple } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { GithubRepository } from '@/types/github.types';
import type { Project } from '@/types/project.types';
import { getApiError, getApiErrorMessage } from '@/utils/apiError';

// L'ordre des champs dans le formulaire : la première erreur reçoit le focus
const FIELD_ORDER = ['name', 'tagline', 'tags', 'cover', 'coverCredit', 'coverSourceUrl', 'gallery', 'description', 'repositoryUrl', 'demoUrl', 'license', 'roles'];

// Ce que la page du projet sait afficher dans une description (projects/markdownBlocks.ts)
const DESCRIPTION_FORMATS = ['bold', 'code', 'list'] as const;

/**
 * Publier un projet, en cinq étapes sur une seule page : l'essentiel (nom, accroche, technologies), les images
 * (couverture et galerie), le récit, les liens et la licence, puis l'équipe (les rôles recherchés). En tête, l'import
 * d'un dépôt GitHub remplit ce qu'il peut, et s'annule d'un clic.
 *
 * À côté, la carte du projet telle que la vitrine la montrera, mise à jour à chaque frappe, et « prêt à x % » : ce
 * qui rend un projet attirant, chaque étape restante menant à son champ. L'onglet « Aperçu » montre sa page.
 *
 * Le projet est gardé en brouillon sur l'appareil à chaque pause dans la frappe, images comprises (elles sont déjà
 * envoyées) : il revient à la prochaine visite. Les erreurs (les règles du backend) s'affichent à la publication,
 * puis à chaque correction ; projet, galerie et rôles sont publiés ensemble, ou pas du tout.
 *
 * Avec un projet déjà publié, le même formulaire le modifie : il part de ce que le projet montre, sans brouillon ni
 * import, et enregistre textes, images et liens ensemble. Les rôles recherchés et le recrutement se gèrent dans
 * l'espace d'équipe : l'étape 5 y mène.
 */
export default function ProjectForm({ project }: { project?: Project }) {
  const { t } = useTranslation('projectForm');
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const base = useId();
  const ids = {
    name: `${base}-name`,
    tagline: `${base}-tagline`,
    tags: `${base}-tags`,
    cover: `${base}-cover`,
    gallery: `${base}-gallery`,
    description: `${base}-description`,
    repositoryUrl: `${base}-repository`,
    demoUrl: `${base}-demo`,
    license: `${base}-license`,
    team: `${base}-team`,
  };

  // Un nouveau projet s'écrit dans le brouillon de l'appareil ; un projet publié, dans l'état de la page
  const draft = useDraft<ProjectDraft>('project', EMPTY_DRAFT, isDraftEmpty);
  const original = useMemo(() => (project ? draftOf(project) : null), [project]);
  const [edited, setEdited] = useState<ProjectDraft | null>(null);
  const editing = original !== null;
  const values = original ? (edited ?? original) : completeDraft(draft.value);
  const dirty = original ? isDraftChanged(values, original) : !isDraftEmpty(values);
  const setValues = (apply: (current: ProjectDraft) => ProjectDraft) =>
    original ? setEdited((current) => apply(current ?? original)) : draft.setValue((current) => apply(completeDraft(current)));
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  // Après une première tentative, les erreurs suivent la frappe ; celles du serveur partent au changement suivant
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<DraftErrors>({});
  const errors: DraftErrors = { ...(submitted ? validateDraft(values) : {}), ...serverErrors };
  const [confirmReset, setConfirmReset] = useState(false);
  const images = useLocalImages();
  const create = useCreateProject();
  const update = useUpdateProject();

  // ── Les envois d'images en cours : la publication les attend ──
  const [uploading, setUploading] = useState(0);
  const track = useCallback(<T,>(promise: Promise<T>) => {
    setUploading((count) => count + 1);
    return promise.finally(() => setUploading((count) => count - 1));
  }, []);

  // ── L'import GitHub : ce qu'il a rempli peut être remplacé par un autre import, ou annulé ──
  const [imported, setImported] = useState<{ before: ProjectDraft; values: Partial<ProjectDraft>; suggestedTags: string[] } | null>(null);
  const [importCount, setImportCount] = useState(0);

  function change(next: Partial<ProjectDraft>) {
    // Sur le dernier état : une image qui arrive pendant qu'on écrit n'efface pas la frappe
    setValues((current) => ({ ...current, ...next }));
    if (Object.keys(serverErrors).length > 0) {
      setServerErrors({});
    }
  }

  function applyImport(repository: GithubRepository): { fields: ImportedField[]; tags: number } {
    const before = imported?.before ?? values;
    // Un champ vide, ou rempli par l'import précédent, prend la valeur du dépôt ; ce que le membre a écrit reste
    const free = (field: keyof ProjectDraft) => {
      const current = values[field];
      return (typeof current === 'string' && !current.trim()) || (imported !== null && imported.values[field] === current);
    };
    const next: Partial<ProjectDraft> = { repositoryUrl: repository.repositoryUrl };
    const fields: ImportedField[] = values.repositoryUrl === repository.repositoryUrl ? [] : ['repository'];
    const fill = <K extends keyof ProjectDraft>(field: K, value: ProjectDraft[K] | null, label: ImportedField) => {
      if (value && free(field) && values[field] !== value) {
        next[field] = value;
        fields.push(label);
      }
    };
    fill('name', repository.name.slice(0, LIMITS.name), 'name');
    fill('tagline', repository.description, 'tagline');
    fill('description', repository.readmeExcerpt, 'description');
    fill('license', repository.license, 'license');
    fill('demoUrl', repository.homepage, 'demo');
    let tags = 0;
    const replaceableTags = values.tags.length === 0 || (imported !== null && imported.values.tags === values.tags);
    if (replaceableTags && repository.suggestedTags.length > 0) {
      next.tags = repository.suggestedTags.slice(0, LIMITS.tags);
      tags = next.tags.length;
      fields.push('tags');
    }

    change(next);
    setImported({ before, values: next, suggestedTags: repository.suggestedTags });
    setImportCount((count) => count + 1);
    return { fields, tags };
  }

  function undoImport() {
    if (imported) {
      setValues(() => imported.before);
      setServerErrors({});
      setImported(null);
      setImportCount((count) => count + 1);
    }
  }

  // ── Mener à un champ : la première erreur, une étape de « prêt à x % » ──
  function goTo(elementId: string) {
    setMode('write');
    requestAnimationFrame(() => {
      const element = document.getElementById(elementId);
      if (!element) {
        return;
      }
      element.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      element.focus({ preventScroll: true });
    });
  }

  function elementOf(path: string): string {
    const [field, index, part] = path.split('.');
    if (field === 'roles' && index !== undefined) {
      const role = values.roles[Number(index)];
      return role && part === 'title' ? `role-${role.id}-title` : ids.team;
    }
    const known: Record<string, string> = {
      name: ids.name,
      tagline: ids.tagline,
      tags: ids.tags,
      cover: ids.cover,
      coverCredit: ids.cover,
      coverSourceUrl: ids.cover,
      gallery: `${ids.gallery}-section`,
      description: ids.description,
      repositoryUrl: ids.repositoryUrl,
      demoUrl: ids.demoUrl,
      license: ids.license,
    };
    return known[field] ?? ids.name;
  }

  function focusFirstError(found: DraftErrors) {
    const first = Object.keys(found).sort((a, b) => FIELD_ORDER.indexOf(a.split('.')[0]) - FIELD_ORDER.indexOf(b.split('.')[0]))[0];
    if (first) {
      goTo(elementOf(first));
    }
  }

  const checklistTargets: Record<ChecklistItem, string> = {
    name: ids.name,
    tagline: ids.tagline,
    stack: ids.tags,
    cover: ids.cover,
    gallery: `${ids.gallery}-section`,
    story: ids.description,
    links: isWebUrl(values.repositoryUrl) ? ids.demoUrl : ids.repositoryUrl,
    roles: ids.team,
  };

  // ── Publier ──
  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (create.isPending || update.isPending) {
      return;
    }
    if (uploading > 0) {
      toast(t('form.imagesPending'));
      return;
    }
    setSubmitted(true);
    setServerErrors({});
    const found = validateDraft(values);
    if (Object.keys(found).length > 0) {
      focusFirstError(found);
      return;
    }
    const onError = (failure: unknown) => {
      const fields = getApiError(failure)?.validationErrors;
      if (fields) {
        const mapped = draftErrorsOf(fields);
        setServerErrors(mapped);
        focusFirstError(mapped);
      } else {
        setServerErrors({ form: getApiErrorMessage(failure) });
      }
    };
    if (project) {
      update.mutate(
        { id: project.id, body: toProjectUpdateRequest(values) },
        {
          onSuccess: (saved) => {
            setEdited(null);
            toast.success(t('form.saved', { name: saved.name }));
            void navigate(paths.project(saved.slug), { replace: true, viewTransition: true });
          },
          onError,
        },
      );
      return;
    }
    create.mutate(toProjectRequest(values), {
      onSuccess: (created) => {
        draft.clear();
        toast.success(t('form.published', { name: created.name }));
        void navigate(paths.project(created.slug), { replace: true, viewTransition: true });
      },
      onError,
    });
  }

  function reset() {
    if (editing) {
      setEdited(null);
    } else {
      draft.clear();
      draft.setValue(EMPTY_DRAFT);
    }
    setServerErrors({});
    setSubmitted(false);
    setImported(null);
    setConfirmReset(false);
    setImportCount((count) => count + 1);
    goTo(ids.name);
  }

  const checklist = checklistOf(values);
  const progress = progressOf(checklist);
  const preview = previewProjectOf(values, user);
  const sectionDone = {
    essentials: values.name.trim().length >= 3 && values.tagline.trim().length >= GOOD_TAGLINE && values.tags.length >= GOOD_STACK,
    images: values.cover !== null && values.gallery.length > 0,
    story: values.description.trim().length >= GOOD_STORY,
    links: isWebUrl(values.repositoryUrl) || isWebUrl(values.demoUrl),
    team: values.recruiting && values.roles.some((role) => role.title.trim()),
  };
  const pending = create.isPending || update.isPending;

  return (
    <div className="relative isolate overflow-x-clip">
      {/* Les dégradés des fils des motifs tissés (les métiers de l'équipe, l'aperçu des rôles) */}
      <WovenThreads />
      <div aria-hidden className="halo halo-gold -top-72 -start-56 -z-10 size-[44rem] animate-float" />
      <div aria-hidden className="halo halo-jade top-[40rem] end-[-16rem] -z-10 size-[36rem] opacity-60" />

      <div className="mx-auto max-w-[90rem] px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:px-10 xl:px-16">
        {/* ── En-tête : retour, titre, écrire ou voir ── */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            to={project ? paths.project(project.slug) : paths.myProjects}
            viewTransition
            className="group/back inline-flex items-center gap-2 rounded-full text-sm font-semibold text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <ArrowLeft aria-hidden className="size-4 transition-transform group-hover/back:-translate-x-0.5 rtl:-scale-x-100" />
            {t(project ? 'form.backToProject' : 'form.back')}
          </Link>
          <h1 className="font-display text-h4">{t(project ? 'form.editTitle' : 'form.title')}</h1>
          <div role="tablist" aria-label={t('form.mode')} className="ms-auto flex gap-0.5 rounded-xl bg-foreground/5 p-1">
            {(['write', 'preview'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={mode === tab}
                aria-controls="project-form-panel"
                onClick={() => setMode(tab)}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-[0.625rem] px-3.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/70',
                  mode === tab ? 'bg-surface text-foreground shadow-[0_1px_3px_var(--float-shadow)]' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab === 'write' ? <PenLine aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
                {t(tab === 'write' ? 'form.write' : 'form.preview')}
              </button>
            ))}
          </div>
        </div>

        <form
          id="project-form"
          onSubmit={submit}
          // Entrée dans un champ d'une ligne ne publie pas le projet : on publie avec le bouton, ou Ctrl + Entrée
          // dans la description
          onKeyDown={(event) => event.key === 'Enter' && event.target instanceof HTMLInputElement && event.preventDefault()}
          noValidate
          className="mt-6"
        >
          <div id="project-form-panel" role="tabpanel">
            {mode === 'preview' ? (
              <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
                <div className="glass min-w-0 rounded-[1.75rem] p-5 sm:p-8">
                  <PreviewPage project={preview} />
                </div>
                <div className="lg:sticky lg:top-22">
                  <PreviewCard project={preview} />
                </div>
              </div>
            ) : (
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8">
                <div className="flex min-w-0 flex-col gap-6">
                  {!editing && draft.restored && (
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

                  {!editing && <GithubRepoImport onImport={applyImport} onUndo={undoImport} />}

                  {/* ── 1. L'essentiel ── */}
                  <FormSection id={`${base}-essentials`} index={1} title={t('section.essentials.title')} description={t('section.essentials.text')} complete={sectionDone.essentials}>
                    <FormField id={ids.name} label={t('fields.name')} error={errors.name} hint={t('fields.nameHint')} count={[values.name.length, LIMITS.name]}>
                      <NameInput
                        id={ids.name}
                        value={values.name}
                        onChange={(name) => change({ name })}
                        invalid={errors.name !== undefined}
                        placeholder={t('fields.namePlaceholder')}
                        autoFocus={!editing && !draft.restored}
                      />
                    </FormField>
                    <FormField id={ids.tagline} label={t('fields.tagline')} error={errors.tagline} hint={t('fields.taglineHint')} count={[values.tagline.length, LIMITS.tagline]}>
                      <input
                        id={ids.tagline}
                        value={values.tagline}
                        onChange={(event) => change({ tagline: event.target.value.replace(/\s*\n\s*/g, ' ') })}
                        placeholder={t('fields.taglinePlaceholder')}
                        maxLength={LIMITS.tagline + 20}
                        aria-invalid={errors.tagline ? true : undefined}
                        aria-describedby={`${ids.tagline}-help`}
                        dir="auto"
                        className={inputClass(errors.tagline !== undefined)}
                      />
                    </FormField>
                    <FormField id={ids.tags} label={t('fields.tags')} error={errors.tags} hint={t('fields.tagsHint', { count: LIMITS.tags })}>
                      <StackInput
                        id={ids.tags}
                        value={values.tags}
                        onChange={(tags) => change({ tags })}
                        suggested={imported?.suggestedTags}
                        invalid={errors.tags !== undefined}
                        describedBy={`${ids.tags}-help`}
                      />
                    </FormField>
                  </FormSection>

                  {/* ── 2. Les images ── */}
                  <FormSection id={`${base}-images`} index={2} title={t('section.images.title')} description={t('section.images.text')} complete={sectionDone.images}>
                    <div className="flex flex-col gap-2">
                      <span className="eyebrow">{t('fields.cover')}</span>
                      <CoverPicker
                        id={ids.cover}
                        value={values.cover}
                        credit={values.coverCredit}
                        sourceUrl={values.coverSourceUrl}
                        onChange={(cover) => change({ cover })}
                        onCreditChange={change}
                        errors={{ cover: errors.cover, coverCredit: errors.coverCredit, coverSourceUrl: errors.coverSourceUrl }}
                        images={images}
                        track={track}
                      />
                    </div>
                    <div id={`${ids.gallery}-section`} tabIndex={-1} className="scroll-mt-24 outline-none">
                      <GalleryEditor id={ids.gallery} value={values.gallery} onChange={(gallery) => change({ gallery })} errors={errors} images={images} track={track} />
                    </div>
                  </FormSection>

                  {/* ── 3. Le récit ── */}
                  <FormSection id={`${base}-story`} index={3} title={t('section.story.title')} description={t('section.story.text')} complete={sectionDone.story}>
                    <FormField id={ids.description} label={t('fields.description')} error={errors.description}>
                      <MarkdownEditor
                        id={ids.description}
                        value={values.description}
                        onChange={(description) => change({ description })}
                        onSubmit={() => submit()}
                        placeholder={t('fields.descriptionPlaceholder')}
                        minRows={9}
                        maxLength={LIMITS.description}
                        invalid={errors.description !== undefined}
                        describedBy={errors.description ? `${ids.description}-help` : undefined}
                        formats={DESCRIPTION_FORMATS}
                        hint={t('fields.descriptionHint', { mod: isApple ? '⌘' : 'Ctrl' })}
                      />
                    </FormField>
                  </FormSection>

                  {/* ── 4. Les liens et la licence ── */}
                  <FormSection id={`${base}-links`} index={4} title={t('section.links.title')} description={t('section.links.text')} complete={sectionDone.links}>
                    <div className="grid gap-5 md:grid-cols-2">
                      <FormField id={ids.repositoryUrl} label={t('fields.repository')} optional error={errors.repositoryUrl}>
                        <input
                          id={ids.repositoryUrl}
                          type="url"
                          inputMode="url"
                          value={values.repositoryUrl}
                          onChange={(event) => change({ repositoryUrl: event.target.value })}
                          onBlur={() => values.repositoryUrl && change({ repositoryUrl: withScheme(values.repositoryUrl) })}
                          placeholder="https://github.com/…"
                          aria-invalid={errors.repositoryUrl ? true : undefined}
                          aria-describedby={`${ids.repositoryUrl}-help`}
                          dir="ltr"
                          className={inputClass(errors.repositoryUrl !== undefined)}
                        />
                      </FormField>
                      <FormField id={ids.demoUrl} label={t('fields.demo')} optional error={errors.demoUrl}>
                        <input
                          id={ids.demoUrl}
                          type="url"
                          inputMode="url"
                          value={values.demoUrl}
                          onChange={(event) => change({ demoUrl: event.target.value })}
                          onBlur={() => values.demoUrl && change({ demoUrl: withScheme(values.demoUrl) })}
                          placeholder="https://"
                          aria-invalid={errors.demoUrl ? true : undefined}
                          aria-describedby={`${ids.demoUrl}-help`}
                          dir="ltr"
                          className={inputClass(errors.demoUrl !== undefined)}
                        />
                      </FormField>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span id={`${ids.license}-label`} className="eyebrow">
                        {t('fields.license')}
                      </span>
                      <LicensePicker key={importCount} id={ids.license} value={values.license} onChange={(license) => change({ license })} error={errors.license} />
                    </div>
                  </FormSection>

                  {/* ── 5. L'équipe ── */}
                  <FormSection
                    id={`${base}-team-section`}
                    index={5}
                    title={t('section.team.title')}
                    description={t(project ? 'section.team.editText' : 'section.team.text')}
                    complete={sectionDone.team}
                  >
                    {project ? (
                      <TeamElsewhere id={ids.team} project={project} roles={values.roles.length} />
                    ) : (
                      <RolesEditor
                        id={ids.team}
                        recruiting={values.recruiting}
                        roles={values.roles}
                        repositoryUrl={values.repositoryUrl}
                        onChange={change}
                        errors={errors}
                      />
                    )}
                  </FormSection>
                </div>

                {/* ── À côté : la carte de la vitrine, et ce qui reste ── */}
                <aside aria-label={t('form.aside')} className="hidden flex-col gap-4 lg:sticky lg:top-22 lg:flex">
                  <PreviewCard project={preview} />
                  <Checklist items={checklist} onGoTo={(item) => goTo(checklistTargets[item])} />
                </aside>
              </div>
            )}
          </div>

          {errors.form && (
            <p role="alert" className="mt-6 rounded-xl border border-coral/25 bg-coral/8 px-4 py-3 text-sm text-coral">
              {errors.form}
            </p>
          )}

          {/* ── Publier : la barre reste au bas de l'écran ── */}
          <div className="sticky bottom-3 z-20 mt-8 sm:bottom-4">
            <div className="flex items-center gap-3 rounded-[1.375rem] border border-border bg-surface/85 p-2.5 ps-3 shadow-float backdrop-blur-xl saver:bg-surface saver:backdrop-blur-none sm:gap-4 sm:p-3 sm:ps-4">
              <span className="lg:hidden">
                <ProgressRing progress={progress} size="sm" />
              </span>
              <p aria-live="polite" className="hidden min-w-0 items-center gap-2 font-mono text-xs text-muted-foreground sm:inline-flex">
                {uploading > 0 ? (
                  <>
                    <PulsatingDots size="sm" />
                    {t('form.uploading', { count: uploading })}
                  </>
                ) : editing ? (
                  <>
                    <span aria-hidden className={cn('size-1.5 rounded-full', dirty ? 'animate-pulse bg-gold' : 'bg-jade')} />
                    {t(dirty ? 'form.unsaved' : 'form.upToDate')}
                  </>
                ) : (
                  draft.savedAt && (
                    <>
                      <span aria-hidden className="size-1.5 rounded-full bg-jade" />
                      {t('form.draftSaved')}
                    </>
                  )
                )}
              </p>
              <span className="flex-1" />
              {dirty && (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="h-10 rounded-xl px-3 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
                >
                  {t(editing ? 'form.discardChanges' : 'form.discard')}
                </button>
              )}
              <button
                type="submit"
                disabled={pending || uploading > 0 || (editing && !dirty)}
                className={cn(
                  'group/publish inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-[0.875rem] bg-kente-warm px-5 text-sm font-bold text-kente-night',
                  'shadow-[0_12px_28px_-14px_var(--kente-coral)] transition-[translate,box-shadow,opacity] duration-300 enabled:hover:-translate-y-px disabled:opacity-60',
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
              >
                {pending ? (
                  <PulsatingDots size="sm" tone="current" label={t(editing ? 'form.saving' : 'form.publishing')} />
                ) : editing ? (
                  <>
                    <Save aria-hidden className="size-4" />
                    {t('form.save')}
                  </>
                ) : (
                  <>
                    <Rocket aria-hidden className="size-4 transition-transform duration-500 ease-out-expo group-enabled/publish:group-hover/publish:-translate-y-0.5 group-enabled/publish:group-hover/publish:translate-x-0.5" />
                    {t('form.publish')}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={t(editing ? 'form.discardChangesTitle' : 'form.discardTitle')}
        description={t(editing ? 'form.discardChangesText' : 'form.discardText')}
        confirmLabel={t(editing ? 'form.discardChangesConfirm' : 'form.discardConfirm')}
        destructive
        onConfirm={reset}
      />
    </div>
  );
}

/**
 * L'étape 5 d'un projet publié : ses rôles recherchés et son recrutement se gèrent dans l'espace d'équipe, avec les
 * candidatures. Le lien n'y mène que pour l'équipe (un modérateur n'y entre pas).
 */
function TeamElsewhere({ id, project, roles }: { id: string; project: Project; roles: number }) {
  const { t } = useTranslation('projectForm');
  const inTeam = project.myMembershipStatus === 'ACCEPTED';

  return (
    <div id={id} tabIndex={-1} className="flex flex-col gap-4 rounded-2xl border border-border-subtle p-4 outline-none sm:flex-row sm:items-center sm:p-5">
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-soft-foreground">
        {!project.lookingForContributors
          ? t('form.teamNotRecruiting')
          : roles > 0
            ? t('form.teamRecruiting', { count: roles })
            : t('form.teamRecruitingEmpty')}
      </p>
      {inTeam && (
        <Link
          to={paths.workspaceRoles(project.slug)}
          viewTransition
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border-strong px-4 text-sm font-bold outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          {t('form.manageRoles')}
          <ArrowUpRight aria-hidden className="size-4 rtl:-scale-x-100" />
        </Link>
      )}
    </div>
  );
}

interface NameInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  placeholder: string;
  autoFocus: boolean;
}

/** Le nom, en grand : un champ qui passe à la ligne et grandit, sans saut de ligne possible. */
function NameInput({ id, value, onChange, invalid, placeholder, autoFocus }: NameInputProps) {
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
      // Un nom tient sur une ligne : Entrée ne l'allonge pas, un saut de ligne collé devient une espace
      onChange={(event) => onChange(event.target.value.replace(/\s*\n\s*/g, ' '))}
      onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
      aria-invalid={invalid || undefined}
      aria-describedby={`${id}-help`}
      placeholder={placeholder}
      maxLength={LIMITS.name + 20}
      autoFocus={autoFocus}
      dir="auto"
      spellCheck={false}
      className="w-full resize-none overflow-hidden bg-transparent font-display text-h2 text-foreground outline-none placeholder:text-faint-foreground/35"
    />
  );
}
