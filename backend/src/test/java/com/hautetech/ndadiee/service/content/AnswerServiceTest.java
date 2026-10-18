package com.hautetech.ndadiee.service.content;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import com.hautetech.ndadiee.dto.request.AnswerRequest;
import com.hautetech.ndadiee.event.AnswerAcceptedEvent;
import com.hautetech.ndadiee.event.AnswerPostedEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.mapper.AnswerMapper;
import com.hautetech.ndadiee.mapper.CommentMapper;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.content.Answer;
import com.hautetech.ndadiee.model.content.Question;
import com.hautetech.ndadiee.model.content.QuestionStatus;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.AnswerRepository;
import com.hautetech.ndadiee.repository.CommentRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.repository.VoteRepository;
import com.hautetech.ndadiee.service.interaction.VoteService;
import com.hautetech.ndadiee.service.user.ReputationService;
import com.hautetech.ndadiee.service.user.UserService;

/** Réponse acceptée : qui peut accepter, et ce que cela change pour la question et la réputation. */
@ExtendWith(MockitoExtension.class)
class AnswerServiceTest {

    private static final Long ASKER = 1L;
    private static final Long ANSWERER = 2L;
    private static final Long OTHER_ANSWERER = 3L;
    private static final Long QUESTION_ID = 100L;
    private static final Long ANSWER_ID = 200L;
    private static final Long OTHER_ANSWER_ID = 201L;

    @Mock
    private AnswerRepository answerRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private VoteRepository voteRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private UserService userService;

    @Mock
    private VoteService voteService;

    @Mock
    private ReputationService reputationService;

    @Mock
    private AnswerMapper answerMapper;

    @Mock
    private CommentMapper commentMapper;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private AnswerService answerService;

    private Question question;
    private Answer answer;

    private static Developer developer(Long id) {
        return Developer.builder().id(id).username("dev" + id).build();
    }

    private Answer answerBy(Long answerId, Long authorId) {
        return Answer.builder().id(answerId).body("réponse").question(question).author(developer(authorId)).build();
    }

    @BeforeEach
    void setUp() {
        question = Question.builder().id(QUESTION_ID).title("Question").author(developer(ASKER)).build();
        answer = answerBy(ANSWER_ID, ANSWERER);
    }

    // ==================== ACCEPTER ====================

    @Test
    void theQuestionAuthorAcceptsAnAnswer() {
        when(answerRepository.findById(ANSWER_ID)).thenReturn(Optional.of(answer));

        answerService.accept(ASKER, ANSWER_ID);

        assertThat(answer.isAccepted()).isTrue();
        assertThat(question.getAcceptedAnswer()).isSameAs(answer);
        verify(reputationService).onAnswerAccepted(ANSWERER);
        verify(eventPublisher).publishEvent(new AnswerAcceptedEvent(ANSWER_ID, QUESTION_ID, ANSWERER, ASKER));
    }

    @Test
    void onlyTheQuestionAuthorCanAccept() {
        when(answerRepository.findById(ANSWER_ID)).thenReturn(Optional.of(answer));

        assertThatThrownBy(() -> answerService.accept(OTHER_ANSWERER, ANSWER_ID))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("auteur de la question");

        assertThat(answer.isAccepted()).isFalse();
        assertThat(question.getAcceptedAnswer()).isNull();
        verifyNoInteractions(reputationService, eventPublisher);
    }

    @Test
    void theAnswerAuthorCannotAcceptTheirOwnAnswerOnSomeoneElsesQuestion() {
        when(answerRepository.findById(ANSWER_ID)).thenReturn(Optional.of(answer));

        assertThatThrownBy(() -> answerService.accept(ANSWERER, ANSWER_ID))
                .isInstanceOf(ForbiddenException.class);

        assertThat(answer.isAccepted()).isFalse();
        verifyNoInteractions(reputationService, eventPublisher);
    }

    @Test
    void acceptingAnotherAnswerReplacesThePreviousOne() {
        Answer previous = answerBy(OTHER_ANSWER_ID, OTHER_ANSWERER);
        previous.setAccepted(true);
        question.setAcceptedAnswer(previous);
        when(answerRepository.findById(ANSWER_ID)).thenReturn(Optional.of(answer));

        answerService.accept(ASKER, ANSWER_ID);

        // Une seule réponse acceptée par question : l'ancienne perd son statut et ses points
        assertThat(previous.isAccepted()).isFalse();
        assertThat(answer.isAccepted()).isTrue();
        assertThat(question.getAcceptedAnswer()).isSameAs(answer);
        verify(reputationService).onAnswerUnaccepted(OTHER_ANSWERER);
        verify(reputationService).onAnswerAccepted(ANSWERER);
    }

    @Test
    void acceptingTheSameAnswerTwiceGivesThePointsOnce() {
        answer.setAccepted(true);
        question.setAcceptedAnswer(answer);
        when(answerRepository.findById(ANSWER_ID)).thenReturn(Optional.of(answer));

        answerService.accept(ASKER, ANSWER_ID);

        assertThat(answer.isAccepted()).isTrue();
        verifyNoInteractions(reputationService, eventPublisher);
    }

