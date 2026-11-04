package com.hautetech.ndadiee.service.review;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.hautetech.ndadiee.dto.response.LinkedIssueResponse;
import com.hautetech.ndadiee.dto.response.PullRequestCheckResponse;
import com.hautetech.ndadiee.dto.response.PullRequestCheckResponse.State;
import com.hautetech.ndadiee.dto.response.PullRequestChecksResponse;
import com.hautetech.ndadiee.dto.response.PullRequestFileResponse;
import com.hautetech.ndadiee.dto.response.PullRequestFilesResponse;
import com.hautetech.ndadiee.github.GithubClient.CheckContext;
import com.hautetech.ndadiee.github.GithubClient.ClosingIssue;
import com.hautetech.ndadiee.github.GithubClient.PullRequestChecks;
import com.hautetech.ndadiee.github.GithubClient.PullRequestFile;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.service.github.GithubPullRequestReader;
import com.hautetech.ndadiee.service.github.StarterLabels;

import lombok.RequiredArgsConstructor;

/**
 * Ce que le dépôt sait d'une pull request, au-delà de ce que Ndadiee garde : ses fichiers modifiés et leur diff, ses
 * vérifications une par une, les issues qu'elle ferme. Une PR synchronisée se lit sur GitHub
 * (GithubPullRequestReader) ; une PR de démonstration, dans ses fichiers du classpath (DemoPullRequestContent).
 *
 * Les erreurs de GitHub (introuvable, quota, injoignable) remontent en GithubException : la page les explique et
 * propose de réessayer.
 */
@Service
@RequiredArgsConstructor
public class PullRequestContentService {

    // Ordre des vérifications : ce qui demande de l'attention d'abord
    private static final List<State> CHECK_ORDER = List.of(State.FAILURE, State.PENDING, State.SUCCESS, State.SKIPPED);
    // Conclusions d'un check run terminé (CheckConclusionState) et états d'un statut (StatusState)
    private static final Set<String> FAILED = Set.of("FAILURE", "ERROR", "TIMED_OUT", "CANCELLED", "ACTION_REQUIRED",
            "STARTUP_FAILURE", "STALE");
    private static final Set<String> SKIPPED = Set.of("NEUTRAL", "SKIPPED");

    private final GithubPullRequestReader github;
    private final DemoPullRequestContent demo;

    // ==================== FICHIERS ====================

    public PullRequestFilesResponse files(PullRequest pullRequest) {
        if (pullRequest.getGithubUrl() == null) {
            Optional<List<PullRequestFileResponse>> files = demo.files(pullRequest.getProject().getSlug(), pullRequest.getNumber());
            return PullRequestFilesResponse.builder()
                    .available(files.isPresent())
                    .files(files.orElse(List.of()))
                    .total(files.map(List::size).orElse(pullRequest.getFilesChanged()))
                    .truncated(false)
                    .build();
        }
        List<PullRequestFileResponse> files = github.files(pullRequest).stream().map(PullRequestContentService::toFile).toList();
        int total = Math.max(pullRequest.getFilesChanged(), files.size());
        return PullRequestFilesResponse.builder()
                .available(true)
                .files(files)
                .total(total)
                .truncated(files.size() < total)
                .url(pullRequest.getGithubUrl() + "/files")
                .build();
    }

    static PullRequestFileResponse toFile(PullRequestFile file) {
        return PullRequestFileResponse.builder()
                .path(file.filename())
                .previousPath(file.previousFilename())
                .status(switch (String.valueOf(file.status())) {
                    case "added" -> PullRequestFileResponse.Status.ADDED;
                    case "removed" -> PullRequestFileResponse.Status.REMOVED;
                    case "renamed" -> PullRequestFileResponse.Status.RENAMED;
                    case "copied" -> PullRequestFileResponse.Status.COPIED;
                    default -> PullRequestFileResponse.Status.MODIFIED;
                })
                .additions(file.additions())
                .deletions(file.deletions())
                .patch(file.patch() == null || file.patch().isEmpty() ? null : file.patch())
                .build();
    }

    // ==================== VÉRIFICATIONS ====================

