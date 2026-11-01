package com.hautetech.ndadiee.model.media;

/** Pour quoi une image a été envoyée : le préfixe de sa clé dans le stockage, et ce qu'elle devient. */
public enum UploadPurpose {

    /** Insérée dans un contenu du forum (sujet, réponse, commentaire) : gardée */
    FORUM("forum"),

    /**
     * Couverture ou capture d'un projet. Rattachée au projet qui la montre ; sans projet depuis le délai de garde
     * (ndadiee.storage.orphan-retention), elle est supprimée.
     */
    PROJECT("projects");

    private final String keyPrefix;

    UploadPurpose(String keyPrefix) {
        this.keyPrefix = keyPrefix;
    }

    public String keyPrefix() {
        return keyPrefix;
    }
}
