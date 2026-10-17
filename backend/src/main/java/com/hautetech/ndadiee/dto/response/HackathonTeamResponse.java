package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Équipe d'un hackathon : le projet inscrit, son pitch, et sa place au palmarès une fois les résultats publiés. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class HackathonTeamResponse {

    // Identifiant de l'inscription
    private Long id;
    private ProjectBriefResponse project;
    private String pitch;
    private Integer rank;
    private String award;
    // Membres acceptés du projet
    private long memberCount;

    // Liste complète des équipes (GET /v1/hackathons/{id}/teams) : les membres, le porteur d'abord (6 au
    // plus), et avant le coup d'envoi, les rôles ouverts ; ces rôles aussi pour l'équipe du membre connecté
    private List<UserSummaryResponse> members;
    private List<ProjectOpeningResponse> openings;

    private Instant registeredAt;
}
