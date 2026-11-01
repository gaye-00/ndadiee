package com.hautetech.ndadiee.github;

import java.io.IOException;
import java.net.http.HttpClient;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.hautetech.ndadiee.exception.GithubException;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Lecture de l'API publique de GitHub : un dépôt, ses langages, son README, les dépôts d'un compte (REST) ; les pull
 * requests d'un dépôt (GraphQL, avec jeton). Rien d'autre : ni écriture, ni dépôt privé. Les erreurs de GitHub
 * deviennent des GithubException (introuvable, quota atteint, injoignable), que le formulaire sait expliquer.
 */
@Slf4j
public class GithubClient {

    // Version de l'API sur laquelle ces lectures reposent (en-tête X-GitHub-Api-Version)
    private static final String API_VERSION = "2022-11-28";
    private static final String JSON = "application/vnd.github+json";
    // Le README brut, en Markdown, plutôt qu'encodé en Base64 dans du JSON
    private static final String RAW = "application/vnd.github.raw+json";

    // Ce qu'on lit d'une pull request : la même sélection pour les listes et pour une PR prise par son numéro
    private static final String PULL_REQUEST_FIELDS = """
            fragment pr on PullRequest {
              number title body url state isDraft createdAt updatedAt mergedAt closedAt
              headRefName baseRefName headRefOid additions deletions changedFiles
              commits { totalCount }
              author { __typename login avatarUrl url }
              authorAssociation
              labels(first: 10) { nodes { name } }
              closingIssuesReferences(first: 5) { nodes { number labels(first: 10) { nodes { name } } } }
              statusCheckRollup { contexts(first: 1) { checkRunCountsByState { state count } statusContextCountsByState { state count } } }
            }
            """;
    // Les PR ouvertes, puis les dernières fusionnées ou fermées : les plus récemment actives d'abord
    private static final String PULL_REQUESTS = """
            query($owner: String!, $name: String!, $open: Int!, $recent: Int!) {
              repository(owner: $owner, name: $name) {
                id nameWithOwner
                open: pullRequests(states: OPEN, first: $open, orderBy: {field: UPDATED_AT, direction: DESC}) { nodes { ...pr } }
                recent: pullRequests(states: [MERGED, CLOSED], first: $recent, orderBy: {field: UPDATED_AT, direction: DESC}) { nodes { ...pr } }
              }
            }
            """ + PULL_REQUEST_FIELDS;
    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private final RestClient client;
    private final boolean authenticated;

