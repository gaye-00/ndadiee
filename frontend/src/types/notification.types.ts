import type { ContentType } from './common.types';
import type { UserSummary } from './user.types';

export type NotificationType =
  | 'NEW_ANSWER'
  | 'ANSWER_ACCEPTED'
  | 'NEW_COMMENT'
  | 'NEW_VOTE'
  | 'NEW_FOLLOWER'
  | 'PROJECT_REQUEST'
  | 'BADGE_EARNED';

export interface Notification {
  id: number;
  type: NotificationType;
  /** Auteur de l'action ; null pour une notification système (BADGE_EARNED) */
  actor: UserSummary | null;
  targetType: ContentType | null;
  targetId: number | null;
  /** Slug de la question / de l'article / du projet concerné (pour une réponse : celui de sa question) */
  targetSlug: string | null;
  /** Titre du contenu concerné ; nom du badge pour BADGE_EARNED */
  targetTitle: string | null;
  read: boolean;
  createdAt: string;
}
