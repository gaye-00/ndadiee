package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import com.hautetech.ndadiee.model.review.ReviewState;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Un commentaire de revue (design 3C) : dans la conversation, ou sur une ligne d'un fichier du diff avec, peut-être,
 * le code proposé à sa place. Une revue rendue y figure aussi, avec son verdict et son message s'il y en a un.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ReviewCommentResponse {

    private Long id;
    private UserSummaryResponse author;
    // En Markdown ; null pour un verdict rendu sans message
    private String body;
    // Sur une ligne du diff : le chemin du fichier et la ligne, dans sa nouvelle version ; null dans la conversation
    private String path;
    private Integer line;
    // Le code proposé à la place de la ligne
    private String suggestion;
    // Le verdict d'une revue rendue ; null pour un simple commentaire
    private ReviewState verdict;
    private Instant createdAt;
    private Instant updatedAt;
}
