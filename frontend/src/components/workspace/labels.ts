import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { ProjectRole, TeamRole } from '@/types/project.types';
import type { Task, TaskPullRequest } from '@/types/workspace.types';

/**
 * Les libellés de l'équipe : la place de chacun (porteur, mainteneur, contributeur) et son métier, en court comme sur les
 * cartes (« mobile », « data » : section `project.specialty` des textes communs).
 */
export function useTeamLabels() {
  const { t } = useTranslation('workspace');
  const { t: tc } = useTranslation();
  const role = (value: ProjectRole) => t(`memberRoles.${value}`);
  const specialty = (value: TeamRole) => tc(`project.specialty.${value.toLowerCase() as Lowercase<TeamRole>}`);
  return {
    role,
    specialty,
    /** Ce qui dit le mieux sa place : porteur du projet, sinon son métier, sinon sa place */
    place: (member: { role: ProjectRole; specialty: TeamRole | null }) =>
      member.role === 'OWNER' || !member.specialty ? role(member.role) : specialty(member.specialty),
  };
}

/** Où en est une pull request, en quelques mots : « changements demandés », « fusionnée »… */
export function pullRequestState(pullRequest: TaskPullRequest, t: TFunction<'workspace'>): string {
  if (pullRequest.status === 'MERGED') {
    return t('pullRequest.merged');
  }
  if (pullRequest.status === 'CLOSED') {
    return t('pullRequest.closed');
  }
  if (pullRequest.draft) {
    return t('pullRequest.draft');
  }
  return pullRequest.review ? t(`pullRequest.${pullRequest.review}`) : t('pullRequest.open');
}

/** Ce qu'une carte dit d'elle au lecteur d'écran : « #38 Mode hors-ligne, mobile, Tunde Adeyemi, PR #84 approuvée ». */
export function useTaskSummary() {
  const { t } = useTranslation('workspace');
  const labels = useTeamLabels();
  return (task: Task) =>
    [
      `#${task.number} ${task.title}`,
      task.role ? labels.specialty(task.role) : null,
      task.assignee ? task.assignee.fullName : t('card.unassigned'),
      task.pullRequest ? `${t('card.pullRequest', { number: task.pullRequest.number })} ${pullRequestState(task.pullRequest, t)}` : null,
    ]
      .filter(Boolean)
      .join(', ');
}
