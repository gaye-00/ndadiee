package com.hautetech.ndadiee.service.github;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.hautetech.ndadiee.dto.response.RepositorySyncResponse;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.GithubException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.github.GithubClient;
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
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;

/**
 * Les pull requests des projets, lues sur leur dépôt GitHub : GitHub garde le code, les PR et la fusion ; Ndadiee
 * garde les relecteurs, les commentaires et l'ouverture à la communauté, auxquels la synchronisation ne touche pas.
 *
 * <ul>
 * <li>Le planificateur passe chaque minute et lit les projets dont la dernière lecture date de plus de
 * ndadiee.github.sync.interval : un projet qui vient d'indiquer son dépôt a ses PR dans la minute.</li>
 * <li>Le porteur ou un mainteneur peut relancer la lecture à la main.</li>
 * <li>Une requête GraphQL par dépôt : les PR ouvertes les plus récemment actives et les dernières fusionnées ou
 * fermées. Une PR ouverte chez nous qui n'en fait plus partie est relue par son numéro, pour connaître son sort.</li>
 * </ul>
 *
 * Les PR des robots (Dependabot, Renovate…) ne sont pas reprises : elles n'appellent pas de revue communautaire.
 * Aucune transaction n'attend GitHub : on lit la base, on interroge GitHub, puis on écrit.
 */
@Slf4j
@Service
public class PullRequestSyncService {

    // Lues à chaque passage : les PR ouvertes les plus récemment actives, et les dernières fusionnées ou fermées
    static final int OPEN_PULL_REQUESTS = 50;
    static final int RECENT_PULL_REQUESTS = 20;
    // PR ouvertes chez nous qui ne sont plus parmi les dernières : relues par leur numéro, tant par passage au plus
    static final int MAX_STALE = 30;
    // Projets lus à chaque passage du planificateur
    static final int PROJECTS_PER_RUN = 10;
    // Relancée à la main moins de tant après la précédente lecture, la synchronisation se contente de celle-ci
    static final Duration MANUAL_COOLDOWN = Duration.ofSeconds(30);
    // Longueurs des colonnes de pull_requests
    static final int MAX_TITLE = 200;
    static final int MAX_BRANCH = 120;
    static final int MAX_LABEL = 255;

    /** Un dépôt GitHub : « https://github.com/owner/name », avec ou sans www ni « .git », suivi ou non d'un chemin (/tree/main) */
    private static final Pattern REPOSITORY_URL = Pattern.compile(
            "^(?:https?://)?(?:www\\.)?github\\.com/([^/?#\\s]+)/([^/?#\\s]+?)(?:\\.git)?(?:[/?#].*)?$", Pattern.CASE_INSENSITIVE);
    // États des check runs (CheckRunState) et des statuts (StatusState) ; les autres tournent encore
    private static final Set<String> PASSED = Set.of("SUCCESS", "NEUTRAL", "SKIPPED", "COMPLETED");
    private static final Set<String> FAILED = Set.of("FAILURE", "ERROR", "TIMED_OUT", "CANCELLED", "ACTION_REQUIRED",
            "STARTUP_FAILURE", "STALE");

    private final GithubClient client;
    private final GithubSyncProperties properties;
    private final ProjectRepository projectRepository;
    private final PullRequestRepository pullRequestRepository;
    private final RepositorySyncRepository syncRepository;
    private final ProjectService projectService;
    private final TransactionTemplate transaction;
    private final Clock clock;
    // Les projets en cours de lecture : le planificateur et un clic du porteur ne lisent pas deux fois le même
    private final Set<Long> running = ConcurrentHashMap.newKeySet();
    private boolean warnedWithoutToken;

    @PersistenceContext
    private EntityManager em;

    /** Un dépôt GitHub : son compte et son nom */
    record Repository(String owner, String name) {

        String fullName() {
            return owner + "/" + name;
        }
    }

