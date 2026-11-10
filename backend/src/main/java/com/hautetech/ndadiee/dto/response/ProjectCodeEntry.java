package com.hautetech.ndadiee.dto.response;

/**
 * Une entrée de l'arbre d'un dépôt.
 *
 * @param path son chemin depuis la racine : « internal/schedule/cache.go »
 * @param type FILE ou DIR
 * @param size la taille d'un fichier en octets ; null pour un dossier
 */
public record ProjectCodeEntry(String path, Type type, Long size) {

    public enum Type {
        FILE, DIR
    }

    public static ProjectCodeEntry file(String path, long size) {
        return new ProjectCodeEntry(path, Type.FILE, size);
    }

    public static ProjectCodeEntry directory(String path) {
        return new ProjectCodeEntry(path, Type.DIR, null);
    }
}
