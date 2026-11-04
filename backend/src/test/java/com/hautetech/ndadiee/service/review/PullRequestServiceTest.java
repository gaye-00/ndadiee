package com.hautetech.ndadiee.service.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import com.hautetech.ndadiee.dto.request.ReviewCommentRequest;
import com.hautetech.ndadiee.dto.request.ReviewCommentUpdateRequest;
import com.hautetech.ndadiee.dto.request.ReviewSubmitRequest;
import com.hautetech.ndadiee.dto.response.PullRequestDetailResponse;
import com.hautetech.ndadiee.dto.response.PullRequestResponse;
import com.hautetech.ndadiee.event.ReviewActivityEvent;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.model.review.PullRequestReviewer;
import com.hautetech.ndadiee.model.review.PullRequestStatus;
import com.hautetech.ndadiee.model.review.ReviewComment;
import com.hautetech.ndadiee.model.review.ReviewState;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.PullRequestRepository;
import com.hautetech.ndadiee.repository.PullRequestReviewerRepository;
import com.hautetech.ndadiee.repository.ReviewCommentRepository;
import com.hautetech.ndadiee.service.project.ProjectService;
import com.hautetech.ndadiee.service.user.ReputationService;
import com.hautetech.ndadiee.service.user.UserService;

/**
 * La page d'une revue : qui commente, qui rend une revue, qui juge une revue utile. GitHub garde le code ; la revue
 * se fait sur Ndadiee, selon la place de chacun (auteur, équipe, relecteur, communauté).
 */
@ExtendWith(MockitoExtension.class)
class PullRequestServiceTest {

    private static final String SLUG = "paperweight";
    private static final int NUMBER = 12;
    private static final Long AUTHOR = 1L;
    private static final Long TEAMMATE = 2L;
    private static final Long OUTSIDER = 3L;
    private static final Long PR_ID = 40L;

    @Mock
    private ReviewService reviewService;
    @Mock
    private PullRequestContentService contentService;
    @Mock
    private PullRequestRepository pullRequestRepository;
    @Mock
    private PullRequestReviewerRepository reviewerRepository;
    @Mock
    private ReviewCommentRepository commentRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectService projectService;
    @Mock
    private UserService userService;
    @Mock
    private ReputationService reputationService;
    @Mock
    private UserMapper userMapper;
    @Mock
    private ApplicationEventPublisher events;

    @InjectMocks
    private PullRequestService service;

    private Project project;
    private PullRequest pullRequest;

    @BeforeEach
    void setUp() {
        project = Project.builder().id(10L).slug(SLUG).name("Paperweight").build();
        pullRequest = PullRequest.builder().id(PR_ID).project(project).number(NUMBER).title("Liste virtuelle")
                .author(Developer.builder().id(AUTHOR).build()).status(PullRequestStatus.OPEN).build();
        lenient().when(projectRepository.findBySlug(SLUG)).thenReturn(Optional.of(project));
        lenient().when(projectService.isVisibleTo(any(), any())).thenReturn(true);
        lenient().when(pullRequestRepository.findByProjectIdAndNumber(10L, NUMBER)).thenReturn(Optional.of(pullRequest));
        lenient().when(projectService.isTeamMember(project, AUTHOR)).thenReturn(true);
        lenient().when(projectService.isTeamMember(project, TEAMMATE)).thenReturn(true);
        lenient().when(reviewerRepository.findByPullRequestIdAndReviewerId(eq(PR_ID), anyLong())).thenReturn(Optional.empty());
        lenient().when(reviewService.toResponses(any(), any())).thenReturn(List.of(PullRequestResponse.builder().id(PR_ID).build()));
        lenient().when(commentRepository.findWithAuthorByPullRequestId(PR_ID)).thenReturn(List.of());
    }

