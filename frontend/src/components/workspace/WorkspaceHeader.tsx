import { ArrowUpRight, CalendarClock, ChevronDown, Flag, Plus, UserPlus } from 'lucide-react';
import { m } from 'motion/react';
import { DropdownMenu, Popover } from 'radix-ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { COLUMNS } from './board';
import InviteDialog from './InviteDialog';
import { useTeamLabels } from './labels';
import SprintDialog, { type SprintDialogMode } from './SprintDialog';
import { useWorkspaceContext } from './workspaceContext';
import { ease, focusRing, menuContent, menuItem, outlineButton, primaryButton, threadStyle } from './workspaceStyles';
import UserAvatar from '@/components/shared/UserAvatar';
import { useNow } from '@/hooks/useNow';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTaskDialog } from '@/hooks/useTaskDialog';
import { useWorkspaceTasks } from '@/hooks/useWorkspace';
import { prefetch } from '@/lib/prefetch';
import { cn } from '@/lib/utils';
import { pages } from '@/router/pages';
import { paths } from '@/router/paths';
import type { Sprint, TaskStatus, WorkspaceMember } from '@/types/workspace.types';
import { formatDate, formatRelativeTime } from '@/utils/formatters';

// Avatars montrés dans l'en-tête ; les suivants sont dans la liste de l'équipe
const SHOWN_MEMBERS = 5;

/**
 * En-tête de l'espace d'équipe : projet, sprint, membres, « Inviter » et « + Tâche ». Design 3E.
 *
 * Le sprint se lit d'un coup d'œil : une bande tissée d'un fil par tâche du tableau, de la couleur de sa colonne
 * (terminées en vert, en revue en rouge, en cours en or), son objectif et son échéance. Le porteur et les mainteneurs
 * l'ouvrent et le closent d'ici. « N » crée une tâche, de n'importe quel onglet.
 */
export default function WorkspaceHeader() {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const { create } = useTaskDialog();
  const [inviting, setInviting] = useState(false);
  const labels = useTeamLabels();
  const project = workspace.project;
  const myPlace = labels.place({ role: workspace.myRole, specialty: workspace.mySpecialty });

  useNewTaskShortcut(() => create());

  return (
    <header className="relative">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1 basis-80">
          <m.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="eyebrow flex flex-wrap items-center gap-x-2 gap-y-1"
          >
            <span aria-hidden className="flex h-2.5 gap-px overflow-hidden rounded-[2px]">
              <span className="w-1.5 bg-kente-gold" />
              <span className="w-0.5 bg-kente-jade" />
              <span className="w-1 bg-kente-coral" />
            </span>
            {t('header.eyebrow')}
            <span aria-hidden className="text-border-strong">
              ·
            </span>
            <span className="normal-case tracking-normal text-soft-foreground">{t('header.myPlace', { place: myPlace })}</span>
          </m.p>
          <m.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.05 }}
            className="mt-2 flex min-w-0 items-center gap-3 font-display text-[1.625rem] leading-tight font-bold tracking-[-0.02em] sm:text-[1.875rem]"
          >
            <span aria-hidden className="size-3 shrink-0 rotate-45 rounded-[3px] bg-kente-conic shadow-[0_0_14px_-2px_var(--kente-gold)]" />
            <span dir="auto" className="min-w-0 truncate">
              {project.name}
            </span>
          </m.h1>
          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease, delay: 0.12 }}
            className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"
          >
            {project.tagline && (
              <span dir="auto" className="line-clamp-1 min-w-0 max-w-2xl text-start">
                {project.tagline}
              </span>
            )}
            <Link
              to={paths.project(slug)}
              viewTransition
              onPointerEnter={() => prefetch(pages.project)}
              onFocus={() => prefetch(pages.project)}
              className={cn('group/public inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-bold text-gold hover:underline hover:underline-offset-4', focusRing)}
            >
              {t('header.publicPage')}
              <ArrowUpRight aria-hidden className="size-3.5 transition-transform group-hover/public:-translate-y-px group-hover/public:translate-x-px rtl:-scale-x-100" />
            </Link>
          </m.p>
        </div>

        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease, delay: 0.1 }}
          className="flex flex-wrap items-center gap-2.5 sm:gap-3"
        >
          <TeamPresence members={workspace.members} />
          <button type="button" onClick={() => setInviting(true)} className={cn(outlineButton, 'relative')}>
            <UserPlus aria-hidden className="size-4" />
            {t('header.invite')}
            {workspace.pendingApplications > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-kente-coral px-1.5 font-mono text-[0.625rem] leading-none text-white tabular-nums">
                {workspace.pendingApplications}
                <span className="sr-only">{t('header.pendingApplications', { count: workspace.pendingApplications })}</span>
              </span>
            )}
          </button>
          <button type="button" onClick={() => create()} aria-keyshortcuts="N" className={primaryButton}>
            <Plus aria-hidden className="size-4.5 transition-transform duration-500 ease-out-expo group-hover/primary:rotate-90" strokeWidth={2.5} />
            {t('header.newTask')}
            <kbd aria-hidden className="ms-0.5 hidden rounded-md bg-kente-night/12 px-1.5 font-mono text-[0.625rem] leading-5 lg:inline">
              N
            </kbd>
            <Sheen />
          </button>
        </m.div>
      </div>

      <SprintStrip sprint={workspace.sprint} />
      <InviteDialog open={inviting} onOpenChange={setInviting} />
    </header>
  );
}

