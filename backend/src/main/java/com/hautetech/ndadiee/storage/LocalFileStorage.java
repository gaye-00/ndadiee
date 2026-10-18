package com.hautetech.ndadiee.storage;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

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
        Path target = root.resolve(key).normalize();
        // La clé vient du serveur, mais on ne sort jamais du dossier, quoi qu'il arrive
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Clé de fichier invalide : " + key);
        }
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content);
        } catch (IOException e) {
            throw new UncheckedIOException("Impossible d'écrire " + target, e);
        }
        return MediaUrls.absolute(URL_PREFIX + key);
    }

    @Override
    public String description() {
        return "disque (" + root + ")";
    }
}
