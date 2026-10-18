package com.hautetech.ndadiee.storage;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import lombok.extern.slf4j.Slf4j;

/**
 * Choisit le stockage des fichiers : Cloudflare R2 dès que ses réglages sont complets (R2_ACCOUNT_ID,
 * R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL), le disque sinon. STORAGE_PROVIDER=r2 impose
 * R2 : sans ses réglages, l'application refuse de démarrer plutôt que d'écrire sur un disque qui ne survivra pas.
 */
@Slf4j
@Configuration
@EnableConfigurationProperties(StorageProperties.class)
public class StorageConfiguration {

    @Bean
    public FileStorage fileStorage(StorageProperties properties) {
        StorageProperties.R2 r2 = properties.r2();
        FileStorage storage = switch (properties.provider()) {
            case R2 -> {
                if (!r2.configured()) {
                    throw new IllegalStateException("STORAGE_PROVIDER=r2, mais R2 n'est pas configuré : il faut R2_ACCOUNT_ID "
                            + "(ou R2_ENDPOINT), R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET et R2_PUBLIC_URL");
                }
                yield new R2FileStorage(r2);
            }
            case LOCAL -> new LocalFileStorage(properties.localDirectory());
            case AUTO -> r2.configured() ? new R2FileStorage(r2) : new LocalFileStorage(properties.localDirectory());
        };
        log.info("[Storage] Fichiers des membres : {}", storage.description());
        return storage;
    }
}