    // Ce qu'il faut savoir d'un projet avant d'interroger GitHub
    record Target(Long projectId, Repository repository, String repositoryId, List<Integer> openNumbers) {
    }

    @Autowired
    public PullRequestSyncService(GithubClient client, GithubSyncProperties properties, ProjectRepository projectRepository,
            PullRequestRepository pullRequestRepository, RepositorySyncRepository syncRepository, ProjectService projectService,
            PlatformTransactionManager transactionManager) {
        this(client, properties, projectRepository, pullRequestRepository, syncRepository, projectService,
                new TransactionTemplate(transactionManager), Clock.systemUTC());
    }

    // Pour les tests : une horloge arrêtée
    PullRequestSyncService(GithubClient client, GithubSyncProperties properties, ProjectRepository projectRepository,
            PullRequestRepository pullRequestRepository, RepositorySyncRepository syncRepository, ProjectService projectService,
            TransactionTemplate transaction, Clock clock) {
        this.client = client;
        this.properties = properties;
        this.projectRepository = projectRepository;
        this.pullRequestRepository = pullRequestRepository;
        this.syncRepository = syncRepository;
        this.projectService = projectService;
        this.transaction = transaction;
        this.clock = clock;
    }

    // ==================== LE PLANIFICATEUR ====================

    /** Lit les projets dont le tour est venu, les jamais lus d'abord ; s'arrête si GitHub limite les requêtes. */
    @Scheduled(initialDelayString = "${ndadiee.github.sync.initial-delay:PT30S}", fixedDelayString = "${ndadiee.github.sync.tick:PT1M}")
    public void syncDue() {
        if (!properties.enabled()) {
            return;
        }
        if (!client.authenticated()) {
            if (!warnedWithoutToken) {
                log.warn("[GitHub] Pull requests non synchronisées : l'API GraphQL demande un jeton (GITHUB_TOKEN)");
                warnedWithoutToken = true;
            }
            return;
        }
        for (Long projectId : dueProjects()) {
            try {
                sync(projectId);
            } catch (GithubException e) {
                if (e.getStatus() == HttpStatus.TOO_MANY_REQUESTS) {
                    log.warn("[GitHub] Quota atteint : synchronisation reprise au prochain passage");
                    return;
                }
            } catch (RuntimeException e) {
                // Un projet en échec n'empêche pas les suivants
                log.error("[GitHub] Synchronisation du projet {} impossible", projectId, e);
            }
        }
    }

    // Les projets à dépôt GitHub dont la dernière tentative est assez ancienne, les jamais lus puis les plus anciens d'abord
    List<Long> dueProjects() {
        return transaction.execute(status -> {
            Map<Long, String> repositories = em.createQuery("""
                    SELECT p.id, p.repositoryUrl FROM Project p
                    WHERE LOWER(p.repositoryUrl) LIKE '%github.com/%' AND p.hiddenAt IS NULL
                    """, Object[].class)
                    .getResultStream()
                    .filter(row -> repositoryOf((String) row[1]).isPresent())
                    .collect(Collectors.toMap(row -> (Long) row[0], row -> (String) row[1]));
            if (repositories.isEmpty()) {
                return List.of();
            }
            Map<Long, RepositorySync> syncs = syncRepository.findByProjectIdIn(repositories.keySet()).stream()
                    .collect(Collectors.toMap(sync -> sync.getProject().getId(), Function.identity()));
            Instant now = clock.instant();
            return repositories.keySet().stream()
                    .filter(id -> isDue(syncs.get(id), now))
                    .sorted(Comparator.comparing((Long id) -> syncs.containsKey(id) ? syncs.get(id).getAttemptedAt() : null,
                            Comparator.nullsFirst(Comparator.naturalOrder())))
                    .limit(PROJECTS_PER_RUN)
                    .toList();
        });
    }

