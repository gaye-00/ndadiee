package com.hautetech.ndadiee.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Modifier un commentaire de revue : son texte, et la suggestion d'un commentaire de ligne. Le texte d'une revue
 * rendue peut s'effacer (le verdict reste) ; celui d'un commentaire, non.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ReviewCommentUpdateRequest {

    @Size(max = ReviewCommentRequest.MAX_BODY, message = "Le commentaire ne peut pas dépasser 10 000 caractères")
    private String body;

    @Size(max = ReviewCommentRequest.MAX_BODY, message = "La suggestion ne peut pas dépasser 10 000 caractères")
    private String suggestion;
}
