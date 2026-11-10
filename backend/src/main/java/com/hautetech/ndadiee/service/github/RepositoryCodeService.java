package com.hautetech.ndadiee.service.github;

import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.SortedSet;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.util.UriUtils;

import com.hautetech.ndadiee.dto.response.ProjectCodeEntry;
import com.hautetech.ndadiee.dto.response.ProjectCodeFileResponse;
import com.hautetech.ndadiee.dto.response.ProjectCodeResponse;
import com.hautetech.ndadiee.exception.CodeUnavailableException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.github.GithubClient;
import com.hautetech.ndadiee.github.GithubClient.CodeRepository;
import com.hautetech.ndadiee.github.GithubClient.Tree;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.service.github.DemoRepositories.DemoRepository;
import com.hautetech.ndadiee.service.github.PullRequestSyncService.Repository;
import com.hautetech.ndadiee.service.project.ProjectService;

/**
 * Le code d'un projet, à lire dans Ndadiee (« Code source » de la page projet) : l'arbre de ses fichiers, puis le
 * texte de celui qu'on ouvre.
 *
 * <ul>
 * <li>Un dépôt GitHub public est lu sur GitHub : sa branche par défaut et son arbre (deux requêtes à l'API, gardées
 * une demi-heure : sans jeton, le quota est de 60 requêtes par heure pour tout le serveur), puis chaque fichier
 * ouvert, pris sur raw.githubusercontent.com, hors quota.</li>
 * <li>Un projet de démonstration a son dépôt dans l'application (DemoRepositories).</li>
 * </ul>
 *
 * Seul un fichier de l'arbre se demande : pas de chemin inventé. Un fichier binaire ou de plus de 256 ko ne
 * s'affiche pas (un lien mène à GitHub). Un projet masqué n'a de code que pour son équipe et les admins. Pas de
 * transaction autour des appels à GitHub : la base n'attend pas leurs réponses.
 */
@Service
public class RepositoryCodeService {

