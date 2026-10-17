package com.hautetech.ndadiee.service.project;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.hautetech.ndadiee.dto.response.OpeningMatchResponse;
import com.hautetech.ndadiee.model.project.TeamRole;

/** Compatibilité d'un profil avec un rôle : les compétences du métier, puis la stack du projet. */
class OpeningMatcherTest {

    private static final List<String> LAGOS_STACK = List.of("Go", "GraphQL", "Redis", "React Native", "GTFS", "Open Data");

    private final OpeningMatcher matcher = new OpeningMatcher();

    @Test
    void twoSkillsOfTheTradeMakeSeventyPercent() {
        // Ada, dev front-end, face au rôle mobile de lagos-transit
        assertThat(matcher.match(List.of("React", "TypeScript", "CSS"), TeamRole.MOBILE, LAGOS_STACK)).get()
                .satisfies(match -> {
                    assertThat(match.getScore()).isEqualTo(70);
                    assertThat(match.getSkills()).containsExactly("React", "TypeScript");
                });
    }

    @Test
    void theProjectStackCountsTooAndComesFirstAmongTheReasons() {
        // Musa, back-end Java, face au rôle paiements de momo-sdk : Java compte deux fois, Spring Boot une
        assertThat(matcher.match(List.of("PostgreSQL", "Spring Boot", "Java"), TeamRole.PAYMENTS,
                List.of("Java", "Kotlin", "Spring Boot", "Mobile Money", "API"))).get()
                .satisfies(match -> {
                    assertThat(match.getScore()).isEqualTo(73);
                    assertThat(match.getSkills()).containsExactly("Java", "Spring Boot");
                });
    }

    @Test
    void noRelevantSkillMeansNoMatch() {
        assertThat(matcher.match(List.of("PHP", "Laravel"), TeamRole.EMBEDDED, List.of("IoT", "ESP32"))).isEmpty();
        assertThat(matcher.match(List.of(), TeamRole.MOBILE, LAGOS_STACK)).isEmpty();
    }

    @Test
    void theScoreNeverReachesAHundred() {
        List<String> everything = List.of("React", "Vue", "Svelte", "Angular", "Next.js", "TypeScript", "JavaScript", "CSS", "HTML");
        assertThat(matcher.match(everything, TeamRole.FRONTEND, everything)).get()
                .extracting(OpeningMatchResponse::getScore)
                .isEqualTo(99);
    }

    @Test
    void namesMatchWhateverTheirCaseAndKeepTheProfileSpelling() {
        assertThat(matcher.match(List.of(" react native "), TeamRole.MOBILE, LAGOS_STACK)).get()
                .satisfies(match -> {
                    assertThat(match.getScore()).isEqualTo(62);
                    assertThat(match.getSkills()).containsExactly("react native");
                });
    }
}
