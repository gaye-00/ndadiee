package com.hautetech.ndadiee.service.badge;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.event.AnswerAcceptedEvent;
import com.hautetech.ndadiee.event.AnswerPostedEvent;
import com.hautetech.ndadiee.event.ArticlePublishedEvent;
import com.hautetech.ndadiee.event.ProjectCreatedEvent;
import com.hautetech.ndadiee.event.QuestionPostedEvent;
import com.hautetech.ndadiee.event.ReputationChangedEvent;
import com.hautetech.ndadiee.model.badge.BadgeType;

import lombok.RequiredArgsConstructor;

/**
 * Traduit les événements de la plateforme en badges. Les services métier ne connaissent
 * pas BadgeService : ils se contentent de publier ce qui s'est passé.
 */
@Component
@RequiredArgsConstructor
public class BadgeListener {

    private final BadgeService badgeService;

    @EventListener
    public void onQuestionPosted(QuestionPostedEvent event) {
        badgeService.award(event.authorId(), BadgeType.FIRST_QUESTION);
    }

    @EventListener
    public void onAnswerPosted(AnswerPostedEvent event) {
        badgeService.award(event.answerAuthorId(), BadgeType.FIRST_ANSWER);
    }

    @EventListener
    public void onAnswerAccepted(AnswerAcceptedEvent event) {
        // Accepter sa propre réponse ne donne pas le badge
        if (!event.answerAuthorId().equals(event.questionAuthorId())) {
            badgeService.award(event.answerAuthorId(), BadgeType.FIRST_ACCEPTED_ANSWER);
        }
    }

    @EventListener
    public void onArticlePublished(ArticlePublishedEvent event) {
        badgeService.award(event.authorId(), BadgeType.FIRST_ARTICLE);
    }

    @EventListener
    public void onProjectCreated(ProjectCreatedEvent event) {
        badgeService.award(event.ownerId(), BadgeType.FIRST_PROJECT);
    }

    @EventListener
    public void onReputationChanged(ReputationChangedEvent event) {
        badgeService.checkReputationBadges(event.developerId());
    }
}
