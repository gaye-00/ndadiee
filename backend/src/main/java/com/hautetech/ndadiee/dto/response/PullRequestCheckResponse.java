package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Une vérification du dernier commit d'une pull request : tests, lint, build (design 3C, « Vérifications »). */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PullRequestCheckResponse {

    /** Où elle en est : réussie, en échec, en cours (ou en attente), ignorée (neutre, sautée) */
    public enum State {
        SUCCESS,
        FAILURE,
        PENDING,
        SKIPPED
    }

    private String name;
    // Le workflow ou l'application dont elle fait partie (« CI », « GitHub Actions », « Vercel »)
    private String context;
    private State state;
    // Ce qu'elle dit d'elle-même (« Budget : 2,1 ko sur 3 ko ») ; null si rien
    private String description;
    // Son détail (journal, rapport) ; null pour les données de démonstration
    private String url;
    private Instant startedAt;
    private Instant completedAt;
}
