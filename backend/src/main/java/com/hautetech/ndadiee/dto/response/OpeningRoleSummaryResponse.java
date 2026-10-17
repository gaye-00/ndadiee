package com.hautetech.ndadiee.dto.response;

import java.util.List;

import com.hautetech.ndadiee.model.project.TeamRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un rôle du catalogue et ce qu'on en cherche en ce moment (bande des rôles de l'accueil). */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OpeningRoleSummaryResponse {

    private TeamRole role;
    // Annonces ouvertes, et places qu'elles proposent en tout
    private int openings;
    private int seats;
    // Les projets qui recrutent pour ce rôle, les plus récents d'abord (4 au plus)
    private List<ProjectBriefResponse> projects;
}
