package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import com.hautetech.ndadiee.model.review.ReviewState;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un relecteur d'une pull request, et où en est sa revue (design 3C, « Relecteurs »). */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ReviewerResponse {

    private UserSummaryResponse user;
    private ReviewState state;
    // L'équipe attend sa revue pour fusionner ; il n'est pas de l'équipe du projet
    private boolean required;
    private boolean community;
    // Demande de revue, et sa dernière revue
    private Instant requestedAt;
    private Instant submittedAt;
    // Revue communautaire jugée utile par l'équipe : elle lui a rapporté de la réputation
    private boolean helpful;
}
