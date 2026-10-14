package com.hautetech.ndadiee.service.notification;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.event.AnswerAcceptedEvent;
import com.hautetech.ndadiee.event.AnswerPostedEvent;
import com.hautetech.ndadiee.event.BadgeEarnedEvent;
import com.hautetech.ndadiee.event.CommentPostedEvent;
import com.hautetech.ndadiee.event.ProjectJoinRequestedEvent;
import com.hautetech.ndadiee.event.UserFollowedEvent;
import com.hautetech.ndadiee.event.VoteCastEvent;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.notification.NotificationType;

import lombok.RequiredArgsConstructor;

/**
 * Traduit les événements de la plateforme en notifications. Les services métier ne
 * connaissent pas NotificationService : ils se contentent de publier ce qui s'est passé.
 */
@Component
@RequiredArgsConstructor
public class NotificationListener {

    private final NotificationService notificationService;

    @EventListener
    public void onAnswerPosted(AnswerPostedEvent event) {
        notificationService.notify(event.questionAuthorId(), event.answerAuthorId(),
                NotificationType.NEW_ANSWER, ContentType.ANSWER, event.answerId());
    }

    @EventListener
    public void onAnswerAccepted(AnswerAcceptedEvent event) {
        notificationService.notify(event.answerAuthorId(), event.questionAuthorId(),
                NotificationType.ANSWER_ACCEPTED, ContentType.ANSWER, event.answerId());
    }

    @EventListener
    public void onCommentPosted(CommentPostedEvent event) {
        notificationService.notify(event.targetOwnerId(), event.authorId(),
                NotificationType.NEW_COMMENT, event.targetType(), event.targetId());
    }

    @EventListener
    public void onVoteCast(VoteCastEvent event) {
        // Seul un nouveau vote positif est notifié : ni les votes négatifs, ni les retraits
        if (event.newValue() == 1 && event.oldValue() != 1) {
            notificationService.notify(event.targetOwnerId(), event.voterId(),
                    NotificationType.NEW_VOTE, event.targetType(), event.targetId());
        }
    }

    @EventListener
    public void onUserFollowed(UserFollowedEvent event) {
        notificationService.notify(event.followedId(), event.followerId(),
                NotificationType.NEW_FOLLOWER, null, null);
    }

    @EventListener
    public void onProjectJoinRequested(ProjectJoinRequestedEvent event) {
        notificationService.notify(event.ownerId(), event.requesterId(),
                NotificationType.PROJECT_REQUEST, ContentType.PROJECT, event.projectId());
    }

    @EventListener
    public void onBadgeEarned(BadgeEarnedEvent event) {
        notificationService.notify(event.developerId(), null,
                NotificationType.BADGE_EARNED, null, event.badgeId());
    }
}
