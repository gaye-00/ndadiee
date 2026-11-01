import { ArrowLeft, Check, CircleCheck, FolderPlus, RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useId, useState, type CSSProperties, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import OpeningCard, { type BoardOpening } from './OpeningCard';
import ErrorState from '@/components/feedback/ErrorState';
import PageLoader from '@/components/feedback/PageLoader';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import { statusPrimaryAction } from '@/components/feedback/statusActions';
import StatusPage from '@/components/feedback/StatusPage';
import { FormField, FormSection } from '@/components/projects/form/FormSection';
import { inputClass } from '@/components/projects/form/formStyles';
import { LIMITS, roleDraftSchema, toOpeningRequest, type DraftRole } from '@/components/projects/form/projectDraft';
import RoleFields from '@/components/projects/form/RoleFields';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import LazyImage from '@/components/shared/LazyImage';
import WovenMotif, { WovenThreads } from '@/components/shared/WovenMotif';
import { teamRoles, type RoleDefinition } from '@/config/roles';
import { useDashboard } from '@/hooks/useDashboard';
import { useDraft } from '@/hooks/useDraft';
import { useCreateOpening, useProject } from '@/hooks/useProjects';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Dashboard, DashboardProject } from '@/types/dashboard.types';
import type { Project, TeamRole } from '@/types/project.types';
import { getApiError, getApiErrorMessage } from '@/utils/apiError';

/** L'annonce en cours d'écriture : gardée en brouillon sur l'appareil à chaque pause dans la frappe */
type Values = Omit<DraftRole, 'id' | 'role'> & {
  /** Le slug du projet choisi */
  project: string;
  role: TeamRole | null;
};

type Field = 'project' | 'role' | 'title' | 'description' | 'starterIssueNumber' | 'starterIssueTitle';
type Errors = Partial<Record<Field, string>>;

const EMPTY: Values = { project: '', role: null, title: '', description: '', seats: 1, starterIssueNumber: '', starterIssueTitle: '' };

// Le projet seul n'est pas un brouillon : il revient de lui-même depuis l'adresse (?project=)
const isEmpty = (values: Values) =>
  values.role === null && !values.title.trim() && !values.description.trim() && !values.starterIssueNumber.trim() && !values.starterIssueTitle.trim();

const toTeamRole = (role: RoleDefinition) => role.id.toUpperCase() as TeamRole;

// Comme le backend (ProjectService.canManage) : le porteur et les mainteneurs publient les rôles d'un projet
const managedProjects = (dashboard: Dashboard) =>
  dashboard.projects.filter((project) => project.myStatus === 'ACCEPTED' && (project.myRole === 'OWNER' || project.myRole === 'MAINTAINER'));

const noop = () => undefined;

/**
 * Publier un rôle : pour quel projet, quel métier, puis ce qu'on attend et l'issue « premier pas » par laquelle
 * commencer. À côté, l'annonce prend forme telle qu'elle apparaîtra sur la page des annonces.
 *
 * Seuls les projets que le membre porte ou maintient sont proposés ; sans projet, la page mène à en publier un.
 */
export default function OpeningForm() {
  const { t } = useTranslation('openings');
  const { t: tc } = useTranslation();
  const projects = useDashboard(managedProjects);

  if (projects.isPending) {
    return <PageLoader />;
  }
  if (projects.isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <ErrorState title={t('form.loadFailed')} onRetry={() => void projects.refetch()} />
      </div>
    );
  }
  if (projects.data.length === 0) {
    return (
      <StatusPage
        motifs={[teamRoles[0]]}
        title={t('form.noProjectTitle')}
        description={t('form.noProjectText')}
        actions={
          <Link to={paths.newProject} viewTransition className={statusPrimaryAction}>
            <FolderPlus aria-hidden className="size-4.5" />
            {tc('actions.publishProject')}
          </Link>
        }
      />
    );
  }
  return <Composer managed={projects.data} />;
}

