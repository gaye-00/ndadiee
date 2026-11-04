package com.hautetech.ndadiee.service.workspace;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.hautetech.ndadiee.model.review.PullRequestReviewer;
import com.hautetech.ndadiee.model.review.ReviewState;

/** Le verdict d'une revue, vu d'une tâche : les changements demandés l'emportent, une revue requise attendue retient. */
class TaskPullRequestsTest {

    private static PullRequestReviewer reviewer(ReviewState state, boolean required) {
        return PullRequestReviewer.builder().state(state).required(required).build();
    }

    @Test
    void withoutReviewersThereIsNoVerdict() {
        assertThat(TaskPullRequests.verdict(List.of())).isNull();
    }

    @Test
    void requestedChangesWinOverApprovals() {
        assertThat(TaskPullRequests.verdict(List.of(
                reviewer(ReviewState.CHANGES_REQUESTED, true),
                reviewer(ReviewState.APPROVED, false)))).isEqualTo(ReviewState.CHANGES_REQUESTED);
    }

    @Test
    void anApprovalCountsOnceNoRequiredReviewIsWaiting() {
        assertThat(TaskPullRequests.verdict(List.of(
                reviewer(ReviewState.APPROVED, true),
                reviewer(ReviewState.REQUESTED, false)))).isEqualTo(ReviewState.APPROVED);
        assertThat(TaskPullRequests.verdict(List.of(
                reviewer(ReviewState.APPROVED, false),
                reviewer(ReviewState.COMMENTED, true)))).isEqualTo(ReviewState.REQUESTED);
    }
}
