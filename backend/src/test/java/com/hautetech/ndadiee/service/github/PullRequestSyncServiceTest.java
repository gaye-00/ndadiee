package com.hautetech.ndadiee.service.github;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.GithubException;
import com.hautetech.ndadiee.github.GithubClient;
import com.hautetech.ndadiee.github.GithubClient.Actor;
import com.hautetech.ndadiee.github.GithubClient.CheckRollup;
import com.hautetech.ndadiee.github.GithubClient.Contexts;
import com.hautetech.ndadiee.github.GithubClient.Count;
import com.hautetech.ndadiee.github.GithubClient.Issue;
import com.hautetech.ndadiee.github.GithubClient.Label;
import com.hautetech.ndadiee.github.GithubClient.Nodes;
import com.hautetech.ndadiee.github.GithubClient.PullRequestNode;
import com.hautetech.ndadiee.github.GithubClient.RepositoryPullRequests;
import com.hautetech.ndadiee.github.GithubClient.StateCount;
import com.hautetech.ndadiee.github.GithubSyncProperties;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.model.review.PullRequestStatus;
import com.hautetech.ndadiee.model.review.RepositorySync;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.PullRequestRepository;
import com.hautetech.ndadiee.repository.RepositorySyncRepository;
import com.hautetech.ndadiee.service.project.ProjectService;

import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;

/**
 * Les PR d'un dépôt GitHub deviennent des PR du projet : créées ouvertes à la communauté, mises à jour sans toucher
 * à ce qui appartient à Ndadiee, sans les robots, et l'auteur retrouvé parmi les membres par son compte GitHub.
 */
