package com.hautetech.ndadiee.service.github;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Clock;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.hautetech.ndadiee.dto.response.GithubRepositoryResponse;
import com.hautetech.ndadiee.dto.response.GithubRepositorySummaryResponse;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.github.GithubClient;
import com.hautetech.ndadiee.github.GithubClient.Repository;
import com.hautetech.ndadiee.github.GithubProperties;
import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.TagRepository;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.user.UserService;

/**
 * Préremplir un projet depuis son dépôt GitHub (formulaire /projects/new) : nom, description, site, licence,
 * technologies (langages et sujets du dépôt) et l'introduction du README. Et pour un membre qui a renseigné son
 * GitHub, ses dépôts récents, à importer en un clic. Seuls les dépôts publics se lisent.
 *
 * Trois requêtes à GitHub par dépôt (le dépôt, ses langages, son README), gardées dix minutes en mémoire. Pas de
 * transaction autour : la base n'attend pas les réponses de GitHub.
 */
@Service
public class GithubRepositoryService {

    static final int MAX_LANGUAGES = 6;
    // Langages repris parmi les technologies proposées : le principal, et ceux qui font au moins un dixième du code
    static final int SUGGESTED_LANGUAGES = 3;
    static final double MAIN_LANGUAGE_SHARE = 0.1;
    static final int MAX_SUGGESTED_TAGS = 8;
    static final int MAX_MEMBER_REPOSITORIES = 8;
    // Longueurs de ProjectRequest
    static final int MAX_DESCRIPTION = 200;
    static final int MAX_URL = 500;
    static final int MAX_LICENSE = 40;
    private static final int CACHE_ENTRIES = 500;

    /** Compte GitHub : lettres, chiffres, tirets isolés (ni au début ni à la fin), 39 caractères au plus */
    static final Pattern LOGIN = Pattern.compile("^[a-z\\d](?:[a-z\\d]|-(?=[a-z\\d])){0,38}$", Pattern.CASE_INSENSITIVE);
    /** Nom de dépôt : lettres, chiffres, points, tirets et soulignés, 100 caractères au plus */
    static final Pattern NAME = Pattern.compile("^[\\w.-]{1,100}$");
    // Le compte dans l'adresse d'un profil GitHub (Developer.githubUrl) : « https://github.com/ada », « github.com/ada »
    private static final Pattern PROFILE = Pattern.compile("^(?:https?://)?(?:www\\.)?github\\.com/([^/?#\\s]+)/?.*$", Pattern.CASE_INSENSITIVE);
    // Fichiers de construction ou d'outillage plus que technologies du projet
    private static final Set<String> TOOLING_LANGUAGES = Set.of("Shell", "Makefile", "Dockerfile", "Batchfile", "PowerShell",
            "Procfile", "CMake", "M4", "Roff", "Nix", "Just");
    // Sujets qui disent comment le dépôt cherche des contributeurs, pas ce qu'il est
    private static final Pattern COMMUNITY_TOPIC = Pattern.compile("^(hacktoberfest\\d*|good-first-issues?|first-timers?-only|help-wanted"
            + "|up-for-grabs|open-?source|awesome|beginner-friendly|contributions-welcome)$");

    private final GithubClient client;
    private final ProjectRepository projectRepository;
    private final TagRepository tagRepository;
    private final SlugService slugService;
    private final UserService userService;
    private final ExpiringCache<Imported> repositories;
    private final ExpiringCache<List<Repository>> memberRepositories;

    // Ce que GitHub dit d'un dépôt, gardé en mémoire
    private record Imported(Repository repository, Map<String, Long> languages, String readme) {
    }

    @Autowired
    public GithubRepositoryService(GithubClient client, ProjectRepository projectRepository, TagRepository tagRepository,
            SlugService slugService, UserService userService, GithubProperties properties) {
        this(client, projectRepository, tagRepository, slugService, userService, properties, Clock.systemUTC());
    }

