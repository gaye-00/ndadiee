package com.hautetech.ndadiee.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Une technologie des projets qui recrutent, et ce qu'on y cherche en ce moment (accueil : « Se rencontrer »). */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OpeningStackSummaryResponse {

    // Le tag de la technologie : son slug filtre GET /v1/openings?tag=
    private String slug;
    private String name;
    // Annonces ouvertes des projets qui l'utilisent, places qu'elles proposent
    private int openings;
    private int seats;
    // Ces projets : deux technologies qui mènent aux mêmes équipes se reconnaissent
    private int projects;
    private List<Long> projectIds;
}
