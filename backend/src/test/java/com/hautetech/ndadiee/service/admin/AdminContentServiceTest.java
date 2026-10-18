package com.hautetech.ndadiee.service.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.admin.AdminActionType;
import com.hautetech.ndadiee.model.admin.AdminTargetType;
import com.hautetech.ndadiee.model.admin.ModeratedContent;
import com.hautetech.ndadiee.model.content.Answer;
import com.hautetech.ndadiee.model.content.Question;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.AnswerRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.service.admin.AdminAuditService.Target;
import com.hautetech.ndadiee.service.content.AnswerService;
import com.hautetech.ndadiee.service.content.QuestionService;
import com.hautetech.ndadiee.service.project.ProjectService;

/** Masquer, rétablir, supprimer : un contenu quitte les pages publiques sans perdre ses compteurs en route. */
@ExtendWith(MockitoExtension.class)
class AdminContentServiceTest {

    private static final Long ADMIN = 1L;
    private static final Long QUESTION_ID = 100L;
    private static final Long ANSWER_ID = 200L;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private AnswerRepository answerRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private QuestionService questionService;

    @Mock
    private AnswerService answerService;

    @Mock
    private ProjectService projectService;

    @Mock
    private AdminAuditService auditService;

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private AdminContentService adminContentService;

    private static Question question() {
        Question question = Question.builder().title("Spring Boot : @Component ou @Service ?").slug("spring-boot")
                .body("Quelle différence entre les deux annotations ?").author(new Developer()).answerCount(2).build();
        question.setId(QUESTION_ID);
        return question;
    }

    private static Answer answer(Question question) {
        Answer answer = Answer.builder().body("Gagnez 500 000 FCFA par semaine !").question(question).author(new Developer()).build();
        answer.setId(ANSWER_ID);
        return answer;
    }

    @Test
    void hidingAnAnswerTakesItOutOfItsTopicCounter() {
        Answer spam = answer(question());
        when(answerRepository.findById(ANSWER_ID)).thenReturn(Optional.of(spam));

        var response = adminContentService.hide(ADMIN, ModeratedContent.ANSWER, ANSWER_ID, " Spam ");

        assertThat(spam.isHidden()).isTrue();
        assertThat(spam.getHiddenReason()).isEqualTo("Spam");
        assertThat(response.isHidden()).isTrue();
        assertThat(response.getSlug()).isEqualTo("spring-boot");
        verify(questionRepository).addAnswerCount(QUESTION_ID, -1);
        verify(auditService).record(ADMIN, AdminActionType.HIDE_CONTENT,
                new Target(AdminTargetType.ANSWER, ANSWER_ID, "Spring Boot : @Component ou @Service ?"), "Spam", null);
    }

    @Test
    void restoringAnAnswerPutsItBackInTheCounter() {
        Answer spam = answer(question());
        spam.setHiddenAt(Instant.now());
        spam.setHiddenReason("Spam");
        when(answerRepository.findById(ANSWER_ID)).thenReturn(Optional.of(spam));

        adminContentService.unhide(ADMIN, ModeratedContent.ANSWER, ANSWER_ID);

        assertThat(spam.isHidden()).isFalse();
        assertThat(spam.getHiddenReason()).isNull();
        verify(questionRepository).addAnswerCount(QUESTION_ID, 1);
    }

    @Test
    void hidingATopicLeavesTheCountersAlone() {
        Question topic = question();
        when(questionRepository.findById(QUESTION_ID)).thenReturn(Optional.of(topic));

        adminContentService.hide(ADMIN, ModeratedContent.QUESTION, QUESTION_ID, "Hors sujet");

        assertThat(topic.isHidden()).isTrue();
        verify(questionRepository, never()).addAnswerCount(any(), any(int.class));
    }

    @Test
    void anAlreadyHiddenContentIsNotHiddenTwice() {
        Question topic = question();
        topic.setHiddenAt(Instant.now());
        when(questionRepository.findById(QUESTION_ID)).thenReturn(Optional.of(topic));

        assertThatThrownBy(() -> adminContentService.hide(ADMIN, ModeratedContent.QUESTION, QUESTION_ID, "Encore"))
                .isInstanceOf(OperationNotAllowedException.class);
        verifyNoInteractions(auditService);
    }

    @Test
    void deletingGoesThroughTheContentServiceAndKeepsItsTitleInTheLog() {
        when(questionRepository.findById(QUESTION_ID)).thenReturn(Optional.of(question()));

        adminContentService.delete(ADMIN, ModeratedContent.QUESTION, QUESTION_ID, "Doublon");

        InOrder order = inOrder(questionService, auditService);
        order.verify(questionService).delete(ADMIN, QUESTION_ID);
        order.verify(auditService).record(ADMIN, AdminActionType.DELETE_CONTENT,
                new Target(AdminTargetType.QUESTION, QUESTION_ID, "Spring Boot : @Component ou @Service ?"), "Doublon", null);
    }
}