function Composer({ managed }: { managed: DashboardProject[] }) {
  const { t } = useTranslation('openings');
  const { t: tp } = useTranslation('projectForm');
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [params] = useSearchParams();
  // Depuis l'espace d'une équipe : son projet est déjà choisi, et le retour y ramène
  const requested = params.get('project');
  const draft = useDraft<Values>('opening', { ...EMPTY, project: requested ?? '' }, isEmpty);
  const { setValue } = draft;
  const values = draft.value;
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const create = useCreateOpening();
  const titleId = useId();
  // L'aperçu dit « à l'instant » : c'est l'annonce qu'on est en train d'écrire
  const [openedAt] = useState(() => new Date().toISOString());

  // Un brouillon retrouvé garde son texte, mais c'est le projet demandé qui compte
  useEffect(() => {
    if (requested) {
      setValue((current) => (current.project === requested ? current : { ...current, project: requested }));
    }
  }, [requested, setValue]);

  // Un seul projet : le choix est déjà fait
  const selectedOf = (slug: string) => managed.find((project) => project.slug === slug) ?? (managed.length === 1 ? managed[0] : undefined);
  const selected = selectedOf(values.project);
  // Sa stack, son porteur et son dépôt : pour l'aperçu, et le lien de l'issue « premier pas »
  const { data: project } = useProject(selected?.slug);

  const roleLabel = (role: TeamRole) => tc(`teamRoles.${role.toLowerCase() as Lowercase<TeamRole>}`);

  function validate(next: Values): Errors {
    const found: Errors = {};
    if (!selectedOf(next.project)) {
      found.project = t('form.projectRequired');
    }
    if (next.role === null) {
      found.role = t('form.roleRequired');
    }
    const parsed = roleDraftSchema.safeParse(next);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        found[issue.path[0] as Field] ??= issue.message;
      });
    }
    return found;
  }

  function change(next: Partial<Values>) {
    const merged = { ...values, ...next };
    setValue(merged);
    // Après une première tentative, les erreurs suivent la frappe
    if (submitted) {
      setErrors(validate(merged));
    }
  }

  // L'intitulé suit le métier tant qu'il n'a pas été écrit à la main
  function chooseRole(role: TeamRole) {
    const untouched = !values.title.trim() || (values.role !== null && values.title === roleLabel(values.role));
    change({ role, title: untouched ? roleLabel(role) : values.title });
  }

  function reset() {
    draft.clear();
    setValue({ ...EMPTY, project: requested ?? values.project });
    setErrors({});
    setSubmitted(false);
    setConfirmReset(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (create.isPending) {
      return;
    }
    setSubmitted(true);
    const found = validate(values);
    setErrors(found);
    if (!selected || values.role === null || Object.keys(found).length > 0) {
      // On remonte jusqu'à la première section à corriger
      const section = found.project ? 'opening-project' : found.role ? 'opening-role' : 'opening-details';
      document.getElementById(section)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    create.mutate(
      { projectId: selected.id, body: toOpeningRequest({ ...values, role: values.role }) },
      {
        onSuccess: (opening) => {
          draft.clear();
          toast.success(t('form.published', { title: opening.title }));
          // La page du projet descend jusqu'au rôle, et l'éclaire
          void navigate(paths.projectRoles(selected.slug, opening.id), { viewTransition: true });
        },
        onError: (error) => {
          const fields = getApiError(error)?.validationErrors;
          if (fields) {
            setErrors(fields);
          } else {
            toast.error(getApiErrorMessage(error));
          }
        },
      },
    );
  }

  // Sans intitulé, l'annonce porte le nom du métier
  const preview = previewOf(values, project, values.role ? roleLabel(values.role) : '', openedAt);

  return (
    <div className="relative isolate overflow-x-clip">
      {/* Les dégradés des fils des motifs tissés : les métiers, l'aperçu de l'annonce */}
      <WovenThreads />
      <div aria-hidden className="halo halo-gold -top-72 -start-56 -z-10 size-[44rem] animate-float" />
      <div aria-hidden className="halo halo-jade top-[36rem] end-[-16rem] -z-10 size-[34rem] opacity-60" />

      <div className="mx-auto max-w-[90rem] px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:px-10 xl:px-16">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            to={requested ? paths.workspaceRoles(requested) : paths.openings}
            viewTransition
            className="group/back inline-flex items-center gap-2 rounded-full text-sm font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <ArrowLeft aria-hidden className="size-4 transition-transform group-hover/back:-translate-x-0.5 rtl:-scale-x-100" />
            {tc('actions.back')}
          </Link>
          <h1 className="font-display text-h4">{tc('actions.publishRole')}</h1>
        </div>

        <form onSubmit={submit} noValidate>
          <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-8">
            <div className="flex min-w-0 flex-col gap-5">
              {draft.restored && !isEmpty(values) && (
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-jade/25 bg-jade/8 px-4 py-2.5 text-sm text-soft-foreground">
                  <CircleCheck aria-hidden className="size-4 text-jade" />
                  {t('form.draftRestored')}
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="ms-auto inline-flex items-center gap-1.5 rounded-full text-sm font-bold text-gold underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/70"
                  >
                    <RotateCcw aria-hidden className="size-3.5" />
                    {tp('form.startOver')}
                  </button>
                </p>
              )}

              <FormSection id="opening-project" index={1} title={t('form.projectTitle')} description={t('form.projectText')} complete={selected !== undefined}>
                <ProjectChoice projects={managed} value={selected?.slug ?? ''} error={errors.project} onChange={(slug) => change({ project: slug })} />
              </FormSection>

              <FormSection id="opening-role" index={2} title={t('form.roleTitle')} description={t('form.roleText')} complete={values.role !== null}>
                <RoleChoice value={values.role} error={errors.role} onChange={chooseRole} />
              </FormSection>

              <FormSection id="opening-details" index={3} title={t('form.detailsTitle')} description={t('form.detailsText')} complete={values.role !== null && values.title.trim().length > 0}>
                <FormField id={titleId} label={tp('team.titleLabel')} error={errors.title} count={[values.title.length, LIMITS.roleTitle]}>
                  <input
                    id={titleId}
                    value={values.title}
                    onChange={(event) => change({ title: event.target.value })}
                    placeholder={tp('team.titlePlaceholder')}
                    maxLength={LIMITS.roleTitle + 20}
                    aria-invalid={errors.title ? true : undefined}
                    aria-describedby={`${titleId}-help`}
                    dir="auto"
                    className={inputClass(errors.title !== undefined)}
                  />
                </FormField>
                {/* Le dépôt peut changer avec le projet : le lien de l'issue le suit */}
                <RoleFields values={values} errors={errors} repositoryUrl={project?.repositoryUrl ?? ''} onChange={change} />
              </FormSection>
            </div>

            <aside aria-label={tp('form.preview')} className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-22">
              <p className="eyebrow">{tp('form.preview')}</p>
              {preview ? (
                <>
                  {/* Une vraie carte d'annonce, mais rien n'y mène encore : on ne la parcourt pas au clavier */}
                  <div inert>
                    <OpeningCard key={preview.role} opening={preview} onApply={noop} />
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{t('form.previewHint')}</p>
                </>
              ) : (
                <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-border-strong p-6 text-center">
                  <p className="max-w-60 text-[0.8125rem] leading-relaxed text-muted-foreground">{t('form.previewEmpty')}</p>
                </div>
              )}
            </aside>
          </div>

          {/* ── Publier : la barre reste au bas de l'écran ── */}
          <div className="sticky bottom-3 z-20 mt-8 sm:bottom-4">
            <div className="flex items-center gap-3 rounded-[1.375rem] border border-border bg-surface/85 p-2.5 ps-4 shadow-float backdrop-blur-xl saver:bg-surface saver:backdrop-blur-none">
              <p aria-live="polite" className="hidden min-w-0 items-center gap-2 font-mono text-xs text-muted-foreground sm:inline-flex">
                {draft.savedAt && (
                  <>
                    <span aria-hidden className="size-1.5 rounded-full bg-jade" />
                    {tp('form.draftSaved')}
                  </>
                )}
              </p>
              <span className="flex-1" />
              {!isEmpty(values) && (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="h-10 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors outline-none hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
                >
                  {tp('form.discard')}
                </button>
              )}
              <button
                type="submit"
                disabled={create.isPending}
                className={cn(
                  'group/publish inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-[0.875rem] bg-kente-warm px-5 text-sm font-bold text-kente-night',
                  'shadow-[0_12px_28px_-14px_var(--kente-coral)] transition-[translate,box-shadow,opacity] duration-300 enabled:hover:-translate-y-px disabled:opacity-60',
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
              >
                {create.isPending ? (
                  <PulsatingDots size="sm" tone="current" label={t('form.publishing')} />
                ) : (
                  <>
                    <Sparkles aria-hidden className="size-4" />
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
        title={tp('form.discardTitle')}
        description={t('form.discardText')}
        confirmLabel={tp('form.discardConfirm')}
        destructive
        onConfirm={reset}
      />
    </div>
  );
}

/** L'annonce telle qu'elle apparaîtra, dès qu'on connaît son projet et son métier. */
function previewOf(values: Values, project: Project | undefined, fallbackTitle: string, createdAt: string): BoardOpening | null {
  if (!project || values.role === null) {
    return null;
  }
  const issue = /^\d+$/.test(values.starterIssueNumber) ? Number(values.starterIssueNumber) : null;
  return {
    id: 0,
    role: values.role,
    title: values.title.trim() || fallbackTitle,
    description: values.description.trim() || null,
    seats: values.seats,
    starterIssueNumber: issue,
    starterIssueTitle: issue === null ? null : values.starterIssueTitle.trim() || null,
    open: true,
    createdAt,
    applicants: 0,
    match: null,
    appliedByMe: false,
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
      tagline: project.tagline,
      coverThumbnailUrl: project.coverThumbnailUrl,
      repositoryUrl: project.repositoryUrl,
      owner: project.owner,
      tags: project.tags,
      myMembershipStatus: project.myMembershipStatus,
    },
  };
}

const choiceFocus = 'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/70 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background';

interface ProjectChoiceProps {
  projects: DashboardProject[];
  value: string;
  error?: string;
  onChange: (slug: string) => void;
}

/** Les projets que le membre gère : des boutons radio, qui se parcourent aux flèches. */
function ProjectChoice({ projects, value, error, onChange }: ProjectChoiceProps) {
  const { t } = useTranslation();
  const name = useId();

  return (
    <div>
      <div role="radiogroup" aria-labelledby="opening-project-title" aria-invalid={error ? true : undefined} className="grid gap-2.5 sm:grid-cols-2">
        {projects.map((project) => {
          const checked = project.slug === value;
          return (
            <label
              key={project.id}
              className={cn(
                'relative flex cursor-pointer items-center gap-3 rounded-2xl border p-2.5 pe-3.5 transition-[border-color,background-color] duration-200',
                choiceFocus,
                checked ? 'border-gold/55 bg-gold/6' : 'border-border hover:border-border-strong',
              )}
            >
              <input type="radio" name={name} value={project.slug} checked={checked} onChange={() => onChange(project.slug)} className="sr-only" />
              {project.coverThumbnailUrl ? (
                <LazyImage src={project.coverThumbnailUrl} alt="" className="size-12 shrink-0 rounded-xl" imageClassName="object-cover" />
              ) : (
                <span aria-hidden className="size-12 shrink-0 rounded-xl bg-kente-conic opacity-85" />
              )}
              <span className="min-w-0 flex-1">
                <span dir="auto" className="block truncate text-sm font-bold text-foreground">
                  {project.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{t(`enums.projectRole.${project.myRole}`)}</span>
              </span>
              <span aria-hidden className={cn('grid size-5 shrink-0 place-items-center rounded-full border transition-colors', checked ? 'border-transparent bg-kente-gold text-kente-night' : 'border-border-strong')}>
                {checked && <Check className="size-3" strokeWidth={3} />}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2.5 text-xs text-coral">
          {error}
        </p>
      )}
    </div>
  );
}

interface RoleChoiceProps {
  value: TeamRole | null;
  error?: string;
  onChange: (role: TeamRole) => void;
}

/** Le catalogue des métiers : le métier choisi prend la couleur de son fil, et son motif se tisse. */
function RoleChoice({ value, error, onChange }: RoleChoiceProps) {
  const { t } = useTranslation();
  const name = useId();

  return (
    <div>
      <div role="radiogroup" aria-labelledby="opening-role-title" aria-invalid={error ? true : undefined} className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {teamRoles.map((definition) => {
          const role = toTeamRole(definition);
          const checked = role === value;
          return (
            <label
              key={definition.id}
              style={{ '--thread': `var(--${definition.colors[0]})` } as CSSProperties}
              className={cn(
                'group/role flex cursor-pointer items-center gap-2.5 rounded-xl border p-2 pe-3 transition-[border-color,background-color,translate] duration-200',
                choiceFocus,
                checked
                  ? 'border-[color-mix(in_srgb,var(--thread)_60%,transparent)] bg-[color-mix(in_srgb,var(--thread)_9%,transparent)]'
                  : 'border-border hover:-translate-y-px hover:border-border-strong',
              )}
            >
              <input type="radio" name={name} value={role} checked={checked} onChange={() => onChange(role)} className="sr-only" />
              <span aria-hidden data-weave={checked ? 'in' : undefined} className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground/5">
                <span data-weave-in>
                  <WovenMotif motif={definition.motif} colors={definition.colors} className="h-5 w-auto" />
                </span>
              </span>
              <span className={cn('min-w-0 flex-1 text-[0.8125rem] leading-tight font-semibold', checked ? 'text-foreground' : 'text-soft-foreground group-hover/role:text-foreground')}>
                {t(`teamRoles.${definition.id}`)}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2.5 text-xs text-coral">
          {error}
        </p>
      )}
    </div>
  );
}