@ExtendWith(MockitoExtension.class)
class PullRequestSyncServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-19T09:00:00Z");
    private static final Long PROJECT_ID = 7L;

    @Mock
    private GithubClient client;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private PullRequestRepository pullRequestRepository;
    @Mock
    private RepositorySyncRepository syncRepository;
    @Mock
    private ProjectService projectService;
    @Mock
    private EntityManager em;
    @Mock
    private TypedQuery<Developer> developers;

    private PullRequestSyncService service;
    private Project project;
    private RepositorySync sync;

    @BeforeEach
    void setUp() {
        // Les transactions s'exécutent telles quelles : le gestionnaire est un simulacre
        service = new PullRequestSyncService(client, new GithubSyncProperties(null, null, null), projectRepository,
                pullRequestRepository, syncRepository, projectService, new TransactionTemplate(mock(PlatformTransactionManager.class)),
                Clock.fixed(NOW, ZoneOffset.UTC));
        ReflectionTestUtils.setField(service, "em", em);
        project = Project.builder().name("OpenMRS Patient Chart").slug("openmrs-patient-chart")
                .repositoryUrl("https://github.com/openmrs/openmrs-esm-patient-chart").build();
        project.setId(PROJECT_ID);
        sync = RepositorySync.builder().project(project).build();
        lenient().when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        lenient().when(syncRepository.findByProjectId(PROJECT_ID)).thenReturn(Optional.of(sync));
        lenient().when(em.createQuery(anyString(), eq(Developer.class))).thenReturn(developers);
        lenient().when(developers.getResultList()).thenReturn(List.of());
    }

    private static PullRequestNode node(int number, String state, String login, String type) {
        return new PullRequestNode(number, "PR " + number, "Description", "https://github.com/openmrs/openmrs-esm-patient-chart/pull/" + number,
                state, false, Instant.parse("2026-10-10T08:00:00Z"), Instant.parse("2026-10-18T10:00:00Z"),
                "MERGED".equals(state) ? Instant.parse("2026-10-18T10:00:00Z") : null,
                "OPEN".equals(state) ? null : Instant.parse("2026-10-18T10:00:00Z"),
                "feat/" + number, "main", "abc123", 40, 5, 3, new Count(2),
                login == null ? null : new Actor(type, login, "https://avatars.githubusercontent.com/" + login, "https://github.com/" + login),
                "CONTRIBUTOR", new Nodes<>(List.of(new Label("bug"))), new Nodes<>(List.of()), null);
    }

    private static RepositoryPullRequests fetched(String repositoryId, List<PullRequestNode> open, List<PullRequestNode> recent) {
        return new RepositoryPullRequests(repositoryId, "openmrs/openmrs-esm-patient-chart", open, recent);
    }

    @SuppressWarnings("unchecked")
    private List<PullRequest> savedPullRequests() {
        ArgumentCaptor<List<PullRequest>> saved = ArgumentCaptor.forClass(List.class);
        verify(pullRequestRepository).saveAll(saved.capture());
        return saved.getValue();
    }

    // ==================== LE DÉPÔT D'UNE ADRESSE ====================

    @Test
    void aRepositoryIsFoundInTheUsualWaysOfWritingItsAddress() {
        assertThat(PullRequestSyncService.repositoryOf("https://github.com/openmrs/openmrs-core")).map(r -> r.fullName()).contains("openmrs/openmrs-core");
        assertThat(PullRequestSyncService.repositoryOf("github.com/openmrs/openmrs-core.git")).map(r -> r.fullName()).contains("openmrs/openmrs-core");
        assertThat(PullRequestSyncService.repositoryOf("https://www.github.com/ada/site.github.io/")).map(r -> r.fullName()).contains("ada/site.github.io");
        assertThat(PullRequestSyncService.repositoryOf("https://github.com/openmrs/openmrs-core/tree/master")).map(r -> r.fullName()).contains("openmrs/openmrs-core");
    }

    @Test
    void otherAddressesAreNotGithubRepositories() {
        assertThat(PullRequestSyncService.repositoryOf("https://example.com/ndadiee-demo/lagos-transit")).isEmpty();
        assertThat(PullRequestSyncService.repositoryOf("https://github.com/openmrs")).isEmpty();
        assertThat(PullRequestSyncService.repositoryOf("https://gitlab.com/openmrs/openmrs-core")).isEmpty();
        assertThat(PullRequestSyncService.repositoryOf(null)).isEmpty();
    }

    // ==================== CE QUE GITHUB DIT D'UNE PR ====================

    @Test
    void checksStarterIssueAndLabelsAreCopied() {
        PullRequestNode node = new PullRequestNode(3809, "  Handle vitals save errors  ", "", "https://github.com/x/y/pull/3809", "OPEN", true,
                null, Instant.parse("2026-10-18T10:00:00Z"), null, null, "fix/vitals", "main", "abc", 42, 7, 3, new Count(2),
                new Actor("User", "aarti", "https://avatars/aarti", "https://github.com/aarti"), "FIRST_TIME_CONTRIBUTOR",
                new Nodes<>(List.of(new Label("bug"), new Label(" "))),
                new Nodes<>(List.of(new Issue(3600, new Nodes<>(List.of(new Label("bug")))),
                        new Issue(3700, new Nodes<>(List.of(new Label("good first issue")))))),
                new CheckRollup(new Contexts(List.of(new StateCount("SUCCESS", 4), new StateCount("FAILURE", 1), new StateCount("IN_PROGRESS", 2)),
                        List.of(new StateCount("PENDING", 1)))));
        PullRequest pullRequest = PullRequest.builder().lastActivityAt(Instant.parse("2026-10-19T08:00:00Z")).build();

        PullRequestSyncService.copy(node, pullRequest, null);

        assertThat(pullRequest.getTitle()).isEqualTo("Handle vitals save errors");
        assertThat(pullRequest.getBody()).isNull();
        assertThat(pullRequest.isDraft()).isTrue();
        assertThat(pullRequest.getChecksTotal()).isEqualTo(8);
        assertThat(pullRequest.getChecksPassed()).isEqualTo(4);
        assertThat(pullRequest.getChecksFailed()).isEqualTo(1);
        assertThat(pullRequest.getStarterIssueNumber()).isEqualTo(3700);
        assertThat(pullRequest.getLabels()).containsExactly("bug");
        assertThat(pullRequest.getAuthorLogin()).isEqualTo("aarti");
        assertThat(pullRequest.getAuthorAssociation()).isEqualTo("FIRST_TIME_CONTRIBUTOR");
        // Une activité plus récente chez nous (une revue) n'est pas effacée par celle de GitHub
        assertThat(pullRequest.getLastActivityAt()).isEqualTo(Instant.parse("2026-10-19T08:00:00Z"));
    }

    @Test
    void aMergedPullRequestIsNotAlsoClosed() {
        PullRequest pullRequest = PullRequest.builder().build();

        PullRequestSyncService.copy(node(5, "MERGED", "aarti", "User"), pullRequest, null);

        assertThat(pullRequest.getStatus()).isEqualTo(PullRequestStatus.MERGED);
        assertThat(pullRequest.getMergedAt()).isNotNull();
        assertThat(pullRequest.getClosedAt()).isNull();
    }

    // ==================== L'ÉCRITURE ====================

    @Test
    void newPullRequestsAreOpenToTheCommunityAndKeepTheirOpeningDate() {
        when(pullRequestRepository.findByProjectIdAndNumberIn(eq(PROJECT_ID), anyCollection())).thenReturn(List.of());

        int count = service.apply(PROJECT_ID, fetched("R_1", List.of(node(12, "OPEN", "aarti", "User")), List.of()), List.of());

        assertThat(count).isEqualTo(1);
        PullRequest created = savedPullRequests().getFirst();
        assertThat(created.getProject()).isSameAs(project);
        assertThat(created.isCommunity()).isTrue();
        assertThat(created.getCreatedAt()).isEqualTo(Instant.parse("2026-10-10T08:00:00Z"));
        assertThat(created.getGithubUrl()).endsWith("/pull/12");
        assertThat(created.getAuthor()).isNull();
        assertThat(sync.getRepositoryId()).isEqualTo("R_1");
        assertThat(sync.getSyncedAt()).isEqualTo(NOW);
        assertThat(sync.getError()).isNull();
    }

    @Test
    void anExistingPullRequestKeepsWhatBelongsToNdadiee() {
        PullRequest existing = PullRequest.builder().project(project).number(12).community(false).status(PullRequestStatus.OPEN)
                .lastActivityAt(Instant.parse("2026-10-01T00:00:00Z")).build();
        when(pullRequestRepository.findByProjectIdAndNumberIn(eq(PROJECT_ID), anyCollection())).thenReturn(List.of(existing));

        service.apply(PROJECT_ID, fetched("R_1", List.of(), List.of(node(12, "MERGED", "aarti", "User"))), List.of());

        assertThat(existing.isCommunity()).isFalse();
        assertThat(existing.getStatus()).isEqualTo(PullRequestStatus.MERGED);
        assertThat(existing.getLastActivityAt()).isEqualTo(Instant.parse("2026-10-18T10:00:00Z"));
        assertThat(savedPullRequests()).isEmpty();
    }

    @Test
    void botsAreLeftOutAndMembersAreRecognisedByTheirGithubAccount() {
        Developer aarti = Developer.builder().githubUrl("https://github.com/Aarti/").build();
        when(developers.getResultList()).thenReturn(List.of(aarti));
        when(pullRequestRepository.findByProjectIdAndNumberIn(eq(PROJECT_ID), anyCollection())).thenReturn(List.of());

        int count = service.apply(PROJECT_ID, fetched("R_1",
                List.of(node(12, "OPEN", "aarti", "User"), node(13, "OPEN", "dependabot", "Bot"), node(14, "OPEN", "musa-dev", "User")),
                List.of()), List.of());

        assertThat(count).isEqualTo(2);
        List<PullRequest> created = savedPullRequests();
        assertThat(created).extracting(PullRequest::getNumber).containsExactly(12, 14);
        assertThat(created.get(0).getAuthor()).isSameAs(aarti);
        assertThat(created.get(1).getAuthor()).isNull();
        assertThat(created.get(1).getAuthorLogin()).isEqualTo("musa-dev");
    }

    @Test
    void aNewRepositoryReplacesThePullRequestsOfTheOldOne() {
        sync.setRepositoryId("R_old");
        when(pullRequestRepository.findByProjectIdAndNumberIn(eq(PROJECT_ID), anyCollection())).thenReturn(List.of());

        service.apply(PROJECT_ID, fetched("R_new", List.of(node(1, "OPEN", "aarti", "User")), List.of()), List.of());

        verify(pullRequestRepository).deleteSynced(PROJECT_ID);
        assertThat(sync.getRepositoryId()).isEqualTo("R_new");
    }

    @Test
    void theSameRepositoryKeepsItsPullRequests() {
        sync.setRepositoryId("R_1");
        when(pullRequestRepository.findByProjectIdAndNumberIn(eq(PROJECT_ID), anyCollection())).thenReturn(List.of());

        service.apply(PROJECT_ID, fetched("R_1", List.of(node(1, "OPEN", "aarti", "User")), List.of()), List.of());

        verify(pullRequestRepository, never()).deleteSynced(any());
    }

    // ==================== LA LECTURE ====================

    @Test
    void pullRequestsStillOpenHereButQuietOnGithubAreReadByNumber() {
        sync.setRepositoryId("R_1");
        when(pullRequestRepository.findSyncedNumbers(PROJECT_ID, PullRequestStatus.OPEN)).thenReturn(List.of(12, 40));
        when(client.pullRequests("openmrs", "openmrs-esm-patient-chart", PullRequestSyncService.OPEN_PULL_REQUESTS,
                PullRequestSyncService.RECENT_PULL_REQUESTS)).thenReturn(fetched("R_1", List.of(node(12, "OPEN", "aarti", "User")), List.of()));
        when(client.pullRequestsByNumber("openmrs", "openmrs-esm-patient-chart", List.of(40)))
                .thenReturn(Map.of(40, node(40, "CLOSED", "aarti", "User")));
        when(pullRequestRepository.findByProjectIdAndNumberIn(eq(PROJECT_ID), anyCollection())).thenReturn(new ArrayList<>());

        service.sync(PROJECT_ID);

        assertThat(savedPullRequests()).extracting(PullRequest::getNumber).containsExactlyInAnyOrder(12, 40);
    }

    @Test
    void aGithubErrorIsNotedThenReported() {
        when(pullRequestRepository.findSyncedNumbers(PROJECT_ID, PullRequestStatus.OPEN)).thenReturn(List.of());
        when(client.pullRequests(anyString(), anyString(), anyInt(), anyInt())).thenThrow(GithubException.notFound());

        assertThatThrownBy(() -> service.sync(PROJECT_ID)).isInstanceOf(GithubException.class);

        assertThat(sync.getError()).isEqualTo("GITHUB_REPOSITORY_NOT_FOUND");
        assertThat(sync.getAttemptedAt()).isEqualTo(NOW);
        assertThat(sync.getSyncedAt()).isNull();
    }

    @Test
    void aProjectWithoutGithubRepositoryIsNotRead() {
        project.setRepositoryUrl("https://example.com/ndadiee-demo/lagos-transit");

        service.sync(PROJECT_ID);

        verify(client, never()).pullRequests(anyString(), anyString(), anyInt(), anyInt());
    }

    // ==================== LE PORTEUR ====================

    @Test
    void onlyTheOwnerAndMaintainersSyncByHand() {
        when(projectRepository.findBySlug("openmrs-patient-chart")).thenReturn(Optional.of(project));
        when(projectService.isVisibleTo(project, 3L)).thenReturn(true);
        when(projectService.canManage(project, 3L)).thenReturn(false);

        assertThatThrownBy(() -> service.syncNow(3L, "openmrs-patient-chart")).isInstanceOf(ForbiddenException.class);
        verify(client, never()).pullRequests(anyString(), anyString(), anyInt(), anyInt());
    }

    @Test
    void aSyncByHandRightAfterTheLastOneDoesNotCallGithubAgain() {
        sync.setSyncedAt(NOW.minusSeconds(10));
        when(projectRepository.findBySlug("openmrs-patient-chart")).thenReturn(Optional.of(project));
        when(projectService.isVisibleTo(project, 1L)).thenReturn(true);
        when(projectService.canManage(project, 1L)).thenReturn(true);
        when(client.authenticated()).thenReturn(true);

        var response = service.syncNow(1L, "openmrs-patient-chart");

        verify(client, never()).pullRequests(anyString(), anyString(), anyInt(), anyInt());
        assertThat(response.getRepository()).isEqualTo("openmrs/openmrs-esm-patient-chart");
        assertThat(response.isCanSync()).isTrue();
        assertThat(response.getSyncedAt()).isEqualTo(NOW.minusSeconds(10));
    }
}
