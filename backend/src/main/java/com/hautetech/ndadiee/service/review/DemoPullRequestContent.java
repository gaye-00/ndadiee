package com.hautetech.ndadiee.service.review;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hautetech.ndadiee.dto.response.PullRequestCheckResponse;
import com.hautetech.ndadiee.dto.response.PullRequestFileResponse;

import tools.jackson.databind.json.JsonMapper;

/**
 * Le dépôt des pull requests de démonstration (ReviewSeeder), qui n'existent pas sur GitHub : leur diff et le détail
 * de leurs vérifications et de leurs issues sont des fichiers du classpath, lus une fois.
 *
 * <ul>
 * <li>demo/pull-requests/{projet}/{numéro}.diff : la sortie de `git diff`, découpée en fichiers (UnifiedDiff) ;</li>
 * <li>demo/pull-requests/{projet}/{numéro}.json : ses vérifications et les issues qu'elle ferme.</li>
 * </ul>
 *
 * Une PR de démonstration sans ces fichiers n'a que ses totaux : la page dit que son diff n'est pas disponible.
 */
@Component
public class DemoPullRequestContent {

    private static final String ROOT = "demo/pull-requests/";
    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private final Map<String, Optional<List<PullRequestFileResponse>>> diffs = new ConcurrentHashMap<>();
    private final Map<String, Optional<Details>> details = new ConcurrentHashMap<>();

    /**
     * Le détail d'une PR de démonstration.
     *
     * @param checks ses vérifications, dans l'ordre où elles se sont lancées
     * @param issues les issues qu'elle fermera en fusionnant
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Details(List<Check> checks, List<Issue> issues) {

        public Details {
            checks = checks == null ? List.of() : List.copyOf(checks);
            issues = issues == null ? List.of() : List.copyOf(issues);
        }
    }

    /**
     * Une vérification de démonstration.
     *
     * @param afterMinutes lancée tant de minutes après l'ouverture de la PR
     * @param seconds      sa durée ; null tant qu'elle tourne
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Check(String name, String context, PullRequestCheckResponse.State state, String description, int afterMinutes,
            Integer seconds) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Issue(int number, String title, String state, List<String> labels) {

        public Issue {
            labels = labels == null ? List.of() : List.copyOf(labels);
        }
    }

    /** Le diff de la PR, fichier par fichier ; vide si elle n'en a pas. */
    public Optional<List<PullRequestFileResponse>> files(String projectSlug, int number) {
        return diffs.computeIfAbsent(projectSlug + "/" + number,
                key -> read(ROOT + key + ".diff").map(UnifiedDiff::parse).map(List::copyOf));
    }

    /** Ses vérifications et ses issues ; vide si elle n'en a pas le détail. */
    public Optional<Details> details(String projectSlug, int number) {
        return details.computeIfAbsent(projectSlug + "/" + number,
                key -> read(ROOT + key + ".json").map(json -> MAPPER.readValue(json, Details.class)));
    }

    private static Optional<String> read(String path) {
        ClassPathResource resource = new ClassPathResource(path);
        if (!resource.exists()) {
            return Optional.empty();
        }
        try (InputStream in = resource.getInputStream()) {
            return Optional.of(new String(in.readAllBytes(), StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new UncheckedIOException("Données de démonstration illisibles : " + path, e);
        }
    }
}