/** Reflet qui traverse le bouton principal au survol */
function Sheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 start-0 -z-10 w-1/3 -translate-x-full skew-x-[-20deg] bg-linear-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 ease-out-expo group-hover/primary:translate-x-[400%] rtl:translate-x-full rtl:group-hover/primary:-translate-x-[400%]"
    />
  );
}

/** « N » ouvre une nouvelle tâche, tant qu'on n'écrit pas ailleurs et qu'aucune fenêtre n'est ouverte. */
function useNewTaskShortcut(onCreate: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'n' || event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"], [role="listbox"]')) {
        return;
      }
      event.preventDefault();
      onCreate();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCreate]);
}

// ==================== L'ÉQUIPE ====================

/** Qui est là : les avatars de l'équipe, un point vert pour chaque membre en ligne ; la liste complète au clic. */
function TeamPresence({ members }: { members: WorkspaceMember[] }) {
  const { t } = useTranslation('workspace');
  const labels = useTeamLabels();
  // Ceux qui sont là d'abord
  const ordered = [...members].sort((a, b) => Number(b.online) - Number(a.online));
  const online = members.filter((member) => member.online).length;
  const rest = ordered.length - SHOWN_MEMBERS;

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={t('header.teamLabel', { count: members.length, online })}
        className={cn('group/team flex h-10 items-center gap-2.5 rounded-full pe-1 ps-0.5 transition-colors hover:bg-foreground/5 data-[state=open]:bg-foreground/6', focusRing)}
      >
        <span aria-hidden className="flex -space-x-2">
          {ordered.slice(0, SHOWN_MEMBERS).map((member) => (
            <span key={member.user.id} className="relative">
              <UserAvatar user={member.user} size="sm" className="ring-2 ring-background" />
              {member.online && <span className="absolute -end-px -bottom-px size-2.5 rounded-full bg-jade ring-2 ring-background" />}
            </span>
          ))}
          {rest > 0 && (
            <span className="inline-grid size-7 shrink-0 place-items-center rounded-full bg-muted text-[0.625rem] font-semibold text-muted-foreground ring-2 ring-background">
              +{rest}
            </span>
          )}
        </span>
        <span aria-hidden className="hidden items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:inline-flex">
          {online > 0 && <span className="live-dot size-1.5" />}
          {t('header.online', { count: online })}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className={cn(menuContent, 'w-72 origin-(--radix-popover-content-transform-origin) p-2')}
        >
          <p className="eyebrow px-2 pt-1 pb-2">{t('header.team', { count: members.length })}</p>
          <ul className="flex max-h-80 flex-col overflow-y-auto">
            {ordered.map((member) => (
              <li key={member.user.id}>
                <Link
                  to={paths.profile(member.user.username)}
                  viewTransition
                  className={cn('flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-foreground/5', focusRing)}
                >
                  <span className="relative">
                    <UserAvatar user={member.user} size="sm" />
                    {member.online && <span aria-hidden className="absolute -end-px -bottom-px size-2.5 rounded-full bg-jade ring-2 ring-popover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{member.user.fullName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{labels.place(member)}</span>
                  </span>
                  <span className={cn('shrink-0 text-[0.6875rem] font-semibold', member.online ? 'text-jade' : 'text-faint-foreground')}>
                    {member.online ? t('header.here') : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ==================== LE SPRINT ====================

// L'ordre des fils de la bande : ce qui est fait d'abord, ce qui reste ensuite
const WEAVE_ORDER: readonly TaskStatus[] = ['DONE', 'IN_REVIEW', 'IN_PROGRESS', 'TODO'];

/**
 * Le sprint en cours : son numéro, son objectif, son échéance, et la bande tissée de son avancement. Entre deux sprints,
 * ce qu'un sprint apporte, et pour qui gère l'équipe, de quoi en ouvrir un.
 */
function SprintStrip({ sprint }: { sprint: Sprint | null }) {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const tasks = useWorkspaceTasks(slug);
  const now = useNow(60_000);
  const [dialog, setDialog] = useState<SprintDialogMode | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const manage = workspace.canManage;

  function openDialog(mode: SprintDialogMode) {
    setDialog(mode);
    setDialogOpen(true);
  }

  const counts = Object.fromEntries(COLUMNS.map(({ status }) => [status, tasks.data?.filter((task) => task.status === status).length ?? 0])) as Record<TaskStatus, number>;
  const total = tasks.data?.length ?? sprint?.taskCount ?? 0;
  const done = tasks.data ? counts.DONE : (sprint?.doneCount ?? 0);

  return (
    <m.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease, delay: 0.15 }}
      aria-label={sprint ? t('header.sprint', { number: sprint.number }) : t('header.noSprint')}
      className="glass mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl px-4 py-3.5 sm:px-5"
    >
      {sprint ? (
        <>
          <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/12 font-mono text-sm font-bold text-gold ring-1 ring-gold/20 ring-inset">
              {sprint.number}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[0.9375rem] font-bold text-foreground">
                {t('header.sprint', { number: sprint.number })}
                <Deadline sprint={sprint} now={now} />
              </p>
              <p dir="auto" className="truncate text-start text-[0.8125rem] text-muted-foreground" title={sprint.goal ?? undefined}>
                {sprint.goal ?? t('header.noGoal')}
                <span className="text-faint-foreground"> · {t('header.until', { date: formatDate(sprint.endsAt) })}</span>
              </p>
            </div>
          </div>

          <SprintWeave counts={counts} total={total} done={done} />

          {manage && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger aria-label={t('header.sprintMenu')} className={cn(outlineButton, 'h-9 px-3 text-[0.8125rem]')}>
                <Flag aria-hidden className="size-3.5" />
                <span className="max-sm:sr-only">{t('header.sprintMenu')}</span>
                <ChevronDown aria-hidden className="size-3.5 opacity-60" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={8} collisionPadding={12} className={menuContent}>
                  <DropdownMenu.Item className={menuItem} onSelect={() => openDialog('close')}>
                    <Flag aria-hidden className="size-4 text-jade" />
                    {t('header.closeSprint', { number: sprint.number })}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl border border-dashed border-border-strong text-muted-foreground">
              <CalendarClock className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-bold text-foreground">{t('header.noSprint')}</p>
              <p className="text-[0.8125rem] text-muted-foreground">{manage ? t('header.noSprintHint') : t('header.noSprintMember')}</p>
            </div>
          </div>
          {manage && (
            <button type="button" onClick={() => openDialog('start')} className={cn(outlineButton, 'h-9 px-3 text-[0.8125rem]')}>
              <Flag aria-hidden className="size-3.5 text-gold" />
              {t('header.startSprint', { number: workspace.lastSprintNumber + 1 })}
            </button>
          )}
        </>
      )}
      {dialog && <SprintDialog mode={dialog} open={dialogOpen} onOpenChange={setDialogOpen} />}
    </m.section>
  );
}

/** L'échéance : jours restants, dernier jour, ou dépassée (le sprint attend d'être clos). */
function Deadline({ sprint, now }: { sprint: Sprint; now: number }) {
  const { t } = useTranslation('workspace');
  const left = Date.parse(sprint.endsAt) - now;
  const days = Math.ceil(left / 86_400_000);
  const tone = left < 0 ? 'bg-coral/12 text-coral' : days <= 1 ? 'bg-gold/12 text-gold' : 'bg-foreground/6 text-soft-foreground';
  const label = left < 0 ? t('header.overdue', { time: formatRelativeTime(sprint.endsAt) }) : days <= 1 ? t('header.lastDay') : t('header.daysLeft', { count: days });
  return (
    <time dateTime={sprint.endsAt} className={cn('rounded-full px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-normal', tone)}>
      {label}
    </time>
  );
}

/**
 * La bande tissée du sprint : un fil par tâche du tableau, de la couleur de sa colonne, ce qui est fait d'abord. Elle se
 * tisse à l'arrivée, fil après fil ; chaque colonne dit son nombre au survol, et la phrase entière au lecteur d'écran.
 */
function SprintWeave({ counts, total, done }: { counts: Record<TaskStatus, number>; total: number; done: number }) {
  const { t } = useTranslation('workspace');
  const reduced = useReducedMotion();
  const threads = WEAVE_ORDER.flatMap((status) => Array.from({ length: counts[status] }, (_, index) => ({ status, key: `${status}-${index}` })));
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex min-w-0 flex-[1.3] basis-72 items-center gap-3.5">
      <div
        role="img"
        aria-label={t('header.progressLabel', {
          done,
          total,
          details: WEAVE_ORDER.map((status) => t('header.statusCount', { column: t(`columns.${status}`), count: counts[status] })).join(', '),
        })}
        className="flex h-7 min-w-0 flex-1 items-stretch gap-[2px] rounded-md"
      >
        {total === 0 ? (
          <span className="flex-1 rounded-md border border-dashed border-border-strong" />
        ) : (
          threads.map(({ status, key }, index) => {
            const column = COLUMNS.find((candidate) => candidate.status === status)!;
            return (
              <m.span
                key={key}
                title={t('header.statusCount', { column: t(`columns.${status}`), count: counts[status] })}
                initial={reduced ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.5, ease, delay: 0.25 + Math.min(index, 30) * 0.025 }}
                style={threadStyle(column.thread)}
                className={cn(
                  'min-w-[3px] flex-1 origin-bottom rounded-[2px]',
                  status === 'TODO' ? 'bg-foreground/10' : 'bg-(--thread)',
                  status === 'DONE' && 'shadow-[0_0_8px_-2px_var(--thread)]',
                )}
              />
            );
          })
        )}
      </div>
      <p className="shrink-0 text-end">
        <span className="block font-mono text-sm font-bold text-foreground tabular-nums">{percent} %</span>
        <span className="block text-[0.6875rem] text-muted-foreground tabular-nums">{t('header.progress', { done, total })}</span>
      </p>
    </div>
  );
}
