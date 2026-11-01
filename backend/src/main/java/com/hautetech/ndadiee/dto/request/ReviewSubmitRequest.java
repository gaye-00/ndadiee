package com.hautetech.ndadiee.dto.request;

import com.hautetech.ndadiee.model.review.ReviewState;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Rendre sa revue d'une pull request : un verdict (commentée, approuvée, changements demandés) et un message. Le
 * message est facultatif pour une approbation ; pour les autres verdicts, il dit ce qui manque (« Rends un verdict
 * clair »).
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ReviewSubmitRequest {

    @NotNull(message = "Le verdict est requis")
    private ReviewState state;

    @Size(max = ReviewCommentRequest.MAX_BODY, message = "Le message ne peut pas dépasser 10 000 caractères")
    private String body;

    @AssertTrue(message = "Une revue rendue est commentée, approuvée ou demande des changements")
    public boolean isSubmitted() {
        return state != ReviewState.REQUESTED;
    }

    @AssertTrue(message = "Dis ce qui manque : le message est requis, sauf pour une approbation")
    public boolean isExplained() {
        return state == null || state == ReviewState.APPROVED || (body != null && !body.isBlank());
    }
}