    @Test
    void theAuthorCommentsButDoesNotReviewHisOwnPullRequest() {
        PullRequestDetailResponse.Viewer viewer = service.detail(AUTHOR, SLUG, NUMBER).getViewer();

        assertThat(viewer.isAuthor()).isTrue();
        assertThat(viewer.isCanComment()).isTrue();
        assertThat(viewer.isCanReview()).isFalse();
        assertThat(viewer.isCanClaim()).isFalse();
        assertThatThrownBy(() -> service.submitReview(AUTHOR, SLUG, NUMBER, submit(ReviewState.APPROVED, null)))
                .isInstanceOf(OperationNotAllowedException.class);
    }

    @Test
    void aTeammateReviewsAndJudges() {
        PullRequestDetailResponse.Viewer viewer = service.detail(TEAMMATE, SLUG, NUMBER).getViewer();

        assertThat(viewer.isCanReview()).isTrue();
        assertThat(viewer.isCanClaim()).isTrue();
        assertThat(viewer.isCanJudge()).isTrue();
    }

    @Test
    void anOutsiderOnlyJoinsACommunityPullRequest() {
        PullRequestDetailResponse.Viewer closed = service.detail(OUTSIDER, SLUG, NUMBER).getViewer();
        assertThat(closed.isCanComment()).isFalse();
        assertThat(closed.isCanReview()).isFalse();
        assertThatThrownBy(() -> service.comment(OUTSIDER, SLUG, NUMBER, ReviewCommentRequest.builder().body("Bien vu").build()))
                .isInstanceOf(ForbiddenException.class);

        pullRequest.setCommunity(true);
        PullRequestDetailResponse.Viewer open = service.detail(OUTSIDER, SLUG, NUMBER).getViewer();
        assertThat(open.isCanComment()).isTrue();
        assertThat(open.isCanReview()).isTrue();
        assertThat(open.isCanJudge()).isFalse();
    }

    @Test
    void aDraftOrMergedPullRequestNoLongerWaitsForAReview() {
        pullRequest.setDraft(true);
        assertThat(service.detail(TEAMMATE, SLUG, NUMBER).getViewer().isCanReview()).isFalse();

        pullRequest.setDraft(false);
        pullRequest.setStatus(PullRequestStatus.MERGED);
        assertThatThrownBy(() -> service.submitReview(TEAMMATE, SLUG, NUMBER, submit(ReviewState.APPROVED, null)))
                .isInstanceOf(OperationNotAllowedException.class);
        verify(reviewService, never()).submitReview(any(), any(), any(), any());
    }

    @Test
    void aSubmittedReviewGoesThroughTheRepositoryGesturesAndIsAnnounced() {
        when(reviewService.submitReview(PR_ID, TEAMMATE, ReviewState.CHANGES_REQUESTED, "Il manque la gestion d'erreur."))
                .thenReturn(ReviewComment.builder().id(12L).build());

        service.submitReview(TEAMMATE, SLUG, NUMBER, submit(ReviewState.CHANGES_REQUESTED, "Il manque la gestion d'erreur."));

        verify(events).publishEvent(ReviewActivityEvent.reviewed(PR_ID, TEAMMATE, 12L));
    }

    @Test
    void aLineCommentKeepsTheIndentationOfItsSuggestion() {
        when(reviewService.comment(any(), any(), any(), any(), any(), any()))
                .thenReturn(ReviewComment.builder().id(5L).author(Developer.builder().id(TEAMMATE).build()).build());

        service.comment(TEAMMATE, SLUG, NUMBER, ReviewCommentRequest.builder().body("  Plutôt ceci :  ").path("src/List.tsx").line(4)
                .suggestion("    const overscan = 8;\n").build());

        verify(reviewService).comment(PR_ID, TEAMMATE, "Plutôt ceci :", "src/List.tsx", 4, "    const overscan = 8;");
        verify(events).publishEvent(ReviewActivityEvent.commented(PR_ID, TEAMMATE, 5L));
    }

