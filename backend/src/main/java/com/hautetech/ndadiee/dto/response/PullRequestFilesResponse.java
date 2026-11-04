package com.hautetech.ndadiee.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Les fichiers modifiés d'une pull request et leur diff : lus sur GitHub au dernier commit de sa branche, ou ceux des
 * données de démonstration.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PullRequestFilesResponse {

    // Le diff peut se lire : faux pour une PR de démonstration qui n'en a pas
    private boolean available;
    private List<PullRequestFileResponse> files;
    // Fichiers que la PR modifie en tout ; au-delà de ceux lus, ils sont sur GitHub (truncated)
    private int total;
    private boolean truncated;
    // Les fichiers de la PR sur GitHub ; null pour les données de démonstration
    private String url;
}
