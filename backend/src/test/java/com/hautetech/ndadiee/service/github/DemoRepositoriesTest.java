package com.hautetech.ndadiee.service.github;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.hautetech.ndadiee.service.github.DemoRepositories.DemoRepository;

/** Le code des projets de démonstration : un fichier par dépôt, découpé aux lignes « ==> chemin <== ». */
class DemoRepositoriesTest {

    // Les dépôts fictifs des seeders (ShowcaseSeeder, HackathonSeeder, DashboardSeeder)
    private static final List<String> SEEDED = List.of("lagos-transit", "momo-sdk", "wolof-nlp", "agridata", "eduoffline",
            "habesha-nlp", "kawral", "naija-k8s-starter", "sunu-solar", "sahel-ui", "kumasi-builders", "tontine-cloud",
            "matatu-live", "paperweight");

    private final DemoRepositories repositories = new DemoRepositories();

    @Test
    void splitsTheBundleIntoFiles() {
        DemoRepository repository = DemoRepositories.parse("demo", """
                ==> README.md <==
                # Démo

                ==> src/main.go <==
                package main


                """);

        assertThat(repository.files()).containsOnlyKeys("README.md", "src/main.go");
        assertThat(repository.files().get("README.md")).isEqualTo("# Démo\n");
        // Les lignes vides avant le fichier suivant ne lui appartiennent pas
        assertThat(repository.files().get("src/main.go")).isEqualTo("package main\n");
        assertThat(repository.fullName()).isEqualTo("ndadiee-demo/demo");
    }

    @Test
    void refusesAPathOutsideTheRepository() {
        assertThatThrownBy(() -> DemoRepositories.parse("demo", "==> ../secret <==\nx\n")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> DemoRepositories.parse("demo", "==> /etc/passwd <==\nx\n")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void everySeededProjectHasItsCode() {
        SEEDED.forEach(name -> assertThat(repositories.of("https://example.com/ndadiee-demo/" + name))
                .as(name)
                .hasValueSatisfying(repository -> {
                    assertThat(repository.files()).containsKey("README.md");
                    assertThat(repository.files().size()).isGreaterThanOrEqualTo(5);
                }));
    }

    @Test
    void onlyDemoAddressesAreDemoRepositories() {
        assertThat(repositories.of("https://github.com/ndadiee-demo/lagos-transit")).isEmpty();
        assertThat(repositories.of("https://example.com/ndadiee-demo/inconnu")).isEmpty();
        assertThat(repositories.of("https://example.com/ndadiee-demo/../lagos-transit")).isEmpty();
        assertThat(repositories.of(null)).isEmpty();
        assertThat(repositories.of("HTTPS://www.example.com/ndadiee-demo/Lagos-Transit/")).isPresent();
    }
}
