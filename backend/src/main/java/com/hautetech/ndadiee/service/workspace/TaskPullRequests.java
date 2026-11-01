package com.hautetech.ndadiee.service.workspace;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.dto.response.TaskPullRequestResponse;
import com.hautetech.ndadiee.mapper.WorkspaceMapper;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.model.review.PullRequestReviewer;
import com.hautetech.ndadiee.model.review.PullRequestStatus;
import com.hautetech.ndadiee.model.review.ReviewState;
import com.hautetech.ndadiee.repository.PullRequestReviewerRepository;

import lombok.RequiredArgsConstructor;

/** Les pull requests vues d'une tâche : leur état et le verdict de leur revue, pour toute une liste en une requête. */
@Component
@RequiredArgsConstructor
public class TaskPullRequests {

    private final PullRequestReviewerRepository reviewerRepository;
    private final WorkspaceMapper mapper;

    /** Chaque PR, par son identifiant, avec le verdict de sa revue. */
    public Map<Long, TaskPullRequestResponse> describe(Collection<PullRequest> pullRequests) {
        // Une fois chacune, par identifiant (une PR peut être liée à plusieurs tâches)
        Collection<PullRequest> distinct = pullRequests.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(PullRequest::getId, Function.identity(), (first, same) -> first, LinkedHashMap::new))
                .values();
        if (distinct.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<PullRequestReviewer>> reviewers = reviewerRepository
                .findWithReviewerByPullRequestIds(distinct.stream().map(PullRequest::getId).toList()).stream()
                .collect(Collectors.groupingBy(reviewer -> reviewer.getPullRequest().getId()));
        return distinct.stream().collect(Collectors.toMap(PullRequest::getId, pullRequest -> {
            TaskPullRequestResponse response = mapper.toPullRequestRef(pullRequest);
            if (pullRequest.getStatus() == PullRequestStatus.OPEN) {
                response.setReview(verdict(reviewers.getOrDefault(pullRequest.getId(), List.of())));
            }
            return response;
        }));
    }

    /**
     * Où en est la revue : des changements demandés par l'un des relecteurs l'emportent ; approuvée quand au moins un
     * relecteur a approuvé et qu'aucune revue requise n'attend plus ; sinon, une revue est attendue. Sans relecteur, rien.
     */
    static ReviewState verdict(List<PullRequestReviewer> reviewers) {
        if (reviewers.isEmpty()) {
            return null;
        }
        if (reviewers.stream().anyMatch(reviewer -> reviewer.getState() == ReviewState.CHANGES_REQUESTED)) {
            return ReviewState.CHANGES_REQUESTED;
        }
        boolean approved = reviewers.stream().anyMatch(reviewer -> reviewer.getState() == ReviewState.APPROVED);
        boolean waiting = reviewers.stream().anyMatch(reviewer -> reviewer.isRequired() && reviewer.getState() != ReviewState.APPROVED);
        return approved && !waiting ? ReviewState.APPROVED : ReviewState.REQUESTED;
    }
}
