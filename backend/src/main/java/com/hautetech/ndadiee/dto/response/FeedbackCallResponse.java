package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Demande de retours d'un projet, avec les retours reçus. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FeedbackCallResponse {

    private Long id;
    private String title;
    private String prompt;
    private boolean open;
    private UserSummaryResponse author;
    private Instant createdAt;

    // Renseignés par FeedbackService : retours reçus, leur note moyenne (null sans note)
    private long feedbackCount;
    private Double averageRating;

    // Renseigné uniquement pour un membre connecté : il a déjà donné son avis
    private Boolean givenByMe;
}
