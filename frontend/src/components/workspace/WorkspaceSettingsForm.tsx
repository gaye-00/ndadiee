import { Check, Crown, FolderGit2, LogOut, MoreHorizontal, Shield, UserMinus, UserRoundCog, Users } from 'lucide-react';
import { m } from 'motion/react';
import { DropdownMenu } from 'radix-ui';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTeamLabels } from './labels';
import { useWorkspaceContext } from './workspaceContext';
import { ease, fieldClass, focusRing, menuContent, menuItem, outlineButton, primaryButton, threadStyle } from './workspaceStyles';
import PulsatingDots from '@/components/feedback/PulsatingDots';
import RepositorySyncCard from '@/components/projects/RepositorySyncCard';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsSwitch from '@/components/settings/SettingsSwitch';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import UserAvatar from '@/components/shared/UserAvatar';
import WovenMotif from '@/components/shared/WovenMotif';
import { teamRoles } from '@/config/roles';
import { useAuth } from '@/hooks/useAuth';
import { useProject, useProjectMembership } from '@/hooks/useProjects';
import { useTeamActions } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';
import { paths } from '@/router/paths';
import type { Project, TeamRole } from '@/types/project.types';
import type { WorkspaceMember } from '@/types/workspace.types';
import { getApiError, getApiErrorMessage } from '@/utils/apiError';
import { formatMonth, isolate } from '@/utils/formatters';

/**
 * Réglages de l'espace d'équipe : membres, lien GitHub, visibilité.
 *
 * Chacun y choisit le métier qu'il tient dans l'équipe (il s'affiche sur la page du projet et sur ses tâches). Qui gère
 * l'équipe y nomme les mainteneurs et retire un membre (ses tâches attendent alors un nouveau preneur). Le porteur y
 * relie le dépôt GitHub (ses pull requests arrivent dans l'onglet Revues) et dit si le projet recrute. On y quitte aussi
 * l'équipe.
 */
export default function WorkspaceSettingsForm() {
  const { slug, workspace } = useWorkspaceContext();
  const project = useProject(slug);
  const owner = workspace.myRole === 'OWNER';

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <MySpecialty />
      <Team />
      {project.data && <RepositoryAndRecruitment project={project.data} editable={owner} />}
      {!owner && <LeaveTeam />}
    </div>
  );
}

// ==================== MON MÉTIER ====================