    // Pour les tests : une horloge arrêtée
    GithubRepositoryService(GithubClient client, ProjectRepository projectRepository, TagRepository tagRepository,
            SlugService slugService, UserService userService, GithubProperties properties, Clock clock) {
        this.client = client;
        this.projectRepository = projectRepository;
        this.tagRepository = tagRepository;
        this.slugService = slugService;
        this.userService = userService;
        this.repositories = new ExpiringCache<>(properties.cacheTtl(), CACHE_ENTRIES, clock);
        this.memberRepositories = new ExpiringCache<>(properties.cacheTtl(), CACHE_ENTRIES, clock);
    }

    /** Un dépôt public, prêt à préremplir le formulaire : « owner/name ». */
    public GithubRepositoryResponse importRepository(String owner, String name) {
        if (owner == null || !LOGIN.matcher(owner).matches() || name == null || !NAME.matcher(name).matches()) {
            throw new OperationNotAllowedException("Adresse de dépôt GitHub invalide : github.com/compte/depot", "repository");
        }
        Imported imported = repositories.get((owner + "/" + name).toLowerCase(Locale.ROOT), () -> {
            Repository repository = client.repository(owner, name);
            // Les noms exacts (casse, dépôt renommé) sont ceux que GitHub renvoie
            String realOwner = repository.owner().login();
            Map<String, Long> languages = client.languages(realOwner, repository.name());
            String readme = client.readme(realOwner, repository.name()).orElse(null);
            return new Imported(repository, languages, readme);
        });

        Repository repository = imported.repository();
        String repositoryUrl = canonicalUrl(repository);
        List<Map.Entry<String, Long>> byWeight = imported.languages().entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .toList();
        List<String> languages = byWeight.stream().map(Map.Entry::getKey).limit(MAX_LANGUAGES).toList();
        List<String> topics = repository.topics() == null ? List.of() : repository.topics();

        return GithubRepositoryResponse.builder()
                .owner(repository.owner().login())
                .ownerAvatarUrl(repository.owner().avatarUrl())
                .name(repository.name())
                .fullName(repository.fullName())
                .repositoryUrl(repositoryUrl)
                .description(shorten(repository.description()))
                .homepage(homepageOf(repository.homepage()))
                .license(licenseOf(repository))
                .languages(languages)
                .topics(topics)
                .suggestedTags(suggestedTags(mainLanguages(byWeight), topics))
                .readmeExcerpt(ReadmeExcerpt.of(imported.readme(), repository.name()))
                .stars(repository.stars())
                .forks(repository.forks())
                .openIssues(repository.openIssues())
                .archived(repository.archived())
                .fork(repository.fork())
                .pushedAt(repository.pushedAt())
                .listedProjectSlug(listedSlug(repositoryUrl).orElse(null))
                .build();
    }

