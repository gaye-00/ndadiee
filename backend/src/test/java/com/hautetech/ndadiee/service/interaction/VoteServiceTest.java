package com.hautetech.ndadiee.service.interaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import com.hautetech.ndadiee.dto.request.VoteRequest;
import com.hautetech.ndadiee.dto.response.VoteResponse;
import com.hautetech.ndadiee.event.VoteCastEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.interaction.Vote;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.VoteRepository;
import com.hautetech.ndadiee.service.user.ReputationService;
import com.hautetech.ndadiee.service.user.UserService;

/** Règles de vote : un vote par personne et par contenu, jamais sur son propre contenu. */
@ExtendWith(MockitoExtension.class)
class VoteServiceTest {

    private static final Long VOTER = 1L;
    private static final Long AUTHOR = 2L;
    private static final Long ANSWER_ID = 10L;
    private static final int INITIAL_SCORE = 3;

    @Mock
    private VoteRepository voteRepository;

    @Mock
    private ContentTargetService contentTargetService;

    @Mock
    private UserService userService;

    @Mock
    private ReputationService reputationService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private VoteService voteService;

    private final Developer voter = Developer.builder().id(VOTER).username("voter").build();

    private static VoteRequest request(ContentType targetType, Long targetId, int value) {
        return VoteRequest.builder().targetType(targetType).targetId(targetId).value(value).build();
    }

    // Une réponse écrite par AUTHOR, sur laquelle VOTER a (ou non) déjà voté
    private void givenAnAnswerWhereTheVoterAlreadyVoted(Integer existingValue) {
        when(contentTargetService.resolve(ContentType.ANSWER, ANSWER_ID)).thenReturn(
                new ContentTarget(ContentType.ANSWER, ANSWER_ID, AUTHOR, "Titre", "titre", INITIAL_SCORE));
        when(voteRepository.findByUserIdAndTargetTypeAndTargetId(VOTER, ContentType.ANSWER, ANSWER_ID)).thenReturn(
                Optional.ofNullable(existingValue).map(value -> Vote.builder()
                        .user(voter).targetType(ContentType.ANSWER).targetId(ANSWER_ID).value(value).build()));
    }

    @Test
    void firstVoteIsSavedAndUpdatesScoreAndReputation() {
        when(userService.getDeveloperOrThrow(VOTER)).thenReturn(voter);
        givenAnAnswerWhereTheVoterAlreadyVoted(null);

        VoteResponse response = voteService.vote(VOTER, request(ContentType.ANSWER, ANSWER_ID, 1));

        ArgumentCaptor<Vote> saved = ArgumentCaptor.forClass(Vote.class);
        verify(voteRepository).save(saved.capture());
        assertThat(saved.getValue().getUser()).isSameAs(voter);
        assertThat(saved.getValue().getTargetType()).isEqualTo(ContentType.ANSWER);
        assertThat(saved.getValue().getTargetId()).isEqualTo(ANSWER_ID);
        assertThat(saved.getValue().getValue()).isEqualTo(1);

        verify(contentTargetService).addScore(ContentType.ANSWER, ANSWER_ID, 1);
        verify(reputationService).onVoteChanged(AUTHOR, ContentType.ANSWER, 0, 1);
        verify(eventPublisher).publishEvent(new VoteCastEvent(ContentType.ANSWER, ANSWER_ID, AUTHOR, VOTER, 0, 1));
        assertThat(response.getValue()).isEqualTo(1);
        assertThat(response.getScore()).isEqualTo(INITIAL_SCORE + 1);
    }

    @Test
    void cannotVoteForOwnContent() {
        when(userService.getDeveloperOrThrow(AUTHOR)).thenReturn(Developer.builder().id(AUTHOR).build());
        when(contentTargetService.resolve(ContentType.ANSWER, ANSWER_ID)).thenReturn(
                new ContentTarget(ContentType.ANSWER, ANSWER_ID, AUTHOR, "Titre", "titre", INITIAL_SCORE));

        assertThatThrownBy(() -> voteService.vote(AUTHOR, request(ContentType.ANSWER, ANSWER_ID, 1)))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("propre contenu");

        verify(voteRepository, never()).save(any());
        verify(contentTargetService, never()).addScore(any(), any(), anyInt());
        verifyNoInteractions(reputationService, eventPublisher);
    }

