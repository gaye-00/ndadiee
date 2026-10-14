package com.hautetech.ndadiee.service.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import com.hautetech.ndadiee.event.ReputationChangedEvent;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.repository.DeveloperRepository;

/** Barème de la réputation : ce que rapportent et coûtent les votes et les réponses acceptées. */
@ExtendWith(MockitoExtension.class)
class ReputationServiceTest {

    private static final Long AUTHOR = 7L;

    @Mock
    private DeveloperRepository developerRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private ReputationService reputationService;

    @Test
    void followsTheScaleOfTheSpecification() {
        // Valeurs du cahier des charges : si le barème change volontairement, ce test est à mettre à jour
        assertThat(ReputationRules.ANSWER_UPVOTED).isEqualTo(10);
        assertThat(ReputationRules.ANSWER_ACCEPTED).isEqualTo(15);
        assertThat(ReputationRules.CONTENT_DOWNVOTED).isEqualTo(-2);
    }

    @Test
    void upvotePointsDependOnTheContentType() {
        assertThat(reputationService.pointsFor(ContentType.QUESTION, 1)).isEqualTo(ReputationRules.QUESTION_UPVOTED);
        assertThat(reputationService.pointsFor(ContentType.ANSWER, 1)).isEqualTo(ReputationRules.ANSWER_UPVOTED);
        assertThat(reputationService.pointsFor(ContentType.ARTICLE, 1)).isEqualTo(ReputationRules.ARTICLE_UPVOTED);
        assertThat(reputationService.pointsFor(ContentType.PROJECT, 1)).isEqualTo(ReputationRules.PROJECT_STARRED);
    }

    @Test
    void downvoteCostsTheSameWhateverTheContent() {
        for (ContentType type : ContentType.values()) {
            assertThat(reputationService.pointsFor(type, -1)).isEqualTo(ReputationRules.CONTENT_DOWNVOTED);
        }
    }

    @Test
    void upvoteOnAnAnswerRewardsItsAuthor() {
        reputationService.onVoteChanged(AUTHOR, ContentType.ANSWER, 0, 1);

        verify(developerRepository).addReputation(AUTHOR, ReputationRules.ANSWER_UPVOTED);
        verify(eventPublisher).publishEvent(new ReputationChangedEvent(AUTHOR));
    }

    @Test
    void downvotePenalisesTheAuthor() {
        reputationService.onVoteChanged(AUTHOR, ContentType.QUESTION, 0, -1);

        verify(developerRepository).addReputation(AUTHOR, ReputationRules.CONTENT_DOWNVOTED);
    }

    @Test
    void switchingFromUpvoteToDownvoteCancelsTheGainThenAppliesThePenalty() {
        reputationService.onVoteChanged(AUTHOR, ContentType.ANSWER, 1, -1);

        // -10 (le vote positif disparaît) puis -2 (le vote négatif arrive)
        verify(developerRepository).addReputation(AUTHOR, ReputationRules.CONTENT_DOWNVOTED - ReputationRules.ANSWER_UPVOTED);
    }

    @Test
    void removingAVoteCancelsExactlyWhatItHadGiven() {
        reputationService.onVoteChanged(AUTHOR, ContentType.ARTICLE, 1, 0);
        verify(developerRepository).addReputation(AUTHOR, -ReputationRules.ARTICLE_UPVOTED);

        reputationService.onVoteChanged(AUTHOR, ContentType.ARTICLE, -1, 0);
        verify(developerRepository).addReputation(AUTHOR, -ReputationRules.CONTENT_DOWNVOTED);
    }

    @Test
    void nothingHappensWhenTheVoteDoesNotChange() {
        reputationService.onVoteChanged(AUTHOR, ContentType.ANSWER, 1, 1);

        verifyNoInteractions(developerRepository, eventPublisher);
    }

    @Test
    void acceptedAnswerRewardsItsAuthor() {
        reputationService.onAnswerAccepted(AUTHOR);

        verify(developerRepository).addReputation(AUTHOR, ReputationRules.ANSWER_ACCEPTED);
        verify(eventPublisher).publishEvent(new ReputationChangedEvent(AUTHOR));
    }

    @Test
    void unacceptingTakesThePointsBack() {
        reputationService.onAnswerUnaccepted(AUTHOR);

        verify(developerRepository).addReputation(AUTHOR, -ReputationRules.ANSWER_ACCEPTED);
        verify(eventPublisher).publishEvent(new ReputationChangedEvent(AUTHOR));
    }
}
