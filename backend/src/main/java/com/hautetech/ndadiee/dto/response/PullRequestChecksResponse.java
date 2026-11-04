package com.hautetech.ndadiee.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Les vérifications du dernier commit d'une pull request, une par une : en échec d'abord, puis en cours, réussies,
 * ignorées. Une PR de démonstration sans détail n'a que ses totaux (PullRequestResponse).
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PullRequestChecksResponse {

    // Le détail est connu : faux pour une PR de démonstration qui n'en a pas
    private boolean available;
    private List<PullRequestCheckResponse> checks;
    // Toutes ses vérifications, même au-delà de celles lues
    private int total;
    // Les vérifications sur GitHub ; null pour les données de démonstration
    private String url;
}
