package com.hautetech.ndadiee.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** Le disque du développement : un fichier se range, se retrouve par son adresse et se supprime, sans sortir du dossier. */
class LocalFileStorageTest {

    @TempDir
    private Path directory;

    @Test
    void aStoredFileIsFoundFromItsAddressAndDeleted() throws Exception {
        LocalFileStorage storage = new LocalFileStorage(directory.toString());

        // Hors d'une requête HTTP, l'adresse est le chemin seul
        String url = storage.store("avatars/12/photo.webp", new byte[] { 1, 2, 3 }, "image/webp");
        assertThat(url).isEqualTo("uploads/avatars/12/photo.webp");
        assertThat(storage.keyOf(url)).contains("avatars/12/photo.webp");

        storage.delete("avatars/12/photo.webp");
        assertThat(Files.exists(directory.resolve("avatars/12/photo.webp"))).isFalse();
        // Déjà supprimé : rien ne se passe
        storage.delete("avatars/12/photo.webp");
    }

    @Test
    void theKeyIsReadFromThePathWhateverTheHost() {
        LocalFileStorage storage = new LocalFileStorage(directory.toString());

        assertThat(storage.keyOf("http://localhost:8080/api/uploads/avatars/12/photo.webp")).contains("avatars/12/photo.webp");
        assertThat(storage.keyOf("http://192.168.1.20:8080/api/uploads/forum/3/2026/10/x.png")).contains("forum/3/2026/10/x.png");
        assertThat(storage.keyOf("https://avatars.githubusercontent.com/u/1")).isEmpty();
        assertThat(storage.keyOf("http://localhost:8080/api/uploads/")).isEmpty();
        assertThat(storage.keyOf(null)).isEmpty();
        assertThat(storage.keyOf("pas une adresse :")).isEmpty();
    }

    @Test
    void aKeyNeverLeadsOutOfTheDirectory() {
        LocalFileStorage storage = new LocalFileStorage(directory.resolve("uploads").toString());

        assertThatThrownBy(() -> storage.delete("../secret.txt")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.store("../../etc/x", new byte[] { 1 }, "image/png")).isInstanceOf(IllegalArgumentException.class);
    }
}
