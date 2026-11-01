package com.hautetech.ndadiee.service.review;

import java.time.Instant;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.ReviewCommentRequest;
import com.hautetech.ndadiee.dto.request.ReviewCommentUpdateRequest;
import com.hautetech.ndadiee.dto.request.ReviewSubmitRequest;
import com.hautetech.ndadiee.dto.response.LinkedIssueResponse;
import com.hautetech.ndadiee.dto.response.PullRequestChecksResponse;
import com.hautetech.ndadiee.dto.response.PullRequestDetailResponse;
import com.hautetech.ndadiee.dto.response.PullRequestFilesResponse;
import com.hautetech.ndadiee.dto.response.PullRequestResponse;
import com.hautetech.ndadiee.dto.response.ReviewCommentResponse;
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
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.PullRequestRepository;
import com.hautetech.ndadiee.repository.PullRequestReviewerRepository;
import com.hautetech.ndadiee.repository.ReviewCommentRepository;
import com.hautetech.ndadiee.service.project.ProjectService;
import com.hautetech.ndadiee.service.user.ReputationRules;
import com.hautetech.ndadiee.service.user.ReputationService;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * La page d'une revue de code (design 3C) : une pull request prise par son projet et son numéro, sa conversation et
 * ses commentaires de ligne, et ce que le membre connecté peut y faire.
 *
 * GitHub garde le code, le diff et la fusion (PullRequestContentService les lit) ; Ndadiee garde la revue :
 * commenter une ligne ou la conversation, proposer une suggestion, rendre un verdict, et juger utile la revue d'un
 * relecteur de la communauté, qui lui rapporte de la réputation.
 *
 * <ul>
 * <li>Commenter : l'auteur, l'équipe du projet, les relecteurs, et tout le monde si la PR est communautaire.</li>
 * <li>Rendre une revue : la PR est ouverte et n'est plus un brouillon ; on n'en est pas l'auteur ; on est de
 * l'équipe, relecteur, ou elle est communautaire.</li>
 * <li>Juger une revue utile : l'équipe du projet, pour un relecteur de la communauté qui a rendu sa revue.</li>
 * </ul>
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class PullRequestService {

    private final ReviewService reviewService;
    private final PullRequestContentService contentService;
    private final PullRequestRepository pullRequestRepository;
    private final PullRequestReviewerRepository reviewerRepository;
    private final ReviewCommentRepository commentRepository;
    private final ProjectRepository projectRepository;
    private final ProjectService projectService;
    private final UserService userService;
    private final ReputationService reputationService;
    private final UserMapper userMapper;
    private final ApplicationEventPublisher events;

    /** Ce que le membre connecté est pour la PR, lu une fois par requête */
    private record Access(PullRequest pullRequest, Long userId, boolean author, boolean inTeam, PullRequestReviewer review) {

        boolean open() {
            return pullRequest.getStatus() == PullRequestStatus.OPEN && !pullRequest.isDraft();
        }

        boolean canComment() {
            return author || inTeam || review != null || pullRequest.isCommunity();
        }

        boolean canReview() {
            return open() && !author && (inTeam || review != null || pullRequest.isCommunity());
        }

        boolean canClaim() {
            return open() && !author && review == null && (inTeam || pullRequest.isCommunity());
        }

        boolean canRelease() {
            return review != null && !review.isRequired() && review.getState() == ReviewState.REQUESTED;
        }
    }

    // ==================== LECTURE ====================

    @Transactional(readOnly = true)
    public PullRequestDetailResponse detail(Long userId, String slug, int number) {
        return toDetail(access(userId, slug, number));
    }

    @Transactional(readOnly = true)
    public PullRequestFilesResponse files(Long userId, String slug, int number) {
        return contentService.files(access(userId, slug, number).pullRequest());
    }

    @Transactional(readOnly = true)
    public PullRequestChecksResponse checks(Long userId, String slug, int number) {
        return contentService.checks(access(userId, slug, number).pullRequest());
    }

    @Transactional(readOnly = true)
    public List<LinkedIssueResponse> issues(Long userId, String slug, int number) {
        return contentService.issues(access(userId, slug, number).pullRequest());
    }

    // ==================== COMMENTAIRES ====================

    /** Commente la conversation, ou une ligne du diff (avec, peut-être, le code proposé à sa place). */
    public ReviewCommentResponse comment(Long userId, String slug, int number, ReviewCommentRequest request) {
        Access access = access(userId, slug, number);
        if (!access.canComment()) {
            throw new ForbiddenException("Cette pull request n'est ouverte qu'à l'équipe du projet et à ses relecteurs");
        }
        boolean onLine = request.getLine() != null;
        ReviewComment comment = reviewService.comment(access.pullRequest().getId(), userId, request.getBody().strip(),
                onLine ? request.getPath().strip() : null, request.getLine(), onLine ? codeOrNull(request.getSuggestion()) : null);
        log.info("[Review] {} commente la PR {}{}", userId, access.pullRequest().getId(), onLine ? " (ligne)" : "");
        events.publishEvent(ReviewActivityEvent.commented(access.pullRequest().getId(), userId, comment.getId()));
        return toComment(comment);
    }

    /**
     * Modifie son commentaire : le texte, et la suggestion d'un commentaire de ligne. Le message d'une revue rendue
     * peut s'effacer, son verdict reste ; un commentaire garde un texte.
     */
    public ReviewCommentResponse updateComment(Long userId, String slug, int number, Long commentId, ReviewCommentUpdateRequest request) {
        ReviewComment comment = ownComment(userId, slug, number, commentId);
        String body = emptyToNull(request.getBody());
        if (body == null && comment.getVerdict() == null) {
            throw new OperationNotAllowedException("Le commentaire est requis", "body");
        }
        comment.setBody(body);
        if (comment.getLine() != null) {
            comment.setSuggestion(codeOrNull(request.getSuggestion()));
        }
        return toComment(comment);
    }

    /** Supprime son commentaire. Une revue rendue reste : son verdict compte pour la fusion. */
    public void deleteComment(Long userId, String slug, int number, Long commentId) {
        ReviewComment comment = ownComment(userId, slug, number, commentId);
        if (comment.getVerdict() != null) {
            throw new OperationNotAllowedException("Une revue rendue ne se supprime pas : rends-en une nouvelle pour changer de verdict");
        }
        commentRepository.delete(comment);
        log.info("[Review] {} supprime son commentaire {}", userId, commentId);
    }

    // ==================== REVUE ====================

    /** Rend sa revue : le verdict et son message rejoignent la conversation. */
    public PullRequestDetailResponse submitReview(Long userId, String slug, int number, ReviewSubmitRequest request) {
        Access access = access(userId, slug, number);
        PullRequest pullRequest = access.pullRequest();
        if (access.author()) {
            throw new OperationNotAllowedException("On ne relit pas sa propre pull request");
        }
        if (!access.open()) {
            throw new OperationNotAllowedException("Cette pull request n'attend plus de revue");
        }
        if (!access.canReview()) {
            throw new ForbiddenException("Cette pull request n'est pas ouverte à la revue communautaire");
        }
        ReviewComment verdict = reviewService.submitReview(pullRequest.getId(), userId, request.getState(), request.getBody());
        events.publishEvent(ReviewActivityEvent.reviewed(pullRequest.getId(), userId, verdict.getId()));
        log.info("[Review] {} rend sa revue de la PR {} : {}", userId, pullRequest.getId(), request.getState());
        return toDetail(access(userId, slug, number));
    }

    /**
     * Juge utile (ou plus) la revue d'un relecteur de la communauté : elle lui rapporte de la réputation
     * (ReputationRules.REVIEW_HELPFUL), qu'il perd si l'équipe se ravise.
     */
    public PullRequestDetailResponse judgeHelpful(Long userId, String slug, int number, Long reviewerId, boolean helpful) {
        Access access = access(userId, slug, number);
        if (!access.inTeam()) {
            throw new ForbiddenException("Seule l'équipe du projet juge les revues utiles");
        }
        PullRequestReviewer review = reviewerRepository.findByPullRequestIdAndReviewerId(access.pullRequest().getId(), reviewerId)
                .orElseThrow(() -> new ResourceNotFoundException("Relecteur", reviewerId));
        if (!review.isCommunity() || review.getState() == ReviewState.REQUESTED) {
            throw new OperationNotAllowedException("Seule une revue communautaire rendue peut être jugée utile");
        }
        if (helpful && review.getHelpfulAt() == null) {
            review.setHelpfulAt(Instant.now());
            reputationService.onReviewJudgedHelpful(reviewerId);
            events.publishEvent(ReviewActivityEvent.judgedHelpful(access.pullRequest().getId(), userId, reviewerId));
            log.info("[Review] {} juge utile la revue de {} sur la PR {}", userId, reviewerId, access.pullRequest().getId());
        } else if (!helpful && review.getHelpfulAt() != null) {
            review.setHelpfulAt(null);
            reputationService.onReviewHelpfulWithdrawn(reviewerId);
            log.info("[Review] {} ne juge plus utile la revue de {} sur la PR {}", userId, reviewerId, access.pullRequest().getId());
        }
        reviewerRepository.flush();
        return toDetail(access(userId, slug, number));
    }

    // ==================== HELPERS ====================

    /**
     * La PR et ce que le membre est pour elle. Un projet masqué n'existe que pour son équipe et les admins : ses PR
     * non plus.
     */
    private Access access(Long userId, String slug, int number) {
        Project project = projectRepository.findBySlug(slug)
                .filter(found -> projectService.isVisibleTo(found, userId))
                .orElseThrow(() -> new ResourceNotFoundException("Projet", "slug", slug));
        PullRequest pullRequest = pullRequestRepository.findByProjectIdAndNumber(project.getId(), number)
                .orElseThrow(() -> new ResourceNotFoundException("Pull request", "numéro", "#" + number));
        return new Access(pullRequest, userId, ReviewService.isAuthor(pullRequest, userId), projectService.isTeamMember(project, userId),
                reviewerRepository.findByPullRequestIdAndReviewerId(pullRequest.getId(), userId).orElse(null));
    }

    // Son commentaire sur cette PR ; un modérateur peut aussi intervenir sur celui d'un autre
    private ReviewComment ownComment(Long userId, String slug, int number, Long commentId) {
        Access access = access(userId, slug, number);
        ReviewComment comment = commentRepository.findByIdAndPullRequestId(commentId, access.pullRequest().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Commentaire", commentId));
        if (!comment.getAuthor().getId().equals(userId) && !userService.canModerate(userId)) {
            throw new ForbiddenException("Seul son auteur modifie ou supprime un commentaire");
        }
        return comment;
    }

    private PullRequestDetailResponse toDetail(Access access) {
        PullRequest pullRequest = access.pullRequest();
        PullRequestResponse response = reviewService.toResponses(List.of(pullRequest), access.userId()).getFirst();
        return PullRequestDetailResponse.builder()
                .pullRequest(response)
                .body(pullRequest.getBody())
                .comments(commentRepository.findWithAuthorByPullRequestId(pullRequest.getId()).stream().map(this::toComment).toList())
                .viewer(PullRequestDetailResponse.Viewer.builder()
                        .author(access.author())
                        .canComment(access.canComment())
                        .canReview(access.canReview())
                        .canClaim(access.canClaim())
                        .canRelease(access.canRelease())
                        .canJudge(access.inTeam())
                        .build())
                .helpfulReward(ReputationRules.REVIEW_HELPFUL)
                .build();
    }

    private ReviewCommentResponse toComment(ReviewComment comment) {
        return ReviewCommentResponse.builder()
                .id(comment.getId())
                .author(userMapper.toSummary(comment.getAuthor()))
                .body(comment.getBody())
                .path(comment.getPath())
                .line(comment.getLine())
                .suggestion(comment.getSuggestion())
                .verdict(comment.getVerdict())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }

    private static String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    // Du code proposé : son indentation compte, seuls les retours à la ligne de la fin partent. Une suggestion vide
    // (supprimer la ligne) reste une suggestion
    private static String codeOrNull(String value) {
        return value == null ? null : value.replaceAll("[\\r\\n]+$", "");
    }
}
