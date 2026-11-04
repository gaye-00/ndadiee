package com.hautetech.ndadiee.service.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.hautetech.ndadiee.dto.response.LinkedIssueResponse;
import com.hautetech.ndadiee.dto.response.PullRequestCheckResponse;
import com.hautetech.ndadiee.dto.response.PullRequestCheckResponse.State;
import com.hautetech.ndadiee.dto.response.PullRequestChecksResponse;
import com.hautetech.ndadiee.dto.response.PullRequestFilesResponse;
import com.hautetech.ndadiee.github.GithubClient.CheckContext;
import com.hautetech.ndadiee.github.GithubClient.ClosingIssue;
import com.hautetech.ndadiee.github.GithubClient.Label;
import com.hautetech.ndadiee.github.GithubClient.Nodes;
import com.hautetech.ndadiee.github.GithubClient.PullRequestChecks;
import com.hautetech.ndadiee.github.GithubClient.PullRequestFile;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.service.github.GithubPullRequestReader;

/** Le diff, les vérifications et les issues d'une PR : lus sur GitHub, ou dans les fichiers de démonstration. */
@ExtendWith(MockitoExtension.class)
class PullRequestContentServiceTest {

    private static final String URL = "https://github.com/openmrs/openmrs-core/pull/5120";

    @Mock
    private GithubPullRequestReader github;
    @Mock
    private DemoPullRequestContent demo;

    @InjectMocks
    private PullRequestContentService service;

    private static PullRequest synced(int filesChanged) {
        return PullRequest.builder().number(5120).githubUrl(URL).filesChanged(filesChanged)
                .project(Project.builder().slug("openmrs-core").build()).build();
    }

    @Test
    void filesBeyondThoseReadAreOnGithub() {
        PullRequest pullRequest = synced(320);
        when(github.files(pullRequest)).thenReturn(List.of(new PullRequestFile("api/Obs.java", "renamed", 4, 1, "@@ -1 +1 @@", "api/Observation.java")));

        PullRequestFilesResponse files = service.files(pullRequest);

        assertThat(files.isAvailable()).isTrue();
        assertThat(files.isTruncated()).isTrue();
        assertThat(files.getTotal()).isEqualTo(320);
        assertThat(files.getUrl()).isEqualTo(URL + "/files");
        assertThat(files.getFiles().getFirst().getPreviousPath()).isEqualTo("api/Observation.java");
    }

    @Test
    void checksSayWhatNeedsAttentionFirst() {
        PullRequest pullRequest = synced(1);
        Instant start = Instant.parse("2026-10-30T08:00:00Z");
        when(github.canReadChecks()).thenReturn(true);
        when(github.checks(pullRequest)).thenReturn(new PullRequestChecks(List.of(
                run("build", "COMPLETED", "SUCCESS", start),
                run("lint", "COMPLETED", "NEUTRAL", start),
                run("e2e", "IN_PROGRESS", null, start),
                run("unit", "COMPLETED", "TIMED_OUT", start),
                new CheckContext(CheckContext.STATUS, "ci/sonar", null, "PENDING", null, start, null, null, null, "Analyse en cours")),
                5, List.of()));

        PullRequestChecksResponse checks = service.checks(pullRequest);

        assertThat(checks.getChecks()).extracting(PullRequestCheckResponse::getName).containsExactly("unit", "ci/sonar", "e2e", "build", "lint");
        assertThat(checks.getChecks()).extracting(PullRequestCheckResponse::getState)
                .containsExactly(State.FAILURE, State.PENDING, State.PENDING, State.SUCCESS, State.SKIPPED);
        assertThat(checks.getChecks().get(2).getCompletedAt()).isNull();
        assertThat(checks.getChecks().get(3).getContext()).isEqualTo("CI");
    }

    @Test
    void aStarterIssueIsRecognisedByItsLabels() {
        PullRequest pullRequest = synced(1);
        when(github.canReadChecks()).thenReturn(true);
        when(github.checks(pullRequest)).thenReturn(new PullRequestChecks(List.of(), 0, List.of(
                new ClosingIssue(4810, "Obs: null concept", "https://github.com/openmrs/openmrs-core/issues/4810", "OPEN",
                        new Nodes<>(List.of(new Label("Good First Issue"), new Label("bug")))))));

        List<LinkedIssueResponse> issues = service.issues(pullRequest);

        assertThat(issues).singleElement().satisfies(issue -> {
            assertThat(issue.isStarter()).isTrue();
            assertThat(issue.getLabels()).containsExactly("Good First Issue", "bug");
        });
    }

    @Test
    void aDemoPullRequestWithoutDetailsStillShowsItsStarterIssue() {
        PullRequest pullRequest = PullRequest.builder().number(14).starterIssueNumber(3).filesChanged(3).checksTotal(1)
                .project(Project.builder().slug("paperweight").build()).build();
        when(demo.files("paperweight", 14)).thenReturn(java.util.Optional.empty());
        when(demo.details("paperweight", 14)).thenReturn(java.util.Optional.empty());

        assertThat(service.files(pullRequest).isAvailable()).isFalse();
        assertThat(service.files(pullRequest).getTotal()).isEqualTo(3);
        assertThat(service.checks(pullRequest).isAvailable()).isFalse();
        assertThat(service.issues(pullRequest)).singleElement().satisfies(issue -> {
            assertThat(issue.getNumber()).isEqualTo(3);
            assertThat(issue.isStarter()).isTrue();
            assertThat(issue.getTitle()).isNull();
        });
    }

    private static CheckContext run(String name, String status, String conclusion, Instant start) {
        return new CheckContext(CheckContext.CHECK_RUN, name, status, conclusion, "https://github.com/x", start, start.plusSeconds(60),
                "GitHub Actions", "CI", null);
    }
}