    @Test
    void aConversationCommentHasNoSuggestion() {
        when(reviewService.comment(any(), any(), any(), any(), any(), any()))
                .thenReturn(ReviewComment.builder().id(5L).author(Developer.builder().id(AUTHOR).build()).build());

        service.comment(AUTHOR, SLUG, NUMBER, ReviewCommentRequest.builder().body("Merci à tous").build());

        verify(reviewService).comment(eq(PR_ID), eq(AUTHOR), eq("Merci à tous"), isNull(), isNull(), isNull());
    }

    @Test
    void theTeamJudgesACommunityReviewHelpfulOnce() {
        PullRequestReviewer review = PullRequestReviewer.builder().pullRequest(pullRequest).reviewer(Developer.builder().id(OUTSIDER).build())
                .community(true).state(ReviewState.COMMENTED).build();
        when(reviewerRepository.findByPullRequestIdAndReviewerId(PR_ID, OUTSIDER)).thenReturn(Optional.of(review));

        service.judgeHelpful(TEAMMATE, SLUG, NUMBER, OUTSIDER, true);
        service.judgeHelpful(TEAMMATE, SLUG, NUMBER, OUTSIDER, true);

        assertThat(review.getHelpfulAt()).isNotNull();
        verify(reputationService).onReviewJudgedHelpful(OUTSIDER);
        // Une fois seulement : juger utile une revue déjà jugée utile n'annonce rien
        verify(events).publishEvent(ReviewActivityEvent.judgedHelpful(PR_ID, TEAMMATE, OUTSIDER));

        service.judgeHelpful(TEAMMATE, SLUG, NUMBER, OUTSIDER, false);
        assertThat(review.getHelpfulAt()).isNull();
        verify(reputationService).onReviewHelpfulWithdrawn(OUTSIDER);
    }

    @Test
    void onlyASubmittedCommunityReviewCanBeJudged() {
        PullRequestReviewer pending = PullRequestReviewer.builder().pullRequest(pullRequest).reviewer(Developer.builder().id(OUTSIDER).build())
                .community(true).state(ReviewState.REQUESTED).build();
        when(reviewerRepository.findByPullRequestIdAndReviewerId(PR_ID, OUTSIDER)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> service.judgeHelpful(TEAMMATE, SLUG, NUMBER, OUTSIDER, true)).isInstanceOf(OperationNotAllowedException.class);
        assertThatThrownBy(() -> service.judgeHelpful(OUTSIDER, SLUG, NUMBER, OUTSIDER, true)).isInstanceOf(ForbiddenException.class);
        verify(reputationService, never()).onReviewJudgedHelpful(any());
    }

    @Test
    void aVerdictKeepsItsPlaceButItsMessageCanBeCleared() {
        ReviewComment verdict = ReviewComment.builder().id(7L).pullRequest(pullRequest).author(Developer.builder().id(TEAMMATE).build())
                .verdict(ReviewState.APPROVED).body("Parfait").createdAt(Instant.now()).build();
        when(commentRepository.findByIdAndPullRequestId(7L, PR_ID)).thenReturn(Optional.of(verdict));

        service.updateComment(TEAMMATE, SLUG, NUMBER, 7L, ReviewCommentUpdateRequest.builder().body("  ").build());
        assertThat(verdict.getBody()).isNull();

        assertThatThrownBy(() -> service.deleteComment(TEAMMATE, SLUG, NUMBER, 7L)).isInstanceOf(OperationNotAllowedException.class);
        assertThatThrownBy(() -> service.updateComment(AUTHOR, SLUG, NUMBER, 7L, ReviewCommentUpdateRequest.builder().body("x").build()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void aHiddenProjectHidesItsPullRequests() {
        when(projectService.isVisibleTo(project, OUTSIDER)).thenReturn(false);

        assertThatThrownBy(() -> service.detail(OUTSIDER, SLUG, NUMBER)).isInstanceOf(ResourceNotFoundException.class);
    }

    private static ReviewSubmitRequest submit(ReviewState state, String body) {
        return ReviewSubmitRequest.builder().state(state).body(body).build();
    }
}
