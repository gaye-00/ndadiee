package com.hautetech.ndadiee.storage;

/**
 * Là où sont gardés les fichiers envoyés par les membres : Cloudflare R2 en production, le disque en
 * développement (StorageConfiguration choisit). Les fichiers sont publics et ne changent jamais : une nouvelle
 * version est un nouveau fichier, sous une nouvelle clé.
 */
public interface FileStorage {

    /**
     * Enregistre un fichier.
     *
     * @param key         son chemin dans le stockage (« forum/12/2026/10/3f2a….webp »)
     * @param content     son contenu
     * @param contentType son type (« image/webp »)
     * @return son adresse publique
     */
    String store(String key, byte[] content, String contentType);

    /** Pour les journaux : « Cloudflare R2 (bucket ndadiee-media) », « disque (uploads) » */
    String description();
}
