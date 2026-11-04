package com.hautetech.ndadiee.service.review;

import java.util.ArrayList;
import java.util.List;

import com.hautetech.ndadiee.dto.response.PullRequestFileResponse;
import com.hautetech.ndadiee.dto.response.PullRequestFileResponse.Status;

/**
 * Découpe la sortie de `git diff` en fichiers, comme l'API de GitHub les donne : le chemin, ce que le diff fait du
 * fichier, ses lignes ajoutées et supprimées, et son diff à partir du premier « @@ », sans en-tête. Sert aux pull
 * requests de démonstration (DemoPullRequestContent), dont le diff est un fichier du classpath.
 */
final class UnifiedDiff {

    private static final String FILE_HEADER = "diff --git ";

    private UnifiedDiff() {
    }

    static List<PullRequestFileResponse> parse(String diff) {
        List<PullRequestFileResponse> files = new ArrayList<>();
        FileBuilder current = null;
        for (String line : diff.replace("\r\n", "\n").split("\n", -1)) {
            if (line.startsWith(FILE_HEADER)) {
                if (current != null) {
                    files.add(current.build());
                }
                current = new FileBuilder(line.substring(FILE_HEADER.length()));
            } else if (current != null) {
                current.accept(line);
            }
        }
        if (current != null) {
            files.add(current.build());
        }
        return files;
    }

    // Un fichier en cours de lecture : son en-tête, puis ses blocs « @@ »
    private static final class FileBuilder {

        private String path;
        private String previousPath;
        private Status status = Status.MODIFIED;
        private final List<String> hunks = new ArrayList<>();
        private boolean inHunks;
        private boolean binary;
        private int additions;
        private int deletions;

        // « a/src/List.tsx b/src/List.tsx » : le chemin de droite, en attendant les lignes --- et +++
        FileBuilder(String paths) {
            int split = paths.indexOf(" b/");
            path = split >= 0 ? paths.substring(split + 3) : paths;
        }

        void accept(String line) {
            if (inHunks) {
                hunkLine(line);
                return;
            }
            if (line.startsWith("@@")) {
                inHunks = true;
                hunkLine(line);
            } else if (line.startsWith("new file mode")) {
                status = Status.ADDED;
            } else if (line.startsWith("deleted file mode")) {
                status = Status.REMOVED;
            } else if (line.startsWith("rename from ")) {
                status = Status.RENAMED;
                previousPath = line.substring("rename from ".length());
            } else if (line.startsWith("rename to ")) {
                path = line.substring("rename to ".length());
            } else if (line.startsWith("copy from ")) {
                status = Status.COPIED;
                previousPath = line.substring("copy from ".length());
            } else if (line.startsWith("copy to ")) {
                path = line.substring("copy to ".length());
            } else if (line.startsWith("Binary files ")) {
                binary = true;
            } else if (line.startsWith("+++ ") && !line.equals("+++ /dev/null")) {
                path = stripPrefix(line.substring(4));
            } else if (line.startsWith("--- ") && !line.equals("--- /dev/null") && status == Status.REMOVED) {
                path = stripPrefix(line.substring(4));
            }
        }

        private void hunkLine(String line) {
            if (line.startsWith("+")) {
                additions++;
            } else if (line.startsWith("-")) {
                deletions++;
            }
            hunks.add(line);
        }

        PullRequestFileResponse build() {
            // Les lignes vides de la fin séparent les fichiers ; au milieu d'un bloc, une ligne vide est une ligne de
            // contexte dont un éditeur a retiré l'espace de tête
            int end = hunks.size();
            while (end > 0 && hunks.get(end - 1).isEmpty()) {
                end--;
            }
            String patch = String.join("\n", hunks.subList(0, end).stream().map(line -> line.isEmpty() ? " " : line).toList());
            return PullRequestFileResponse.builder()
                    .path(path)
                    .previousPath(previousPath)
                    .status(status)
                    .additions(additions)
                    .deletions(deletions)
                    .patch(binary || patch.isEmpty() ? null : patch)
                    .build();
        }

        private static String stripPrefix(String path) {
            return path.startsWith("a/") || path.startsWith("b/") ? path.substring(2) : path;
        }
    }
}
