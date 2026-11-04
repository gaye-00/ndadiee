package com.hautetech.ndadiee.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import com.hautetech.ndadiee.storage.StorageProperties.Provider;
import com.hautetech.ndadiee.storage.StorageProperties.R2;

/** Le choix du stockage : R2 dès que ses réglages sont complets, le disque sinon, et jamais R2 à moitié réglé. */
class StorageConfigurationTest {

    private static final R2 COMPLETE = new R2("compte", "cle", "secret", "ndadiee-media", "https://media.example.com/", null);
    private static final R2 MISSING_SECRET = new R2("compte", "cle", " ", "ndadiee-media", "https://media.example.com", null);

    private final StorageConfiguration configuration = new StorageConfiguration();

    private static StorageProperties properties(Provider provider, R2 r2) {
        return new StorageProperties(provider, "build/test-uploads", null, 0, null, r2);
    }

    @Test
    void withoutR2SettingsFilesGoToTheDisk() {
        assertThat(configuration.fileStorage(properties(Provider.AUTO, null))).isInstanceOf(LocalFileStorage.class);
        assertThat(configuration.fileStorage(properties(Provider.AUTO, MISSING_SECRET))).isInstanceOf(LocalFileStorage.class);
    }

    @Test
    void completeR2SettingsAreEnough() throws Exception {
        FileStorage storage = configuration.fileStorage(properties(Provider.AUTO, COMPLETE));

        assertThat(storage).isInstanceOf(R2FileStorage.class);
        assertThat(storage.description()).contains("ndadiee-media");
        ((R2FileStorage) storage).close();
    }

    @Test
    void r2CannotBeRequiredWithoutItsSettings() {
        assertThatThrownBy(() -> configuration.fileStorage(properties(Provider.R2, MISSING_SECRET)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("R2_SECRET_ACCESS_KEY");
    }

    @Test
    void theApiAddressComesFromTheAccount() {
        assertThat(COMPLETE.endpointUrl()).isEqualTo("https://compte.r2.cloudflarestorage.com");
        assertThat(new R2(null, "k", "s", "b", "https://m", "https://compte.eu.r2.cloudflarestorage.com").endpointUrl())
                .isEqualTo("https://compte.eu.r2.cloudflarestorage.com");
    }
}
