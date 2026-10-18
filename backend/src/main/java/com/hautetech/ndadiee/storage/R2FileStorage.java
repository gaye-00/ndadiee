package com.hautetech.ndadiee.storage;

import java.net.URI;
import java.util.Optional;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * Fichiers dans un bucket Cloudflare R2, par son API compatible S3. Servis par l'adresse publique du bucket (un
 * domaine relié, ou r2.dev), et gardés un an par les navigateurs : un fichier ne change jamais.
 */
public class R2FileStorage implements FileStorage, AutoCloseable {

    // Un fichier ne change jamais sous la même clé : le navigateur et le CDN le gardent
    private static final String CACHE_CONTROL = "public, max-age=31536000, immutable";

    private final S3Client client;
    private final String bucket;
    private final String publicUrl;

    public R2FileStorage(StorageProperties.R2 r2) {
        this.bucket = r2.bucket().trim();
        this.publicUrl = r2.publicUrl().trim().replaceAll("/+$", "");
        this.client = S3Client.builder()
                .endpointOverride(URI.create(r2.endpointUrl()))
                // R2 n'a pas de régions au sens d'AWS : « auto »
                .region(Region.of("auto"))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(r2.accessKeyId().trim(), r2.secretAccessKey().trim())))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                // Les sommes de contrôle ajoutées d'office par les SDK récents ne sont pas toutes acceptées par R2 :
                // seulement quand l'opération les exige (recommandation de Cloudflare)
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
                .build();
    }

    @Override
    public String store(String key, byte[] content, String contentType) {
        client.putObject(PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(contentType)
                        .cacheControl(CACHE_CONTROL)
                        .build(),
                RequestBody.fromBytes(content));
        return publicUrl + "/" + key;
    }

    @Override
    public void delete(String key) {
        // S3 ne signale pas une clé absente : la suppression est toujours un succès
        client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }

    @Override
    public Optional<String> keyOf(String url) {
        String prefix = publicUrl + "/";
        if (url == null || !url.startsWith(prefix) || url.length() == prefix.length()) {
            return Optional.empty();
        }
        return Optional.of(url.substring(prefix.length()));
    }

    @Override
    public String description() {
        return "Cloudflare R2 (bucket " + bucket + ")";
    }

    @Override
    public void close() {
        client.close();
    }
}