    private boolean isDue(RepositorySync sync, Instant now) {
        if (sync == null || sync.getAttemptedAt() == null) {
            return true;
        }
        Duration wait = "GITHUB_REPOSITORY_NOT_FOUND".equals(sync.getError()) ? properties.retryAfterNotFound() : properties.interval();
        return !sync.getAttemptedAt().plus(wait).isAfter(now);
    }

    // ==================== LE PORTEUR ====================

    /** Où en est la lecture du dépôt d'un projet. */
    public RepositorySyncResponse status(Long userId, String slug) {
        return transaction.execute(status -> {
            Project project = visibleProject(slug, userId);
            return toResponse(project, syncRepository.findByProjectId(project.getId()).orElse(null), userId);
        });
    }

    /**
     * Relit le dépôt d'un projet tout de suite (porteur ou mainteneur). Juste après une lecture, renvoie celle-ci ; les
     * erreurs de GitHub (dépôt introuvable, quota) remontent telles quelles, après avoir été notées.
     */
    public RepositorySyncResponse syncNow(Long userId, String slug) {
        // Le projet, ou null si sa dernière lecture est toute récente
        Long projectId = transaction.execute(status -> {
            Project project = visibleProject(slug, userId);
            if (!projectService.canManage(project, userId)) {
                throw new ForbiddenException("Seuls le porteur et les mainteneurs synchronisent les pull requests du projet");
            }
            if (repositoryOf(project.getRepositoryUrl()).isEmpty()) {
                throw new OperationNotAllowedException("Ce projet n'a pas de dépôt GitHub : ajoute son adresse (github.com/compte/depot)",
                        "repositoryUrl");
            }
            if (!client.authenticated()) {
                throw GithubException.notConfigured();
            }
            boolean recent = syncRepository.findByProjectId(project.getId())
                    .map(RepositorySync::getSyncedAt)
                    .filter(at -> at.plus(MANUAL_COOLDOWN).isAfter(clock.instant()))
                    .isPresent();
            return recent ? null : project.getId();
        });
        if (projectId != null) {
            sync(projectId);
        }
        return status(userId, slug);
    }

    private Project visibleProject(String slug, Long userId) {
        Project project = projectRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Projet", "slug", slug));
        if (!projectService.isVisibleTo(project, userId)) {
            throw new ResourceNotFoundException("Projet", "slug", slug);
        }
        return project;
    }

    private RepositorySyncResponse toResponse(Project project, RepositorySync sync, Long userId) {
        Optional<Repository> repository = repositoryOf(project.getRepositoryUrl());
        return RepositorySyncResponse.builder()
                // Le nom que GitHub donne au dépôt (casse, renommage) une fois lu, celui de l'adresse avant
                .repository(sync != null && sync.getFullName() != null ? sync.getFullName()
                        : repository.map(Repository::fullName).orElse(null))
                .repositoryUrl(repository.map(found -> "https://github.com/" + found.fullName()).orElse(null))
                .available(client.authenticated())
                .syncedAt(sync == null ? null : sync.getSyncedAt())
                .attemptedAt(sync == null ? null : sync.getAttemptedAt())
                .error(sync == null ? null : sync.getError())
                .openPullRequests(pullRequestRepository.countSynced(project.getId(), PullRequestStatus.OPEN))
                .canSync(repository.isPresent() && projectService.canManage(project, userId))
                .build();
    }

    // ==================== LA LECTURE ====================

