package com.hautetech.ndadiee.github;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import com.hautetech.ndadiee.exception.GithubException;
import com.hautetech.ndadiee.github.GithubClient.PullRequestNode;
import com.hautetech.ndadiee.github.GithubClient.RepositoryPullRequests;
import com.sun.net.httpserver.HttpServer;

/** Les pull requests d'un dépôt se lisent en une requête GraphQL ; ses erreurs arrivent dans une réponse 200. */
class GithubClientPullRequestsTest {

    // Une PR telle que l'API GraphQL la renvoie (fragment PULL_REQUEST_FIELDS)
    private static final String PULL_REQUEST = """
            {"number":3809,"title":"(fix) O3-6116: Handle vitals save errors correctly","body":"Fixes the toast.",
             "url":"https://github.com/openmrs/openmrs-esm-patient-chart/pull/3809","state":"OPEN","isDraft":false,
             "createdAt":"2026-10-15T08:00:00Z","updatedAt":"2026-10-18T10:30:00Z","mergedAt":null,"closedAt":null,
             "headRefName":"fix/vitals-errors","baseRefName":"main","headRefOid":"0123456789abcdef0123456789abcdef01234567",
             "additions":42,"deletions":7,"changedFiles":3,"commits":{"totalCount":2},
             "author":{"__typename":"User","login":"AartiGoswami01","avatarUrl":"https://avatars.githubusercontent.com/u/9","url":"https://github.com/AartiGoswami01"},
             "authorAssociation":"FIRST_TIME_CONTRIBUTOR","labels":{"nodes":[{"name":"bug"}]},
             "closingIssuesReferences":{"nodes":[{"number":3700,"labels":{"nodes":[{"name":"good first issue"}]}}]},
             "statusCheckRollup":{"contexts":{"checkRunCountsByState":[{"state":"SUCCESS","count":4},{"state":"IN_PROGRESS","count":1}],
                                              "statusContextCountsByState":[]}}}
            """;

    private HttpServer server;
    private final AtomicReference<String> requestBody = new AtomicReference<>();
    private final AtomicReference<String> reply = new AtomicReference<>();
    private final AtomicReference<String> requestPath = new AtomicReference<>();

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            requestPath.set(exchange.getRequestMethod() + " " + exchange.getRequestURI());
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            byte[] body = reply.get().getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
        server.start();
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    private GithubClient client(String token) {
        return new GithubClient(new GithubProperties("http://127.0.0.1:" + server.getAddress().getPort(), token, Duration.ofSeconds(2), null));
    }

    @Test
    void openAndRecentPullRequestsAreReadInOneQuery() {
        reply.set("""
                {"data":{"repository":{"id":"R_kgDOA","nameWithOwner":"openmrs/openmrs-esm-patient-chart",
                  "open":{"nodes":[%s]},"recent":{"nodes":[]}}}}
                """.formatted(PULL_REQUEST));

        RepositoryPullRequests pulls = client("secret-token").pullRequests("openmrs", "openmrs-esm-patient-chart", 50, 20);

        assertThat(requestPath.get()).isEqualTo("POST /graphql");
        assertThat(requestBody.get()).contains("\"owner\":\"openmrs\"", "\"open\":50", "\"recent\":20", "fragment pr on PullRequest");
        assertThat(pulls.repositoryId()).isEqualTo("R_kgDOA");
        assertThat(pulls.fullName()).isEqualTo("openmrs/openmrs-esm-patient-chart");
        assertThat(pulls.recent()).isEmpty();
        PullRequestNode pr = pulls.open().getFirst();
        assertThat(pr.number()).isEqualTo(3809);
        assertThat(pr.createdAt()).isEqualTo(Instant.parse("2026-10-15T08:00:00Z"));
        assertThat(pr.commits().totalCount()).isEqualTo(2);
        assertThat(pr.author().type()).isEqualTo("User");
        assertThat(pr.author().login()).isEqualTo("AartiGoswami01");
        assertThat(pr.labels().nodes()).extracting(GithubClient.Label::name).containsExactly("bug");
        assertThat(pr.closingIssuesReferences().nodes().getFirst().number()).isEqualTo(3700);
        assertThat(pr.statusCheckRollup().contexts().checkRunCountsByState()).hasSize(2);
    }

    @Test
    void pullRequestsAreAlsoReadByNumberAndUnknownOnesAreLeftOut() {
        reply.set("""
                {"data":{"repository":{"n3809":%s,"n12":null}},
                 "errors":[{"type":"NOT_FOUND","path":["repository","n12"],"message":"Could not resolve to a PullRequest with the number of 12."}]}
                """.formatted(PULL_REQUEST));

        Map<Integer, PullRequestNode> found = client("secret-token").pullRequestsByNumber("openmrs", "openmrs-esm-patient-chart", List.of(3809, 12));

        assertThat(requestBody.get()).contains("n3809: pullRequest(number: 3809)", "n12: pullRequest(number: 12)");
        assertThat(found).containsOnlyKeys(3809);
        assertThat(found.get(3809).title()).startsWith("(fix) O3-6116");
    }

