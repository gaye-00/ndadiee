package com.hautetech.ndadiee.storage;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import com.hautetech.ndadiee.common.MediaUrls;

/**
 * Fichiers sur le disque du serveur, servis par l'API sous /api/uploads/** (config/WebConfig). Pour le
 * développement, tant que R2 n'est pas configuré : un seul serveur, et des fichiers perdus avec lui.
 */
public class LocalFileStorage implements FileStorage {

    /** Le préfixe des adresses des fichiers, sous le chemin de l'API */
    public static final String URL_PREFIX = "uploads/";

    private final Path root;

    public LocalFileStorage(String directory) {
        this.root = Path.of(directory).toAbsolutePath().normalize();
    }

    public Path root() {
        return root;
    }

    @Override
    public String store(String key, byte[] content, String contentType) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content);
        } catch (IOException e) {
            throw new UncheckedIOException("Impossible d'écrire " + target, e);
        }
        return MediaUrls.absolute(URL_PREFIX + key);
    }

    @Override
    public void delete(String key) {
        Path target = resolve(key);
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            throw new UncheckedIOException("Impossible de supprimer " + target, e);
        }
    }

    /**
     * L'adresse d'un fichier est « {hôte}/api/uploads/{clé} » (ou « uploads/{clé} » hors d'une requête) : l'hôte
     * dépend de la requête qui l'a créée, seul le chemin compte.
     */
    @Override
    public Optional<String> keyOf(String url) {
        if (url == null || url.isBlank()) {
            return Optional.empty();
        }
        String path;
        try {
            path = URI.create(url).getPath();
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
        if (path == null) {
            return Optional.empty();
        }
        String marker = "/" + URL_PREFIX;
        int at = path.indexOf(marker);
        String key = at >= 0 ? path.substring(at + marker.length())
                : path.startsWith(URL_PREFIX) ? path.substring(URL_PREFIX.length()) : "";
        return key.isEmpty() ? Optional.empty() : Optional.of(key);
    }

    @Override
    public String description() {
        return "disque (" + root + ")";
    }

    // La clé vient du serveur, mais on ne sort jamais du dossier, quoi qu'il arrive
    private Path resolve(String key) {
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root) || target.equals(root)) {
            throw new IllegalArgumentException("Clé de fichier invalide : " + key);
        }
        return target;
    }
}
