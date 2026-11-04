package com.hautetech.ndadiee.service.user;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.event.ReputationChangedEvent;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.repository.DeveloperRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Met à jour la réputation des membres lors des votes, des réponses acceptées et des revues de code jugées utiles,
 * selon le barème de {@link ReputationRules}.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class ReputationService {

    private final DeveloperRepository developerRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Points que rapporte à l'auteur d'un contenu un vote de cette valeur.
     *
     * @param value +1, -1, ou 0 pour « pas de vote »
     */
    public int pointsFor(ContentType targetType, int value) {
        if (value == 0) {
            return 0;
        }
        if (value < 0) {
            return ReputationRules.CONTENT_DOWNVOTED;
        }
        return switch (targetType) {
            case QUESTION -> ReputationRules.QUESTION_UPVOTED;
            case ANSWER -> ReputationRules.ANSWER_UPVOTED;
            case ARTICLE -> ReputationRules.ARTICLE_UPVOTED;
            case PROJECT -> ReputationRules.PROJECT_STARRED;
        };
    }

    /**
     * Un vote a été posé, inversé ou retiré : l'auteur du contenu perd les points de l'ancien
     * vote et gagne ceux du nouveau. Les valeurs valent +1, -1, ou 0 pour « pas de vote ».
     */
    public void onVoteChanged(Long authorId, ContentType targetType, int oldValue, int newValue) {
        applyDelta(authorId, pointsFor(targetType, newValue) - pointsFor(targetType, oldValue));
    }

    public void onAnswerAccepted(Long answerAuthorId) {
        applyDelta(answerAuthorId, ReputationRules.ANSWER_ACCEPTED);
    }

    public void onAnswerUnaccepted(Long answerAuthorId) {
        applyDelta(answerAuthorId, -ReputationRules.ANSWER_ACCEPTED);
    }

    /** L'équipe d'un projet juge utile la revue d'un relecteur de la communauté (design 3C). */
    public void onReviewJudgedHelpful(Long reviewerId) {
        applyDelta(reviewerId, ReputationRules.REVIEW_HELPFUL);
    }

    public void onReviewHelpfulWithdrawn(Long reviewerId) {
        applyDelta(reviewerId, -ReputationRules.REVIEW_HELPFUL);
    }

    // ==================== HELPERS ====================

    private void applyDelta(Long developerId, int delta) {
        if (delta == 0) {
            return;
        }
        developerRepository.addReputation(developerId, delta);
        log.info("[Reputation] Membre {} : {}{} points", developerId, delta > 0 ? "+" : "", delta);
        eventPublisher.publishEvent(new ReputationChangedEvent(developerId));
    }
}