    /**
     * Lit le dépôt d'un projet et met ses PR à jour. Rien si le projet n'a pas (ou plus) de dépôt GitHub, ou s'il est
     * déjà en cours de lecture. Une erreur de GitHub est notée sur la synchronisation, puis relancée.
     */
    void sync(Long projectId) {
        if (!running.add(projectId)) {
            return;
        }
        try {
            Target target = transaction.execute(status -> target(projectId));
            if (target == null) {
                return;
            }
            RepositoryPullRequests fetched;
            Map<Integer, PullRequestNode> stale;
            try {
                Repository repository = target.repository();
                fetched = client.pullRequests(repository.owner(), repository.name(), OPEN_PULL_REQUESTS, RECENT_PULL_REQUESTS);
                // Les PR ouvertes chez nous qui ne sont plus parmi les dernières : fusionnées, fermées, ou juste calmes
                Set<Integer> seen = Stream.concat(fetched.open().stream(), fetched.recent().stream())
                        .map(PullRequestNode::number)
                        .collect(Collectors.toSet());
                boolean sameRepository = target.repositoryId() == null || target.repositoryId().equals(fetched.repositoryId());
                List<Integer> missing = sameRepository
                        ? target.openNumbers().stream().filter(number -> !seen.contains(number)).limit(MAX_STALE).toList()
                        : List.of();
                stale = client.pullRequestsByNumber(repository.owner(), repository.name(), missing);
            } catch (GithubException e) {
                transaction.executeWithoutResult(status -> syncRepository.findByProjectId(projectId).ifPresent(sync -> {
                    sync.setAttemptedAt(clock.instant());
                    sync.setError(e.getErrorCode());
                }));
                log.warn("[GitHub] Dépôt {} (projet {}) non lu : {}", target.repository().fullName(), projectId, e.getErrorCode());
                throw e;
            }
            int count = transaction.execute(status -> apply(projectId, fetched, stale.values().stream().toList()));
            log.info("[GitHub] Dépôt {} (projet {}) : {} pull requests à jour", fetched.fullName(), projectId, count);
        } finally {
            running.remove(projectId);
        }
    }

    // Le dépôt du projet, sa synchronisation (créée au premier passage) et ses PR ouvertes chez nous
    private Target target(Long projectId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        Optional<Repository> repository = project == null ? Optional.empty() : repositoryOf(project.getRepositoryUrl());
        if (repository.isEmpty()) {
            return null;
        }
        RepositorySync sync = syncRepository.findByProjectId(projectId)
                .orElseGet(() -> syncRepository.save(RepositorySync.builder().project(project).build()));
        return new Target(projectId, repository.get(), sync.getRepositoryId(),
                pullRequestRepository.findSyncedNumbers(projectId, PullRequestStatus.OPEN));
    }

    /**
     * Écrit ce que GitHub a renvoyé : crée les PR nouvelles (ouvertes à la communauté), met à jour les autres. Si le
     * projet pointe vers un autre dépôt que la fois précédente, les PR de l'ancien partent avec leurs revues.
     *
     * @return le nombre de PR écrites
     */
    int apply(Long projectId, RepositoryPullRequests fetched, List<PullRequestNode> stale) {
        Project project = projectRepository.findById(projectId).orElseThrow(() -> new ResourceNotFoundException("Projet", projectId));
        RepositorySync sync = syncRepository.findByProjectId(projectId)
                .orElseGet(() -> syncRepository.save(RepositorySync.builder().project(project).build()));
        if (sync.getRepositoryId() != null && !sync.getRepositoryId().equals(fetched.repositoryId())) {
            int removed = pullRequestRepository.deleteSynced(projectId);
            log.info("[GitHub] Projet {} : nouveau dépôt {}, {} pull requests de l'ancien supprimées", projectId, fetched.fullName(), removed);
        }

        // Une fois chaque numéro, sans les robots
        Map<Integer, PullRequestNode> nodes = new LinkedHashMap<>();
        Stream.of(fetched.open(), fetched.recent(), stale)
                .flatMap(List::stream)
                .filter(node -> node.author() == null || !"Bot".equals(node.author().type()))
                .forEach(node -> nodes.putIfAbsent(node.number(), node));

        Map<Integer, PullRequest> existing = nodes.isEmpty() ? Map.of()
                : pullRequestRepository.findByProjectIdAndNumberIn(projectId, nodes.keySet()).stream()
                        .collect(Collectors.toMap(PullRequest::getNumber, Function.identity()));
        Map<String, Developer> members = membersByLogin(nodes.values().stream()
                .map(PullRequestNode::author)
                .filter(author -> author != null && author.login() != null)
                .map(author -> author.login().toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet()));

        Instant now = clock.instant();
        List<PullRequest> created = new ArrayList<>();
        nodes.values().forEach(node -> {
            PullRequest pullRequest = existing.get(node.number());
            if (pullRequest == null) {
                pullRequest = PullRequest.builder()
                        .project(project)
                        .number(node.number())
                        // Un projet qui relie son dépôt cherche des relecteurs : ses PR s'ouvrent à la communauté
                        .community(true)
                        .lastActivityAt(node.updatedAt() != null ? node.updatedAt() : now)
                        .build();
                pullRequest.setCreatedAt(node.createdAt());
                created.add(pullRequest);
            }
            copy(node, pullRequest, node.author() == null || node.author().login() == null
                    ? null
                    : members.get(node.author().login().toLowerCase(Locale.ROOT)));
        });
        pullRequestRepository.saveAll(created);

        sync.setRepositoryId(fetched.repositoryId());
        sync.setFullName(fetched.fullName());
        sync.setAttemptedAt(now);
        sync.setSyncedAt(now);
        sync.setError(null);
        return nodes.size();
    }

