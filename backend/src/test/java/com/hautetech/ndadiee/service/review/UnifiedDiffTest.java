package com.hautetech.ndadiee.service.review;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.hautetech.ndadiee.dto.response.PullRequestFileResponse;
import com.hautetech.ndadiee.dto.response.PullRequestFileResponse.Status;

/** La sortie de `git diff` se découpe en fichiers comme GitHub les donne : chemin, statut, lignes, diff sans en-tête. */
class UnifiedDiffTest {

    private static final String DIFF = """
            diff --git a/src/pages/Inventory.tsx b/src/pages/Inventory.tsx
            index 1111111..2222222 100644
            --- a/src/pages/Inventory.tsx
            +++ b/src/pages/Inventory.tsx
            @@ -1,3 +1,4 @@
             import { useMemo, useState } from 'react';
            +import { VirtualList } from '../components/VirtualList';
             import { SearchField } from '../components/SearchField';
            -import './Old.css';
            diff --git a/docs/list.md b/docs/list.md
            new file mode 100644
            index 0000000..3333333
            --- /dev/null
            +++ b/docs/list.md
            @@ -0,0 +1,2 @@
            +# VirtualList
            +Une liste légère.
            diff --git a/src/legacy.ts b/src/legacy.ts
            deleted file mode 100644
            index 4444444..0000000
            --- a/src/legacy.ts
            +++ /dev/null
            @@ -1 +0,0 @@
            -export const legacy = true;
            diff --git a/src/a.ts b/src/b.ts
            similarity index 90%
            rename from src/a.ts
            rename to src/b.ts
            diff --git a/logo.png b/logo.png
            index 5555555..6666666 100644
            Binary files a/logo.png and b/logo.png differ
            """;

    @Test
    void eachFileHasItsPathStatusCountsAndPatch() {
        List<PullRequestFileResponse> files = UnifiedDiff.parse(DIFF);

        assertThat(files).extracting(PullRequestFileResponse::getPath)
                .containsExactly("src/pages/Inventory.tsx", "docs/list.md", "src/legacy.ts", "src/b.ts", "logo.png");
        assertThat(files).extracting(PullRequestFileResponse::getStatus)
                .containsExactly(Status.MODIFIED, Status.ADDED, Status.REMOVED, Status.RENAMED, Status.MODIFIED);

        PullRequestFileResponse inventory = files.getFirst();
        assertThat(inventory.getAdditions()).isEqualTo(1);
        assertThat(inventory.getDeletions()).isEqualTo(1);
        assertThat(inventory.getPatch()).startsWith("@@ -1,3 +1,4 @@").doesNotContain("+++").endsWith("-import './Old.css';");
        assertThat(files.get(1).getAdditions()).isEqualTo(2);
        assertThat(files.get(2).getDeletions()).isEqualTo(1);
    }

    @Test
    void aRenameKeepsItsPreviousPathAndABinaryFileHasNoPatch() {
        List<PullRequestFileResponse> files = UnifiedDiff.parse(DIFF);

        assertThat(files.get(3).getPreviousPath()).isEqualTo("src/a.ts");
        assertThat(files.get(3).getPatch()).isNull();
        assertThat(files.get(4).getPatch()).isNull();
    }

    @Test
    void anEmptyLineInsideAHunkIsABlankContextLine() {
        String diff = "diff --git a/a.go b/a.go\n--- a/a.go\n+++ b/a.go\n@@ -1,3 +1,4 @@\n package a\n\n+// doc\n func A() {}\n\n";

        PullRequestFileResponse file = UnifiedDiff.parse(diff).getFirst();

        assertThat(file.getPatch()).isEqualTo("@@ -1,3 +1,4 @@\n package a\n \n+// doc\n func A() {}");
        assertThat(file.getAdditions()).isEqualTo(1);
    }
}
