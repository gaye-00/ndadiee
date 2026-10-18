package com.hautetech.ndadiee.service.review;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.PullRequestResponse;
import com.hautetech.ndadiee.dto.response.ReviewOverviewResponse;
import com.hautetech.ndadiee.dto.response.ReviewerResponse;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMember;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.model.review.PullRequestReviewer;
import com.hautetech.ndadiee.model.review.PullRequestStatus;
import com.hautetech.ndadiee.model.review.ReviewComment;
import com.hautetech.ndadiee.model.review.ReviewState;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.PullRequestRepository;
import com.hautetech.ndadiee.repository.PullRequestReviewerRepository;
import com.hautetech.ndadiee.repository.ReviewCommentRepository;
import com.hautetech.ndadiee.service.project.ProjectService;
import com.hautetech.ndadiee.service.user.ReputationRules;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Les revues de code (design 3B, 3C) : les pull requests des projets, leurs relecteurs et les commentaires.
 *
 * <ul>
 * <li>La page des revues : les PR de chaque onglet pour le membre connecté (ReviewTab), avec recherche et filtre
 * de projet, et la vue d'ensemble (totaux, projets, bilan de relecteur).</li>
 * <li>La revue communautaire : un membre hors de l'équipe se propose comme relecteur d'une PR ouverte à la
 * communauté, ou se retire tant qu'il n'a rien rendu.</li>
 * <li>Les gestes du dépôt (ouvrir une PR, demander une revue, rendre une revue, commenter, fusionner, fermer) :
 * pour les données de démonstration aujourd'hui, pour la synchronisation GitHub demain.</li>
 * </ul>
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class ReviewService {

    // Arrivé dans l'équipe depuis moins de tant de jours : sa première PR est une « première contribution »
    private static final int NEWCOMER_DAYS = 30;

    private final ReviewQueries queries;
    private final PullRequestRepository pullRequestRepository;
    private final PullRequestReviewerRepository reviewerRepository;
    private final ReviewCommentRepository commentRepository;
    private final ProjectRepository projectRepository;
    private final DeveloperRepository developerRepository;
    private final ProjectService projectService;
    private final UserService userService;
    private final ProjectMapper projectMapper;
    private final UserMapper userMapper;

    // ==================== LECTURE ====================

    /**
     * Une page d'un onglet. L'onglet Communauté met d'abord les PR dont le membre connaît la stack (étiquettes et
     * technologies du projet présentes dans son profil), puis les plus récentes.
     */
    @Transactional(readOnly = true)
    public PageResponse<PullRequestResponse> list(Long userId, ReviewTab tab, String q, String project, Pageable pageable) {
        ReviewQueries.Filter filter = new ReviewQueries.Filter(userId, tab, q, project);
        if (tab != ReviewTab.COMMUNITY) {
            List<PullRequest> content = queries.page(filter, (int) pageable.getOffset(), pageable.getPageSize());
            long total = queries.count(filter);
            return PageResponse.from(new PageImpl<>(content, pageable, total), toResponses(content, userId));
        }

        List<PullRequest> candidates = queries.page(filter, 0, ReviewQueries.COMMUNITY_CANDIDATES);
        Set<String> skills = skillsOf(userId);
        // Le tri est stable : à égalité, l'ordre de la base (les plus récentes d'abord)
        List<PullRequest> ranked = candidates.stream()
                .sorted(Comparator.comparingInt((PullRequest pr) -> -sharedSkills(pr, skills).size()))
                .toList();
        int from = (int) Math.min(pageable.getOffset(), ranked.size());
        List<PullRequest> slice = ranked.subList(from, Math.min(from + pageable.getPageSize(), ranked.size()));
        return PageResponse.from(new PageImpl<>(slice, pageable, ranked.size()), toResponses(slice, userId));
    }

    /** Les totaux de chaque onglet, ses équipes qui ont des PR ouvertes, son bilan de relecteur. */
    @Transactional(readOnly = true)
    public ReviewOverviewResponse overview(Long userId) {
        Map<Long, Long> openByProject = queries.openByTeamProject(userId).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1], (a, b) -> a, LinkedHashMap::new));
        Map<Long, Project> projects = projectRepository.findAllById(openByProject.keySet()).stream()
                .collect(Collectors.toMap(Project::getId, Function.identity()));

        long reviewsGiven = 0;
        long approved = 0;
        long changesRequested = 0;
        long communityReviews = 0;
        for (Object[] row : queries.reviewsGivenBy(userId)) {
            long count = (Long) row[2];
            reviewsGiven += count;
            approved += row[0] == ReviewState.APPROVED ? count : 0;
            changesRequested += row[0] == ReviewState.CHANGES_REQUESTED ? count : 0;
            communityReviews += Boolean.TRUE.equals(row[1]) ? count : 0;
        }

        return ReviewOverviewResponse.builder()
                .toReview(count(userId, ReviewTab.TO_REVIEW))
                .community(count(userId, ReviewTab.COMMUNITY))
                .mine(count(userId, ReviewTab.MINE))
                .team(count(userId, ReviewTab.TEAM))
                .done(count(userId, ReviewTab.DONE))
                .oldestRequestAt(queries.oldestRequest(userId))
                .projects(openByProject.entrySet().stream()
                        .filter(entry -> projects.containsKey(entry.getKey()))
                        .map(entry -> ReviewOverviewResponse.ProjectCount.builder()
                                .project(projectMapper.toBrief(projects.get(entry.getKey())))
                                .open(entry.getValue())
                                .build())
                        .toList())
                .reviewsGiven(reviewsGiven)
                .approved(approved)
                .changesRequested(changesRequested)
                .communityReviews(communityReviews)
                .mergedPullRequests(queries.mergedBy(userId))
                .reward(ReputationRules.REVIEW_HELPFUL)
                .build();
    }

    /** Les PR qui attendent sa revue, les plus anciennes d'abord (atelier, design 3B). */
    @Transactional(readOnly = true)
    public List<PullRequestResponse> awaitingReview(Long userId, int limit) {
        List<PullRequest> pullRequests = queries.page(new ReviewQueries.Filter(userId, ReviewTab.TO_REVIEW, null, null), 0, limit);
        return toResponses(pullRequests, userId);
    }

    @Transactional(readOnly = true)
    public long count(Long userId, ReviewTab tab) {
        return queries.count(new ReviewQueries.Filter(userId, tab, null, null));
    }

    // ==================== REVUE COMMUNAUTAIRE ====================

    /**
     * Se propose comme relecteur d'une PR ouverte : un membre de l'équipe du projet, ou n'importe qui si la PR est
     * ouverte à la communauté. La PR passe dans son onglet « À relire ».
     */
    public PullRequestResponse claim(Long userId, Long pullRequestId) {
        PullRequest pullRequest = findOrThrow(pullRequestId);
        Developer reviewer = userService.getDeveloperOrThrow(userId);
        if (pullRequest.getStatus() != PullRequestStatus.OPEN || pullRequest.isDraft()) {
            throw new OperationNotAllowedException("Cette pull request n'attend plus de revue");
        }
        if (pullRequest.getAuthor().getId().equals(userId)) {
            throw new OperationNotAllowedException("On ne relit pas sa propre pull request");
        }
        boolean inTeam = projectService.isTeamMember(pullRequest.getProject(), userId);
        if (!inTeam && !pullRequest.isCommunity()) {
            throw new ForbiddenException("Cette pull request n'est pas ouverte à la revue communautaire");
        }
        if (reviewerRepository.findByPullRequestIdAndReviewerId(pullRequestId, userId).isPresent()) {
            throw new OperationNotAllowedException("Tu relis déjà cette pull request");
        }
        reviewerRepository.save(PullRequestReviewer.builder()
                .pullRequest(pullRequest)
                .reviewer(reviewer)
                .community(!inTeam)
                .build());
        log.info("[Review] {} se propose pour relire la PR {}", userId, pullRequestId);
        return toResponses(List.of(pullRequest), userId).get(0);
    }

    /** Se retire d'une revue qu'il avait prise lui-même, tant qu'il n'a rien rendu. */
    public PullRequestResponse release(Long userId, Long pullRequestId) {
        PullRequest pullRequest = findOrThrow(pullRequestId);
        PullRequestReviewer review = reviewerRepository.findByPullRequestIdAndReviewerId(pullRequestId, userId)
                .orElseThrow(() -> new OperationNotAllowedException("Tu ne relis pas cette pull request"));
        if (review.isRequired() || review.getState() != ReviewState.REQUESTED) {
            throw new OperationNotAllowedException("Cette revue t'a été demandée par l'équipe, ou tu l'as déjà commencée");
        }
        reviewerRepository.delete(review);
        reviewerRepository.flush();
        log.info("[Review] {} se retire de la PR {}", userId, pullRequestId);
        return toResponses(List.of(pullRequest), userId).get(0);
    }

    // ==================== GESTES DU DÉPÔT ====================

    /** Ce qu'il faut pour ouvrir une PR (données de démonstration, synchronisation du dépôt). */
    @Builder
    public record Opening(Long projectId, Long authorId, Integer number, String title, String body, String sourceBranch,
            String targetBranch, int commits, int filesChanged, int additions, int deletions, int checksTotal,
            int checksPassed, int checksFailed, Integer starterIssueNumber, List<String> labels, boolean community,
            boolean draft) {
    }

    public PullRequest open(Opening opening) {
        Project project = projectService.findProjectOrThrow(opening.projectId());
        Instant now = Instant.now();
        PullRequest pullRequest = pullRequestRepository.save(PullRequest.builder()
                .project(project)
                .author(userService.getDeveloperOrThrow(opening.authorId()))
                .number(opening.number() != null ? opening.number() : queries.nextNumber(project.getId()))
                .title(opening.title().trim())
                .body(opening.body())
                .sourceBranch(opening.sourceBranch())
                .targetBranch(opening.targetBranch() == null ? "main" : opening.targetBranch())
                .commits(opening.commits())
                .filesChanged(opening.filesChanged())
                .additions(opening.additions())
                .deletions(opening.deletions())
                .checksTotal(opening.checksTotal())
                .checksPassed(opening.checksPassed())
                .checksFailed(opening.checksFailed())
                .starterIssueNumber(opening.starterIssueNumber())
                .labels(opening.labels() == null ? new ArrayList<>() : new ArrayList<>(opening.labels()))
                .community(opening.community())
                .draft(opening.draft())
                .lastActivityAt(now)
                .build());
        log.info("[Review] PR #{} ouverte sur le projet {}", pullRequest.getNumber(), project.getId());
        return pullRequest;
    }

    /** Demande la revue d'un membre ; requis : l'équipe attend sa revue pour fusionner. */
    public PullRequestReviewer requestReview(Long pullRequestId, Long reviewerId, boolean required) {
        PullRequest pullRequest = findOrThrow(pullRequestId);
        return reviewerRepository.findByPullRequestIdAndReviewerId(pullRequestId, reviewerId)
                .orElseGet(() -> reviewerRepository.save(PullRequestReviewer.builder()
                        .pullRequest(pullRequest)
                        .reviewer(userService.getDeveloperOrThrow(reviewerId))
                        .required(required)
                        .community(!projectService.isTeamMember(pullRequest.getProject(), reviewerId))
                        .build()));
    }

    /** Rend une revue : commentée, approuvée, ou avec des changements demandés. */
    public PullRequestReviewer submitReview(Long pullRequestId, Long reviewerId, ReviewState state) {
        if (state == ReviewState.REQUESTED) {
            throw new OperationNotAllowedException("Une revue rendue est commentée, approuvée ou demande des changements");
        }
        PullRequestReviewer review = requestReview(pullRequestId, reviewerId, false);
        Instant now = Instant.now();
        review.setState(state);
        review.setSubmittedAt(now);
        review.getPullRequest().setLastActivityAt(now);
        return review;
    }

    public ReviewComment comment(Long pullRequestId, Long authorId, String body, String path, Integer line, String suggestion) {
        PullRequest pullRequest = findOrThrow(pullRequestId);
        pullRequest.setLastActivityAt(Instant.now());
        return commentRepository.save(ReviewComment.builder()
                .pullRequest(pullRequest)
                .author(userService.getDeveloperOrThrow(authorId))
                .body(body)
                .path(path)
                .line(line)
                .suggestion(suggestion)
                .build());
    }

    public void merge(Long pullRequestId) {
        PullRequest pullRequest = findOrThrow(pullRequestId);
        Instant now = Instant.now();
        pullRequest.setStatus(PullRequestStatus.MERGED);
        pullRequest.setMergedAt(now);
        pullRequest.setLastActivityAt(now);
    }

    public void close(Long pullRequestId) {
        PullRequest pullRequest = findOrThrow(pullRequestId);
        Instant now = Instant.now();
        pullRequest.setStatus(PullRequestStatus.CLOSED);
        pullRequest.setClosedAt(now);
        pullRequest.setLastActivityAt(now);
    }

    // ==================== RÉPONSES ====================

    /**
     * Convertit des PR en ajoutant ce qui ne vient pas de l'entité : relecteurs, commentaires, première
     * contribution ; et pour le membre connecté, sa revue, son équipe, la stack partagée et la réputation à gagner.
     * Une poignée de requêtes pour toute la liste.
     */
    @Transactional(readOnly = true)
    public List<PullRequestResponse> toResponses(List<PullRequest> pullRequests, Long viewerId) {
        if (pullRequests.isEmpty()) {
            return List.of();
        }
        List<Long> ids = pullRequests.stream().map(PullRequest::getId).toList();
        Map<Long, List<ReviewerResponse>> reviewers = reviewerRepository.findWithReviewerByPullRequestIds(ids).stream()
                .collect(Collectors.groupingBy(review -> review.getPullRequest().getId(),
                        Collectors.mapping(this::toReviewer, Collectors.toList())));
        Map<Long, Long> comments = commentRepository.countByPullRequestIds(ids).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        Set<Long> first = firstContributions(ids);
        Set<Long> teams = viewerId == null ? Set.of() : new HashSet<>(queries.teamProjectIds(viewerId));
        Set<String> skills = viewerId == null ? Set.of() : skillsOf(viewerId);

        return pullRequests.stream()
                .map(pr -> {
                    List<ReviewerResponse> prReviewers = reviewers.getOrDefault(pr.getId(), List.of());
                    boolean inTeam = teams.contains(pr.getProject().getId());
                    boolean outsider = viewerId != null && !inTeam && !pr.getAuthor().getId().equals(viewerId);
                    return PullRequestResponse.builder()
                            .id(pr.getId())
                            .number(pr.getNumber())
                            .title(pr.getTitle())
                            .status(pr.getStatus())
                            .draft(pr.isDraft())
                            .community(pr.isCommunity())
                            .labels(List.copyOf(pr.getLabels()))
                            .project(projectMapper.toBrief(pr.getProject()))
                            .author(userMapper.toSummary(pr.getAuthor()))
                            .firstContribution(first.contains(pr.getId()))
                            .starterIssueNumber(pr.getStarterIssueNumber())
                            .sourceBranch(pr.getSourceBranch())
                            .targetBranch(pr.getTargetBranch())
                            .commits(pr.getCommits())
                            .filesChanged(pr.getFilesChanged())
                            .additions(pr.getAdditions())
                            .deletions(pr.getDeletions())
                            .checksTotal(pr.getChecksTotal())
                            .checksPassed(pr.getChecksPassed())
                            .checksFailed(pr.getChecksFailed())
                            .reviewers(prReviewers)
                            .commentCount(comments.getOrDefault(pr.getId(), 0L))
                            .createdAt(pr.getCreatedAt())
                            .lastActivityAt(pr.getLastActivityAt())
                            .mergedAt(pr.getMergedAt())
                            .closedAt(pr.getClosedAt())
                            .myReview(viewerId == null ? null : prReviewers.stream()
                                    .filter(review -> review.getUser().getId().equals(viewerId))
                                    .findFirst()
                                    .orElse(null))
                            .inMyTeam(inTeam)
                            .sharedSkills(sharedSkills(pr, skills))
                            // Une revue communautaire utile rapporte de la réputation à qui n'est pas de l'équipe
                            .reward(outsider && pr.isCommunity() && pr.getStatus() == PullRequestStatus.OPEN
                                    ? ReputationRules.REVIEW_HELPFUL
                                    : null)
                            .build();
                })
                .toList();
    }

    private ReviewerResponse toReviewer(PullRequestReviewer review) {
        return ReviewerResponse.builder()
                .user(userMapper.toSummary(review.getReviewer()))
                .state(review.getState())
                .required(review.isRequired())
                .community(review.isCommunity())
                .requestedAt(review.getCreatedAt())
                .submittedAt(review.getSubmittedAt())
                .build();
    }

    // ==================== HELPERS ====================

    /**
     * Les PR qui sont la première contribution de leur auteur au projet (design 3C : « sa 1re contribution ») : sa
     * première PR dans le projet, quand il n'en est ni le porteur ni un mainteneur, et qu'il vient d'arriver dans
     * l'équipe (moins de NEWCOMER_DAYS avant la PR) ou n'en fait pas partie.
     */
    private Set<Long> firstContributions(List<Long> ids) {
        List<PullRequest> firsts = queries.firstPullRequests(ids);
        if (firsts.isEmpty()) {
            return Set.of();
        }
        Map<String, ProjectMember> memberships = queries.memberships(
                        firsts.stream().map(pr -> pr.getProject().getId()).collect(Collectors.toSet()),
                        firsts.stream().map(pr -> pr.getAuthor().getId()).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(member -> member.getProject().getId() + ":" + member.getUser().getId(),
                        Function.identity()));
        return firsts.stream()
                .filter(pr -> {
                    ProjectMember member = memberships.get(pr.getProject().getId() + ":" + pr.getAuthor().getId());
                    if (member == null || member.getStatus() != MemberStatus.ACCEPTED) {
                        return true;
                    }
                    return member.getRole() == ProjectRole.CONTRIBUTOR
                            && member.getCreatedAt().isAfter(pr.getCreatedAt().minus(NEWCOMER_DAYS, ChronoUnit.DAYS));
                })
                .map(PullRequest::getId)
                .collect(Collectors.toSet());
    }

    private PullRequest findOrThrow(Long pullRequestId) {
        return pullRequestRepository.findById(pullRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Pull request", pullRequestId));
    }

    // Ses compétences, en minuscules
    private Set<String> skillsOf(Long userId) {
        return developerRepository.findById(userId)
                .map(developer -> developer.getSkills().stream().map(tag -> normalize(tag.getName())).collect(Collectors.toSet()))
                .orElse(Set.of());
    }

    /**
     * Ce que la PR a de commun avec son profil : ses étiquettes et les technologies de son projet présentes dans ses
     * compétences, telles que la PR ou le projet les écrivent, une fois chacune.
     */
    private static List<String> sharedSkills(PullRequest pr, Set<String> skills) {
        if (skills.isEmpty()) {
            return List.of();
        }
        Map<String, String> shared = new LinkedHashMap<>();
        Stream.concat(pr.getLabels().stream(), pr.getProject().getTags().stream().map(Tag::getName))
                .filter(name -> skills.contains(normalize(name)))
                .forEach(name -> shared.putIfAbsent(normalize(name), name));
        return List.copyOf(shared.values());
    }

    private static String normalize(String name) {
        return name.trim().toLowerCase(Locale.ROOT);
    }
}
