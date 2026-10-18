package com.hautetech.ndadiee.storage;

import java.util.Optional;

/**
 * Là où sont gardés les fichiers envoyés par les membres : Cloudflare R2 en production, le disque en
 * développement (StorageConfiguration choisit). Les fichiers sont publics et ne changent jamais : une nouvelle
 * version est un nouveau fichier, sous une nouvelle clé, et l'ancienne est supprimée quand plus rien n'y renvoie
 * (une photo de profil remplacée).
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

    /** Supprime un fichier ; rien ne se passe s'il n'existe pas. */
    void delete(String key);

    /**
     * La clé d'un fichier de ce stockage, retrouvée dans son adresse publique (celle que {@link #store} a rendue).
     *
     * @return vide pour une adresse qui n'est pas celle d'un fichier de ce stockage
     */
    Optional<String> keyOf(String url);

    /** Pour les journaux : « Cloudflare R2 (bucket ndadiee-media) », « disque (uploads) » */
    String description();
}