    @Test
    void votingTheSameValueAgainChangesNothing() {
        when(userService.getDeveloperOrThrow(VOTER)).thenReturn(voter);
        givenAnAnswerWhereTheVoterAlreadyVoted(1);

        VoteResponse response = voteService.vote(VOTER, request(ContentType.ANSWER, ANSWER_ID, 1));

        verify(voteRepository, never()).save(any());
        verify(contentTargetService, never()).addScore(any(), any(), anyInt());
        verifyNoInteractions(reputationService, eventPublisher);
        assertThat(response.getScore()).isEqualTo(INITIAL_SCORE);
    }

    @Test
    void switchingVoteMovesTheScoreByTwo() {
        when(userService.getDeveloperOrThrow(VOTER)).thenReturn(voter);
        givenAnAnswerWhereTheVoterAlreadyVoted(1);

        VoteResponse response = voteService.vote(VOTER, request(ContentType.ANSWER, ANSWER_ID, -1));

        // Le vote existant est réutilisé : pas de seconde ligne pour le même membre et le même contenu
        ArgumentCaptor<Vote> saved = ArgumentCaptor.forClass(Vote.class);
        verify(voteRepository).save(saved.capture());
        assertThat(saved.getValue().getValue()).isEqualTo(-1);

        verify(contentTargetService).addScore(ContentType.ANSWER, ANSWER_ID, -2);
        verify(reputationService).onVoteChanged(AUTHOR, ContentType.ANSWER, 1, -1);
        assertThat(response.getValue()).isEqualTo(-1);
        assertThat(response.getScore()).isEqualTo(INITIAL_SCORE - 2);
    }

    @Test
    void removingAVoteRestoresTheScore() {
        givenAnAnswerWhereTheVoterAlreadyVoted(1);

        VoteResponse response = voteService.removeVote(VOTER, ContentType.ANSWER, ANSWER_ID);

        verify(voteRepository).delete(any(Vote.class));
        verify(contentTargetService).addScore(ContentType.ANSWER, ANSWER_ID, -1);
        verify(reputationService).onVoteChanged(AUTHOR, ContentType.ANSWER, 1, 0);
        verify(eventPublisher).publishEvent(new VoteCastEvent(ContentType.ANSWER, ANSWER_ID, AUTHOR, VOTER, 1, 0));
        assertThat(response.getValue()).isZero();
        assertThat(response.getScore()).isEqualTo(INITIAL_SCORE - 1);
    }

    @Test
    void removingAVoteThatDoesNotExistChangesNothing() {
        givenAnAnswerWhereTheVoterAlreadyVoted(null);

        VoteResponse response = voteService.removeVote(VOTER, ContentType.ANSWER, ANSWER_ID);

        verify(voteRepository, never()).delete(any(Vote.class));
        verifyNoInteractions(reputationService, eventPublisher);
        assertThat(response.getScore()).isEqualTo(INITIAL_SCORE);
    }

    @Test
    void rejectsAnyValueOtherThanPlusOrMinusOne() {
        assertThatThrownBy(() -> voteService.vote(VOTER, request(ContentType.ANSWER, ANSWER_ID, 0)))
                .isInstanceOf(OperationNotAllowedException.class);
        assertThatThrownBy(() -> voteService.vote(VOTER, request(ContentType.ANSWER, ANSWER_ID, 2)))
                .isInstanceOf(OperationNotAllowedException.class);

        verifyNoInteractions(voteRepository, reputationService, eventPublisher);
    }

    @Test
    void aProjectOnlyReceivesStars() {
        assertThatThrownBy(() -> voteService.vote(VOTER, request(ContentType.PROJECT, 5L, -1)))
                .isInstanceOf(OperationNotAllowedException.class)
                .hasMessageContaining("étoiles");

        verifyNoInteractions(voteRepository, reputationService, eventPublisher);
    }

    @Test
    void anAdminAccountCannotVote() {
        when(userService.getDeveloperOrThrow(VOTER)).thenThrow(new ForbiddenException("réservé aux membres"));

        assertThatThrownBy(() -> voteService.vote(VOTER, request(ContentType.ANSWER, ANSWER_ID, 1)))
                .isInstanceOf(ForbiddenException.class);

        verifyNoInteractions(voteRepository, reputationService, eventPublisher);
    }
}
