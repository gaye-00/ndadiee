package com.hautetech.ndadiee.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * L'atelier du membre connecté (design 3B), en une requête : ses équipes, ce qui attend sa décision ou son
 * avis, l'activité de ses équipes et sa réputation de bâtisseur. Voir DashboardService.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DashboardResponse {

    // Ses projets : ceux dont il fait partie, puis ceux où sa candidature attend
    private List<DashboardProjectResponse> projects;

    // Les pull requests qui attendent sa revue, les plus anciennes d'abord (5 au plus)
    private List<PullRequestResponse> pullRequests;

    // Les candidatures à étudier, dans les projets qu'il porte ou maintient, les plus anciennes d'abord
    private List<ApplicationReviewResponse> applications;

    // Les demandes de retours d'autres projets, où son avis compte (revue communautaire)
    private List<FeedbackReviewResponse> feedbackRequests;

    // Ce qui s'est passé dans ses équipes ces dernières semaines, le plus récent d'abord
    private List<TeamActivityResponse> activity;

    private BuilderStatsResponse stats;
}
