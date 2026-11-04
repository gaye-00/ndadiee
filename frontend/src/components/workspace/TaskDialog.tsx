import { AlertCircle, ArrowUpRight, Briefcase, GitPullRequest, Lock, Trash2, UserRound, X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { Dialog } from 'radix-ui';
import { useId, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { COLUMNS } from './board';
import { pullRequestState, useTeamLabels } from './labels';
import { PullRequestChip } from './TaskCard';
import { useWorkspaceContext } from './workspaceContext';
import { dialogContent, dialogOverlay, fieldClass, focusRing, ghostButton, iconButton, primaryButton, threadStyle } from './workspaceStyles';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import FacetPicker, { type FacetOption } from '@/components/shared/FacetPicker';
import UserAvatar from '@/components/shared/UserAvatar';
import WovenMotif from '@/components/shared/WovenMotif';
import { roleOf, teamRoles } from '@/config/roles';
import { useAuth } from '@/hooks/useAuth';
import { useTaskDialog, type TaskDialogTarget } from '@/hooks/useTaskDialog';
import { errorStatus, useCreateTask, useDeleteTask, useLinkablePullRequests, useUpdateTask, useWorkspaceTask, useWorkspaceTasks } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';
import type { TeamRole } from '@/types/project.types';
import type { Task, TaskRequest, TaskStatus } from '@/types/workspace.types';
import { getApiError, getApiErrorMessage } from '@/utils/apiError';
import { formatDateTime, formatRelativeTime } from '@/utils/formatters';

// Longueurs de TaskRequest.java
const MAX_TITLE = 140;
const MAX_DESCRIPTION = 4000;

/** Ce que la fiche modifie d'une tâche */
interface Draft {
  title: string;
  description: string;
  status: TaskStatus;
  role: TeamRole | null;
  assigneeId: number | null;
  pullRequestNumber: number | null;
}

const draftOf = (task: Task): Draft => ({
  title: task.title,
  description: task.description ?? '',
  status: task.status,
  role: task.role,
  assigneeId: task.assignee?.id ?? null,
  pullRequestNumber: task.pullRequest?.number ?? null,
});

const emptyDraft = (status: TaskStatus): Draft => ({ title: '', description: '', status, role: null, assigneeId: null, pullRequestNumber: null });

const sameDraft = (a: Draft, b: Draft) => (Object.keys(a) as Array<keyof Draft>).every((key) => a[key] === b[key]);

/**
 * La fiche d'une tâche, par-dessus l'espace : la lire, la modifier, la créer. Design 3E.
 *
 * Ouverte par l'adresse (« ?task=38 », hooks/useTaskDialog) : une carte, une mention « #38 » dans la discussion,
 * « + Tâche » ou un lien partagé y mènent. Le titre en grand, puis ses propriétés (colonne, métier, personne, pull
 * request), choisies au clavier dans des listes qui se cherchent, et son détail. Ctrl+Entrée enregistre ; fermer avec
 * des modifications demande confirmation. Une tâche livrée pendant un sprint clos se lit seulement.
 */
export default function TaskDialog() {
  const { t } = useTranslation('workspace');
  const { target, close } = useTaskDialog();
  const [confirming, setConfirming] = useState(false);
  const [dirty, setDirty] = useState(false);

  function requestClose() {
    if (dirty) {
      setConfirming(true);
    } else {
      close();
    }
  }

  return (
    <>
      <Dialog.Root open={target !== null} onOpenChange={(open) => !open && requestClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className={dialogOverlay} />
          <Dialog.Content
            aria-describedby={undefined}
            onOpenAutoFocus={(event) => {
              // Une nouvelle tâche : on écrit son titre. Une tâche existante : le focus va sur la fiche, pas dans un champ
              // (sur téléphone, le clavier ne surgit pas sur ce qu'on vient lire).
              event.preventDefault();
              const sheet = event.currentTarget as HTMLElement | null;
              (sheet?.querySelector<HTMLElement>('[data-autofocus]') ?? sheet)?.focus();
            }}
            className={dialogContent('sm:w-[min(42rem,calc(100vw-2rem))]')}
          >
            {target && <TaskSheet key={target.mode === 'edit' ? target.number : `new-${target.status}`} target={target} onDirtyChange={setDirty} onDone={close} />}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('dialog.discardTitle')}
        description={t('dialog.discardText')}
        confirmLabel={t('dialog.discard')}
        cancelLabel={t('dialog.keepEditing')}
        destructive
        onConfirm={() => {
          setConfirming(false);
          setDirty(false);
          close();
        }}
      />
    </>
  );
}

/** La tâche de l'adresse : celle du tableau, sinon demandée au serveur (livrée pendant un sprint clos). */
function TaskSheet({ target, onDirtyChange, onDone }: { target: NonNullable<TaskDialogTarget>; onDirtyChange: (dirty: boolean) => void; onDone: () => void }) {
  const { t } = useTranslation('workspace');
  const { slug } = useWorkspaceContext();
  const board = useWorkspaceTasks(slug);
  const number = target.mode === 'edit' ? target.number : null;
  const onBoard = number !== null ? board.data?.find((task) => task.number === number) : undefined;
  const remote = useWorkspaceTask(slug, number !== null && board.isSuccess && !onBoard ? number : null);

  if (target.mode === 'create') {
    return <TaskForm task={null} initial={emptyDraft(target.status)} onDirtyChange={onDirtyChange} onDone={onDone} />;
  }
  const task = onBoard ?? remote.data;
  if (task) {
    return <TaskForm task={task} initial={draftOf(task)} onDirtyChange={onDirtyChange} onDone={onDone} />;
  }
  const missing = remote.isError && errorStatus(remote.error) === 404;
  return (
    <div className="relative grid min-h-60 place-items-center p-8 text-center">
      <Dialog.Title className="sr-only">{t('dialog.taskTitle', { number: target.number })}</Dialog.Title>
      <Dialog.Close aria-label={t('dialog.close')} className={cn(iconButton, 'absolute end-4 top-4')}>
        <X aria-hidden className="size-4.5" />
      </Dialog.Close>
      {missing || board.isError ? (
        <div className="flex flex-col items-center gap-2">
          <p className="font-bold text-foreground">{t('dialog.missingTitle', { number: target.number })}</p>
          <p className="max-w-xs text-sm text-muted-foreground">{t('dialog.missingText')}</p>
        </div>
      ) : (
        <PulsatingDots label={t('dialog.loading')} />
      )}
    </div>
  );
}

interface TaskFormProps {
  /** null : une nouvelle tâche. Elle peut changer pendant qu'on l'écrit (un coéquipier la déplace) : le brouillon reste. */
  task: Task | null;
  /** La tâche telle que le serveur la connaît : ce qui diffère du brouillon est une modification */
  initial: Draft;
  onDirtyChange: (dirty: boolean) => void;
  onDone: () => void;
}

function TaskForm({ task, initial, onDirtyChange, onDone }: TaskFormProps) {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const { user } = useAuth();
  const labels = useTeamLabels();
  const createTask = useCreateTask(slug);
  const updateTask = useUpdateTask(slug);
  const deleteTask = useDeleteTask(slug);
  const [draft, setDraft] = useState(initial);
  // La colonne à l'ouverture : seule une colonne choisie ici déplace la tâche (pas celle où un coéquipier l'a mise depuis)
  const [openedIn] = useState(initial.status);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft | 'form', string>>>({});
  const [deleting, setDeleting] = useState(false);
  const pullRequests = useLinkablePullRequests(slug, true);
  const ids = { title: useId(), description: useId(), descriptionHint: useId() };

  const delivered = task?.deliveredInSprint ?? null;
  const readOnly = delivered !== null;
  const saving = createTask.isPending || updateTask.isPending;
  const canDelete = task !== null && !readOnly && (task.author.id === user?.id || workspace.canManage);
  const role = draft.role ? roleOf(draft.role) : undefined;
  const isMember = workspace.members.some((member) => member.user.id === user?.id);

  function change(changes: Partial<Draft>) {
    const next = { ...draft, ...changes };
    setDraft(next);
    onDirtyChange(!sameDraft(next, initial));
    setErrors((current) => {
      const cleared = { ...current };
      (Object.keys(changes) as Array<keyof Draft>).forEach((key) => delete cleared[key]);
      return cleared;
    });
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (saving || readOnly) {
      return;
    }
    const title = draft.title.trim();
    if (!title) {
      setErrors({ title: t('dialog.titleRequired') });
      return;
    }
    const body: TaskRequest = {
      title,
      description: draft.description.trim() || undefined,
      role: draft.role ?? undefined,
      assigneeId: draft.assigneeId ?? undefined,
      pullRequestNumber: draft.pullRequestNumber ?? undefined,
    };
    const onError = (failure: unknown) => {
      const fields = getApiError(failure)?.validationErrors ?? {};
      const fieldErrors: typeof errors = {};
      (['title', 'description', 'assigneeId', 'pullRequestNumber'] as const).forEach((key) => {
        if (fields[key]) {
          fieldErrors[key] = fields[key];
        }
      });
      setErrors(Object.keys(fieldErrors).length > 0 ? fieldErrors : { form: getApiErrorMessage(failure) });
    };
    const finish = () => {
      onDirtyChange(false);
      onDone();
    };

    if (task) {
      updateTask.mutate(
        { number: task.number, body: { ...body, status: draft.status !== openedIn ? draft.status : undefined } },
        { onSuccess: finish, onError },
      );
    } else {
      createTask.mutate(
        { ...body, status: draft.status },
        {
          onSuccess: (created) => {
            toast.success(t('dialog.created', { number: created.number }));
            finish();
          },
          onError,
        },
      );
    }
  }

  function keys(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  }

  // ── Les listes des propriétés ──
  const roleOptions: FacetOption[] = teamRoles.map((definition) => {
    const value = definition.id.toUpperCase() as TeamRole;
    return {
      value,
      label: labels.specialty(value),
      keywords: [labels.specialty(value), definition.id],
      icon: <WovenMotif motif={definition.motif} colors={definition.colors} className="h-4 w-auto" />,
    };
  });
  const memberOptions: FacetOption[] = workspace.members.map((member) => ({
    value: String(member.user.id),
    label: member.user.id === user?.id ? t('dialog.me', { name: member.user.fullName }) : member.user.fullName,
    keywords: [member.user.fullName, member.user.username],
    icon: <UserAvatar user={member.user} size="sm" className="size-5 text-[0.5rem]" />,
  }));
  const linkable = pullRequests.data ?? [];
  // La PR déjà liée reste proposée, même fermée depuis longtemps
  const current = task?.pullRequest && !linkable.some((candidate) => candidate.number === task.pullRequest!.number) ? [task.pullRequest] : [];
  const pullRequestOptions: FacetOption[] = [...current, ...linkable].map((pullRequest) => ({
    value: String(pullRequest.number),
    label: `#${pullRequest.number} ${pullRequest.title}`,
    keywords: [String(pullRequest.number), `#${pullRequest.number}`, pullRequest.title],
    group: pullRequest.status === 'OPEN' ? t('dialog.pullRequestsOpen') : t('dialog.pullRequestsDone'),
    icon: <GitPullRequest className={cn('size-4', pullRequest.status === 'OPEN' ? 'text-jade' : 'text-muted-foreground')} />,
  }));
  const selectedMember = workspace.members.find((member) => member.user.id === draft.assigneeId);
  const selectedPullRequest = [...current, ...linkable].find((pullRequest) => pullRequest.number === draft.pullRequestNumber) ?? task?.pullRequest;

  return (
    <>
      <form onSubmit={submit} onKeyDown={keys} noValidate className="flex min-h-0 flex-1 flex-col">
        {/* L'en-tête : la poignée de la feuille, le numéro, fermer */}
        <div className="shrink-0 px-5 pt-3 sm:px-7 sm:pt-6">
          <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-foreground/15 sm:hidden" />
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="rounded-lg bg-foreground/7 px-2 py-1 font-mono text-xs font-semibold text-soft-foreground tabular-nums">
              {task ? `#${task.number}` : '+'}
            </span>
            <Dialog.Title className="eyebrow min-w-0 truncate">
              {task ? <span className="sr-only">{t('dialog.taskTitle', { number: task.number })} · </span> : `${t('dialog.newTitle')} · `}
              {workspace.project.name}
            </Dialog.Title>
            <Dialog.Close aria-label={t('dialog.close')} className={cn(iconButton, 'ms-auto -me-2')}>
              <X aria-hidden className="size-4.5" />
            </Dialog.Close>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-5 sm:px-7">
          {readOnly && (
            <p className="mb-4 flex items-start gap-2.5 rounded-xl border border-jade/25 bg-jade/8 px-3.5 py-3 text-sm text-jade">
              <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
              {t('dialog.delivered', { number: delivered })}
            </p>
          )}

          {/* Le titre, en grand */}
          <label htmlFor={ids.title} className="sr-only">
            {t('dialog.title')}
          </label>
          <textarea
            id={ids.title}
            data-autofocus={task ? undefined : true}
            rows={2}
            value={draft.title}
            readOnly={readOnly}
            maxLength={MAX_TITLE}
            onChange={(event) => change({ title: event.target.value.replace(/\n/g, ' ') })}
            dir="auto"
            placeholder={t('dialog.titlePlaceholder')}
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? `${ids.title}-error` : undefined}
            className="block w-full resize-none bg-transparent font-display text-[1.375rem] leading-snug font-bold tracking-[-0.01em] text-foreground outline-none placeholder:text-faint-foreground/70 sm:text-[1.5rem]"
          />
          <FieldError id={`${ids.title}-error`} message={errors.title} />

          {/* Les propriétés */}
          <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center">
            <Property label={t('dialog.column')}>
              <ColumnPicker value={draft.status} disabled={readOnly} onChange={(status) => change({ status })} />
            </Property>

            <Property label={t('dialog.role')}>
              <FacetPicker
                label={t('dialog.rolePick')}
                icon={Briefcase}
                value={draft.role}
                selected={role && draft.role ? { label: labels.specialty(draft.role), icon: <WovenMotif motif={role.motif} colors={role.colors} className="h-4 w-auto" /> } : undefined}
                options={roleOptions}
                anyLabel={t('dialog.noRole')}
                searchPlaceholder={t('dialog.roleSearch')}
                emptyLabel={t('dialog.noMatch')}
                onChange={(value) => change({ role: value as TeamRole | null })}
                className={cn('h-10 justify-self-start', readOnly && 'pointer-events-none opacity-70')}
              />
            </Property>

            <Property label={t('dialog.assignee')} error={errors.assigneeId}>
              <div className="flex flex-wrap items-center gap-2">
                <FacetPicker
                  label={t('dialog.nobody')}
                  icon={UserRound}
                  value={draft.assigneeId === null ? null : String(draft.assigneeId)}
                  selected={
                    selectedMember
                      ? { label: selectedMember.user.fullName, icon: <UserAvatar user={selectedMember.user} size="sm" className="size-5 text-[0.5rem]" /> }
                      : undefined
                  }
                  options={memberOptions}
                  anyLabel={t('dialog.nobody')}
                  searchPlaceholder={t('dialog.assigneeSearch')}
                  emptyLabel={t('dialog.noMatch')}
                  onChange={(value) => change({ assigneeId: value === null ? null : Number(value) })}
                  className={cn('h-10', readOnly && 'pointer-events-none opacity-70')}
                />
                {!readOnly && isMember && draft.assigneeId !== user?.id && (
                  <button type="button" onClick={() => user && change({ assigneeId: user.id })} className={cn('rounded-md px-1.5 py-1 text-xs font-bold text-gold hover:underline hover:underline-offset-4', focusRing)}>
                    {t('dialog.takeIt')}
                  </button>
                )}
              </div>
            </Property>

            <Property label={t('dialog.pullRequest')} error={errors.pullRequestNumber}>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <FacetPicker
                  label={t('dialog.noPullRequest')}
                  icon={GitPullRequest}
                  value={draft.pullRequestNumber === null ? null : String(draft.pullRequestNumber)}
                  selected={selectedPullRequest ? { label: `#${selectedPullRequest.number} ${selectedPullRequest.title}` } : undefined}
                  options={pullRequestOptions}
                  groups={[t('dialog.pullRequestsOpen'), t('dialog.pullRequestsDone')]}
                  anyLabel={t('dialog.noPullRequest')}
                  searchPlaceholder={t('dialog.pullRequestSearch')}
                  emptyLabel={t('dialog.noPullRequests')}
                  loading={pullRequests.isPending}
                  onChange={(value) => change({ pullRequestNumber: value === null ? null : Number(value) })}
                  className={cn('h-10 max-w-full', readOnly && 'pointer-events-none opacity-70')}
                />
                {selectedPullRequest && selectedPullRequest.number === draft.pullRequestNumber && (
                  <>
                    <PullRequestChip pullRequest={selectedPullRequest} className="self-center" />
                    {selectedPullRequest.githubUrl && (
                      <a
                        href={selectedPullRequest.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t('dialog.openPullRequest', { number: selectedPullRequest.number, state: pullRequestState(selectedPullRequest, t) })}
                        className={cn(iconButton, 'size-8')}
                      >
                        <ArrowUpRight aria-hidden className="size-4 rtl:-scale-x-100" />
                      </a>
                    )}
                  </>
                )}
              </div>
            </Property>
          </dl>

          {/* Le détail */}
          <div className="mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={ids.description} className="text-sm font-semibold">
                {t('dialog.description')}
              </label>
              <span id={ids.descriptionHint} className="text-xs text-faint-foreground">
                {t('dialog.descriptionHint')}
              </span>
            </div>
            <textarea
              id={ids.description}
              rows={5}
              value={draft.description}
              readOnly={readOnly}
              maxLength={MAX_DESCRIPTION}
              onChange={(event) => change({ description: event.target.value })}
              dir="auto"
              placeholder={t('dialog.descriptionPlaceholder')}
              aria-describedby={ids.descriptionHint}
              aria-invalid={errors.description ? true : undefined}
              className={cn(fieldClass, 'mt-2 min-h-28 resize-y py-3 leading-relaxed')}
            />
            <FieldError message={errors.description} />
          </div>

          {task && <TaskHistory task={task} />}

          <AnimatePresence initial={false}>
            {errors.form && (
              <m.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <span className="mt-4 flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/8 px-3.5 py-3 text-sm text-coral">
                  <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {errors.form}
                </span>
              </m.p>
            )}
          </AnimatePresence>
        </div>

        {/* Les actions, toujours à portée */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border-subtle px-5 py-3.5 sm:px-7">
          {canDelete && (
            <button type="button" onClick={() => setDeleting(true)} className={cn(ghostButton, 'px-2.5 text-coral hover:bg-coral/8 hover:text-coral')}>
              <Trash2 aria-hidden className="size-4" />
              <span className="max-sm:sr-only">{t('dialog.delete')}</span>
            </button>
          )}
          <span className="flex-1" />
          <Dialog.Close className={ghostButton}>{readOnly ? t('dialog.close') : t('dialog.cancel')}</Dialog.Close>
          {!readOnly && (
            <button type="submit" aria-busy={saving || undefined} aria-keyshortcuts="Control+Enter Meta+Enter" className={primaryButton}>
              {saving && <PulsatingDots size="sm" tone="current" />}
              {task ? t('dialog.save') : t('dialog.create')}
              <kbd aria-hidden className="ms-0.5 hidden rounded-md bg-kente-night/12 px-1.5 font-mono text-[0.625rem] leading-5 sm:inline">
                Ctrl ↵
              </kbd>
            </button>
          )}
        </div>
      </form>

      {task && (
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          title={t('dialog.deleteTitle', { number: task.number })}
          description={t('dialog.deleteText', { title: task.title })}
          confirmLabel={t('dialog.delete')}
          destructive
          pending={deleteTask.isPending}
          onConfirm={() =>
            deleteTask.mutate(task.number, {
              onSuccess: () => {
                setDeleting(false);
                onDirtyChange(false);
                onDone();
              },
              onError: () => setDeleting(false),
            })
          }
        />
      )}
    </>
  );
}

function Property({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-[0.8125rem] font-semibold text-muted-foreground max-sm:mt-1.5">{label}</dt>
      <dd className="min-w-0">
        {children}
        <FieldError message={error} />
      </dd>
    </>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="mt-1 text-xs text-coral">
      {message}
    </p>
  ) : null;
}

/** La colonne, en quatre pastilles ; la flèche passe de l'une à l'autre */
function ColumnPicker({ value, disabled, onChange }: { value: TaskStatus; disabled: boolean; onChange: (status: TaskStatus) => void }) {
  const { t, i18n } = useTranslation('workspace');

  function keys(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) {
      return;
    }
    event.preventDefault();
    const forward = (event.key === 'ArrowRight') !== (i18n.dir() === 'rtl');
    const index = (COLUMNS.findIndex((column) => column.status === value) + (forward ? 1 : COLUMNS.length - 1)) % COLUMNS.length;
    onChange(COLUMNS[index].status);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[index]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={t('dialog.column')} onKeyDown={keys} className="flex flex-wrap gap-1.5">
      {COLUMNS.map((column) => {
        const selected = column.status === value;
        return (
          <button
            key={column.status}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled && !selected}
            onClick={() => onChange(column.status)}
            style={threadStyle(column.thread)}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] font-semibold transition-colors',
              selected ? 'border-(--thread)/45 bg-(--thread)/12 text-(--thread-text)' : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
              'disabled:opacity-50',
              focusRing,
            )}
          >
            <span aria-hidden className="size-1.5 rounded-full bg-(--thread)" />
            {t(`columns.${column.status}`)}
          </button>
        );
      })}
    </div>
  );
}

/** D'où vient la tâche : qui l'a créée, et son arrivée dans sa colonne. */
function TaskHistory({ task }: { task: Task }) {
  const { t } = useTranslation('workspace');
  const moved = task.movedBy !== null;
  return (
    <p className="mt-5 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[0.6875rem] text-faint-foreground">
      <UserAvatar user={task.author} size="sm" className="size-4 text-[0.4375rem]" />
      <span>
        {t('dialog.createdBy', { name: task.author.fullName })} ·{' '}
        <time dateTime={task.createdAt} title={formatDateTime(task.createdAt)}>
          {formatRelativeTime(task.createdAt)}
        </time>
      </span>
      {moved && task.movedBy && (
        <span>
          · {t('dialog.movedBy', { name: task.movedBy.fullName, column: t(`columns.${task.status}`) })}{' '}
          <time dateTime={task.statusChangedAt} title={formatDateTime(task.statusChangedAt)}>
            {formatRelativeTime(task.statusChangedAt)}
          </time>
        </span>
      )}
    </p>
  );
}
