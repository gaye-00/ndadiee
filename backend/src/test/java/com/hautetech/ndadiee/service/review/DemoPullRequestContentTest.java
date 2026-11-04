package com.hautetech.ndadiee.service.review;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.hautetech.ndadiee.dto.response.PullRequestCheckResponse;
import com.hautetech.ndadiee.dto.response.PullRequestFileResponse;

/**
 * Les fichiers de démonstration du classpath se lisent, et collent aux commentaires du seeder : la ligne 24 de
 * cache.go (design 3C) et la ligne 42 de TripList.tsx sont bien celles qu'ils commentent.
 */
class DemoPullRequestContentTest {

    private final DemoPullRequestContent content = new DemoPullRequestContent();

    @Test
    void theVirtualListPullRequestHasItsDiffChecksAndIssue() {
        List<PullRequestFileResponse> files = content.files("paperweight", 12).orElseThrow();
        DemoPullRequestContent.Details details = content.details("paperweight", 12).orElseThrow();

        assertThat(files).hasSize(8).allSatisfy(file -> assertThat(file.getPatch()).isNotBlank());
        assertThat(details.checks()).hasSize(3).allSatisfy(check -> assertThat(check.state()).isEqualTo(PullRequestCheckResponse.State.SUCCESS));
        assertThat(details.issues()).singleElement().satisfies(issue -> assertThat(issue.number()).isEqualTo(6));
    }

    @Test
    void commentedLinesExistInTheNewVersionOfTheirFile() {
        assertThat(newLine(content.files("lagos-transit", 84).orElseThrow(), "internal/schedule/cache.go", 24))
                .contains("c.rdb.Set(ctx, key, encode(deps), 0)");
        assertThat(newLine(content.files("lagos-transit", 90).orElseThrow(), "web/src/trips/TripList.tsx", 42))
                .contains("<ol aria-live=\"polite\"");
        assertThat(newLine(content.files("paperweight", 12).orElseThrow(), "src/components/VirtualList/useVirtualRange.ts", 4))
                .contains("DEFAULT_OVERSCAN = 6");
    }

    @Test
    void aPullRequestWithoutDemoFilesHasNoContent() {
        assertThat(content.files("paperweight", 14)).isEmpty();
        assertThat(content.details("paperweight", 14)).isEmpty();
    }

    // La ligne `line` de la nouvelle version d'un fichier, d'après les numéros des blocs « @@ »
    private static String newLine(List<PullRequestFileResponse> files, String path, int line) {
        String patch = files.stream().filter(file -> file.getPath().equals(path)).findFirst().orElseThrow().getPatch();
        int current = 0;
        for (String row : patch.split("\n")) {
            if (row.startsWith("@@")) {
                current = Integer.parseInt(row.replaceAll("^@@ -\\S+ \\+(\\d+).*$", "$1"));
            } else if (!row.startsWith("-")) {
                if (current == line) {
                    return row;
                }
                current++;
            }
        }
        return null;
    }
}
