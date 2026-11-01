package com.hautetech.ndadiee.github;

import java.io.IOException;
import java.net.http.HttpClient;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
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
 * Lecture de l'API publique de GitHub : un dépôt, ses langages, son README, les dépôts d'un compte, les fichiers
 * modifiés d'une pull request et leur diff (REST) ; les pull requests d'un dépôt, les vérifications d'une PR et les
 * issues qu'elle ferme (GraphQL, avec jeton). Rien d'autre : ni écriture, ni dépôt privé. Les erreurs de GitHub
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
    // Les vérifications du dernier commit d'une PR, une par une, et les issues qu'elle fermera en fusionnant
    private static final String PULL_REQUEST_CHECKS = """
            query($owner: String!, $name: String!, $number: Int!, $checks: Int!) {
              repository(owner: $owner, name: $name) {
                pullRequest(number: $number) {
                  closingIssuesReferences(first: 5) { nodes { number title url state labels(first: 10) { nodes { name } } } }
                  statusCheckRollup {
                    contexts(first: $checks) {
                      totalCount
                      nodes {
                        __typename
                        ... on CheckRun {
                          name status conclusion detailsUrl startedAt completedAt
                          checkSuite { app { name } workflowRun { workflow { name } } }
                        }
                        ... on StatusContext { context state targetUrl description createdAt }
                      }
                    }
                  }
                }
              }
            }
            """;
    // Fichiers modifiés lus par page de l'API REST (le maximum qu'elle accepte)
    private static final int FILES_PER_PAGE = 100;
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

    /**
     * Les fichiers modifiés d'une pull request et leur diff, dans l'ordre de GitHub, `maxPages` pages de 100 au plus.
     * Le diff d'un fichier binaire ou trop gros manque (patch nul), comme sur GitHub. GithubException.notFound si la
     * PR ou le dépôt n'existe pas.
     */
    public List<PullRequestFile> pullRequestFiles(String owner, String name, int number, int maxPages) {
        List<PullRequestFile> files = new ArrayList<>();
        for (int page = 1; page <= maxPages; page++) {
            int current = page;
            List<PullRequestFile> batch = call(() -> client.get()
                    .uri("/repos/{owner}/{name}/pulls/{number}/files?per_page={size}&page={page}", owner, name, number, FILES_PER_PAGE, current)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<PullRequestFile>>() {
                    }));
            if (batch == null || batch.isEmpty()) {
                break;
            }
            files.addAll(batch);
            if (batch.size() < FILES_PER_PAGE) {
                break;
            }
        }
        return files;
    }

    /**
     * Les vérifications du dernier commit d'une pull request (`maxChecks` au plus) et les issues qu'elle fermera en
     * fusionnant. Une requête GraphQL ; GithubException.notFound si le dépôt ou la PR n'existe pas.
     */
    public PullRequestChecks pullRequestChecks(String owner, String name, int number, int maxChecks) {
        JsonNode repository = graphql(PULL_REQUEST_CHECKS, Map.of("owner", owner, "name", name, "number", number, "checks", maxChecks));
        JsonNode pullRequest = repository.path("pullRequest");
        if (!pullRequest.isObject()) {
            throw GithubException.notFound();
        }
        JsonNode contexts = pullRequest.path("statusCheckRollup").path("contexts");
        List<CheckContext> checks = contexts.path("nodes").isArray()
                ? contexts.path("nodes").valueStream().filter(JsonNode::isObject).map(GithubClient::checkOf).toList()
                : List.of();
        List<ClosingIssue> issues = pullRequest.path("closingIssuesReferences").path("nodes").isArray()
                ? pullRequest.path("closingIssuesReferences").path("nodes").valueStream()
                        .filter(JsonNode::isObject)
                        .map(node -> MAPPER.treeToValue(node, ClosingIssue.class))
                        .toList()
                : List.of();
        return new PullRequestChecks(checks, contexts.path("totalCount").asInt(checks.size()), issues);
    }

    // Une vérification : un check run (GitHub Actions, une application) ou un statut (un service extérieur)
    private static CheckContext checkOf(JsonNode node) {
        if ("StatusContext".equals(node.path("__typename").asString(""))) {
            return new CheckContext(CheckContext.STATUS, textOf(node.path("context")), null, textOf(node.path("state")),
                    textOf(node.path("targetUrl")), instantOf(node.path("createdAt")), null, null, null,
                    textOf(node.path("description")));
        }
        JsonNode suite = node.path("checkSuite");
        return new CheckContext(CheckContext.CHECK_RUN, textOf(node.path("name")), textOf(node.path("status")),
                textOf(node.path("conclusion")), textOf(node.path("detailsUrl")), instantOf(node.path("startedAt")),
                instantOf(node.path("completedAt")), textOf(suite.path("app").path("name")),
                textOf(suite.path("workflowRun").path("workflow").path("name")), null);
    }

    private static String textOf(JsonNode node) {
        return node.isString() && !node.asString().isBlank() ? node.asString() : null;
    }

    private static Instant instantOf(JsonNode node) {
        String text = textOf(node);
        if (text == null) {
            return null;
        }
        try {
            return Instant.parse(text);
        } catch (DateTimeParseException e) {
            return null;
        }
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

    // ==================== LA PAGE D'UNE PULL REQUEST ====================

    /**
     * Un fichier modifié par une pull request (REST).
     *
     * @param status           added, removed, modified, renamed, copied, changed ou unchanged
     * @param patch            son diff unifié, sans en-tête de fichier ; null pour un fichier binaire ou trop gros
     * @param previousFilename son ancien chemin, s'il a été renommé
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PullRequestFile(
            String filename,
            String status,
            int additions,
            int deletions,
            String patch,
            @JsonProperty("previous_filename") String previousFilename) {
    }

    /**
     * Les vérifications du dernier commit d'une PR et les issues qu'elle ferme.
     *
     * @param total toutes ses vérifications, même au-delà de celles lues
     */
    public record PullRequestChecks(List<CheckContext> checks, int total, List<ClosingIssue> issues) {
    }

    /**
     * Une vérification du dernier commit.
     *
     * @param type        CHECK_RUN (GitHub Actions, une application) ou STATUS (un service extérieur)
     * @param status      check run : QUEUED, IN_PROGRESS, COMPLETED, WAITING, PENDING, REQUESTED ; null pour un statut
     * @param conclusion  check run terminé : SUCCESS, FAILURE, NEUTRAL, SKIPPED… ; statut : SUCCESS, PENDING, FAILURE,
     *                    ERROR, EXPECTED
     * @param app         l'application qui l'a lancée (« GitHub Actions »)
     * @param workflow    le workflow d'Actions dont elle fait partie
     * @param description ce qu'un statut dit de lui-même
     */
    public record CheckContext(String type, String name, String status, String conclusion, String url, Instant startedAt,
            Instant completedAt, String app, String workflow, String description) {

        public static final String CHECK_RUN = "CHECK_RUN";
        public static final String STATUS = "STATUS";
    }

    /** Une issue que la PR fermera en fusionnant : son titre, son adresse, OPEN ou CLOSED, ses étiquettes */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ClosingIssue(int number, String title, String url, String state, Nodes<Label> labels) {
    }
}
