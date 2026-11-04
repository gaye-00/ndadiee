package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import com.hautetech.ndadiee.model.project.TeamRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Une candidature à étudier, dans l'atelier de qui porte ou maintient le projet : le candidat, le rôle
 * visé, son mot pour l'équipe, et sa compatibilité avec le rôle (OpeningMatcher, d'après son profil).
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ApplicationReviewResponse {

    // La participation en attente : c'est elle qu'on accepte ou refuse (PUT /v1/projects/{id}/members/{memberId})
    private Long memberId;
    private UserSummaryResponse applicant;
    private ProjectBriefResponse project;

    // Le rôle visé (null pour une demande sans annonce)
    private Long openingId;
    private String openingTitle;
    private TeamRole role;

    private String motivation;
    private OpeningMatchResponse match;
    private Instant createdAt;
}
