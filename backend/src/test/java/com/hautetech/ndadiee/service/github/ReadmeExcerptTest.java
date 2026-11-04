package com.hautetech.ndadiee.service.github;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** L'introduction d'un README devient la description du projet, dans le Markdown que sa page sait montrer. */
class ReadmeExcerptTest {

    private static final String README = """
            <p align="center">
              <img src="docs/logo.png" width="120" alt="logo">
            </p>
            <h1 align="center">Lagos Transit</h1>

            [![CI](https://github.com/ada/lagos-transit/actions/workflows/ci.yml/badge.svg)](https://github.com/ada/lagos-transit/actions) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

            <!-- Pitch -->
            > Les **prochains passages** de bus à Lagos, même hors ligne. Les données viennent de [LAMATA](https://lamata.ng) et des _conducteurs_ eux-mêmes.

            ## Fonctionnalités

            - Horaires en temps réel via `GTFS-RT`
            - Mode hors ligne : *les dernières données restent*
            * Signaler un retard en un geste

            ```bash
            npm install
            ```

            ## Installation

            Clone le dépôt puis lance `npm run dev`.
            """;

    @Test
    void theIntroductionIsKeptWithoutBadgesImagesNorTitles() {
        String excerpt = ReadmeExcerpt.of(README, "lagos-transit");

        assertThat(excerpt).isEqualTo("""
                Les **prochains passages** de bus à Lagos, même hors ligne. Les données viennent de LAMATA et des conducteurs eux-mêmes.

                - Horaires en temps réel via `GTFS-RT`
                - Mode hors ligne : les dernières données restent
                - Signaler un retard en un geste""");
    }

    @Test
    void aTableOfContentsBeforeTheIntroductionIsSkipped() {
        String readme = """
                # paperweight

                ## Table of Contents

                - [About](#about)
                - [Install](#install)

                ## About

                A tiny **offline-first** notes app for low-end Android phones.

                ## Install

                Run it.
                """;

        assertThat(ReadmeExcerpt.of(readme, "paperweight")).isEqualTo("A tiny **offline-first** notes app for low-end Android phones.");
    }

    @Test
    void underlinedTitlesAndTablesAreLeftOut() {
        String readme = """
                Momo SDK
                ========

                | Pays | Opérateur |
                |------|-----------|
                | CI   | Orange    |

                Un SDK __Mobile Money__ pour l'Afrique de l'Ouest.
                """;

        assertThat(ReadmeExcerpt.of(readme, "momo-sdk")).isEqualTo("Un SDK **Mobile Money** pour l'Afrique de l'Ouest.");
    }

    @Test
    void aReadmeWithNothingToSayGivesNothing() {
        assertThat(ReadmeExcerpt.of("# demo\n\n[![badge](x.svg)](y)\n\n## Install\n\nnpm i", "demo")).isNull();
        assertThat(ReadmeExcerpt.of("   ", "demo")).isNull();
        assertThat(ReadmeExcerpt.of(null, "demo")).isNull();
    }

    @Test
    void aVeryLongIntroductionIsCutOnAWord() {
        String excerpt = ReadmeExcerpt.of("word ".repeat(400), "x");

        assertThat(excerpt).endsWith("word…").hasSizeLessThanOrEqualTo(ReadmeExcerpt.MAX_CHARS + 1);
    }

    @Test
    void snakeCaseIsNotMistakenForItalics() {
        assertThat(ReadmeExcerpt.inline("Use my_module_name and 2 * 3 * 4")).isEqualTo("Use my_module_name and 2 * 3 * 4");
    }

    @Test
    void aRowOfNavigationLinksAndALeadInToAMissingListAreLeftOut() {
        String readme = """
                <a href="https://excalidraw.com">Excalidraw Editor</a> | <a href="https://blog.excalidraw.com">Blog</a> | <a href="https://docs.excalidraw.com">Documentation</a>

                An open source virtual hand-drawn style whiteboard.

                It supports:

                ## Installation
                """;

        assertThat(ReadmeExcerpt.of(readme, "excalidraw")).isEqualTo("An open source virtual hand-drawn style whiteboard.");
    }
}
