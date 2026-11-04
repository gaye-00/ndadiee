package com.hautetech.ndadiee.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * « Ta réputation de bâtisseur » (design 3B) : ce que le membre a construit et apporté aux autres, compté
 * sur la plateforme.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class BuilderStatsResponse {

    private int reputation;

    // Projets qu'il porte, et équipes qu'il a rejointes
    private long projectsLed;
    private long teamsJoined;

    // Membres accueillis dans les équipes de ses projets
    private long buildersWelcomed;

    // Avis donnés aux demandes de retours, réponses acceptées au forum
    private long feedbackGiven;
    private long acceptedAnswers;

    // Étoiles reçues par ses projets
    private long starsReceived;

    // Ses pull requests fusionnées, et les revues de code qu'il a rendues (design 3B : « PR fusionnées, revues utiles »)
    private long mergedPullRequests;
    private long reviewsGiven;
}