function MySpecialty() {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const labels = useTeamLabels();
  const actions = useTeamActions(slug, workspace.project.id);
  const [choosing, setChoosing] = useState<TeamRole | null>(null);

  function choose(specialty: TeamRole) {
    if (specialty === workspace.mySpecialty || actions.specialty.isPending) {
      return;
    }
    setChoosing(specialty);
    actions.specialty.mutate(specialty, {
      onSuccess: () => toast.success(t('settings.specialtySaved', { specialty: labels.specialty(specialty) })),
      onSettled: () => setChoosing(null),
    });
  }

  return (
    <SettingsSection id="workspace-specialty" tone="gold" icon={UserRoundCog} title={t('settings.specialtyTitle')} description={t('settings.specialtyText')}>
      <div role="radiogroup" aria-label={t('settings.specialtyTitle')} className="grid grid-cols-2 gap-2 p-5 sm:grid-cols-3 sm:p-7 lg:grid-cols-4">
        {teamRoles.map((role) => {
          const value = role.id.toUpperCase() as TeamRole;
          const selected = value === workspace.mySpecialty;
          return (
            <button
              key={role.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={actions.specialty.isPending}
              onClick={() => choose(value)}
              style={threadStyle(role.colors[0])}
              className={cn(
                'group/role relative flex h-14 items-center gap-2.5 rounded-xl border px-3 text-start transition-[border-color,background-color,translate] duration-200',
                selected ? 'border-(--thread)/50 bg-(--thread)/8' : 'border-border-subtle hover:-translate-y-px hover:border-border-strong',
                'disabled:cursor-wait',
                focusRing,
              )}
            >
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground/5">
                <WovenMotif motif={role.motif} colors={role.colors} className="h-4.5 w-auto" />
              </span>
              <span className={cn('min-w-0 flex-1 truncate text-[0.8125rem] font-semibold', selected ? 'text-(--thread-text)' : 'text-soft-foreground')}>{labels.specialty(value)}</span>
              {choosing === value ? (
                <PulsatingDots size="sm" />
              ) : (
                selected && <Check aria-hidden className="size-4 shrink-0 text-(--thread-text)" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}

// ==================== L'ÉQUIPE ====================

function Team() {
  const { t } = useTranslation('workspace');
  const { workspace } = useWorkspaceContext();
  return (
    <SettingsSection
      id="workspace-team"
      tone="jade"
      icon={Users}
      title={t('settings.teamTitle', { count: workspace.members.length })}
      description={workspace.canManage ? t('settings.teamTextManager') : t('settings.teamText')}
    >
      <ul className="divide-y divide-border-subtle">
        {workspace.members.map((member, index) => (
          <m.li key={member.memberId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease, delay: Math.min(index, 8) * 0.03 }}>
            <MemberRow member={member} />
          </m.li>
        ))}
      </ul>
    </SettingsSection>
  );
}

function MemberRow({ member }: { member: WorkspaceMember }) {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const { user } = useAuth();
  const labels = useTeamLabels();
  const actions = useTeamActions(slug, workspace.project.id);
  const [removing, setRemoving] = useState(false);
  const me = member.user.id === user?.id;
  const manageable = workspace.canManage && !me && member.role !== 'OWNER';
  const firstName = member.user.fullName.split(/\s+/)[0] ?? member.user.fullName;

  function promote(role: 'MAINTAINER' | 'CONTRIBUTOR') {
    actions.role.mutate(
      { memberId: member.memberId, role },
      { onSuccess: () => toast.success(t(role === 'MAINTAINER' ? 'settings.promoted' : 'settings.demoted', { name: isolate(firstName) })) },
    );
  }

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 sm:px-7">
      <Link to={paths.profile(member.user.username)} viewTransition className={cn('relative shrink-0 rounded-full', focusRing)}>
        <UserAvatar user={member.user} size="md" />
        {member.online && <span aria-hidden className="absolute -end-px -bottom-px size-3 rounded-full bg-jade ring-2 ring-card" />}
        <span className="sr-only">{member.user.fullName}</span>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{member.user.fullName}</span>
          {me && <span className="shrink-0 rounded-full bg-foreground/7 px-1.5 text-[0.625rem] font-semibold text-muted-foreground">{t('settings.you')}</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {member.specialty ? labels.specialty(member.specialty) : t('settings.noSpecialty')} · {t('settings.since', { date: formatMonth(member.joinedAt) })}
        </p>
      </div>
      <RoleBadge role={member.role} />
      {manageable ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger aria-label={t('settings.memberMenu', { name: member.user.fullName })} className={cn('grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-foreground/7 hover:text-foreground data-[state=open]:bg-foreground/7', focusRing)}>
            {actions.role.isPending || actions.remove.isPending ? <PulsatingDots size="sm" /> : <MoreHorizontal aria-hidden className="size-4.5" />}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={6} collisionPadding={12} className={menuContent}>
              {member.role === 'CONTRIBUTOR' ? (
                <DropdownMenu.Item className={menuItem} onSelect={() => promote('MAINTAINER')}>
                  <Shield aria-hidden className="size-4 text-gold" />
                  {t('settings.promote')}
                </DropdownMenu.Item>
              ) : (
                <DropdownMenu.Item className={menuItem} onSelect={() => promote('CONTRIBUTOR')}>
                  <Shield aria-hidden className="size-4 text-muted-foreground" />
                  {t('settings.demote')}
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Separator className="mx-1 my-1 h-px bg-border-subtle" />
              <DropdownMenu.Item className={cn(menuItem, 'text-coral focus:text-coral')} onSelect={() => setRemoving(true)}>
                <UserMinus aria-hidden className="size-4" />
                {t('settings.remove')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : (
        <span aria-hidden className="size-9 shrink-0" />
      )}
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title={t('settings.removeTitle', { name: member.user.fullName })}
        description={t('settings.removeText', { name: firstName })}
        confirmLabel={t('settings.remove')}
        destructive
        pending={actions.remove.isPending}
        onConfirm={() =>
          actions.remove.mutate(member.memberId, {
            onSuccess: () => {
              setRemoving(false);
              toast.success(t('settings.removed', { name: isolate(firstName) }));
            },
            onError: () => setRemoving(false),
          })
        }
      />
    </div>
  );
}

function RoleBadge({ role }: { role: WorkspaceMember['role'] }) {
  const labels = useTeamLabels();
  return (
    <span
      className={cn(
        'hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold sm:inline-flex',
        role === 'OWNER' ? 'bg-gold/12 text-gold' : role === 'MAINTAINER' ? 'bg-jade/12 text-jade' : 'bg-foreground/6 text-muted-foreground',
      )}
    >
      {role === 'OWNER' && <Crown aria-hidden className="size-3" />}
      {role === 'MAINTAINER' && <Shield aria-hidden className="size-3" />}
      {labels.role(role)}
    </span>
  );
}

// ==================== DÉPÔT ET RECRUTEMENT ====================

function RepositoryAndRecruitment({ project, editable }: { project: Project; editable: boolean }) {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const actions = useTeamActions(slug, workspace.project.id);
  const [repositoryUrl, setRepositoryUrl] = useState(project.repositoryUrl ?? '');
  const [recruiting, setRecruiting] = useState(project.lookingForContributors);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();
  const dirty = repositoryUrl.trim() !== (project.repositoryUrl ?? '') || recruiting !== project.lookingForContributors;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!dirty || actions.settings.isPending) {
      return;
    }
    setError(null);
    actions.settings.mutate(
      { repositoryUrl: repositoryUrl.trim() || undefined, lookingForContributors: recruiting },
      {
        onSuccess: () => toast.success(t('settings.saved')),
        onError: (failure) => setError(getApiError(failure)?.validationErrors?.repositoryUrl ?? getApiErrorMessage(failure)),
      },
    );
  }

  return (
    <SettingsSection id="workspace-repository" tone="coral" icon={FolderGit2} title={t('settings.repositoryTitle')} description={editable ? t('settings.repositoryText') : t('settings.repositoryTextMember')}>
      <form onSubmit={submit} className="flex flex-col gap-5 p-5 sm:p-7">
        <div>
          <label htmlFor={fieldId} className="text-sm font-semibold">
            {t('settings.repositoryLabel')}
          </label>
          <input
            id={fieldId}
            type="url"
            inputMode="url"
            value={repositoryUrl}
            readOnly={!editable}
            onChange={(event) => setRepositoryUrl(event.target.value)}
            dir="ltr"
            placeholder="https://github.com/organisation/projet"
            aria-invalid={error ? true : undefined}
            aria-describedby={`${fieldId}-hint`}
            className={cn(fieldClass, 'mt-2 h-11 font-mono text-sm', !editable && 'cursor-default opacity-80')}
          />
          {error ? (
            <p id={`${fieldId}-hint`} role="alert" className="mt-1.5 text-xs text-coral">
              {error}
            </p>
          ) : (
            <p id={`${fieldId}-hint`} className="mt-1.5 text-xs text-muted-foreground">
              {t('settings.repositoryHint')}
            </p>
          )}
        </div>

        <RepositorySyncCard project={{ slug, name: project.name, myMembershipStatus: 'ACCEPTED' }} />

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border-subtle px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t('settings.recruiting')}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('settings.recruitingText')}</p>
          </div>
          {editable ? (
            <SettingsSwitch checked={recruiting} onCheckedChange={setRecruiting} label={t('settings.recruiting')} />
          ) : (
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', recruiting ? 'bg-jade/12 text-jade' : 'bg-foreground/6 text-muted-foreground')}>
              {recruiting ? t('settings.recruitingOn') : t('settings.recruitingOff')}
            </span>
          )}
        </div>

        {editable && (
          <div className="flex justify-end">
            <button type="submit" disabled={!dirty} aria-busy={actions.settings.isPending || undefined} className={primaryButton}>
              {actions.settings.isPending && <PulsatingDots size="sm" tone="current" />}
              {t('settings.save')}
            </button>
          </div>
        )}
      </form>
    </SettingsSection>
  );
}

// ==================== QUITTER L'ÉQUIPE ====================

function LeaveTeam() {
  const { t } = useTranslation('workspace');
  const { slug, workspace } = useWorkspaceContext();
  const membership = useProjectMembership();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  return (
    <section aria-labelledby="workspace-leave-title" className="flex flex-wrap items-center gap-4 rounded-[1.375rem] border border-coral/25 bg-coral/[0.04] px-5 py-5 sm:px-7">
      <div className="min-w-0 flex-1 basis-60">
        <h2 id="workspace-leave-title" className="font-display text-[1.0625rem] font-semibold tracking-tight">
          {t('settings.leaveTitle')}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('settings.leaveText')}</p>
      </div>
      <button type="button" onClick={() => setConfirming(true)} className={cn(outlineButton, 'border-coral/40 text-coral hover:bg-coral/8')}>
        <LogOut aria-hidden className="size-4 rtl:-scale-x-100" />
        {t('settings.leave')}
      </button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('settings.leaveConfirmTitle', { project: workspace.project.name })}
        description={t('settings.leaveConfirmText')}
        confirmLabel={t('settings.leave')}
        destructive
        pending={membership.isPending}
        onConfirm={() =>
          membership.mutate(
            { projectId: workspace.project.id, join: false },
            {
              onSuccess: () => {
                setConfirming(false);
                toast.success(t('settings.left', { project: isolate(workspace.project.name) }));
                void navigate(paths.project(slug), { replace: true });
              },
              onError: (failure) => {
                setConfirming(false);
                toast.error(getApiErrorMessage(failure));
              },
            },
          )
        }
      />
    </section>
  );
}