    public GithubClient(GithubProperties properties) {
        HttpClient http = HttpClient.newBuilder()
                .connectTimeout(properties.timeout())
                // Un dépôt renommé ou transféré répond par une redirection vers sa nouvelle adresse
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(properties.timeout());

        RestClient.Builder builder = RestClient.builder()
                .baseUrl(properties.apiUrl())
                .requestFactory(factory)
                .defaultHeader(HttpHeaders.ACCEPT, JSON)
                .defaultHeader("X-GitHub-Api-Version", API_VERSION)
                // GitHub refuse les requêtes sans User-Agent
                .defaultHeader(HttpHeaders.USER_AGENT, "Ndadiee")
                .defaultStatusHandler(HttpStatusCode::isError, (request, response) -> {
                    throw translate(response);
                });
        if (properties.token() != null) {
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.token());
        }
        this.client = builder.build();
        this.authenticated = properties.token() != null;
    }

    /** Un jeton est configuré : l'API GraphQL (les pull requests) n'accepte pas les requêtes anonymes. */
    public boolean authenticated() {
        return authenticated;
    }

    /** Un dépôt public : « owner/name » ; GithubException.notFound s'il n'existe pas ou s'il est privé. */
    public Repository repository(String owner, String name) {
        return call(() -> client.get().uri("/repos/{owner}/{name}", owner, name).retrieve().body(Repository.class));
    }

    /** Les langages du dépôt et leur poids en octets, le plus présent d'abord */
    public Map<String, Long> languages(String owner, String name) {
        Map<String, Long> languages = call(() -> client.get().uri("/repos/{owner}/{name}/languages", owner, name)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Long>>() {
                }));
        return languages == null ? Map.of() : languages;
    }

    /** Le README du dépôt, en Markdown ; vide s'il n'en a pas */
    public Optional<String> readme(String owner, String name) {
        try {
            return Optional.ofNullable(call(() -> client.get().uri("/repos/{owner}/{name}/readme", owner, name)
                    .header(HttpHeaders.ACCEPT, RAW)
                    .retrieve()
                    .body(String.class)));
        } catch (GithubException e) {
            if (e.getStatus() == HttpStatus.NOT_FOUND) {
                return Optional.empty();
            }
            throw e;
        }
    }

    /** Les dépôts publics d'un compte, les plus récemment modifiés d'abord (100 au plus) */
    public List<Repository> userRepositories(String login) {
        List<Repository> repositories = call(() -> client.get()
                .uri("/users/{login}/repos?type=owner&sort=pushed&per_page=100", login)
                .retrieve()
                .body(new ParameterizedTypeReference<List<Repository>>() {
                }));
        return repositories == null ? List.of() : repositories;
    }

    /**
     * Les pull requests d'un dépôt public : les `open` ouvertes et les `recent` dernières fusionnées ou fermées, les
     * plus récemment actives d'abord. Une seule requête GraphQL ; GithubException.notFound si le dépôt n'existe pas.
     */
    public RepositoryPullRequests pullRequests(String owner, String name, int open, int recent) {
        JsonNode repository = graphql(PULL_REQUESTS, Map.of("owner", owner, "name", name, "open", open, "recent", recent));
        return new RepositoryPullRequests(repository.path("id").asString(), repository.path("nameWithOwner").asString(),
                nodes(repository.path("open").path("nodes")), nodes(repository.path("recent").path("nodes")));
    }

    /** Des pull requests prises par leur numéro (celles qui ne sont plus parmi les dernières actives) ; les inconnues manquent. */
    public Map<Integer, PullRequestNode> pullRequestsByNumber(String owner, String name, Collection<Integer> numbers) {
        if (numbers.isEmpty()) {
            return Map.of();
        }
        // Un alias par numéro : « n84: pullRequest(number: 84) »
        String aliases = numbers.stream().distinct()
                .map(number -> "n" + number + ": pullRequest(number: " + number + ") { ...pr }")
                .collect(Collectors.joining("\n"));
        String query = "query($owner: String!, $name: String!) {\n repository(owner: $owner, name: $name) {\n" + aliases + "\n }\n}\n"
                + PULL_REQUEST_FIELDS;
        JsonNode repository = graphql(query, Map.of("owner", owner, "name", name));
        Map<Integer, PullRequestNode> found = new LinkedHashMap<>();
        numbers.forEach(number -> {
            JsonNode node = repository.path("n" + number);
            if (node.isObject()) {
                found.put(number, MAPPER.treeToValue(node, PullRequestNode.class));
            }
        });
        return found;
    }

    // Le dépôt d'une réponse GraphQL. GitHub répond 200 même en cas d'erreur : elles arrivent dans « errors »
    private JsonNode graphql(String query, Map<String, Object> variables) {
        if (!authenticated) {
            throw GithubException.notConfigured();
        }
        // Le corps déjà écrit : envoyé avec sa longueur, et non en flux (chunked) que certains serveurs refusent
        String payload = MAPPER.writeValueAsString(Map.of("query", query, "variables", variables));
        String body = call(() -> client.post().uri("/graphql")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(String.class));
        JsonNode response;
        try {
            response = MAPPER.readTree(body == null ? "{}" : body);
        } catch (JacksonException e) {
            log.warn("[GitHub] Réponse GraphQL illisible : {}", e.getMessage());
            throw GithubException.unavailable();
        }
        JsonNode repository = response.path("data").path("repository");
        for (JsonNode error : response.path("errors")) {
            String type = error.path("type").asString("");
            if ("RATE_LIMITED".equals(type)) {
                throw GithubException.rateLimited(null);
            }
            // Une PR demandée par son numéro qui n'existe pas : son alias reste vide, le reste se lit
            boolean missingPullRequest = "NOT_FOUND".equals(type) && repository.isObject();
            if (missingPullRequest) {
                continue;
            }
            if ("NOT_FOUND".equals(type)) {
                throw GithubException.notFound();
            }
            log.warn("[GitHub] Erreur GraphQL {} : {}", type, error.path("message").asString(""));
            throw GithubException.unavailable();
        }
        if (!repository.isObject()) {
            throw GithubException.notFound();
        }
        return repository;
    }

    private static List<PullRequestNode> nodes(JsonNode nodes) {
        if (!nodes.isArray()) {
            return List.of();
        }
        return nodes.valueStream()
                .filter(JsonNode::isObject)
                .map(node -> MAPPER.treeToValue(node, PullRequestNode.class))
                .toList();
    }

    // GitHub injoignable (délai dépassé, réseau) : la même erreur qu'une réponse en échec
    private static <T> T call(Supplier<T> request) {
        try {
            return request.get();
        } catch (GithubException e) {
            throw e;
        } catch (RestClientException e) {
            log.warn("[GitHub] Requête impossible : {}", e.getMessage());
            throw GithubException.unavailable();
        }
    }

    private static GithubException translate(ClientHttpResponse response) throws IOException {
        HttpStatusCode status = response.getStatusCode();
        HttpHeaders headers = response.getHeaders();
        if (status.value() == 404 || status.value() == 451) {
            return GithubException.notFound();
        }
        // Quota de l'heure épuisé (403 avec 0 restante), ou limite secondaire (429, ou 403 avec retry-after)
        boolean exhausted = "0".equals(headers.getFirst("x-ratelimit-remaining"));
        if (status.value() == 429 || (status.value() == 403 && (exhausted || headers.getFirst(HttpHeaders.RETRY_AFTER) != null))) {
            return GithubException.rateLimited(resetOf(headers));
        }
        if (status.value() == 401) {
            log.error("[GitHub] Jeton refusé : vérifier GITHUB_TOKEN");
        } else {
            log.warn("[GitHub] Réponse {} de l'API", status.value());
        }
        return GithubException.unavailable();
    }

    // Quand le quota se renouvelle : x-ratelimit-reset (secondes depuis 1970), ou retry-after (secondes)
    private static Instant resetOf(HttpHeaders headers) {
        try {
            String reset = headers.getFirst("x-ratelimit-reset");
            if (reset != null) {
                return Instant.ofEpochSecond(Long.parseLong(reset));
            }
            String retryAfter = headers.getFirst(HttpHeaders.RETRY_AFTER);
            if (retryAfter != null) {
                return Instant.now().plusSeconds(Long.parseLong(retryAfter));
            }
        } catch (NumberFormatException e) {
            // En-tête illisible : le message ne dira pas quand réessayer
        }
        return null;
    }

    /** Un dépôt, tel que l'API le décrit (les champs utiles seulement). */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Repository(
            String name,
            @JsonProperty("full_name") String fullName,
            String description,
            String homepage,
            @JsonProperty("html_url") String htmlUrl,
            List<String> topics,
            License license,
            String language,
            @JsonProperty("stargazers_count") int stars,
            @JsonProperty("forks_count") int forks,
            @JsonProperty("open_issues_count") int openIssues,
            boolean archived,
            boolean fork,
            @JsonProperty("private") boolean privateRepository,
            @JsonProperty("pushed_at") Instant pushedAt,
            Owner owner) {
    }

    /** La licence reconnue par GitHub : son identifiant SPDX (« MIT »), ou NOASSERTION */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record License(@JsonProperty("spdx_id") String spdxId) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Owner(String login, @JsonProperty("avatar_url") String avatarUrl) {
    }

    // ==================== PULL REQUESTS (GraphQL) ====================

    /**
     * Les pull requests d'un dépôt.
     *
     * @param repositoryId identifiant GitHub du dépôt, qui ne change pas s'il est renommé ou transféré
     * @param fullName     « owner/name », tels que GitHub les écrit
     */
    public record RepositoryPullRequests(String repositoryId, String fullName, List<PullRequestNode> open, List<PullRequestNode> recent) {
    }

    /**
     * Une pull request, telle que l'API GraphQL la décrit (fragment PULL_REQUEST_FIELDS).
     *
     * @param state             OPEN, MERGED ou CLOSED
     * @param authorAssociation lien de l'auteur avec le dépôt : FIRST_TIME_CONTRIBUTOR, CONTRIBUTOR, MEMBER, OWNER…
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PullRequestNode(
            int number,
            String title,
            String body,
            String url,
            String state,
            boolean isDraft,
            Instant createdAt,
            Instant updatedAt,
            Instant mergedAt,
            Instant closedAt,
            String headRefName,
            String baseRefName,
            String headRefOid,
            int additions,
            int deletions,
            int changedFiles,
            Count commits,
            Actor author,
            String authorAssociation,
            Nodes<Label> labels,
            Nodes<Issue> closingIssuesReferences,
            CheckRollup statusCheckRollup) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Count(int totalCount) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Nodes<T>(List<T> nodes) {
    }

    /** L'auteur : un compte (User), un robot (Bot : Dependabot, Renovate…) ; null si le compte a été supprimé */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Actor(@JsonProperty("__typename") String type, String login, String avatarUrl, String url) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Label(String name) {
    }

    /** Une issue que la PR fermera en fusionnant (« Closes #77 »), et ses étiquettes */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Issue(int number, Nodes<Label> labels) {
    }

    /** Les vérifications du dernier commit : combien de check runs (Actions…) et de statuts dans chaque état */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CheckRollup(Contexts contexts) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Contexts(List<StateCount> checkRunCountsByState, List<StateCount> statusContextCountsByState) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StateCount(String state, int count) {
    }
}
