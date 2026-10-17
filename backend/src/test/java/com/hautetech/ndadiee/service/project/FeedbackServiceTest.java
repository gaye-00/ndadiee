package com.hautetech.ndadiee.service.project;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.hautetech.ndadiee.dto.request.FeedbackRequest;
import com.hautetech.ndadiee.dto.response.FeedbackCallResponse;
import com.hautetech.ndadiee.exception.ConflictException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.model.project.Feedback;
import com.hautetech.ndadiee.model.project.FeedbackCall;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.FeedbackCallRepository;
import com.hautetech.ndadiee.repository.FeedbackRepository;
import com.hautetech.ndadiee.service.user.UserService;

/** Retours : un par membre et par demande ouverte ; l'équipe ne répond pas à sa propre demande. */
@ExtendWith(MockitoExtension.class)
class FeedbackServiceTest {

    private static final Long PROJECT_ID = 10L;
    private static final Long CALL_ID = 20L;
    private static final Long AUTHOR = 1L;
    private static final Long MEMBER = 2L;

    @Mock
    private FeedbackCallRepository callRepository;
    @Mock
    private FeedbackRepository feedbackRepository;
    @Mock
    private ProjectService projectService;
    @Mock
    private UserService userService;
    @Mock
    private ProjectMapper projectMapper;

    @InjectMocks
    private FeedbackService feedbackService;

    private static Developer developer(Long id) {
        Developer developer = Developer.builder().username("dev-" + id).build();
        developer.setId(id);
        return developer;
    }

    private FeedbackCall call(Long projectId, boolean open) {
        FeedbackCall call = FeedbackCall.builder().id(CALL_ID).project(Project.builder().id(projectId).build())
                .author(developer(AUTHOR)).title("Votre avis sur l'écran trajets").open(open).build();
        when(callRepository.findById(CALL_ID)).thenReturn(Optional.of(call));
        return call;
    }

    private static FeedbackRequest request() {
        return FeedbackRequest.builder().rating(5).body("  L'écran trajets est clair.  ").build();
    }

    @Test
    void feedbackIsSavedAndTheCallComesBackCounted() {
        FeedbackCall call = call(PROJECT_ID, true);
        when(feedbackRepository.existsByCallIdAndAuthorId(CALL_ID, MEMBER)).thenReturn(false);
        when(userService.getDeveloperOrThrow(MEMBER)).thenReturn(developer(MEMBER));
        when(projectMapper.toFeedbackCallResponse(call)).thenReturn(new FeedbackCallResponse());
        List<Object[]> summary = List.<Object[]>of(new Object[] { CALL_ID, 15L, 4.2142857 });
        when(feedbackRepository.summarize(List.of(CALL_ID))).thenReturn(summary);
        when(feedbackRepository.findCallIdsAnsweredBy(MEMBER, List.of(CALL_ID))).thenReturn(List.of(CALL_ID));

        FeedbackCallResponse response = feedbackService.give(MEMBER, PROJECT_ID, CALL_ID, request());

        ArgumentCaptor<Feedback> saved = ArgumentCaptor.forClass(Feedback.class);
        verify(feedbackRepository).save(saved.capture());
        assertThat(saved.getValue().getBody()).isEqualTo("L'écran trajets est clair.");
        assertThat(saved.getValue().getRating()).isEqualTo(5);
        assertThat(response.getFeedbackCount()).isEqualTo(15);
        assertThat(response.getAverageRating()).isEqualTo(4.2);
        assertThat(response.getGivenByMe()).isTrue();
    }

    @Test
    void aSecondFeedbackIsAConflict() {
        call(PROJECT_ID, true);
        when(feedbackRepository.existsByCallIdAndAuthorId(CALL_ID, MEMBER)).thenReturn(true);

        assertThatThrownBy(() -> feedbackService.give(MEMBER, PROJECT_ID, CALL_ID, request()))
                .isInstanceOf(ConflictException.class);
        verify(feedbackRepository, never()).save(any(Feedback.class));
    }

    @Test
    void theAuthorDoesNotAnswerTheirOwnCall() {
        call(PROJECT_ID, true);

        assertThatThrownBy(() -> feedbackService.give(AUTHOR, PROJECT_ID, CALL_ID, request()))
                .isInstanceOf(OperationNotAllowedException.class);
        verify(feedbackRepository, never()).save(any(Feedback.class));
    }

    @Test
    void aClosedCallTakesNoMoreFeedback() {
        call(PROJECT_ID, false);

        assertThatThrownBy(() -> feedbackService.give(MEMBER, PROJECT_ID, CALL_ID, request()))
                .isInstanceOf(OperationNotAllowedException.class);
        verify(feedbackRepository, never()).save(any(Feedback.class));
    }

    @Test
    void aCallOfAnotherProjectIsNotFound() {
        call(99L, true);

        assertThatThrownBy(() -> feedbackService.give(MEMBER, PROJECT_ID, CALL_ID, request()))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
