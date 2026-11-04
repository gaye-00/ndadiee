package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Les revues du membre connecté en chiffres : combien dans chaque onglet, ses projets qui ont des PR ouvertes,
 * son bilan de relecteur et la réputation d'une revue utile.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ReviewOverviewResponse {

    // Par onglet (ReviewTab)
    private long toReview;
    private long community;
    private long mine;
    private long team;
    private long done;

    // La plus ancienne demande de revue qui l'attend encore
    private Instant oldestRequestAt;

    // Ses équipes qui ont des PR ouvertes, les plus actives d'abord
    private List<ProjectCount> projects;

    // Son bilan : revues rendues (dont approbations, changements demandés, revues communautaires), PR fusionnées
    private long reviewsGiven;
    private long approved;
    private long changesRequested;
    private long communityReviews;
    private long mergedPullRequests;

    private int reward;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class ProjectCount {
        private ProjectBriefResponse project;
        private long open;
    }
}