    static final int MAX_FILE_BYTES = 256 * 1024;
    // Au-delà, l'arbre est coupé : le reste se lit sur GitHub
    static final int MAX_ENTRIES = 5_000;
    private static final Duration CACHE_TTL = Duration.ofMinutes(30);
    private static final int CACHED_TREES = 100;
    private static final int CACHED_FILES = 200;
    // Ce qu'on ne lit pas comme du texte, d'après l'extension : pas besoin de le télécharger pour le savoir
    private static final Set<String> BINARY_EXTENSIONS = Set.of("png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "ico", "icns",
            "pdf", "zip", "gz", "tgz", "bz2", "xz", "7z", "rar", "jar", "war", "aar", "apk", "ipa", "class", "so", "dylib", "dll", "exe",
            "bin", "wasm", "woff", "woff2", "ttf", "otf", "eot", "mp3", "mp4", "m4a", "ogg", "wav", "webm", "mov", "avi", "psd", "sketch",
            "fig", "keystore", "jks", "p12", "pyc", "db", "sqlite");
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "ico");
    // Git tient un fichier pour binaire s'il a un octet nul dans ses 8 000 premiers
    private static final int BINARY_SNIFF = 8_000;

    private final ProjectRepository projectRepository;
    private final ProjectService projectService;
    private final GithubClient client;
    private final DemoRepositories demoRepositories;
    private final TransactionTemplate transaction;
    private final ExpiringCache<GithubTree> trees;
    private final ExpiringCache<byte[]> files;

    // L'arbre d'une branche, avec ses fichiers par chemin pour vérifier qu'on demande bien l'un d'eux
    private record GithubTree(CodeRepository repository, List<ProjectCodeEntry> entries, Map<String, Long> fileSizes, boolean truncated) {
    }

    @Autowired
    public RepositoryCodeService(ProjectRepository projectRepository, ProjectService projectService, GithubClient client,
            DemoRepositories demoRepositories, PlatformTransactionManager transactionManager) {
        this(projectRepository, projectService, client, demoRepositories, readOnly(transactionManager), Clock.systemUTC());
    }

    // Pour les tests : une horloge arrêtée
    RepositoryCodeService(ProjectRepository projectRepository, ProjectService projectService, GithubClient client,
            DemoRepositories demoRepositories, TransactionTemplate transaction, Clock clock) {
        this.projectRepository = projectRepository;
        this.projectService = projectService;
        this.client = client;
        this.demoRepositories = demoRepositories;
        this.transaction = transaction;
        this.trees = new ExpiringCache<>(CACHE_TTL, CACHED_TREES, clock);
        this.files = new ExpiringCache<>(CACHE_TTL, CACHED_FILES, clock);
    }

    private static TransactionTemplate readOnly(PlatformTransactionManager transactionManager) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setReadOnly(true);
        return template;
    }

    /** L'arbre du code d'un projet ; CodeUnavailableException s'il n'a pas de dépôt à lire. */
    public ProjectCodeResponse tree(String slug, Long viewerId) {
        String repositoryUrl = repositoryUrlOf(slug, viewerId);
        var demo = demoRepositories.of(repositoryUrl);
        if (demo.isPresent()) {
            return demoTree(demo.get());
        }
        Repository repository = PullRequestSyncService.repositoryOf(repositoryUrl).orElseThrow(CodeUnavailableException::new);
        GithubTree tree = githubTree(repository);
        CodeRepository found = tree.repository();
        return ProjectCodeResponse.builder()
                .source(ProjectCodeResponse.Source.GITHUB)
                .repository(found.owner().login() + "/" + found.name())
                .branch(found.defaultBranch())
                .webUrl(found.htmlUrl() + "/tree/" + UriUtils.encodePath(found.defaultBranch(), StandardCharsets.UTF_8))
                .entries(tree.entries())
                .truncated(tree.truncated())
                .build();
    }

    /** Un fichier du code d'un projet, pris dans son arbre ; ResourceNotFoundException s'il n'y est pas. */
    public ProjectCodeFileResponse file(String slug, String path, Long viewerId) {
        String repositoryUrl = repositoryUrlOf(slug, viewerId);
        String wanted = path == null ? "" : path.strip();
        var demo = demoRepositories.of(repositoryUrl);
        if (demo.isPresent()) {
            String content = demo.get().files().get(wanted);
            if (content == null) {
                throw new ResourceNotFoundException("Fichier", "chemin", wanted);
            }
            return ProjectCodeFileResponse.builder()
                    .path(wanted)
                    .size(content.getBytes(StandardCharsets.UTF_8).length)
                    .content(content)
                    .build();
        }

        Repository repository = PullRequestSyncService.repositoryOf(repositoryUrl).orElseThrow(CodeUnavailableException::new);
        GithubTree tree = githubTree(repository);
        Long size = tree.fileSizes().get(wanted);
        if (size == null) {
            throw new ResourceNotFoundException("Fichier", "chemin", wanted);
        }
        CodeRepository found = tree.repository();
        String owner = found.owner().login();
        String branch = found.defaultBranch();
        String extension = extensionOf(wanted);
        ProjectCodeFileResponse.ProjectCodeFileResponseBuilder response = ProjectCodeFileResponse.builder()
                .path(wanted)
                .size(size)
                .webUrl(found.htmlUrl() + "/blob/" + UriUtils.encodePath(branch, StandardCharsets.UTF_8) + "/"
                        + UriUtils.encodePath(wanted, StandardCharsets.UTF_8))
                .rawUrl(IMAGE_EXTENSIONS.contains(extension) ? GithubClient.rawUrl(owner, found.name(), branch, wanted) : null);
        if (BINARY_EXTENSIONS.contains(extension)) {
            return response.binary(true).build();
        }
        if (size > MAX_FILE_BYTES) {
            return response.tooLarge(true).build();
        }
        String key = (owner + "/" + found.name() + "@" + branch + ":" + wanted).toLowerCase(Locale.ROOT);
        byte[] bytes = files.get(key, () -> client.rawFile(owner, found.name(), branch, wanted));
        String text = textOf(bytes);
        return text == null ? response.binary(true).build() : response.content(text).build();
    }

    // L'adresse du dépôt d'un projet visible pour ce lecteur
    private String repositoryUrlOf(String slug, Long viewerId) {
        return transaction.execute(status -> projectRepository.findBySlug(slug)
                .filter(project -> projectService.isVisibleTo(project, viewerId))
                .orElseThrow(() -> new ResourceNotFoundException("Projet", "slug", slug))
                .getRepositoryUrl());
    }

    private GithubTree githubTree(Repository repository) {
        return trees.get(repository.fullName().toLowerCase(Locale.ROOT), () -> {
            CodeRepository found = client.codeRepository(repository.owner(), repository.name());
            Tree tree = client.tree(found.owner().login(), found.name(), found.defaultBranch());
            List<ProjectCodeEntry> entries = new ArrayList<>();
            boolean truncated = tree.truncated();
            for (GithubClient.TreeEntry entry : tree.tree()) {
                if (entry.path() == null || !("blob".equals(entry.type()) || "tree".equals(entry.type()))) {
                    // Un sous-module (commit) vit dans un autre dépôt
                    continue;
                }
                if (entries.size() >= MAX_ENTRIES) {
                    truncated = true;
                    break;
                }
                entries.add("tree".equals(entry.type()) ? ProjectCodeEntry.directory(entry.path())
                        : ProjectCodeEntry.file(entry.path(), entry.size() == null ? 0 : entry.size()));
            }
            Map<String, Long> sizes = entries.stream()
                    .filter(entry -> entry.type() == ProjectCodeEntry.Type.FILE)
                    .collect(Collectors.toMap(ProjectCodeEntry::path, ProjectCodeEntry::size, (first, second) -> first));
            return new GithubTree(found, List.copyOf(entries), Map.copyOf(sizes), truncated);
        });
    }

    private static ProjectCodeResponse demoTree(DemoRepository repository) {
        SortedSet<String> directories = new TreeSet<>();
        repository.files().keySet().forEach(path -> {
            for (int slash = path.indexOf('/'); slash > 0; slash = path.indexOf('/', slash + 1)) {
                directories.add(path.substring(0, slash));
            }
        });
        Map<String, ProjectCodeEntry> byPath = new TreeMap<>();
        directories.forEach(directory -> byPath.put(directory, ProjectCodeEntry.directory(directory)));
        repository.files().forEach((path, content) -> byPath.put(path, ProjectCodeEntry.file(path, content.getBytes(StandardCharsets.UTF_8).length)));
        return ProjectCodeResponse.builder()
                .source(ProjectCodeResponse.Source.DEMO)
                .repository(repository.fullName())
                .branch(DemoRepositories.BRANCH)
                .entries(List.copyOf(byPath.values()))
                .build();
    }

    private static String extensionOf(String path) {
        String name = path.substring(path.lastIndexOf('/') + 1).toLowerCase(Locale.ROOT);
        int dot = name.lastIndexOf('.');
        return dot <= 0 ? "" : name.substring(dot + 1);
    }

    /** Le texte d'un fichier en UTF-8 ; null s'il est binaire (un octet nul dans ses premiers octets). */
    static String textOf(byte[] bytes) {
        for (int index = 0; index < Math.min(bytes.length, BINARY_SNIFF); index++) {
            if (bytes[index] == 0) {
                return null;
            }
        }
        try {
            return StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes))
                    .toString();
        } catch (CharacterCodingException e) {
            // Latin-1 ou autre encodage d'avant : lisible quand même, quelques caractères remplacés
            return new String(bytes, StandardCharsets.UTF_8);
        }
    }
}
