package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un dépôt d'un membre, proposé à l'import en un clic. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GithubRepositorySummaryResponse {

    private String owner;
    private String name;
    private String fullName;
    private String description;
    // Langage principal
    private String language;
    private int stars;
    private Instant pushedAt;
    // Un projet de la vitrine pointe déjà vers ce dépôt : son slug
    private String listedProjectSlug;
}
