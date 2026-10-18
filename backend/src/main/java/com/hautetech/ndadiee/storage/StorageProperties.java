package com.hautetech.ndadiee.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

/**
 * Où vont les fichiers envoyés par les membres (images du forum), et leurs limites (ndadiee.storage).
 *
 * @param provider          AUTO : R2 dès que ses réglages sont complets, le disque sinon ; LOCAL ; R2
 * @param localDirectory    dossier des fichiers sur le disque (développement), servi sous /api/uploads/**
 * @param maxImageSize      taille maximale d'une image
 * @param maxUploadsPerHour envois d'images par membre et par heure, au plus
 * @param r2                le bucket Cloudflare R2
 */
@ConfigurationProperties(prefix = "ndadiee.storage")
public record StorageProperties(Provider provider, String localDirectory, DataSize maxImageSize, int maxUploadsPerHour, R2 r2) {

    public enum Provider {
        AUTO,
        LOCAL,
        R2
    }

    public StorageProperties {
        provider = provider == null ? Provider.AUTO : provider;
        localDirectory = localDirectory == null || localDirectory.isBlank() ? "uploads" : localDirectory;
        maxImageSize = maxImageSize == null ? DataSize.ofMegabytes(5) : maxImageSize;
        maxUploadsPerHour = maxUploadsPerHour <= 0 ? 40 : maxUploadsPerHour;
        r2 = r2 == null ? new R2(null, null, null, null, null, null) : r2;
    }

    /**
     * Un bucket Cloudflare R2, joint par son API compatible S3.
     *
     * @param accountId       identifiant du compte Cloudflare : l'adresse de l'API en découle
     * @param accessKeyId     clé d'un jeton d'API R2 (lecture et écriture sur ce bucket)
     * @param secretAccessKey secret de ce jeton
     * @param bucket          nom du bucket
     * @param publicUrl       adresse publique des fichiers : le domaine relié au bucket, ou son adresse r2.dev
     * @param endpoint        adresse de l'API S3, si elle n'est pas celle du compte (juridiction UE…)
     */
    public record R2(String accountId, String accessKeyId, String secretAccessKey, String bucket, String publicUrl, String endpoint) {

        /** Tout est là pour écrire dans le bucket et donner l'adresse publique des fichiers */
        public boolean configured() {
            return (hasText(accountId) || hasText(endpoint)) && hasText(accessKeyId) && hasText(secretAccessKey)
                    && hasText(bucket) && hasText(publicUrl);
        }

        public String endpointUrl() {
            return hasText(endpoint) ? endpoint.trim() : "https://" + accountId.trim() + ".r2.cloudflarestorage.com";
        }

        private static boolean hasText(String value) {
            return value != null && !value.isBlank();
        }
    }
}