    @Test
    void acceptingOwnAnswerGivesNoReputation() {
        Answer ownAnswer = answerBy(ANSWER_ID, ASKER);
        when(answerRepository.findById(ANSWER_ID)).thenReturn(Optional.of(ownAnswer));

        answerService.accept(ASKER, ANSWER_ID);

        assertThat(ownAnswer.isAccepted()).isTrue();
        assertThat(question.getAcceptedAnswer()).isSameAs(ownAnswer);
        verifyNoInteractions(reputationService);
    }

    // ==================== RETIRER L'ACCEPTATION ====================

    @Test
    void unacceptingTakesThePointsBack() {
        answer.setAccepted(true);
        question.setAcceptedAnswer(answer);
        when(answerRepository.findById(ANSWER_ID)).thenReturn(Optional.of(answer));

        answerService.unaccept(ASKER, ANSWER_ID);

        assertThat(answer.isAccepted()).isFalse();
        assertThat(question.getAcceptedAnswer()).isNull();
        verify(reputationService).onAnswerUnaccepted(ANSWERER);
    }

    @Test
    void onlyTheQuestionAuthorCanUnaccept() {
        answer.setAccepted(true);
        question.setAcceptedAnswer(answer);
        when(answerRepository.findById(ANSWER_ID)).thenReturn(Optional.of(answer));

        assertThatThrownBy(() -> answerService.unaccept(ANSWERER, ANSWER_ID))
                .isInstanceOf(ForbiddenException.class);

        assertThat(answer.isAccepted()).isTrue();
        verifyNoInteractions(reputationService);
    }

    // ==================== PUBLIER / SUPPRIMER ====================

    @Test
    void postingAnAnswerCountsItAndNotifiesTheAsker() {
        Answer saved = answerBy(ANSWER_ID, ANSWERER);
        when(userService.getDeveloperOrThrow(ANSWERER)).thenReturn(developer(ANSWERER));
        when(questionRepository.findById(QUESTION_ID)).thenReturn(Optional.of(question));
        when(answerRepository.save(any(Answer.class))).thenReturn(saved);

        answerService.create(ANSWERER, QUESTION_ID, AnswerRequest.builder().body("Voici la solution.").build());

        verify(questionRepository).addAnswerCount(QUESTION_ID, 1);
        verify(eventPublisher).publishEvent(new AnswerPostedEvent(ANSWER_ID, QUESTION_ID, ASKER, ANSWERER));
    }

    @Test
    void aClosedQuestionAcceptsNoMoreAnswers() {
        question.setStatus(QuestionStatus.CLOSED);
        when(userService.getDeveloperOrThrow(ANSWERER)).thenReturn(developer(ANSWERER));
        when(questionRepository.findById(QUESTION_ID)).thenReturn(Optional.of(question));

        assertThatThrownBy(() -> answerService.create(ANSWERER, QUESTION_ID,
                AnswerRequest.builder().body("Trop tard.").build()))
                .isInstanceOf(OperationNotAllowedException.class)
                .hasMessageContaining("fermée");

        verify(answerRepository, never()).save(any());
        verify(questionRepository, never()).addAnswerCount(any(), anyInt());
        verifyNoInteractions(eventPublisher);
    }

    @Test
    void deletingTheAcceptedAnswerFreesTheQuestionAndTakesThePointsBack() {
        answer.setAccepted(true);
        question.setAcceptedAnswer(answer);
        when(answerRepository.findById(ANSWER_ID)).thenReturn(Optional.of(answer));

        answerService.delete(ANSWERER, ANSWER_ID);

        assertThat(question.getAcceptedAnswer()).isNull();
        verify(reputationService).onAnswerUnaccepted(ANSWERER);
        // Votes et commentaires de la réponse disparaissent avec elle
        verify(voteRepository).deleteByTargets(ContentType.ANSWER, List.of(ANSWER_ID));
        verify(commentRepository).deleteByTargets(ContentType.ANSWER, List.of(ANSWER_ID));
        verify(answerRepository).delete(answer);
        verify(questionRepository).addAnswerCount(QUESTION_ID, -1);
    }

    @Test
    void aMemberCannotDeleteSomeoneElsesAnswer() {
        when(answerRepository.findById(ANSWER_ID)).thenReturn(Optional.of(answer));
        when(userService.canModerate(OTHER_ANSWERER)).thenReturn(false);

        assertThatThrownBy(() -> answerService.delete(OTHER_ANSWERER, ANSWER_ID))
                .isInstanceOf(ForbiddenException.class);

        verify(answerRepository, never()).delete(any(Answer.class));
    }

    @Test
    void aModeratorCanDeleteAnyAnswer() {
        when(answerRepository.findById(ANSWER_ID)).thenReturn(Optional.of(answer));
        when(userService.canModerate(OTHER_ANSWERER)).thenReturn(true);

        answerService.delete(OTHER_ANSWERER, ANSWER_ID);

        verify(answerRepository).delete(answer);
    }
}
