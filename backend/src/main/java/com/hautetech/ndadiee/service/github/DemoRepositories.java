package com.hautetech.ndadiee.service.github;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.SortedMap;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Les dépôts des projets de démonstration (ShowcaseSeeder, HackathonSeeder, DashboardSeeder), qui n'existent pas sur
 * GitHub : leur adresse est « https://example.com/ndadiee-demo/{nom} », et leur code un fichier du classpath, lu une
 * fois, demo/code/{nom}.txt.
 *
 * Tous les fichiers d'un dépôt y sont à la suite, chacun annoncé par une ligne « ==> chemin <== » (comme `head` sur
 * plusieurs fichiers). Un seul fichier par dépôt : ni les outils qui cherchent des package.json ou des go.mod dans le
 * dépôt, ni Maven (qui écarte les .gitignore des ressources) ne s'en mêlent.
 */
@Component
public class DemoRepositories {

    /** Le compte des dépôts de démonstration, devant leur nom : « ndadiee-demo/lagos-transit » */
    static final String OWNER = "ndadiee-demo";
    static final String BRANCH = "main";
    private static final String ROOT = "demo/code/";
    // example.com est réservé à la documentation : ces adresses ne mènent nulle part
    private static final Pattern DEMO_URL = Pattern.compile("^https?://(?:www\\.)?example\\.com/" + OWNER + "/([a-z0-9][a-z0-9-]{0,99})/?$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern FILE_HEADER = Pattern.compile("^==> (.+) <==$");

    private final Map<String, Optional<DemoRepository>> repositories = new ConcurrentHashMap<>();

    /**
     * Un dépôt de démonstration.
     *
     * @param name  « lagos-transit »
     * @param files le texte de chaque fichier, par chemin
     */
    public record DemoRepository(String name, SortedMap<String, String> files) {

        public String fullName() {
            return OWNER + "/" + name;
        }
    }

    /** Le dépôt de démonstration d'une adresse ; vide si l'adresse n'en est pas un, ou si son code manque. */
    public Optional<DemoRepository> of(String repositoryUrl) {
        if (repositoryUrl == null) {
            return Optional.empty();
        }
        Matcher matcher = DEMO_URL.matcher(repositoryUrl.trim());
        if (!matcher.matches()) {
            return Optional.empty();
        }
        String name = matcher.group(1).toLowerCase();
        return repositories.computeIfAbsent(name, key -> read(ROOT + key + ".txt").map(bundle -> parse(key, bundle)));
    }

    /** Les fichiers d'un dépôt, d'après les lignes « ==> chemin <== » ; les lignes vides en fin de fichier tombent. */
    static DemoRepository parse(String name, String bundle) {
        SortedMap<String, String> files = new TreeMap<>();
        String path = null;
        StringBuilder content = new StringBuilder();
        for (String line : bundle.split("\n", -1)) {
            Matcher header = FILE_HEADER.matcher(line);
            if (header.matches()) {
                put(files, path, content);
                path = header.group(1).strip();
                content.setLength(0);
                continue;
            }
            if (path != null) {
                content.append(line).append('\n');
            }
        }
        put(files, path, content);
        return new DemoRepository(name, Collections.unmodifiableSortedMap(files));
    }

    private static void put(SortedMap<String, String> files, String path, StringBuilder content) {
        if (path == null) {
            return;
        }
        if (path.startsWith("/") || path.endsWith("/") || path.contains("\\") || ("/" + path + "/").contains("/../")
                || ("/" + path + "/").contains("/./")) {
            throw new IllegalStateException("Chemin invalide dans un dépôt de démonstration : " + path);
        }
        String text = content.toString().stripTrailing();
        files.put(path, text.isEmpty() ? "" : text + "\n");
    }

    private static Optional<String> read(String path) {
        ClassPathResource resource = new ClassPathResource(path);
        if (!resource.exists()) {
            return Optional.empty();
        }
        try (InputStream in = resource.getInputStream()) {
            return Optional.of(new String(in.readAllBytes(), StandardCharsets.UTF_8).replace("\r\n", "\n"));
        } catch (IOException e) {
            throw new UncheckedIOException("Dépôt de démonstration illisible : " + path, e);
        }
    }
}
