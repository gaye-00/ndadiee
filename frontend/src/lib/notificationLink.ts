import { paths } from '@/router/paths';
import type { Notification } from '@/types/notification.types';

/** Où mène une notification : le projet, le sujet du forum, le profil… ; null si elle ne mène nulle part. */
export function notificationLink(notification: Notification, me: string | undefined): string | null {
  const { type, targetType, targetSlug, actor } = notification;
  if (type === 'NEW_FOLLOWER') {
    return actor ? paths.profile(actor.username) : null;
  }
  if (type === 'BADGE_EARNED') {
    return me ? paths.profile(me) : null;
  }
  if (targetType === 'PROJECT' && targetSlug) {
    // Une candidature se lit près des rôles du projet
    return type === 'PROJECT_REQUEST' ? paths.projectRoles(targetSlug) : paths.project(targetSlug);
  }
  // Une réponse (nouvelle, acceptée, votée, commentée) : la page du sujet descend jusqu'à elle
  if (targetType === 'ANSWER' && targetSlug && notification.targetId !== null) {
    return paths.topicAnswer(targetSlug, notification.targetId);
  }
  if (targetType === 'QUESTION' && targetSlug) {
    return paths.topic(targetSlug);
  }
  return null;
}