    /** Recopie ce que GitHub dit d'une PR ; les champs de Ndadiee (communauté, relecteurs) ne bougent pas. */
    static void copy(PullRequestNode node, PullRequest pullRequest, Developer member) {
        pullRequest.setTitle(truncate(node.title() == null ? "#" + node.number() : node.title().strip(), MAX_TITLE));
        pullRequest.setBody(node.body() == null || node.body().isBlank() ? null : node.body().strip());
        pullRequest.setStatus(statusOf(node.state()));
        pullRequest.setDraft(node.isDraft());
        pullRequest.setSourceBranch(truncate(node.headRefName() == null ? "" : node.headRefName(), MAX_BRANCH));
        pullRequest.setTargetBranch(truncate(node.baseRefName() == null ? "main" : node.baseRefName(), MAX_BRANCH));
        pullRequest.setCommits(node.commits() == null ? 0 : node.commits().totalCount());
        pullRequest.setFilesChanged(node.changedFiles());
        pullRequest.setAdditions(node.additions());
        pullRequest.setDeletions(node.deletions());

        List<StateCount> checks = node.statusCheckRollup() == null || node.statusCheckRollup().contexts() == null
                ? List.of()
                : Stream.of(node.statusCheckRollup().contexts().checkRunCountsByState(),
                                node.statusCheckRollup().contexts().statusContextCountsByState())
                        .filter(counts -> counts != null)
                        .flatMap(List::stream)
                        .toList();
        pullRequest.setChecksTotal(checks.stream().mapToInt(StateCount::count).sum());
        pullRequest.setChecksPassed(checks.stream().filter(count -> PASSED.contains(count.state())).mapToInt(StateCount::count).sum());
        pullRequest.setChecksFailed(checks.stream().filter(count -> FAILED.contains(count.state())).mapToInt(StateCount::count).sum());

        pullRequest.setStarterIssueNumber(starterIssueOf(node));
        pullRequest.setLabels(node.labels() == null || node.labels().nodes() == null ? new ArrayList<>()
                : node.labels().nodes().stream()
                        .filter(label -> label != null && label.name() != null && !label.name().isBlank())
                        .map(label -> truncate(label.name().strip(), MAX_LABEL))
                        .collect(Collectors.toCollection(ArrayList::new)));
        pullRequest.setMergedAt(node.mergedAt());
        // Une PR fusionnée est aussi fermée pour GitHub : chez nous, closedAt dit qu'elle l'a été sans fusion
        pullRequest.setClosedAt(node.mergedAt() == null ? node.closedAt() : null);
        if (node.updatedAt() != null && (pullRequest.getLastActivityAt() == null || node.updatedAt().isAfter(pullRequest.getLastActivityAt()))) {
            pullRequest.setLastActivityAt(node.updatedAt());
        }

        pullRequest.setGithubUrl(node.url());
        pullRequest.setHeadSha(node.headRefOid());
        pullRequest.setAuthor(member);
        pullRequest.setAuthorLogin(node.author() == null ? null : node.author().login());
        pullRequest.setAuthorAvatarUrl(node.author() == null ? null : node.author().avatarUrl());
        pullRequest.setAuthorAssociation(node.authorAssociation());
    }