    /**
     * Les dépôts récents du membre connecté, d'après le GitHub de son profil : ses propres dépôts (ni copies, ni
     * archives), les plus récemment modifiés d'abord. Vide s'il n'a pas renseigné son GitHub.
     */
    public List<GithubRepositorySummaryResponse> memberRepositories(Long userId) {
        Optional<String> login = loginOf(userService.getDeveloperOrThrow(userId).getGithubUrl());
        if (login.isEmpty()) {
            return List.of();
        }
        List<Repository> all = memberRepositories.get(login.get().toLowerCase(Locale.ROOT), () -> client.userRepositories(login.get()));
        return all.stream()
                .filter(repository -> !repository.fork() && !repository.archived() && !repository.privateRepository())
                .sorted(Comparator.comparing(Repository::pushedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(MAX_MEMBER_REPOSITORIES)
                .map(repository -> GithubRepositorySummaryResponse.builder()
                        .owner(repository.owner().login())
                        .name(repository.name())
                        .fullName(repository.fullName())
                        .description(shorten(repository.description()))
                        .language(repository.language())
                        .stars(repository.stars())
                        .pushedAt(repository.pushedAt())
                        .listedProjectSlug(listedSlug(canonicalUrl(repository)).orElse(null))
                        .build())
                .toList();
    }

    /** Le compte GitHub d'une adresse de profil (« https://github.com/ada » → « ada ») */
    static Optional<String> loginOf(String githubUrl) {
        if (githubUrl == null || githubUrl.isBlank()) {
            return Optional.empty();
        }
        Matcher profile = PROFILE.matcher(githubUrl.trim());
        String login = profile.matches() ? profile.group(1) : githubUrl.trim().replaceFirst("^@", "");
        return LOGIN.matcher(login).matches() ? Optional.of(login) : Optional.empty();
    }

    private static String canonicalUrl(Repository repository) {
        return "https://github.com/" + repository.owner().login() + "/" + repository.name();
    }

    // Un projet de la vitrine pointe déjà vers ce dépôt, quelle que soit la façon d'écrire son adresse
    private Optional<String> listedSlug(String repositoryUrl) {
        String base = repositoryUrl.toLowerCase(Locale.ROOT);
        String path = base.substring("https://".length());
        List<String> forms = Stream.of("https://" + path, "http://" + path, "https://www." + path, "http://www." + path)
                .flatMap(url -> Stream.of(url, url + "/", url + ".git"))
                .toList();
        return projectRepository.findSlugsByRepositoryUrls(forms).stream().findFirst();
    }

    // Le langage principal du projet (hors outillage : Shell, Dockerfile…), et ceux qui font au moins un dixième du code
    private static List<String> mainLanguages(List<Map.Entry<String, Long>> byWeight) {
        List<Map.Entry<String, Long>> code = byWeight.stream().filter(entry -> !TOOLING_LANGUAGES.contains(entry.getKey())).toList();
        long total = code.stream().mapToLong(Map.Entry::getValue).sum();
        return code.stream()
                .filter(entry -> entry == code.getFirst() || entry.getValue() >= total * MAIN_LANGUAGE_SHARE)
                .map(Map.Entry::getKey)
                .limit(SUGGESTED_LANGUAGES)
                .toList();
    }

    /**
     * Les langages principaux, puis les sujets du dépôt (sans « hacktoberfest » et consorts). Deux noms qui donnent le
     * même tag (« TypeScript », « typescript ») n'en font qu'un, sous le nom du tag existant (« react-native » devient
     * « React Native »).
     */
    private List<String> suggestedTags(List<String> languages, List<String> topics) {
        Map<String, String> bySlug = new LinkedHashMap<>();
        Stream.concat(languages.stream(), topics.stream().filter(topic -> !COMMUNITY_TOPIC.matcher(topic).matches()))
                .filter(name -> name != null && !name.isBlank() && name.length() <= 50)
                .forEach(name -> {
                    String slug = slugService.toSlug(name);
                    if (!slug.isEmpty() && bySlug.size() < MAX_SUGGESTED_TAGS) {
                        bySlug.computeIfAbsent(slug, key -> tagRepository.findBySlug(key).map(Tag::getName).orElse(name));
                    }
                });
        return List.copyOf(bySlug.values());
    }

    // La description sert d'accroche : 200 caractères au plus, coupée au dernier mot qui tient
    private static String shorten(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        String clean = description.strip().replaceAll("\\s+", " ");
        if (clean.length() <= MAX_DESCRIPTION) {
            return clean;
        }
        int cut = clean.lastIndexOf(' ', MAX_DESCRIPTION - 1);
        return clean.substring(0, cut > MAX_DESCRIPTION / 2 ? cut : MAX_DESCRIPTION - 1).strip() + "…";
    }

    // Le site du dépôt, souvent écrit sans https:// (« lagos-transit.app ») ; null s'il n'a pas l'air d'une adresse
    static String homepageOf(String homepage) {
        if (homepage == null || homepage.isBlank()) {
            return null;
        }
        String url = homepage.strip();
        if (!url.matches("(?i)^https?://.*")) {
            url = "https://" + url;
        }
        try {
            URI uri = new URI(url);
            String host = uri.getHost();
            return host != null && host.contains(".") && url.length() <= MAX_URL ? url : null;
        } catch (URISyntaxException e) {
            return null;
        }
    }

    private static String licenseOf(Repository repository) {
        if (repository.license() == null) {
            return null;
        }
        String spdx = repository.license().spdxId();
        return spdx == null || spdx.isBlank() || "NOASSERTION".equals(spdx) || spdx.length() > MAX_LICENSE ? null : spdx;
    }
}
