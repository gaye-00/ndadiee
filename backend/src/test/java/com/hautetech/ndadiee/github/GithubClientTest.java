package com.hautetech.ndadiee.github;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import com.hautetech.ndadiee.exception.GithubException;
import com.sun.net.httpserver.HttpServer;

/** Le client lit les réponses de l'API GitHub, et traduit ses erreurs en messages que le formulaire sait montrer. */
class GithubClientTest {

    private record Reply(int status, String body, Map<String, String> headers) {
    }

    private HttpServer server;
    private final Map<String, Reply> replies = new ConcurrentHashMap<>();
    private final Map<String, String> receivedHeaders = new ConcurrentHashMap<>();
    private GithubClient client;

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            receivedHeaders.put("accept", String.valueOf(exchange.getRequestHeaders().getFirst("Accept")));
            receivedHeaders.put("authorization", String.valueOf(exchange.getRequestHeaders().getFirst("Authorization")));
            receivedHeaders.put("user-agent", String.valueOf(exchange.getRequestHeaders().getFirst("User-Agent")));
            Reply reply = replies.getOrDefault(exchange.getRequestURI().toString(), new Reply(404, "{\"message\":\"Not Found\"}", Map.of()));
            reply.headers().forEach((name, value) -> exchange.getResponseHeaders().add(name, value));
            exchange.getResponseHeaders().add("Content-Type", reply.body().startsWith("{") || reply.body().startsWith("[")
                    ? "application/json" : "text/plain");
            byte[] body = reply.body().getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(reply.status(), body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
        server.start();
        client = new GithubClient(new GithubProperties("http://127.0.0.1:" + server.getAddress().getPort(), "secret-token",
                Duration.ofSeconds(2), null));
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    @Test
    void aRepositoryIsReadFromTheApi() {
        replies.put("/repos/ada/lagos-transit", new Reply(200, """
                {"name":"lagos-transit","full_name":"ada/lagos-transit","description":"Bus à Lagos","homepage":"lagos-transit.app",
                 "html_url":"https://github.com/ada/lagos-transit","topics":["gtfs","react-native"],
                 "license":{"key":"mit","spdx_id":"MIT"},"language":"TypeScript","stargazers_count":128,"forks_count":9,
                 "open_issues_count":4,"archived":false,"fork":false,"private":false,"pushed_at":"2026-10-10T08:00:00Z",
                 "owner":{"login":"ada","avatar_url":"https://avatars.githubusercontent.com/u/1"},"visibility":"public"}
                """, Map.of()));

        GithubClient.Repository repository = client.repository("ada", "lagos-transit");

        assertThat(repository.fullName()).isEqualTo("ada/lagos-transit");
        assertThat(repository.topics()).containsExactly("gtfs", "react-native");
        assertThat(repository.license().spdxId()).isEqualTo("MIT");
        assertThat(repository.stars()).isEqualTo(128);
        assertThat(repository.pushedAt()).isEqualTo(Instant.parse("2026-10-10T08:00:00Z"));
        assertThat(repository.owner().login()).isEqualTo("ada");
        assertThat(receivedHeaders).containsEntry("authorization", "Bearer secret-token").containsEntry("user-agent", "Ndadiee");
    }

    @Test
    void languagesAndReadmeAreRead() {
        replies.put("/repos/ada/lagos-transit/languages", new Reply(200, "{\"TypeScript\":52000,\"Kotlin\":8000}", Map.of()));
        replies.put("/repos/ada/lagos-transit/readme", new Reply(200, "# Lagos Transit\n\nBus.", Map.of()));

        assertThat(client.languages("ada", "lagos-transit")).containsEntry("TypeScript", 52000L).containsEntry("Kotlin", 8000L);
        assertThat(client.readme("ada", "lagos-transit")).contains("# Lagos Transit\n\nBus.");
        assertThat(receivedHeaders).containsEntry("accept", "application/vnd.github.raw+json");
    }

    @Test
    void aRepositoryWithoutReadmeHasAnEmptyOne() {
        assertThat(client.readme("ada", "empty")).isEmpty();
    }

    @Test
    void anUnknownOrPrivateRepositoryIsNotFound() {
        assertThatThrownBy(() -> client.repository("ada", "secret"))
                .isInstanceOf(GithubException.class)
                .extracting("status").isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void anExhaustedQuotaSaysWhenToRetry() {
        long reset = Instant.now().plusSeconds(600).getEpochSecond();
        replies.put("/repos/ada/lagos-transit", new Reply(403, "{\"message\":\"API rate limit exceeded\"}",
                Map.of("x-ratelimit-remaining", "0", "x-ratelimit-reset", String.valueOf(reset))));

        assertThatThrownBy(() -> client.repository("ada", "lagos-transit"))
                .isInstanceOf(GithubException.class)
                .hasMessageContaining("10 min")
                .extracting("errorCode").isEqualTo("GITHUB_RATE_LIMITED");
    }

    @Test
    void anyOtherFailureMeansGithubIsUnavailable() {
        replies.put("/repos/ada/lagos-transit", new Reply(500, "{}", Map.of()));

        assertThatThrownBy(() -> client.repository("ada", "lagos-transit"))
                .isInstanceOf(GithubException.class)
                .extracting("status").isEqualTo(HttpStatus.BAD_GATEWAY);
    }

    @Test
    void anUnreachableApiMeansGithubIsUnavailable() {
        GithubClient unreachable = new GithubClient(new GithubProperties("http://127.0.0.1:1", null, Duration.ofSeconds(1), null));

        assertThatThrownBy(() -> unreachable.repository("ada", "lagos-transit"))
                .isInstanceOf(GithubException.class)
                .extracting("errorCode").isEqualTo("GITHUB_UNAVAILABLE");
    }
}