    private static PullRequestStatus statusOf(String state) {
        if ("MERGED".equals(state)) {
            return PullRequestStatus.MERGED;
        }
        return "CLOSED".equals(state) ? PullRequestStatus.CLOSED : PullRequestStatus.OPEN;
    }

    // La première issue « premier pas » que la PR fermera en fusionnant
    private static Integer starterIssueOf(PullRequestNode node) {
        if (node.closingIssuesReferences() == null || node.closingIssuesReferences().nodes() == null) {
            return null;
        }
        return node.closingIssuesReferences().nodes().stream()
                .filter(issue -> issue != null && issue.labels() != null && issue.labels().nodes() != null
                        && issue.labels().nodes().stream()
                                .anyMatch(label -> label != null && StarterLabels.isStarter(label.name())))
                .map(GithubClient.Issue::number)
                .findFirst()
                .orElse(null);
    }

    /**
     * Les membres dont le profil donne l'un de ces comptes GitHub (Developer.githubUrl : « https://github.com/ada »,
     * « github.com/ada/ », « ada »), par compte en minuscules. Un compte GitHub n'a que lettres, chiffres et tirets :
     * il n'y a rien à échapper dans le LIKE, et loginOf confirme chaque candidat.
     */
    private Map<String, Developer> membersByLogin(Set<String> logins) {
        if (logins.isEmpty()) {
            return Map.of();
        }
        List<String> valid = logins.stream().filter(login -> GithubRepositoryService.LOGIN.matcher(login).matches()).toList();
        if (valid.isEmpty()) {
            return Map.of();
        }
        StringBuilder jpql = new StringBuilder("SELECT d FROM Developer d WHERE d.githubUrl IS NOT NULL AND (");
        Map<String, String> params = new HashMap<>();
        for (int i = 0; i < valid.size(); i++) {
            jpql.append(i == 0 ? "" : " OR ").append("LOWER(d.githubUrl) LIKE :a").append(i).append(" OR LOWER(d.githubUrl) LIKE :b").append(i);
            params.put("a" + i, "%" + valid.get(i));
            params.put("b" + i, "%" + valid.get(i) + "/");
        }
        jpql.append(")");
        var query = em.createQuery(jpql.toString(), Developer.class);
        params.forEach(query::setParameter);
        Map<String, Developer> members = new HashMap<>();
        query.getResultList().forEach(developer -> GithubRepositoryService.loginOf(developer.getGithubUrl())
                .map(login -> login.toLowerCase(Locale.ROOT))
                .filter(logins::contains)
                .ifPresent(login -> members.putIfAbsent(login, developer)));
        return members;
    }

    /** Le dépôt GitHub d'une adresse ; vide si ce n'est pas un dépôt GitHub. */
    static Optional<Repository> repositoryOf(String repositoryUrl) {
        if (repositoryUrl == null || repositoryUrl.isBlank()) {
            return Optional.empty();
        }
        Matcher matcher = REPOSITORY_URL.matcher(repositoryUrl.trim());
        if (!matcher.matches()) {
            return Optional.empty();
        }
        String owner = matcher.group(1);
        String name = matcher.group(2);
        if (!GithubRepositoryService.LOGIN.matcher(owner).matches() || !GithubRepositoryService.NAME.matcher(name).matches()) {
            return Optional.empty();
        }
        return Optional.of(new Repository(owner, name));
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }
}