    public PullRequestChecksResponse checks(PullRequest pullRequest) {
        if (pullRequest.getGithubUrl() == null) {
            Optional<DemoPullRequestContent.Details> details = demo.details(pullRequest.getProject().getSlug(), pullRequest.getNumber());
            List<PullRequestCheckResponse> checks = details.map(found -> found.checks().stream()
                            .map(check -> PullRequestCheckResponse.builder()
                                    .name(check.name())
                                    .context(check.context())
                                    .state(check.state())
                                    .description(check.description())
                                    .startedAt(pullRequest.getCreatedAt().plusSeconds(check.afterMinutes() * 60L))
                                    .completedAt(check.seconds() == null ? null
                                            : pullRequest.getCreatedAt().plusSeconds(check.afterMinutes() * 60L + check.seconds()))
                                    .build())
                            .toList())
                    .orElse(List.of());
            return PullRequestChecksResponse.builder()
                    .available(details.isPresent())
                    .checks(sorted(checks))
                    .total(details.isPresent() ? checks.size() : pullRequest.getChecksTotal())
                    .build();
        }
        if (!github.canReadChecks()) {
            return PullRequestChecksResponse.builder().available(false).checks(List.of()).total(pullRequest.getChecksTotal()).build();
        }
        PullRequestChecks fetched = github.checks(pullRequest);
        return PullRequestChecksResponse.builder()
                .available(true)
                .checks(sorted(fetched.checks().stream().map(PullRequestContentService::toCheck).toList()))
                .total(fetched.total())
                .url(pullRequest.getGithubUrl() + "/checks")
                .build();
    }

    static PullRequestCheckResponse toCheck(CheckContext context) {
        boolean status = CheckContext.STATUS.equals(context.type());
        String conclusion = context.conclusion() == null ? "" : context.conclusion().toUpperCase(Locale.ROOT);
        State state;
        if (!status && !"COMPLETED".equals(context.status())) {
            state = State.PENDING;
        } else if ("SUCCESS".equals(conclusion)) {
            state = State.SUCCESS;
        } else if (FAILED.contains(conclusion)) {
            state = State.FAILURE;
        } else if (SKIPPED.contains(conclusion)) {
            state = State.SKIPPED;
        } else {
            // Un statut en attente (PENDING, EXPECTED), une conclusion inconnue
            state = State.PENDING;
        }
        return PullRequestCheckResponse.builder()
                .name(context.name() == null ? "?" : context.name())
                .context(context.workflow() != null ? context.workflow() : context.app())
                .state(state)
                .description(context.description())
                .url(context.url())
                .startedAt(context.startedAt())
                .completedAt(state == State.PENDING ? null : context.completedAt())
                .build();
    }

    private static List<PullRequestCheckResponse> sorted(List<PullRequestCheckResponse> checks) {
        return checks.stream()
                .sorted(Comparator.comparingInt((PullRequestCheckResponse check) -> CHECK_ORDER.indexOf(check.getState()))
                        .thenComparing(PullRequestCheckResponse::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    // ==================== ISSUES ====================

    /**
     * Les issues que la PR fermera en fusionnant. Sans leur détail, l'issue « premier pas » connue par son numéro
     * suffit ; sans lecture possible des vérifications sur GitHub, ce numéro aussi.
     */
    public List<LinkedIssueResponse> issues(PullRequest pullRequest) {
        if (pullRequest.getGithubUrl() == null) {
            return demo.details(pullRequest.getProject().getSlug(), pullRequest.getNumber())
                    .filter(details -> !details.issues().isEmpty())
                    .map(details -> details.issues().stream()
                            .map(issue -> LinkedIssueResponse.builder()
                                    .number(issue.number())
                                    .title(issue.title())
                                    .state(issue.state())
                                    .labels(issue.labels())
                                    .starter(issue.labels().stream().anyMatch(StarterLabels::isStarter))
                                    .build())
                            .toList())
                    .orElseGet(() -> starterOnly(pullRequest));
        }
        if (!github.canReadChecks()) {
            return starterOnly(pullRequest);
        }
        return github.checks(pullRequest).issues().stream().map(PullRequestContentService::toIssue).toList();
    }

    static LinkedIssueResponse toIssue(ClosingIssue issue) {
        List<String> labels = issue.labels() == null || issue.labels().nodes() == null ? List.of()
                : issue.labels().nodes().stream()
                        .filter(label -> label != null && label.name() != null && !label.name().isBlank())
                        .map(label -> label.name().strip())
                        .toList();
        return LinkedIssueResponse.builder()
                .number(issue.number())
                .title(issue.title())
                .state(issue.state())
                .labels(labels)
                .starter(labels.stream().anyMatch(StarterLabels::isStarter))
                .url(issue.url())
                .build();
    }

    private static List<LinkedIssueResponse> starterOnly(PullRequest pullRequest) {
        if (pullRequest.getStarterIssueNumber() == null) {
            return List.of();
        }
        return List.of(LinkedIssueResponse.builder()
                .number(pullRequest.getStarterIssueNumber())
                .labels(List.of())
                .starter(true)
                .build());
    }
}
