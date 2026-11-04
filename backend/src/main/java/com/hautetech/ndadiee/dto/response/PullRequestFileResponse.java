package com.hautetech.ndadiee.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un fichier modifié par une pull request, et son diff (design 3C, « Fichiers modifiés »). */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PullRequestFileResponse {

    /** Ce que la PR fait du fichier */
    public enum Status {
        ADDED,
        MODIFIED,
        REMOVED,
        RENAMED,
        COPIED
    }

    private String path;
    // Son ancien chemin, s'il a été renommé ou copié
    private String previousPath;
    private Status status;
    private int additions;
    private int deletions;
    // Son diff unifié, à partir du premier « @@ » ; null pour un fichier binaire, ou trop gros pour être montré
    private String patch;
}
