package com.hautetech.ndadiee.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;

import org.junit.jupiter.api.Test;

/** Génération des slugs d'URL, et garantie d'unicité. */
class SlugServiceTest {

    private final SlugService slugService = new SlugService();

    @Test
    void removesAccentsPunctuationAndCase() {
        assertThat(slugService.toSlug("Comment déployer Spring Boot ?")).isEqualTo("comment-deployer-spring-boot");
        assertThat(slugService.toSlug("  Où gérer l'état : côté client ou serveur ?  "))
                .isEqualTo("ou-gerer-l-etat-cote-client-ou-serveur");
    }

    @Test
    void keepsLanguagesWithSymbolsApart() {
        // Sans règle dédiée, les trois donneraient « c » et se disputeraient le même tag
        assertThat(slugService.toSlug("C")).isEqualTo("c");
        assertThat(slugService.toSlug("C++")).isEqualTo("cpp");
        assertThat(slugService.toSlug("C#")).isEqualTo("csharp");
        assertThat(slugService.toSlug(".NET")).isEqualTo("dotnet");
        assertThat(slugService.toSlug("Node.js")).isEqualTo("node-js");
    }

    @Test
    void truncatesLongTitlesWithoutTrailingDash() {
        String slug = slugService.toSlug("mot ".repeat(40));

        assertThat(slug).hasSizeLessThanOrEqualTo(80);
        assertThat(slug).doesNotEndWith("-");
    }

    @Test
    void fallsBackWhenNothingCanBeTransliterated() {
        assertThat(slugService.toSlug("አማርኛ ጽሑፍ")).isEqualTo("sans-titre");
        assertThat(slugService.toSlug("???")).isEqualTo("sans-titre");
        assertThat(slugService.toSlug(null)).isEqualTo("sans-titre");
    }

    @Test
    void keepsTheSlugWhenItIsFree() {
        assertThat(slugService.generateUniqueSlug("Mon titre", slug -> false)).isEqualTo("mon-titre");
    }

    @Test
    void addsTheFirstFreeSuffixWhenTheSlugIsTaken() {
        Set<String> taken = Set.of("mon-titre", "mon-titre-2");

        assertThat(slugService.generateUniqueSlug("Mon titre", taken::contains)).isEqualTo("mon-titre-3");
    }
}