    @Test
    void noNumberMeansNoRequest() {
        assertThat(client("secret-token").pullRequestsByNumber("openmrs", "openmrs-core", List.of())).isEmpty();
        assertThat(requestPath.get()).isNull();
    }

    @Test
    void anUnknownRepositoryIsNotFound() {
        reply.set("""
                {"data":{"repository":null},
                 "errors":[{"type":"NOT_FOUND","path":["repository"],"message":"Could not resolve to a Repository with the name 'ada/nothing'."}]}
                """);

        assertThatThrownBy(() -> client("secret-token").pullRequests("ada", "nothing", 50, 20))
                .isInstanceOfSatisfying(GithubException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void aGraphqlRateLimitIsReportedAsSuch() {
        reply.set("""
                {"errors":[{"type":"RATE_LIMITED","message":"API rate limit exceeded for user ID 1."}]}
                """);

        assertThatThrownBy(() -> client("secret-token").pullRequests("openmrs", "openmrs-core", 50, 20))
                .isInstanceOfSatisfying(GithubException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS));
    }

    @Test
    void withoutTokenGraphqlIsNotEvenCalled() {
        GithubClient anonymous = client(null);

        assertThat(anonymous.authenticated()).isFalse();
        assertThatThrownBy(() -> anonymous.pullRequests("openmrs", "openmrs-core", 50, 20))
                .isInstanceOfSatisfying(GithubException.class, e -> assertThat(e.getErrorCode()).isEqualTo("GITHUB_NOT_CONFIGURED"));
        assertThat(requestPath.get()).isNull();
    }

    @Test
    void theChecksAndClosingIssuesOfAPullRequestAreReadInOneQuery() {
        reply.set("""
                {"data":{"repository":{"pullRequest":{
                  "closingIssuesReferences":{"nodes":[{"number":3700,"title":"Vitals: save errors","url":"https://github.com/o/r/issues/3700",
                    "state":"OPEN","labels":{"nodes":[{"name":"good first issue"}]}}]},
                  "statusCheckRollup":{"contexts":{"totalCount":2,"nodes":[
                    {"__typename":"CheckRun","name":"unit","status":"COMPLETED","conclusion":"SUCCESS","detailsUrl":"https://github.com/o/r/runs/1",
                     "startedAt":"2026-10-15T08:00:00Z","completedAt":"2026-10-15T08:02:00Z",
                     "checkSuite":{"app":{"name":"GitHub Actions"},"workflowRun":{"workflow":{"name":"CI"}}}},
                    {"__typename":"StatusContext","context":"ci/sonar","state":"PENDING","targetUrl":null,"description":"Analyse",
                     "createdAt":"2026-10-15T08:01:00Z"}]}}}}}}
                """);

        GithubClient.PullRequestChecks checks = client("secret-token").pullRequestChecks("o", "r", 3809, 50);

        assertThat(requestBody.get()).contains("\"number\":3809", "\"checks\":50", "closingIssuesReferences");
        assertThat(checks.total()).isEqualTo(2);
        assertThat(checks.checks()).extracting(GithubClient.CheckContext::name).containsExactly("unit", "ci/sonar");
        assertThat(checks.checks().getFirst().workflow()).isEqualTo("CI");
        assertThat(checks.checks().getFirst().completedAt()).isEqualTo(Instant.parse("2026-10-15T08:02:00Z"));
        assertThat(checks.checks().get(1).type()).isEqualTo(GithubClient.CheckContext.STATUS);
        assertThat(checks.checks().get(1).conclusion()).isEqualTo("PENDING");
        assertThat(checks.issues()).singleElement().satisfies(issue -> assertThat(issue.title()).isEqualTo("Vitals: save errors"));
    }

    @Test
    void aMissingPullRequestIsNotFound() {
        reply.set("""
                {"data":{"repository":{"pullRequest":null}},"errors":[{"type":"NOT_FOUND","message":"Could not resolve"}]}
                """);

        assertThatThrownBy(() -> client("secret-token").pullRequestChecks("o", "r", 1, 50))
                .isInstanceOfSatisfying(GithubException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void theFilesOfAPullRequestAreReadPageByPage() {
        reply.set("""
                [{"filename":"src/a.ts","status":"modified","additions":3,"deletions":1,"changes":4,"patch":"@@ -1 +1 @@\\n-a\\n+b"},
                 {"filename":"logo.png","status":"added","additions":0,"deletions":0,"changes":0}]
                """);

        List<GithubClient.PullRequestFile> files = client(null).pullRequestFiles("o", "r", 84, 3);

        // Moins de 100 fichiers : une seule page suffit
        assertThat(requestPath.get()).isEqualTo("GET /repos/o/r/pulls/84/files?per_page=100&page=1");
        assertThat(files).hasSize(2);
        assertThat(files.getFirst().patch()).isEqualTo("@@ -1 +1 @@\n-a\n+b");
        assertThat(files.get(1).patch()).isNull();
    }
}
